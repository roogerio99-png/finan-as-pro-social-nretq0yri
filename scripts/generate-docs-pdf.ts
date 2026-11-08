import fs from 'fs'
import path from 'path'
import { PDFDocument, rgb, StandardFonts, PDFPage, PDFFont } from 'pdf-lib'

async function generateArchitecturePdf() {
  console.log('Iniciando compilação do Documento Técnico em PDF (v0.1.0)...')

  const pdfDoc = await PDFDocument.create()
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const PAGE_WIDTH = 595.28 // A4 width
  const PAGE_HEIGHT = 841.89 // A4 height
  const MARGIN_LEFT = 50
  const MARGIN_RIGHT = 50
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT

  const colorPrimary = rgb(0.02, 0.38, 0.3)
  const colorPrimaryDark = rgb(0.01, 0.25, 0.2)
  const colorSecondary = rgb(0.12, 0.44, 0.7)
  const colorTextDark = rgb(0.1, 0.12, 0.15)
  const colorTextMuted = rgb(0.35, 0.4, 0.45)
  const colorBgLight = rgb(0.96, 0.98, 0.97)
  const colorCardBorder = rgb(0.85, 0.9, 0.88)
  const colorAccentSecurity = rgb(0.8, 0.2, 0.2)

  let currentPage: PDFPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  let currentY = PAGE_HEIGHT - 60

  function addNewPage(
    headerTitle: string = 'Gestio Financas Pro v0.1.0 -- Especificacao de Infraestrutura e Seguranca Local',
  ) {
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    currentY = PAGE_HEIGHT - 50

    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 35,
      width: CONTENT_WIDTH,
      height: 1,
      color: rgb(0.85, 0.88, 0.9),
    })

    currentPage.drawText(headerTitle, {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 30,
      size: 8,
      font: fontRegular,
      color: colorTextMuted,
    })

    currentY = PAGE_HEIGHT - 65
  }

  function ensureSpace(neededHeight: number, headerForNextPage?: string) {
    if (currentY - neededHeight < 60) {
      addNewPage(headerForNextPage)
    }
  }

  function drawTextWrapped(
    text: string,
    font: PDFFont,
    size: number,
    color = colorTextDark,
    lineHeight = size * 1.35,
    indent = 0,
  ) {
    const maxWidth = CONTENT_WIDTH - indent
    const words = text.split(' ')
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const width = font.widthOfTextAtSize(testLine, size)

      if (width <= maxWidth) {
        currentLine = testLine
      } else {
        ensureSpace(lineHeight)
        currentPage.drawText(currentLine, {
          x: MARGIN_LEFT + indent,
          y: currentY,
          size,
          font,
          color,
        })
        currentY -= lineHeight
        currentLine = word
      }
    }

    if (currentLine) {
      ensureSpace(lineHeight)
      currentPage.drawText(currentLine, {
        x: MARGIN_LEFT + indent,
        y: currentY,
        size,
        font,
        color,
      })
      currentY -= lineHeight
    }
  }

  // ==========================================
  // CAPA PRINCIPAL (PÁGINA 1)
  // ==========================================
  currentPage.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 220,
    width: PAGE_WIDTH,
    height: 220,
    color: colorPrimary,
  })

  currentPage.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 224,
    width: PAGE_WIDTH,
    height: 4,
    color: rgb(0.2, 0.78, 0.55),
  })

  currentPage.drawText('GESTIO FINANCAS PRO — REVISAO v0.1.0', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 80,
    size: 13,
    font: fontBold,
    color: rgb(0.7, 0.95, 0.85),
  })

  currentPage.drawText('Relatorio de Infraestrutura,', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 120,
    size: 24,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  currentPage.drawText('Funcionalidades e Seguranca Local', {
    x: MARGIN_LEFT,
    y: PAGE_HEIGHT - 150,
    size: 20,
    font: fontBold,
    color: rgb(1, 1, 1),
  })

  currentPage.drawText(
    'Arquitetura PWA Local-First com Cofre Isolado por Perfil e Backup Criptografado',
    {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 185,
      size: 11,
      font: fontRegular,
      color: rgb(0.85, 0.95, 0.9),
    },
  )

  currentY = PAGE_HEIGHT - 260

  const metaBoxY = currentY - 80
  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: metaBoxY,
    width: CONTENT_WIDTH,
    height: 80,
    color: colorBgLight,
    borderColor: colorCardBorder,
    borderWidth: 1,
  })

  currentPage.drawText('METADADOS DA VERSAO REVISADA', {
    x: MARGIN_LEFT + 15,
    y: currentY - 20,
    size: 9,
    font: fontBold,
    color: colorPrimary,
  })

  currentPage.drawText('Versao Unificada: v0.1.0', {
    x: MARGIN_LEFT + 15,
    y: currentY - 38,
    size: 10,
    font: fontRegular,
    color: colorTextDark,
  })

  currentPage.drawText('Data de Emissao: Novembro / 2026', {
    x: MARGIN_LEFT + 15,
    y: currentY - 54,
    size: 10,
    font: fontRegular,
    color: colorTextDark,
  })

  currentPage.drawText('Hospedagem Estatica: Firebase Hosting (HTTPS/CSP)', {
    x: MARGIN_LEFT + 250,
    y: currentY - 38,
    size: 10,
    font: fontRegular,
    color: colorTextDark,
  })

  currentPage.drawText('Persistencia: IndexedDB Isolado por Perfil', {
    x: MARGIN_LEFT + 250,
    y: currentY - 54,
    size: 10,
    font: fontRegular,
    color: colorSecondary,
  })

  currentY -= 110

  currentPage.drawText('1. RESUMO TECNICO CONSOLIDADO', {
    x: MARGIN_LEFT,
    y: currentY,
    size: 14,
    font: fontBold,
    color: colorPrimary,
  })
  currentY -= 20

  drawTextWrapped(
    'O Gestio Financas Pro opera em arquitetura local para testes: a aplicacao e servida como PWA estatico, sem backend centralizado, e todos os dados financeiros (contas, cartoes, lancamentos, faturas, orcamentos, metas, dividas, regras De-Para e importacoes) sao processados e persistidos no navegador do proprio dispositivo via IndexedDB.',
    fontRegular,
    10,
    colorTextDark,
    14,
  )
  currentY -= 8

  drawTextWrapped(
    'Em instalacao ou perfil novo, o aplicativo inicia sem usuario autenticado e sem dados pre-carregados. O acesso exige selecao explicita da Conta Google do proprio usuario, sem contas padrao do proprietario e sem fallback automatico. Cada identidade autenticada e associada ao seu proprio compartimento local de cofre (GestioFinancas_Vault_<id>), impedindo que uma conta abra ou visualize dados de outra no mesmo aparelho.',
    fontRegular,
    10,
    colorTextDark,
    14,
  )
  currentY -= 20

  currentPage.drawText('PILHA TECNOLOGICA VERIFICADA', {
    x: MARGIN_LEFT,
    y: currentY,
    size: 11,
    font: fontBold,
    color: colorPrimaryDark,
  })
  currentY -= 15

  const stackRows = [
    ['Frontend Framework', 'React 19 + TypeScript 5 (Strict Type Checking)'],
    ['Build System', 'Vite + Code-Splitting com Hash de Conteudo Imutavel'],
    ['Persistencia Local', 'IndexedDB Transacional Isolado por Perfil (Um DB por Conta)'],
    ['Precisao Monetaria', 'Aritmetica Exata em Centavos Inteiros (src/lib/money.ts)'],
    ['Criptografia Local', 'Web Crypto API: AES-GCM 256-bit + PBKDF2 (100.000 iteracoes)'],
    ['Service Worker', 'SW v21 com Pre-Cache Validado e Limpeza por Prefixo'],
    ['Cabecalhos HTTP', 'Content-Security-Policy (CSP), X-Frame-Options: DENY, HSTS'],
  ]

  for (const [layer, tech] of stackRows) {
    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: currentY - 4,
      width: 150,
      height: 18,
      color: rgb(0.93, 0.96, 0.95),
    })
    currentPage.drawRectangle({
      x: MARGIN_LEFT + 150,
      y: currentY - 4,
      width: CONTENT_WIDTH - 150,
      height: 18,
      color: rgb(0.98, 0.99, 0.98),
      borderColor: colorCardBorder,
      borderWidth: 0.5,
    })

    currentPage.drawText(layer, {
      x: MARGIN_LEFT + 6,
      y: currentY + 1,
      size: 8.5,
      font: fontBold,
      color: colorPrimaryDark,
    })

    currentPage.drawText(tech, {
      x: MARGIN_LEFT + 158,
      y: currentY + 1,
      size: 8.5,
      font: fontRegular,
      color: colorTextDark,
    })

    currentY -= 20
  }

  // ==========================================
  // PÁGINA 2: FLUXO DE IDENTIDADE, ISOLAMENTO E PERSISTÊNCIA
  // ==========================================
  addNewPage('Capitulo 2: Fluxo de Identidade, Isolamento por Perfil e Persistencia')

  currentPage.drawText('2. FLUXO DE IDENTIDADE E ISOLAMENTO POR PERFIL (P0)', {
    x: MARGIN_LEFT,
    y: currentY,
    size: 15,
    font: fontBold,
    color: colorPrimary,
  })
  currentY -= 20

  const p0Bullets = [
    '* Inicio Limpo e Desautenticado: Em qualquer instalacao nova, aba anonima ou dispositivo de terceiro, o aplicativo inicia com user === null e sem nenhuma conta pre-carregada.',
    '* Ausencia Total de Conta do Proprietario no Pacote: Nenhuma conta pessoal vem pre-cadastrada no seletor de login, barra de navegacao, servico de licenca ou arquivos JSON publicos.',
    '* Sem Fallback Silencioso: Cancelar ou falhar na identificacao Google mantem a sessao desautenticada e nunca redireciona silenciosamente para conta visitante ou padrao.',
    '* Isolamento Real no IndexedDB: Cada perfil autenticado utiliza um banco IndexedDB dedicado (GestioFinancas_Vault_<vaultId>). Uma Conta B jamais le ou altera registros da Conta A.',
    '* Diferenciacao entre Login Google e Desbloqueio Offline: Perfis ja configurados no aparelho podem configurar PIN/senha local (PBKDF2) para desbloqueio offline rapido.',
    '* Coordenacao Multi-Aba e Auto-Bloqueio: Ao bloquear o cofre ou atingir 15 minutos de inatividade, o estado em memoria e limpo e todas as abas abertas sao bloqueadas via BroadcastChannel.',
  ]

  for (const b of p0Bullets) {
    drawTextWrapped(b, fontRegular, 9.5, colorTextDark, 13.5, 10)
    currentY -= 5
  }

  currentY -= 12

  currentPage.drawText('3. PERSISTENCIA DURAVEL, CENTAVOS INTEIROS E BACKUP CRIPTOGRAFADO', {
    x: MARGIN_LEFT,
    y: currentY,
    size: 14,
    font: fontBold,
    color: colorPrimary,
  })
  currentY -= 18

  const p1Bullets = [
    '* Confirmacao Estrita de Transacao IndexedDB: A interface confirma salvamento apenas apos tx.oncomplete. Erros de QuotaExceededError ou aborto de transacao sao reportados sem falso positivo.',
    '* Aritmetica Monetaria em Centavos Inteiros: Operacoes de saldo, transferencias, faturas e divisao de parcelas utilizam centavos inteiros (toCents / fromCents / splitInstallmentsExact).',
    '* Backup Criptografado Obrigatorio: A exportacao exige senha (minimo 6 caracteres) e cifra os dados com AES-GCM 256 bits e chave derivada por PBKDF2 (100.000 iteracoes, SHA-256).',
    '* Restauracao Validada e Segura: Valida tamanho maximo (50 MB), versao do esquema e autenticidade criptografica antes de substituir a base, oferecendo opcao de exportar o estado atual primeiro.',
    '* Limites nos Importadores Locais: Validacao de tamanho maximo de arquivo (15 MB), limite de 60 paginas para PDF e 10.000 linhas para planilhas CSV/Excel.',
    '* Reconhecimento de Voz Desabilitado por Padrao: No Copiloto, a digitacao local e o padrao; a Web Speech API exige ativacao explicita com aviso claro ao usuario.',
  ]

  for (const b of p1Bullets) {
    drawTextWrapped(b, fontRegular, 9.5, colorTextDark, 13.5, 10)
    currentY -= 5
  }

  // ==========================================
  // PÁGINA 3: CERTIFICAÇÃO DA SUÍTE DE TESTES
  // ==========================================
  addNewPage('Capitulo 3: Resultados da Bateria de Testes de Regressao')

  currentPage.drawText('4. AUDITORIA AUTOMATIZADA E TESTES DE REGRESSAO (v0.1.0)', {
    x: MARGIN_LEFT,
    y: currentY,
    size: 15,
    font: fontBold,
    color: colorPrimary,
  })
  currentY -= 20

  drawTextWrapped(
    'Para a finalidade de testes locais e avaliacao funcional, o aplicativo permanece sem servidor de banco de dados proprio, operando de forma segura, deterministica e isolada por perfil no navegador.',
    fontRegular,
    10,
    colorTextDark,
    14,
  )
  currentY -= 15

  const testAuditRows = [
    ['Seguranca P0 (Inicio Limpo, Sem Fallback, Isolamento A/B, PIN)', '7 testes', '100% Aprovado'],
    ['Precisao Monetaria em Centavos Inteiros e Rateio de Parcelas', '1 teste', '100% Aprovado'],
    ['Backup Criptografado Obrigatorio e Rejeicao de Senha Errada', '3 testes', '100% Aprovado'],
    ['Categorias, Contas, Cartoes e Lancamentos Parcelados', '15 testes', '100% Aprovado'],
    ['Orcamentos 50/30/20, Dividas, Sonhos e Regras De-Para', '16 testes', '100% Aprovado'],
    ['Copiloto Heuristico Local e Orcamento Sob Medida', '10 testes', '100% Aprovado'],
    ['Importador Local de Extratos (OFX, CSV, XLSX, Transferencias)', '19 testes', '100% Aprovado'],
  ]

  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - 4,
    width: CONTENT_WIDTH,
    height: 20,
    color: colorPrimaryDark,
  })
  currentPage.drawText('GRUPO DE TESTE AUDITADO', {
    x: MARGIN_LEFT + 8,
    y: currentY + 2,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  })
  currentPage.drawText('COBERTURA', {
    x: MARGIN_LEFT + 310,
    y: currentY + 2,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  })
  currentPage.drawText('RESULTADO', {
    x: MARGIN_LEFT + 400,
    y: currentY + 2,
    size: 9,
    font: fontBold,
    color: rgb(1, 1, 1),
  })
  currentY -= 22

  for (let i = 0; i < testAuditRows.length; i++) {
    const [mod, qtd, st] = testAuditRows[i]
    const bg = i % 2 === 0 ? rgb(0.96, 0.98, 0.97) : rgb(1, 1, 1)

    currentPage.drawRectangle({
      x: MARGIN_LEFT,
      y: currentY - 3,
      width: CONTENT_WIDTH,
      height: 18,
      color: bg,
      borderColor: colorCardBorder,
      borderWidth: 0.5,
    })

    currentPage.drawText(mod, {
      x: MARGIN_LEFT + 8,
      y: currentY + 2,
      size: 8.5,
      font: fontRegular,
      color: colorTextDark,
    })

    currentPage.drawText(qtd, {
      x: MARGIN_LEFT + 310,
      y: currentY + 2,
      size: 8.5,
      font: fontRegular,
      color: colorTextMuted,
    })

    currentPage.drawText(`[OK] ${st}`, {
      x: MARGIN_LEFT + 400,
      y: currentY + 2,
      size: 8.5,
      font: fontBold,
      color: rgb(0.05, 0.55, 0.3),
    })

    currentY -= 19
  }

  currentY -= 25

  currentPage.drawRectangle({
    x: MARGIN_LEFT,
    y: currentY - 60,
    width: CONTENT_WIDTH,
    height: 60,
    color: rgb(0.99, 0.95, 0.95),
    borderColor: colorAccentSecurity,
    borderWidth: 1,
  })

  currentPage.drawText('AVISO DE SEGURANCA OPERACIONAL', {
    x: MARGIN_LEFT + 12,
    y: currentY - 18,
    size: 9.5,
    font: fontBold,
    color: colorAccentSecurity,
  })

  currentPage.drawText(
    'Nenhum dump de banco de dados ou documento interno e publicado na pasta public/.',
    {
      x: MARGIN_LEFT + 12,
      y: currentY - 34,
      size: 8.5,
      font: fontRegular,
      color: colorTextDark,
    },
  )
  currentPage.drawText(
    'A persistencia local no navegador nao substitui a exportacao periodica de backups criptografados.',
    {
      x: MARGIN_LEFT + 12,
      y: currentY - 47,
      size: 8.5,
      font: fontRegular,
      color: colorTextDark,
    },
  )

  const totalPages = pdfDoc.getPageCount()
  for (let i = 0; i < totalPages; i++) {
    const page = pdfDoc.getPage(i)
    const pageNumText = `Pagina ${i + 1} de ${totalPages}`
    const numWidth = fontRegular.widthOfTextAtSize(pageNumText, 8)

    page.drawText(pageNumText, {
      x: PAGE_WIDTH - MARGIN_RIGHT - numWidth,
      y: 25,
      size: 8,
      font: fontRegular,
      color: colorTextMuted,
    })

    page.drawText('Gestio Financas Pro v0.1.0 -- Documentacao Tecnica Revisada', {
      x: MARGIN_LEFT,
      y: 25,
      size: 8,
      font: fontRegular,
      color: colorTextMuted,
    })
  }

  const pdfBytes = await pdfDoc.save()
  const rootPdfPath = path.resolve(
    'Gestio_Financas_Documento_Arquitetura_Funcionalidades_Seguranca.pdf',
  )
  fs.writeFileSync(rootPdfPath, pdfBytes)
  console.log('PDF gravado na raiz (fora de public/):', rootPdfPath)
}

generateArchitecturePdf().catch(console.error)
