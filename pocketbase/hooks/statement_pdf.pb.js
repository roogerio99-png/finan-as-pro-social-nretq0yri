/// <reference path="../pb_data/types.d.ts" />

// Importador e Parser Genérico de Extratos Bancários em PDF.
//
// Endpoint:
// POST /backend/v1/statements/parse-pdf
// Body: multipart/form-data com o arquivo no campo `file`
// Retorno: { ok: true, bank?: string, transactions: [{ date, desc, amount, type }], count: number }
//
// Usa `$documents.toMarkdown({ file: files[0] })` no backend do Skip Cloud,
// que preserva a estrutura espacial e tabelas do PDF nativamente. Em seguida,
// aplica o parser heurístico multi-banco (compatível com Nubank, Banco do Brasil,
// Mercado Pago, Itaú, Bradesco, Santander, Caixa, Inter, Sicredi, Sicoob, etc.).

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
          'O PDF enviado parece ser digitalizado/imagem sem camada de texto selecionável. Por favor envie o PDF original exportado pelo seu banco.',
        )
      }
      if (err && err.status === 413) {
        throw new BadRequestError('O arquivo PDF excede o tamanho limite permitido de 10 MB.')
      }
      throw new BadRequestError(
        'Não foi possível extrair o texto deste PDF: ' + ((err && err.message) || 'erro desconhecido'),
      )
    }

    if (!markdown || !markdown.trim()) {
      throw new BadRequestError(
        'Não foi possível extrair nenhuma informação textual do PDF. Verifique se o arquivo não está corrompido ou protegido por senha.',
      )
    }

    // =======================================================================
    // PARSER MULTI-BANCO
    // =======================================================================

    const MONTHS_PT = {
      JAN: '01', JANEIRO: '01',
      FEV: '02', FEVEREIRO: '02',
      MAR: '03', MARCO: '03', MARÇO: '03',
      ABR: '04', ABRIL: '04',
      MAI: '05', MAIO: '05',
      JUN: '06', JUNHO: '06',
      JUL: '07', JULHO: '07',
      AGO: '08', AGOSTO: '08',
      SET: '09', SETEMBRO: '09',
      OUT: '10', OUTUBRO: '10',
      NOV: '11', NOVEMBRO: '11',
      DEZ: '12', DEZEMBRO: '12',
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

      // Trata separadores de milhar e decimal
      // Casos comuns:
      // "15.450,15" -> "." milhar, "," decimal
      // "323,52" -> "," decimal
      // "15000.00" -> "." decimal
      if (s.includes(',') && s.includes('.')) {
        // Ex: 15.450,15
        s = s.replace(/\./g, '').replace(',', '.')
      } else if (s.includes(',')) {
        // Ex: 323,52 ou 1,400 (se decimal brasileiro)
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
        const mName = mText[2].toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const m = MONTHS_PT[mName]
        const y = mText[3] || defaultYear
        if (m && y) return `${y}-${m}-${d}`
      }

      return null
    }

    // Detecta ano de referência no cabeçalho do documento (ex: "2026")
    let detectedYear = '2026'
    const headerYearMatch = markdown.match(/(?:20\d\d)/)
    if (headerYearMatch) {
      detectedYear = headerYearMatch[0]
    }

    // Detecção preliminar de banco para metadados (apenas informativo)
    let detectedBank = 'Genérico'
    const mdUpper = markdown.toUpperCase()
    if (mdUpper.includes('NUBANK') || mdUpper.includes('NU PAGAMENTOS') || mdUpper.includes('NU FINANCEIRA') || mdUpper.includes('RDB')) {
      detectedBank = 'Nubank'
    } else if (mdUpper.includes('BANCO DO BRASIL') || (mdUpper.includes('EXTRATO DE CONTA CORRENTE') && mdUpper.includes('LOTE'))) {
      detectedBank = 'Banco do Brasil'
    } else if (mdUpper.includes('MERCADO PAGO') || mdUpper.includes('DETALHE DOS MOVIMENTOS')) {
      detectedBank = 'Mercado Pago'
    } else if (mdUpper.includes('ITAU') || mdUpper.includes('ITAÚ')) {
      detectedBank = 'Itaú'
    } else if (mdUpper.includes('BRADESCO')) {
      detectedBank = 'Bradesco'
    } else if (mdUpper.includes('SANTANDER')) {
      detectedBank = 'Santander'
    } else if (mdUpper.includes('CAIXA')) {
      detectedBank = 'Caixa Econômica'
    } else if (mdUpper.includes('INTER')) {
      detectedBank = 'Banco Inter'
    } else if (mdUpper.includes('SICREDI')) {
      detectedBank = 'Sicredi'
    } else if (mdUpper.includes('SICOOB')) {
      detectedBank = 'Sicoob'
    }

    // Textos de rodapé, cabeçalhos agregadores, saldos diários que NÃO são movimentação real
    const isIgnoredDescription = (desc) => {
      if (!desc) return true
      const u = desc.toUpperCase().replace(/\s+/g, ' ').trim()
      if (
        u === 'SALDO' ||
        u === 'S A L D O' ||
        u.startsWith('SALDO ANTERIOR') ||
        u.startsWith('SALDO DO DIA') ||
        u.startsWith('SALDO FINAL') ||
        u.startsWith('SALDO INICIAL') ||
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
        u.startsWith('SAÍDAS:')
      ) {
        return true
      }
      return false
    }

    const transactions = []

    // =======================================================================
    // ESTRATÉGIA 1: PARSER DE TABELAS MARKDOWN (| Data | Descrição | ... |)
    // Usado por Mercado Pago, Banco do Brasil e muitos outros quando convertidos
    // =======================================================================
    const rawLines = markdown.split(/\r?\n/)
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
          (joined.includes('VALOR') || joined.includes('HISTORICO') || joined.includes('DESCRICAO') || joined.includes('DESCRIÇÃO'))
        ) {
          tableHeaders = cells.map((c) => c.toUpperCase())
          inTable = true
          continue
        }

        if (inTable && cells.length >= 3) {
          tableRows.push({ headers: tableHeaders, cells })
        }
      } else {
        // Saiu da tabela
        if (line.length === 0) {
          // linha em branco pode ser fim de tabela
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

        for (let h = 0; h < headers.length; h++) {
          const hName = headers[h]
          if (hName.includes('DATA') || hName === 'DIA') dateIdx = h
          else if (hName.includes('HISTÓRICO') || hName.includes('HISTORICO') || hName.includes('DESCRIÇÃO') || hName.includes('DESCRICAO')) descIdx = h
          else if (hName.includes('VALOR')) amountIdx = h
          else if (hName.includes('DOC') || hName.includes('LOTE') || hName.includes('ID DA OPERAÇÃO')) docIdx = h
        }

        // Se cabeçalhos não foram bem mapeados, tenta heurística por posição
        if (dateIdx === -1) dateIdx = 0
        if (amountIdx === -1) {
          // Procura coluna com valor monetário
          for (let c = cells.length - 1; c >= 0; c--) {
            if (/R?\$?\s*[\-\+]?\s*\d{1,3}(?:\.\d{3})*,\d{2}/.test(cells[c]) || /[\-\+]?\d+,\d{2}/.test(cells[c])) {
              amountIdx = c
              break
            }
          }
        }
        if (descIdx === -1) {
          // Pega a coluna de texto com maior extensão que não seja data/valor
          let maxLen = 0
          for (let c = 0; c < cells.length; c++) {
            if (c !== dateIdx && c !== amountIdx && c !== docIdx) {
              if (cells[c].length > maxLen) {
                maxLen = cells[c].length
                descIdx = c
              }
            }
          }
        }

        if (dateIdx >= 0 && amountIdx >= 0 && descIdx >= 0 && cells[dateIdx] && cells[amountIdx]) {
          const rawDate = cells[dateIdx]
          const rawDesc = cells[descIdx]
          const rawAmount = cells[amountIdx]

          const parsedDate = normalizeDate(rawDate, detectedYear)
          const parsedVal = parseAmount(rawAmount)

          if (parsedDate && parsedVal !== null && rawDesc && !isIgnoredDescription(rawDesc)) {
            // Se houver sinal explícito no valor: negativo = expense, positivo = income
            // Caso especial: Mercado Pago tem "R$ -323,52" (expense) e "R$ 1.400,00" (income)
            // Banco do Brasil tem "15.000,00 (-)" (expense) e "15.450,15 (+)" (income)
            const type = parsedVal < 0 ? 'expense' : 'income'
            transactions.push({
              date: parsedDate,
              desc: rawDesc.replace(/<br\s*\/?>/gi, ' ').replace(/\s+/g, ' ').trim(),
              amount: Math.abs(parsedVal),
              type,
            })
          }
        }
      }
    }

    // =======================================================================
    // ESTRATÉGIA 2: PARSER LINEAR/POR BLOCOS (NUBANK & LAYOUTS NÃO-TABELARES)
    // Se a estratégia de tabela capturou poucas ou nenhuma linha, analisa o
    // fluxo de texto linha a linha com detecção de âncoras de data e valores.
    // =======================================================================
    if (transactions.length === 0) {
      // Padrão de data: "01 OUT 2026", "01/10/2026", "01-10-2026"
      const dateAnchorRegex = /^(\d{1,2}(?:\s+[A-Za-zÇç]{3,9}(?:\s+\d{4})?|[\/\-]\d{1,2}[\/\-]\d{4}))/i
      let currentDate = null
      let currentSectionType = null // 'income' | 'expense' quando sob "Total de entradas" ou "Total de saídas"

      // Buffer para acumular linhas de uma transação
      let pendingDescParts = []
      let pendingAmount = null

      const commitPending = () => {
        if (!currentDate || pendingDescParts.length === 0 || pendingAmount === null) {
          pendingDescParts = []
          pendingAmount = null
          return
        }

        const fullDesc = pendingDescParts.join(' ').replace(/\s+/g, ' ').trim()
        if (fullDesc && !isIgnoredDescription(fullDesc)) {
          // Determina se é despesa ou receita
          let type = 'expense'
          if (pendingAmount.rawVal !== null && pendingAmount.rawVal < 0) {
            type = 'expense'
          } else if (pendingAmount.hasMinus) {
            type = 'expense'
          } else if (pendingAmount.hasPlus) {
            type = 'income'
          } else if (currentSectionType) {
            type = currentSectionType
          } else {
            // Heurística pelo texto
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

          transactions.push({
            date: currentDate,
            desc: fullDesc,
            amount: Math.abs(pendingAmount.absVal),
            type,
          })
        }

        pendingDescParts = []
        pendingAmount = null
      }

      for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim()
        if (!line) continue

        // Remove marcadores de lista markdown (-, *, etc.)
        line = line.replace(/^[\*\-\#\>]+\s*/, '')

        // Detecta cabeçalhos institucionais / de rodapé e pula
        const lineUpper = line.toUpperCase()
        if (
          lineUpper.includes('OUVIDORIA') ||
          lineUpper.includes('ATENDIMENTO 24H') ||
          lineUpper.includes('EXTRATO GERADO DIA') ||
          lineUpper.includes('NU FINANCEIRA S.A.') ||
          lineUpper.includes('NU PAGAMENTOS S.A.') ||
          lineUpper.includes('MERCADO PAGO INSTITUIÇÃO') ||
          lineUpper.includes('BANCO DO BRASIL S.A.') && lineUpper.includes('OUVIDORIA')
        ) {
          continue
        }

        // Verifica se a linha começa com data de âncora
        // Ex: "01 OUT 2026 Total de saídas - 11,11" ou apenas "01 OUT 2026"
        const dateMatch = line.match(dateAnchorRegex)
        if (dateMatch) {
          const rawDateStr = dateMatch[1]
          const parsedD = normalizeDate(rawDateStr, detectedYear)
          if (parsedD) {
            // Se já tínhamos transação em andamento, commita
            commitPending()
            currentDate = parsedD

            // O resto da linha pode conter seção agregadora (ex: "Total de saídas - 11,11")
            const remainder = line.slice(dateMatch[0].length).trim()
            if (remainder) {
              line = remainder
            } else {
              continue
            }
          }
        }

        // Verifica se é uma linha de totalizador/seção (ex: "Total de saídas - 12.038,46", "Total de entradas + 15.750,00")
        const sectionUpper = line.toUpperCase()
        if (sectionUpper.startsWith('TOTAL DE SAÍDAS') || sectionUpper.startsWith('TOTAL DE SAIDAS')) {
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

        // Verifica se a linha termina com um valor monetário (ex: "Transferência enviada pelo Pix 11,11" ou apenas "15.000,00")
        // Também pode ser "Pagamento de fatura 9.093,46"
        const endAmountMatch = line.match(/(.*?)\s+((?:R\$\s*)?[\+\-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*[\(\+\-\)]+)?)$/)
        const standaloneAmountMatch = line.match(/^(?:R\$\s*)?([\+\-]?\s*\d{1,3}(?:\.\d{3})*,\d{2}(?:\s*[\(\+\-\)]+)?)$/)

        if (standaloneAmountMatch) {
          // Linha só com valor (comum no Nubank quando a descrição ficou nas linhas anteriores)
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

          // Só trata como valor final se a descrição antes dele não for vazia e não for um número de agência/conta
          const val = parseAmount(valStr)
          if (val !== null && !isIgnoredDescription(beforeText)) {
            // Se já tínhamos texto pendente de linhas anteriores, junta
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

        // Linha de continuação de descrição (ex: nome do favorecido, agência/conta, etc.)
        if (currentDate) {
          pendingDescParts.push(line)
        }
      }

      commitPending()
    }

    // Validação final de resultados
    if (transactions.length === 0) {
      throw new BadRequestError(
        'Não reconhecemos movimentações bancárias com o formato esperado neste PDF. Verifique se o arquivo enviado é um extrato de conta corrente/pagamento com data, descrição e valores.',
      )
    }

    return e.json(200, {
      ok: true,
      bank: detectedBank,
      transactions,
      count: transactions.length,
    })
  },
  $apis.requireAuth(),
)
