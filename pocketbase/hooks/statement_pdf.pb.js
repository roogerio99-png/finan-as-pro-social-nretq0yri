/// <reference path="../pb_data/types.d.ts" />

// Importador e Parser Genérico de Extratos Bancários e Faturas de Cartão em PDF.
//
// Endpoint:
// POST /backend/v1/statements/parse-pdf
// Body: multipart/form-data com o arquivo no campo `file`
// Retorno: {
//   ok: true,
//   document_type: 'invoice' | 'statement',
//   bank?: string,
//   badge?: string, // ex: "Fatura Nubank", "Extrato Banco do Brasil"
//   transactions: [{ date, desc, amount, type, installments_total?, installment_index? }],
//   count: number
// }
//
// Usa `$documents.toMarkdown({ file: files[0] })` no backend do Skip Cloud,
// que preserva a estrutura espacial e tabelas do PDF nativamente. Em seguida,
// aplica o parser heurístico multi-banco e multi-cartão (Nubank, Banco do Brasil,
// Itaú, Bradesco, Santander, Mercado Pago, Inter, C6, Caixa, etc.).

routerAdd(
  'POST',
  '/backend/v1/statements/parse-pdf',
  (e) => {
    const files = e.findUploadedFiles('file')
    if (!files || files.length === 0) {
      throw new BadRequestError('Nenhum arquivo PDF foi enviado.')
    }

    const uploaded = files[0]
    let markdown = ''
    try {
      const docRes = $documents.toMarkdown({ file: uploaded })
      markdown = (docRes && docRes.markdown) || ''
    } catch (err) {
      if (err && err.status === 422) {
        throw new BadRequestError(
          'O PDF enviado parece ser digitalizado/imagem sem camada de texto selecionável. Por favor envie o PDF original exportado pelo seu banco ou emissor do cartão.',
        )
      }
      if (err && err.status === 413) {
        throw new BadRequestError('O arquivo PDF excede o tamanho limite permitido de 10 MB.')
      }
      throw new BadRequestError(
        'Não foi possível extrair o texto deste PDF: ' +
          ((err && err.message) || 'erro desconhecido'),
      )
    }

    if (!markdown || !markdown.trim()) {
      throw new BadRequestError(
        'Não foi possível extrair nenhuma informação textual do PDF. Verifique se o arquivo não está corrompido ou protegido por senha.',
      )
    }

    // =======================================================================
    // HELPERS E DICIONÁRIOS
    // =======================================================================

    const MONTHS_PT = {
      JAN: '01',
      JANEIRO: '01',
      FEV: '02',
      FEVEREIRO: '02',
      MAR: '03',
      MARCO: '03',
      MARÇO: '03',
      ABR: '04',
      ABRIL: '04',
      MAI: '05',
      MAIO: '05',
      JUN: '06',
      JUNHO: '06',
      JUL: '07',
      JULHO: '07',
      AGO: '08',
      AGOSTO: '08',
      SET: '09',
      SETEMBRO: '09',
      OUT: '10',
      OUTUBRO: '10',
      NOV: '11',
      NOVEMBRO: '11',
      DEZ: '12',
      DEZEMBRO: '12',
    }

    // Normaliza número em formato pt-BR/en para float: "15.450,15" -> 15450.15, "1.400,00" -> 1400.00
    const parseAmount = (valStr) => {
      if (!valStr) return null
      let s = valStr.toString().trim()
      // Remove R$, espaços, símbolos extras
      s = s.replace(/R\$\s*/gi, '').replace(/\s+/g, '')
      // Detecta sinal
      let sign = 1
      if (s.includes('(-)') || s.startsWith('-') || s.endsWith('-')) {
        sign = -1
      } else if (s.includes('(+)') || s.startsWith('+') || s.endsWith('+')) {
        sign = 1
      }
      s = s.replace(/\(\+\)|\(-\)|\+|\-/g, '').trim()

      if (s.includes(',') && s.includes('.')) {
        s = s.replace(/\./g, '').replace(',', '.')
      } else if (s.includes(',')) {
        s = s.replace(',', '.')
      }
      const num = parseFloat(s)
      if (isNaN(num)) return null
      return sign * Math.abs(num)
    }

    // Normaliza data para YYYY-MM-DD
    const normalizeDate = (rawDate, defaultYear) => {
      if (!rawDate) return null
      const s = rawDate.toString().trim()

      // dd/mm/aaaa ou dd-mm-aaaa
      const mIso = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
      if (mIso) {
        const d = mIso[1].padStart(2, '0')
        const m = mIso[2].padStart(2, '0')
        const y = mIso[3]
        return `${y}-${m}-${d}`
      }

      // dd/mm (usa defaultYear)
      const mShort = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/)
      if (mShort && defaultYear) {
        const d = mShort[1].padStart(2, '0')
        const m = mShort[2].padStart(2, '0')
        return `${defaultYear}-${m}-${d}`
      }

      // "01 OUT 2026" ou "01 OUT"
      const mText = s.match(/^(\d{1,2})\s+([A-Za-zÇç]{3,9})(?:\s+(\d{4}))?$/i)
      if (mText) {
        const d = mText[1].padStart(2, '0')
        const mName = mText[2]
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        const m = MONTHS_PT[mName]
        const y = mText[3] || defaultYear
        if (m && y) return `${y}-${m}-${d}`
      }

      return null
    }

    // Detecta ano de referência no cabeçalho do documento (ex: "2026")
    let detectedYear = String(new Date().getFullYear())
    const headerYearMatch = markdown.match(/(?:20\d\d)/)
    if (headerYearMatch) {
      detectedYear = headerYearMatch[0]
    }

    // Extrai informações de parcelas da descrição ou texto
    // Suporta: "PARCELA 03/10", "PARC 3/10", "03/10", "(03/10)", "PARC. 2 DE 5", "de 10", "3 de 10"
    const extractInstallments = (text) => {
      if (!text)
        return { cleanDesc: text, installments_total: undefined, installment_index: undefined }

      let clean = text

      // Padrão 1: "PARCELA 03/10", "PARC 3/10", "(3/10)", " - 03/10"
      const mSlash = clean.match(/(?:(?:PARCELA|PARC\.?)\s*)?\(?\b(\d{1,2})\/(\d{1,2})\)?/i)
      if (mSlash) {
        const current = parseInt(mSlash[1], 10)
        const total = parseInt(mSlash[2], 10)
        if (total >= 2 && total <= 99 && current >= 1 && current <= total) {
          // Remove marcador da descrição para ficar mais limpa, ou preserva se preferir
          return {
            cleanDesc: clean,
            installments_total: total,
            installment_index: current,
          }
        }
      }

      // Padrão 2: "3 DE 10", "PARCELA 3 DE 10"
      const mDe = clean.match(/(?:(?:PARCELA|PARC\.?)\s*)?\(?\b(\d{1,2})\s+DE\s+(\d{1,2})\)?/i)
      if (mDe) {
        const current = parseInt(mDe[1], 10)
        const total = parseInt(mDe[2], 10)
        if (total >= 2 && total <= 99 && current >= 1 && current <= total) {
          return {
            cleanDesc: clean,
            installments_total: total,
            installment_index: current,
          }
        }
      }

      // Padrão 3: "de 10" após valor (ex: "R$ 100,00 de 10")
      const mAfterVal = clean.match(/\bde\s+(\d{1,2})\b/i)
      if (mAfterVal) {
        const total = parseInt(mAfterVal[1], 10)
        if (total >= 2 && total <= 99) {
          return {
            cleanDesc: clean,
            installments_total: total,
            installment_index: undefined,
          }
        }
      }

      return { cleanDesc: clean, installments_total: undefined, installment_index: undefined }
    }

    // =======================================================================
    // DETECÇÃO: FATURA DE CARTÃO vs EXTRATO BANCÁRIO & EMISSOR
    // =======================================================================
    const mdUpper = markdown.toUpperCase()

    // Indicadores fortes de FATURA DE CARTÃO
    const invoiceKeywords = [
      'FATURA',
      'PAGAMENTO MÍNIMO',
      'PAGAMENTO MINIMO',
      'LIMITE TOTAL',
      'LIMITE DISPONÍVEL',
      'LIMITE DISPONIVEL',
      'LIMITE DE CRÉDITO',
      'LIMITE DE CREDITO',
      'MELHOR DIA DE COMPRA',
      'DATA DE VENCIMENTO',
      'VENCIMENTO DA FATURA',
      'TOTAL DA FATURA',
      'RESUMO DA FATURA',
      'LANÇAMENTOS NACIONAIS',
      'LANCAMENTOS NACIONAIS',
      'TRANSAÇÕES NACIONAIS',
      'TRANSACOES NACIONAIS',
      'DESPESAS DO CARTÃO',
      'DESPESAS DO CARTAO',
      'TITULAR DO CARTÃO',
      'TITULAR DO CARTAO',
      'CARTÃO FINAL',
      'CARTAO FINAL',
      'ENCARGOS DA FATURA',
    ]

    let invoiceScore = 0
    for (const kw of invoiceKeywords) {
      if (mdUpper.includes(kw)) invoiceScore += 1
    }

    // Indicadores fortes de EXTRATO BANCÁRIO DE CONTA
    const statementKeywords = [
      'EXTRATO DE CONTA',
      'CONTA CORRENTE',
      'CONTA DE PAGAMENTO',
      'SALDO ANTERIOR',
      'SALDO ATUAL',
      'SALDO DISPONÍVEL',
      'SALDO DO DIA',
      'EXTRATO MENSAL',
      'DETALHE DOS MOVIMENTOS',
      'RENDIMENTO LÍQUIDO',
      'RENDIMENTO LIQUIDO',
      'CHEQUE OURO',
      'TRANSFERÊNCIA ENVIADA PELO PIX',
      'TRANSFERENCIA ENVIADA PELO PIX',
      'TRANSFERÊNCIA RECEBIDA PELO PIX',
    ]

    let statementScore = 0
    for (const kw of statementKeywords) {
      if (mdUpper.includes(kw)) statementScore += 1
    }

    // Se o documento falar explicitamente "FATURA" ou tiver mais scores de fatura
    const isInvoice = invoiceScore >= 2 || (invoiceScore >= 1 && invoiceScore > statementScore)
    const documentType = isInvoice ? 'invoice' : 'statement'

    // Identificação de emissor / banco
    let detectedBank = 'Genérico'
    if (
      mdUpper.includes('NUBANK') ||
      mdUpper.includes('NU PAGAMENTOS') ||
      mdUpper.includes('NU FINANCEIRA') ||
      mdUpper.includes('RDB')
    ) {
      detectedBank = 'Nubank'
    } else if (
      mdUpper.includes('BANCO DO BRASIL') ||
      mdUpper.includes('OURO増') ||
      mdUpper.includes('OUROCARD')
    ) {
      detectedBank = 'Banco do Brasil'
    } else if (mdUpper.includes('MERCADO PAGO')) {
      detectedBank = 'Mercado Pago'
    } else if (mdUpper.includes('ITAU') || mdUpper.includes('ITAÚ')) {
      detectedBank = 'Itaú'
    } else if (mdUpper.includes('BRADESCO')) {
      detectedBank = 'Bradesco'
    } else if (mdUpper.includes('SANTANDER')) {
      detectedBank = 'Santander'
    } else if (mdUpper.includes('CAIXA')) {
      detectedBank = 'Caixa Econômica'
    } else if (mdUpper.includes('INTER') || mdUpper.includes('BANCO INTER')) {
      detectedBank = 'Banco Inter'
    } else if (mdUpper.includes('C6 BANK') || mdUpper.includes('C6BANK')) {
      detectedBank = 'C6 Bank'
    } else if (mdUpper.includes('SICREDI')) {
      detectedBank = 'Sicredi'
    } else if (mdUpper.includes('SICOOB')) {
      detectedBank = 'Sicoob'
    } else if (
      mdUpper.includes('XP INVESTIMENTOS') ||
      mdUpper.includes('CARTAO XP') ||
      mdUpper.includes('CARTÃO XP')
    ) {
      detectedBank = 'XP Investimentos'
    } else if (mdUpper.includes('BTG PACTUAL') || mdUpper.includes('BTG')) {
      detectedBank = 'BTG Pactual'
    }

    const badge = `${isInvoice ? 'Fatura' : 'Extrato'} ${detectedBank}`

    // =======================================================================
    // REGRAS DE IGNORE: CABEÇALHOS, TOTAIS, PAGAMENTO DE FATURA, LIMITES
    // =======================================================================
    const isIgnoredDescription = (desc) => {
      if (!desc) return true
      const u = desc.toUpperCase().replace(/\s+/g, ' ').trim()

      // Linhas institucionais ou de saldo
      if (
        u === 'SALDO' ||
        u === 'S A L D O' ||
        u.startsWith('SALDO ANTERIOR') ||
        u.startsWith('SALDO DO DIA') ||
        u.startsWith('SALDO FINAL') ||
        u.startsWith('SALDO INICIAL') ||
        u.startsWith('SALDO DISPONIVEL') ||
        u.startsWith('SALDO DISPONÍVEL') ||
        u.startsWith('RENDIMENTO LIQUIDO') ||
        u.startsWith('RENDIMENTO LÍQUIDO') ||
        u.startsWith('TOTAL DE ENTRADAS') ||
        u.startsWith('TOTAL DE SAIDAS') ||
        u.startsWith('TOTAL DE SAÍDAS') ||
        u.startsWith('LIMITE CHEQUE OURO') ||
        u.startsWith('TAXA LIMITE') ||
        u.startsWith('TRIBUTOS (IOF)') ||
        u.startsWith('CUSTO EFETIVO TOTAL') ||
        u.startsWith('DATA VENC. LIM') ||
        u.startsWith('VALOR TOTAL DEVIDO') ||
        u.startsWith('VALOR LIBERADO') ||
        u.startsWith('DESPESAS-(IOF)') ||
        u.startsWith('JUROS') ||
        u.startsWith('ENTRADAS:') ||
        u.startsWith('SAIDAS:') ||
        u.startsWith('SAÍDAS:') ||
        u.startsWith('ENCARGOS') ||
        u.startsWith('MULTA POR ATRASO') ||
        u.startsWith('IOF FINANCIAMENTO')
      ) {
        return true
      }

      // Linhas específicas de FATURA DE CARTÃO que NÃO são compras
      if (
        u.startsWith('TOTAL DA FATURA') ||
        u.startsWith('TOTAL DESTA FATURA') ||
        u.startsWith('PAGAMENTO MINIMO') ||
        u.startsWith('PAGAMENTO MÍNIMO') ||
        u.startsWith('PAGAMENTO DA FATURA ANTERIOR') ||
        u.startsWith('PAGAMENTO RECEBIDO') ||
        u.startsWith('PAGAMENTO EFETUADO') ||
        u.startsWith('PAGAMENTO DE FATURA') ||
        u.startsWith('CREDITO DE PAGAMENTO') ||
        u.startsWith('CRÉDITO DE PAGAMENTO') ||
        u.startsWith('LIMITE TOTAL') ||
        u.startsWith('LIMITE DE CRÉDITO') ||
        u.startsWith('LIMITE DE CREDITO') ||
        u.startsWith('LIMITE DISPONÍVEL') ||
        u.startsWith('LIMITE DISPONIVEL') ||
        u.startsWith('MELHOR DIA') ||
        u.startsWith('VENCIMENTO') ||
        u.startsWith('DATA DE VENCIMENTO') ||
        u.startsWith('SUBTOTAL') ||
        u.startsWith('RESUMO DA FATURA') ||
        u.startsWith('TOTAL GERAL') ||
        u.startsWith('TOTAL PARCELADO') ||
        u.startsWith('AUTENTICAÇÃO MECÂNICA') ||
        u.startsWith('LINHA DIGITÁVEL') ||
        u.startsWith('BOLETO')
      ) {
        return true
      }

      return false
    }

    const transactions = []
    const rawLines = markdown.split(/\r?\n/)

    // =======================================================================
    // ESTRATÉGIA 1: PARSER DE TABELAS MARKDOWN (| Data | Descrição | ... |)
    // Usado por Mercado Pago, Banco do Brasil, faturas em tabela (ex: Itaú, BB, etc.)
    // =======================================================================
    const tableRows = []
    let inTable = false
    let tableHeaders = []

    for (let i = 0; i < rawLines.length; i++) {
      const line = rawLines[i].trim()
      if (line.startsWith('|') && line.endsWith('|')) {
        const cells = line
          .slice(1, -1)
          .split('|')
          .map((c) => c.trim())

        // Ignora linha de separação markdown (|---|---|)
        if (cells.every((c) => /^[\s\:\-]+$/.test(c))) {
          continue
        }

        // Verifica se é linha de cabeçalho
        const joined = cells.join(' ').toUpperCase()
        if (
          (joined.includes('DATA') || joined.includes('DIA')) &&
          (joined.includes('VALOR') ||
            joined.includes('HISTORICO') ||
            joined.includes('HISTÓRICO') ||
            joined.includes('DESCRICAO') ||
            joined.includes('DESCRIÇÃO') ||
            joined.includes('ESTABELECIMENTO') ||
            joined.includes('LANÇAMENTO') ||
            joined.includes('LANCAMENTO'))
        ) {
          tableHeaders = cells.map((c) => c.toUpperCase())
          inTable = true
          continue
        }

        if (inTable && cells.length >= 3) {
          tableRows.push({ headers: tableHeaders, cells })
        }
      } else {
        if (line.length === 0) {
          inTable = false
        }
      }
    }

    if (tableRows.length > 0) {
      for (const row of tableRows) {
        const cells = row.cells
        const headers = row.headers

        let dateIdx = -1
        let descIdx = -1
        let amountIdx = -1
        let docIdx = -1
        let parcelIdx = -1

        for (let h = 0; h < headers.length; h++) {
          const hName = headers[h]
          if (hName.includes('DATA') || hName === 'DIA') dateIdx = h
          else if (
            hName.includes('HISTÓRICO') ||
            hName.includes('HISTORICO') ||
            hName.includes('DESCRIÇÃO') ||
            hName.includes('DESCRICAO') ||
            hName.includes('ESTABELECIMENTO') ||
            hName.includes('LANÇAMENTO') ||
            hName.includes('LANCAMENTO')
          )
            descIdx = h
          else if (hName.includes('PARCELA') || hName.includes('PARC')) parcelIdx = h
          else if (hName.includes('VALOR')) amountIdx = h
          else if (
            hName.includes('DOC') ||
            hName.includes('LOTE') ||
            hName.includes('ID DA OPERAÇÃO') ||
            hName.includes('CARTÃO')
          )
            docIdx = h
        }

        if (dateIdx === -1) dateIdx = 0
        if (amountIdx === -1) {
          for (let c = cells.length - 1; c >= 0; c--) {
            if (
              /R?\$?\s*[\-\+]?\s*\d{1,3}(?:\.\d{3})*,\d{2}/.test(cells[c]) ||
              /[\-\+]?\d+,\d{2}/.test(cells[c])
            ) {
              amountIdx = c
              break
            }
          }
        }
        if (descIdx === -1) {
          let maxLen = 0
          for (let c = 0; c < cells.length; c++) {
            if (c !== dateIdx && c !== amountIdx && c !== docIdx && c !== parcelIdx) {
              if (cells[c].length > maxLen) {
                maxLen = cells[c].length
                descIdx = c
              }
            }
          }
        }

        if (dateIdx >= 0 && amountIdx >= 0 && descIdx >= 0 && cells[dateIdx] && cells[amountIdx]) {
          const rawDate = cells[dateIdx]
          let rawDesc = cells[descIdx]
          const rawAmount = cells[amountIdx]

          const parsedDate = normalizeDate(rawDate, detectedYear)
          const parsedVal = parseAmount(rawAmount)

          if (parsedDate && parsedVal !== null && rawDesc && !isIgnoredDescription(rawDesc)) {
            // Se houver coluna de parcelas dedicada (ex: "03/10" ou "2 de 5")
            let installInfo = extractInstallments(rawDesc)
            if (parcelIdx >= 0 && cells[parcelIdx]) {
              const colInstall = extractInstallments(cells[parcelIdx])
              if (colInstall.installments_total) {
                installInfo = colInstall
              }
            }

            // Em fatura de cartão: compra normal é despesa (expense).
            // Apenas se tiver estorno ou crédito explícito vira income.
            let type = 'expense'
            if (isInvoice) {
              const u = rawDesc.toUpperCase()
              if (
                u.includes('ESTORNO') ||
                u.includes('CRÉDITO') ||
                u.includes('CREDITO') ||
                parsedVal < 0
              ) {
                type = 'income'
              } else {
                type = 'expense'
              }
            } else {
              type = parsedVal < 0 ? 'expense' : 'income'
            }

            transactions.push({
              date: parsedDate,
              desc: rawDesc
                .replace(/<br\s*\/?>/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim(),
              amount: Math.abs(parsedVal),
              type,
              installments_total: installInfo.installments_total,
              installment_index: installInfo.installment_index,
            })
          }
        }
      }
    }

    // =======================================================================
    // ESTRATÉGIA 2: PARSER LINEAR / POR BLOCOS (NUBANK & LAYOUTS NÃO-TABELARES)
    // Se a estratégia de tabela capturou poucas ou nenhuma linha, analisa o
    // fluxo de texto linha a linha com detecção de âncoras de data e valores.
    // =======================================================================
    if (transactions.length === 0) {
      // Padrão de data: "01 OUT 2026", "01 OUT", "01/10/2026", "01/10", "01-10-2026"
      const dateAnchorRegex =
        /^(\d{1,2}(?:\s+[A-Za-zÇç]{3,9}(?:\s+\d{4})?|[\/\-]\d{1,2}(?:[\/\-]\d{4})?))/i
      let currentDate = null
      let currentSectionType = null

      let pendingDescParts = []
      let pendingAmount = null
      let pendingInstallmentInfo = { installments_total: undefined, installment_index: undefined }

      const commitPending = () => {
        if (!currentDate || pendingDescParts.length === 0 || pendingAmount === null) {
          pendingDescParts = []
          pendingAmount = null
          pendingInstallmentInfo = { installments_total: undefined, installment_index: undefined }
          return
        }

        const fullDesc = pendingDescParts.join(' ').replace(/\s+/g, ' ').trim()
        if (fullDesc && !isIgnoredDescription(fullDesc)) {
          // Extrai parcelas da descrição se ainda não foram detectadas
          const fromDesc = extractInstallments(fullDesc)
          const installments_total =
            pendingInstallmentInfo.installments_total || fromDesc.installments_total
          const installment_index =
            pendingInstallmentInfo.installment_index || fromDesc.installment_index

          // Tipo de transação
          let type = 'expense'
          if (isInvoice) {
            const u = fullDesc.toUpperCase()
            if (
              u.includes('ESTORNO') ||
              u.includes('CRÉDITO') ||
              u.includes('CREDITO') ||
              pendingAmount.hasMinus
            ) {
              type = 'income'
            } else {
              type = 'expense'
            }
          } else {
            if (pendingAmount.rawVal !== null && pendingAmount.rawVal < 0) {
              type = 'expense'
            } else if (pendingAmount.hasMinus) {
              type = 'expense'
            } else if (pendingAmount.hasPlus) {
              type = 'income'
            } else if (currentSectionType) {
              type = currentSectionType
            } else {
              const u = fullDesc.toUpperCase()
              if (
                u.includes('RECEBIDA') ||
                u.includes('RECEBIMENTO') ||
                u.includes('RESGATE') ||
                u.includes('RENDIMENTO') ||
                u.includes('ESTORNO') ||
                u.includes('CREDITO') ||
                u.includes('CRÉDITO') ||
                u.includes('DEPOSITO') ||
                u.includes('DEPÓSITO')
              ) {
                type = 'income'
              } else {
                type = 'expense'
              }
            }
          }

          transactions.push({
            date: currentDate,
            desc: fullDesc,
            amount: Math.abs(pendingAmount.absVal),
            type,
            installments_total,
            installment_index,
          })
        }

        pendingDescParts = []
        pendingAmount = null
        pendingInstallmentInfo = { installments_total: undefined, installment_index: undefined }
      }

      for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim()
        if (!line) continue

        line = line.replace(/^[\*\-\#\>]+\s*/, '')

        const lineUpper = line.toUpperCase()
        if (
          lineUpper.includes('OUVIDORIA') ||
          lineUpper.includes('ATENDIMENTO 24H') ||
          lineUpper.includes('EXTRATO GERADO DIA') ||
          lineUpper.includes('FATURA GERADA') ||
          lineUpper.includes('CENTRAL DE ATENDIMENTO') ||
          lineUpper.includes('SAC:') ||
          lineUpper.includes('NU FINANCEIRA S.A.') ||
          lineUpper.includes('NU PAGAMENTOS S.A.') ||
          lineUpper.includes('MERCADO PAGO INSTITUIÇÃO') ||
          (lineUpper.includes('BANCO DO BRASIL S.A.') && lineUpper.includes('OUVIDORIA'))
        ) {
          continue
        }

        // Detecta cabeçalhos de seção que não são transações
        if (
          lineUpper.includes('TRANSAÇÕES') ||
          lineUpper.includes('TRANSACOES') ||
          lineUpper.includes('MOVIMENTAÇÕES') ||
          lineUpper.includes('MOVIMENTACOES') ||
          lineUpper.includes('LANÇAMENTOS DO PERÍODO') ||
          lineUpper.includes('HISTÓRICO DA FATURA')
        ) {
          commitPending()
          continue
        }

        // Detecta âncora de data
        const dateMatch = line.match(dateAnchorRegex)
        if (dateMatch) {
          const rawDateStr = dateMatch[1]
          const parsedD = normalizeDate(rawDateStr, detectedYear)
          if (parsedD) {
            commitPending()
            currentDate = parsedD

            const remainder = line.slice(dateMatch[0].length).trim()
            if (remainder) {
              line = remainder
            } else {
              continue
            }
          }
        }

        // Totalizadores
        const sectionUpper = line.toUpperCase()
        if (
          sectionUpper.startsWith('TOTAL DE SAÍDAS') ||
          sectionUpper.startsWith('TOTAL DE SAIDAS')
        ) {
          commitPending()
          currentSectionType = 'expense'
          continue
        }
        if (sectionUpper.startsWith('TOTAL DE ENTRADAS')) {
          commitPending()
          currentSectionType = 'income'
          continue
        }
        if (isIgnoredDescription(line)) {
          commitPending()
          continue
        }

        // Detecta parcelas em formatos como "R$ 100,00 de 10" ou "100,00 de 10" ou "Parcela 3 de 10"
        const parcelMatch = extractInstallments(line)
        if (parcelMatch.installments_total) {
          pendingInstallmentInfo = {
            installments_total: parcelMatch.installments_total,
            installment_index: parcelMatch.installment_index,
          }
        }

        // Verifica se a linha termina com valor monetário
        // Suporta "Uber *Trip 28,40" ou "Mercado Livre R$ 100,00 de 10"
        const endAmountWithInstallments = line.match(
          /^(.*?)\s+((?:R\$\s*)?[\+\-]?\s*\d{1,3}(?:\.\d{3})*,\d{2})\s+de\s+(\d{1,2})$/i,
        )
        const endAmountMatch = line.match(
          /^(.*?)\s+((?:R\$\s*)?[\+\-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*[\(\+\-\)]+)?)$/,
        )
        const standaloneAmountMatch = line.match(
          /^(?:R\$\s*)?([\+\-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*[\(\+\-\)]+)?)$/,
        )

        if (endAmountWithInstallments) {
          const beforeText = endAmountWithInstallments[1].trim()
          const valStr = endAmountWithInstallments[2].trim()
          const totalInst = parseInt(endAmountWithInstallments[3], 10)
          const val = parseAmount(valStr)

          if (val !== null && !isIgnoredDescription(beforeText)) {
            if (pendingDescParts.length > 0) {
              pendingDescParts.push(beforeText)
            } else {
              pendingDescParts = [beforeText]
            }
            pendingAmount = {
              absVal: Math.abs(val),
              rawVal: val,
              hasMinus: valStr.includes('-'),
              hasPlus: valStr.includes('+'),
            }
            pendingInstallmentInfo = {
              installments_total: totalInst,
              installment_index: pendingInstallmentInfo.installment_index,
            }
            commitPending()
            continue
          }
        } else if (standaloneAmountMatch) {
          const val = parseAmount(standaloneAmountMatch[1])
          if (val !== null) {
            pendingAmount = {
              absVal: Math.abs(val),
              rawVal: val,
              hasMinus: standaloneAmountMatch[1].includes('-'),
              hasPlus: standaloneAmountMatch[1].includes('+'),
            }
            commitPending()
            continue
          }
        } else if (endAmountMatch && endAmountMatch[1].trim().length > 0) {
          const beforeText = endAmountMatch[1].trim()
          const valStr = endAmountMatch[2].trim()
          const val = parseAmount(valStr)

          if (val !== null && !isIgnoredDescription(beforeText)) {
            if (pendingDescParts.length > 0) {
              pendingDescParts.push(beforeText)
            } else {
              pendingDescParts = [beforeText]
            }
            pendingAmount = {
              absVal: Math.abs(val),
              rawVal: val,
              hasMinus: valStr.includes('-'),
              hasPlus: valStr.includes('+'),
            }
            commitPending()
            continue
          }
        }

        // Linha de continuação
        if (currentDate) {
          pendingDescParts.push(line)
        }
      }

      commitPending()
    }

    // =======================================================================
    // RESULTADO FINAL
    // =======================================================================
    if (transactions.length === 0) {
      const docLabel = isInvoice ? 'fatura de cartão' : 'extrato bancário'
      throw new BadRequestError(
        `Não reconhecemos movimentações com o formato esperado neste PDF de ${docLabel}. Verifique se o arquivo enviado contém data, descrição/estabelecimento e valores das compras.`,
      )
    }

    return e.json(200, {
      ok: true,
      document_type: documentType,
      bank: detectedBank,
      badge,
      transactions,
      count: transactions.length,
    })
  },
  $apis.requireAuth(),
)
