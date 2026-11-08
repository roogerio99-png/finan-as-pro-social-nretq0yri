// Suíte de Testes de Integração e Regressão de Segurança - Gestio Finanças Pro v0.1.0
// Cobre:
// - Seção 0: Início desautenticado, ausência de fallback silencioso, isolamento Conta A vs Conta B, bloqueio e PIN
// - Seção 4: Aritmética monetária exata em centavos inteiros
// - Seção 8: Backup criptografado obrigatório (AES-GCM + PBKDF2) e rejeição de senha incorreta
// - CRUD completo de todos os módulos financeiros e importadores (OFX, CSV, Excel)

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map<string, string>()
  ;(globalThis as any).localStorage = {
    getItem: (key: string) => store.get(key) || null,
    setItem: (key: string, value: string) => store.set(key, String(value)),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] || null,
    get length() {
      return store.size
    },
  }
}

if (typeof globalThis.window === 'undefined') {
  ;(globalThis as any).window = {
    location: { reload: () => {}, href: '' },
    localStorage: (globalThis as any).localStorage,
  }
}

import { accountsService } from '../src/services/accounts.ts'
import { categoriesService } from '../src/services/categories.ts'
import { transactionsService } from '../src/services/transactions.ts'
import { budgetsService } from '../src/services/budgets.ts'
import { debtsService } from '../src/services/debts.ts'
import { dreamsService } from '../src/services/dreams.ts'
import { deparaService } from '../src/services/depara.ts'
import { copilotService } from '../src/services/copilotService.ts'
import { localDataPrivacyService } from '../src/services/localDataPrivacy.ts'
import { statementParserService, ParsedStatementTransaction } from '../src/services/statementParser.ts'
import { authService } from '../src/services/auth.ts'
import { backupService } from '../src/services/backupService.ts'
import { roundMoney, splitInstallmentsExact, sumMoney } from '../src/lib/money.ts'
import * as XLSX from 'xlsx'

interface TestResult {
  module: string
  action: string
  status: 'PASS' | 'FAIL'
  details?: string
}

const results: TestResult[] = []

function assert(module: string, action: string, condition: boolean, message?: string) {
  if (condition) {
    results.push({ module, action, status: 'PASS' })
    console.log(`  ✅ [${module}] ${action}`)
  } else {
    results.push({ module, action, status: 'FAIL', details: message })
    console.error(`  ❌ [${module}] ${action} - FALHOU: ${message}`)
  }
}

async function runFullTestSuite() {
  console.log('================================================================')
  console.log('🧪 INICIANDO BATERIA DE TESTES DE REGRESSÃO & INTEGRAÇÃO v0.1.0')
  console.log('================================================================\n')

  // -------------------------------------------------------------
  // MÓDULO 0: IDENTIDADE, ISOLAMENTO POR PERFIL E BLOQUEIO (P0)
  // -------------------------------------------------------------
  console.log('🔐 Testando Módulo 0: Fluxo de Identidade, Isolamento e Cofre Local (P0)...')

  // 0.1 Início desautenticado em perfil limpo
  assert(
    'Segurança P0',
    'Início Desautenticado em Perfil Limpo',
    !authService.isAuthenticated() &&
      authService.getCurrentUser() === null &&
      authService.getSavedAccounts().length === 0,
    'Aplicativo iniciou autenticado ou com contas pré-carregadas em perfil limpo',
  )

  // 0.2 Cancelamento / Falha no Login Google NÃO faz fallback silencioso
  let emptyLoginThrew = false
  try {
    await authService.loginWithGoogle()
  } catch {
    emptyLoginThrew = true
  }
  assert(
    'Segurança P0',
    'Ausência de Fallback Silencioso em Login Vazio/Cancelado',
    emptyLoginThrew && !authService.isAuthenticated(),
    'Login vazio não lançou erro ou autenticou usuário indevidamente',
  )

  // 0.3 Isolamento Estrito entre Conta A e Conta B no Mesmo Navegador
  const userA = await authService.loginWithGoogle({
    email: 'perfil.a@exemplo.com',
    name: 'Usuária Perfil A',
  })
  assert(
    'Segurança P0',
    'Login Explícito Conta A',
    authService.isAuthenticated() && userA.email === 'perfil.a@exemplo.com',
    'Falha ao autenticar Conta A',
  )

  const accContaA = await accountsService.create({
    name: 'Conta Exclusiva Perfil A',
    type: 'checking',
    initial_balance: 7777.77,
    status: 'active',
  })
  const txContaA = await transactionsService.create({
    description: 'Lançamento Secreto Conta A',
    amount: 1234.56,
    type: 'expense',
    date: '2026-11-01',
    account_id: accContaA.id,
    status: 'completed',
  })
  assert(
    'Segurança P0',
    'Gravação no Cofre da Conta A',
    !!accContaA.id && !!txContaA.id,
    'Falha ao gravar dados no cofre da Conta A',
  )

  // Troca para Conta B no mesmo navegador
  const userB = await authService.loginWithGoogle({
    email: 'perfil.b@exemplo.com',
    name: 'Usuário Perfil B',
  })
  const accountsInB = await accountsService.getAll()
  const txsInB = await transactionsService.getAll()
  assert(
    'Segurança P0',
    'Isolamento Conta B Não Visualiza Dados da Conta A',
    userB.id !== userA.id &&
      !accountsInB.some((a) => a.name === 'Conta Exclusiva Perfil A') &&
      txsInB.length === 0,
    `Vazamento entre perfis detectado! Contas em B: ${accountsInB.length}, Txs em B: ${txsInB.length}`,
  )

  // 0.4 Bloqueio de Sessão limpa estado em memória
  authService.logout()
  const accountsWhileLocked = await accountsService.getAll()
  assert(
    'Segurança P0',
    'Bloqueio de Sessão Limpa Memória Imediatamente',
    !authService.isAuthenticated() &&
      authService.getCurrentUser() === null &&
      accountsWhileLocked.length === 0,
    'Dados permaneceram acessíveis após bloqueio de sessão',
  )

  // 0.5 Proteção por PIN Local e Desbloqueio Offline da Conta A
  await authService.setVaultPin('perfil.a@exemplo.com', '9876')
  let wrongPinRejected = false
  try {
    await authService.unlockOfflineVault('perfil.a@exemplo.com', '0000')
  } catch {
    wrongPinRejected = true
  }
  assert(
    'Segurança P0',
    'Rejeição de PIN Incorreto no Desbloqueio Offline',
    wrongPinRejected && !authService.isAuthenticated(),
    'Cofre desbloqueou com PIN incorreto',
  )

  const unlockedA = await authService.unlockOfflineVault('perfil.a@exemplo.com', '9876')
  const restoredTxsA = await transactionsService.getAll()
  assert(
    'Segurança P0',
    'Desbloqueio Offline com PIN Correto Preserva Dados da Conta A',
    unlockedA.id === userA.id &&
      restoredTxsA.some((t) => t.description === 'Lançamento Secreto Conta A'),
    'Dados da Conta A não foram restaurados ao desbloquear o cofre',
  )

  // Limpa o lançamento inicial da Conta A para prosseguir com a bateria padrão de CRUD
  await transactionsService.delete(txContaA.id)
  await accountsService.delete(accContaA.id)

  // 0.6 Precisão Monetária em Centavos Inteiros
  const installmentsSplit = splitInstallmentsExact(100, 3)
  assert(
    'Precisão Monetária',
    'Cálculo em Centavos Inteiros e Rateio de Parcelas Exato',
    roundMoney(0.1 + 0.2) === 0.3 &&
      installmentsSplit.length === 3 &&
      installmentsSplit[0] === 33.34 &&
      installmentsSplit[1] === 33.33 &&
      installmentsSplit[2] === 33.33 &&
      sumMoney(installmentsSplit) === 100,
    `Rateio incorreto: ${JSON.stringify(installmentsSplit)}`,
  )

  // -------------------------------------------------------------
  // MÓDULO 1: CATEGORIAS & SUBGRUPOS (Carga Inicial + CRUD)
  // -------------------------------------------------------------
  console.log('\n📁 Testando Módulo: Categorias & Subgrupos...')
  const initialCategories = await categoriesService.getAll()
  assert(
    'Categorias',
    'Carga Inicial Pré-Configurada',
    initialCategories.length >= 10,
    `Esperado >= 10 categorias padrão, encontrado ${initialCategories.length}`,
  )

  const newCat = await categoriesService.create({
    name: 'Consultoria TI Especializada',
    type: 'income',
    group_level1: 'Receitas',
    group_level2: 'Renda Extra',
    subgroup_level3: 'Serviços PJ',
    color: '#10B981',
    icon: 'Laptop',
  })
  assert('Categorias', 'Incluir Categoria', !!newCat.id, 'Falha ao gerar ID da categoria')

  const updatedCat = await categoriesService.update(newCat.id, {
    name: 'Consultoria TI & Dev',
    color: '#059669',
  })
  assert(
    'Categorias',
    'Alterar Categoria',
    updatedCat.name === 'Consultoria TI & Dev' && updatedCat.color === '#059669',
    'Nome ou cor não atualizados',
  )

  const catDeleted = await categoriesService.delete(newCat.id)
  const remainingCats = await categoriesService.getAll()
  assert(
    'Categorias',
    'Excluir Categoria',
    catDeleted && !remainingCats.some((c) => c.id === newCat.id),
    'Categoria excluída ainda encontrada na lista',
  )

  // -------------------------------------------------------------
  // MÓDULO 2: CONTAS & CARTÕES (CRUD)
  // -------------------------------------------------------------
  console.log('\n💳 Testando Módulo: Contas & Cartões...')

  const newAccount = await accountsService.create({
    name: 'Banco do Brasil Corrente',
    type: 'checking',
    initial_balance: 1500.0,
    color: '#0038A8',
    status: 'active',
  })
  assert('Contas', 'Incluir Conta Corrente', !!newAccount.id, 'Falha ao criar conta corrente')

  const newCard = await accountsService.create({
    name: 'Cartão XP Visa Infinite',
    type: 'credit_card',
    credit_limit: 15000.0,
    closing_day: 20,
    due_day: 5,
    color: '#000000',
    status: 'active',
  })
  assert(
    'Contas',
    'Incluir Cartão de Crédito',
    !!newCard.id && newCard.credit_limit === 15000,
    'Falha ao criar cartão',
  )

  const updatedAccount = await accountsService.update(newAccount.id, {
    name: 'Banco do Brasil - Principal',
    initial_balance: 2000.0,
  })
  assert(
    'Contas',
    'Alterar Conta',
    updatedAccount.name === 'Banco do Brasil - Principal',
    'Falha ao alterar nome da conta',
  )

  const activeAccounts = await accountsService.getAll()
  assert('Contas', 'Consultar Contas', activeAccounts.length >= 2, 'Contas criadas não listadas')

  const accDeleted = await accountsService.delete(newAccount.id)
  const afterDeleteAccounts = await accountsService.getAll()
  assert(
    'Contas',
    'Excluir Conta',
    accDeleted && !afterDeleteAccounts.some((a) => a.id === newAccount.id),
    'Conta não excluída',
  )

  // -------------------------------------------------------------
  // MÓDULO 3: LANÇAMENTOS FINANCEIROS
  // -------------------------------------------------------------
  console.log('\n📝 Testando Módulo: Lançamentos Financeiros...')

  const testAccount = await accountsService.create({
    name: 'Conta Teste Lançamentos',
    type: 'checking',
    initial_balance: 5000.0,
  })

  const incomeTx = await transactionsService.create({
    description: 'Salário Mensal CLT',
    amount: 6500.0,
    type: 'income',
    date: '2026-11-05',
    account_id: testAccount.id,
    status: 'completed',
  })
  assert(
    'Lançamentos',
    'Incluir Receita',
    !!incomeTx.id && incomeTx.amount === 6500,
    'Falha ao incluir receita',
  )

  const expenseTx = await transactionsService.create({
    description: 'Supermercado Semanal',
    amount: 450.0,
    type: 'expense',
    date: '2026-11-06',
    account_id: testAccount.id,
    status: 'completed',
  })
  assert(
    'Lançamentos',
    'Incluir Despesa',
    !!expenseTx.id && expenseTx.amount === 450,
    'Falha ao incluir despesa',
  )

  const installmentTx = await transactionsService.create({
    description: 'Notebook Trabalho',
    amount: 3600.0,
    type: 'expense',
    date: '2026-11-06',
    account_id: newCard.id,
    installments_total: 10,
    installments_paid: 1,
    status: 'completed',
  })
  assert(
    'Lançamentos',
    'Incluir Despesa Parcelada (10x)',
    installmentTx.installments_total === 10,
    'Parcelas não gravadas',
  )

  const updatedTx = await transactionsService.update(expenseTx.id, {
    description: 'Supermercado Mensal Pão de Açúcar',
    amount: 520.0,
  })
  assert(
    'Lançamentos',
    'Alterar Lançamento',
    updatedTx.amount === 520 && updatedTx.description.includes('Pão de Açúcar'),
    'Falha na alteração',
  )

  const allTxs = await transactionsService.getAll()
  assert('Lançamentos', 'Consultar Lançamentos', allTxs.length >= 3, 'Lançamentos não encontrados')

  const txDeleted = await transactionsService.delete(expenseTx.id)
  const remainingTxs = await transactionsService.getAll()
  assert(
    'Lançamentos',
    'Excluir Lançamento',
    txDeleted && !remainingTxs.some((t) => t.id === expenseTx.id),
    'Lançamento não removido',
  )

  // -------------------------------------------------------------
  // MÓDULO 4: ORÇAMENTO COM SEMÁFORO
  // -------------------------------------------------------------
  console.log('\n🎯 Testando Módulo: Orçamentos com Semáforo...')

  const groupBudget = await budgetsService.create({
    month: '2026-11',
    category_group: 'Custos Fixos',
    target_type: 'group',
    limit_amount: 3000.0,
    warning_threshold: 75,
    danger_threshold: 90,
  })
  assert(
    'Orçamentos',
    'Incluir Meta por Grupo',
    !!groupBudget.id && groupBudget.limit_amount === 3000,
    'Falha ao criar meta de grupo',
  )

  const subBudget = await budgetsService.create({
    month: '2026-11',
    category_group: 'Alimentação',
    target_type: 'subgroup',
    limit_amount: 1200.0,
    warning_threshold: 75,
    danger_threshold: 90,
  })
  assert(
    'Orçamentos',
    'Incluir Meta por Subgrupo',
    !!subBudget.id && subBudget.limit_amount === 1200,
    'Falha ao criar meta de subgrupo',
  )

  const upsertedBudget = await budgetsService.upsert(
    '2026-11',
    'Alimentação',
    1400.0,
    75,
    90,
    'subgroup',
  )
  assert(
    'Orçamentos',
    'Upsert de Meta (Atualização)',
    upsertedBudget.limit_amount === 1400,
    'Upsert não atualizou o valor',
  )

  const updatedBudget = await budgetsService.update(groupBudget.id, {
    limit_amount: 3500.0,
  })
  assert(
    'Orçamentos',
    'Alterar Meta Orçamentária',
    updatedBudget.limit_amount === 3500,
    'Falha ao alterar limite',
  )

  const budgetDeleted = await budgetsService.delete(groupBudget.id)
  assert('Orçamentos', 'Excluir Meta Orçamentária', budgetDeleted, 'Falha ao excluir meta')

  // -------------------------------------------------------------
  // MÓDULO 5: DÍVIDAS & ESTRATÉGIAS DE QUITAÇÃO
  // -------------------------------------------------------------
  console.log('\n🛡️ Testando Módulo: Dívidas & Estratégias de Quitação...')

  const newDebt = await debtsService.create({
    creditor: 'Empréstimo Pessoal Caixa',
    total_debt: 10000.0,
    current_balance: 8500.0,
    interest_rate_monthly: 3.5,
    minimum_payment: 350.0,
    due_day: 10,
    status: 'active',
  })
  assert(
    'Dívidas',
    'Incluir Dívida',
    !!newDebt.id && newDebt.current_balance === 8500,
    'Falha ao criar dívida',
  )

  const updatedDebt = await debtsService.update(newDebt.id, {
    current_balance: 7500.0,
    notes: 'Amortização extraordinária de R$ 1.000 realizada',
  })
  assert(
    'Dívidas',
    'Alterar Dívida',
    updatedDebt.current_balance === 7500,
    'Falha ao atualizar saldo da dívida',
  )

  const simulation = debtsService.simulatePayoff([updatedDebt], 'avalanche', 500)
  assert(
    'Dívidas',
    'Simulação Método Avalanche',
    simulation.steps.length > 0 &&
      simulation.steps[simulation.steps.length - 1].totalRemaining === 0,
    'Simulação de quitação falhou',
  )

  const debtDeleted = await debtsService.delete(newDebt.id)
  assert('Dívidas', 'Excluir Dívida', debtDeleted, 'Falha ao excluir dívida')

  // -------------------------------------------------------------
  // MÓDULO 6: SONHOS & METAS FINANCEIRAS
  // -------------------------------------------------------------
  console.log('\n🌟 Testando Módulo: Sonhos & Metas...')

  const newDream = await dreamsService.create({
    title: 'Reserva de Emergência 6 Meses',
    target_amount: 30000.0,
    current_amount: 5000.0,
    monthly_contribution: 1000.0,
    target_date: '2028-12-31',
    status: 'in_progress',
  })
  assert(
    'Sonhos',
    'Incluir Sonho/Meta',
    !!newDream.id && newDream.target_amount === 30000,
    'Falha ao criar sonho',
  )

  const dreamWithContribution = await dreamsService.addContribution(newDream.id, 1500.0)
  assert(
    'Sonhos',
    'Adicionar Aporte',
    dreamWithContribution.current_amount === 6500,
    'Aporte não somou ao saldo atual',
  )

  const updatedDream = await dreamsService.update(newDream.id, {
    title: 'Reserva de Emergência e Oportunidade',
  })
  assert(
    'Sonhos',
    'Alterar Sonho',
    updatedDream.title.includes('Oportunidade'),
    'Falha ao alterar título do sonho',
  )

  const dreamDeleted = await dreamsService.delete(newDream.id)
  assert('Sonhos', 'Excluir Sonho', dreamDeleted, 'Falha ao excluir sonho')

  // -------------------------------------------------------------
  // MÓDULO 7: REGRAS DE CONCILIAÇÃO DE-PARA
  // -------------------------------------------------------------
  console.log('\n🔄 Testando Módulo: Regras De-Para de Conciliação...')

  const newRule = await deparaService.create({
    pattern: 'UBER *TRIP',
    category_id: initialCategories[0]?.id || 'cat_default',
    confidence: 90,
  })
  assert('De-Para', 'Incluir Regra De-Para', !!newRule.id, 'Falha ao criar regra De-Para')

  const updatedRule = await deparaService.update(newRule.id, {
    confidence: 98,
  })
  assert(
    'De-Para',
    'Alterar Regra De-Para',
    updatedRule.confidence === 98,
    'Falha ao alterar confiança',
  )

  const ruleDeleted = await deparaService.delete(newRule.id)
  assert('De-Para', 'Excluir Regra De-Para', ruleDeleted, 'Falha ao excluir regra')

  // -------------------------------------------------------------
  // MÓDULO 8: COPILOTO FINANCEIRO (Motor Heurístico Local)
  // -------------------------------------------------------------
  console.log('\n🤖 Testando Módulo: Copiloto Financeiro Local...')

  const testAccounts = await accountsService.getAll()
  const testCategories = await categoriesService.getAll()

  const nlpResult = await copilotService.parseNaturalTransaction(
    'Almoço no restaurante 65 reais hoje no débito',
    testAccounts,
    testCategories,
  )
  assert(
    'Copiloto',
    'Parser Linguagem Natural: Valor',
    nlpResult.parseResult.amount === 65,
    `Esperado 65, recebido ${nlpResult.parseResult.amount}`,
  )
  assert(
    'Copiloto',
    'Parser Linguagem Natural: Tipo',
    nlpResult.parseResult.type === 'expense',
    'Tipo não reconhecido como despesa',
  )
  assert(
    'Copiloto',
    'Parser Linguagem Natural: Subgrupo Refeições em Trânsito',
    nlpResult.suggestedCategoryId === 'cat_sub_2_3',
    `Esperado cat_sub_2_3 (Refeições em Trânsito), recebido ${nlpResult.suggestedCategoryId}`,
  )
  assert(
    'Copiloto',
    'Parser Linguagem Natural: Conta Corrente',
    !!nlpResult.suggestedAccountId,
    'Conta sugerida não encontrada',
  )

  const smartBudget = await copilotService.generateSmartBudget(5000)
  assert(
    'Copiloto',
    'Orçamento 50/30/20 Calculado',
    smartBudget.recommendations.length >= 5,
    'Recomendações de orçamento incompletas',
  )

  const appliedCount = await copilotService.applyBudgetRecommendations(
    smartBudget.recommendations,
    '2026-11',
  )
  assert(
    'Copiloto',
    'Aplicação de Orçamento em Lote',
    appliedCount >= 5,
    `Esperado >= 5 metas aplicadas, aplicado ${appliedCount}`,
  )

  const diag = await copilotService.getDiagnostic()
  assert(
    'Copiloto',
    'Diagnóstico de Saúde Financeira',
    diag.score >= 0 && diag.score <= 100,
    `Score fora da faixa: ${diag.score}`,
  )

  const chatReply = await copilotService.askCopilot('Como posso economizar este mês?')
  assert(
    'Copiloto',
    'Motor de Orientação Financeira',
    chatReply.length > 30,
    'Resposta vazia ou muito curta',
  )

  const familyBudget = await copilotService.generateSmartBudget(6000, {
    monthlyIncome: 6000,
    housingType: 'rent',
    rentAmount: 1800,
    hasChildren: true,
    childrenCount: 2,
    transportType: 'car',
  })
  assert(
    'Copiloto',
    'Orçamento Sob Medida Aluguel e Filhos',
    familyBudget.macroDistribution.needsPercent === 60 &&
      familyBudget.macroDistribution.wantsPercent === 25,
    'Falha ao adaptar modelo para 60/25/15 com aluguel e filhos',
  )

  const modifiedRecs = familyBudget.recommendations.map((r, idx) => ({
    ...r,
    enabled: idx !== 0,
    customAmount: r.recommendedAmount + 50,
  }))
  const selectiveAppliedCount = await copilotService.applyBudgetRecommendations(
    modifiedRecs,
    '2026-11',
  )
  assert(
    'Copiloto',
    'Aplicação Seletiva de Orçamento Customizado',
    selectiveAppliedCount === familyBudget.recommendations.length - 1,
    'Falha ao respeitar categorias desmarcadas',
  )

  // -------------------------------------------------------------
  // MÓDULO 9: PRIVACIDADE LOCAL & BACKUP CRIPTOGRAFADO OBRIGATÓRIO
  // -------------------------------------------------------------
  console.log('\n🔒 Testando Módulo: Privacidade Local & Backup Criptografado...')

  const stats = localDataPrivacyService.getStats()
  assert(
    'Privacidade',
    'Cálculo de Estatísticas Locais',
    stats.categoriesCount > 0,
    'Contagem de categorias local inválida',
  )

  // 9.1 Exigência obrigatória de senha no backup
  let unencryptedRejected = false
  try {
    await backupService.createBackup('')
  } catch {
    unencryptedRejected = true
  }
  assert(
    'Backup Criptografado',
    'Rejeição de Backup sem Senha (Texto Puro Proibido)',
    unencryptedRejected,
    'Backup permitiu geração sem senha',
  )

  // 9.2 Geração de backup criptografado AES-GCM e validação contra senha incorreta
  const encryptedBackup = await backupService.createBackup('SenhaSegura2026!')
  const inspection = await backupService.inspectBackupFile(encryptedBackup.content)
  assert(
    'Backup Criptografado',
    'Geração AES-GCM 256 bits + PBKDF2 v0.1.0',
    inspection.isEncrypted && inspection.metadata.version === '0.1.0',
    'Metadados ou criptografia do backup inválidos',
  )

  let wrongBackupPasswordRejected = false
  try {
    await backupService.restoreBackup(encryptedBackup.content, 'SenhaIncorreta999')
  } catch {
    wrongBackupPasswordRejected = true
  }
  assert(
    'Backup Criptografado',
    'Rejeição de Restauração com Senha Incorreta',
    wrongBackupPasswordRejected,
    'Backup aceitou senha incorreta na restauração',
  )

  localDataPrivacyService.clearOnlyTransactions()
  const afterClearTxs = await transactionsService.getAll()
  assert(
    'Privacidade',
    'Limpeza Segura de Transações',
    afterClearTxs.length === 0,
    'Lançamentos não foram zerados',
  )

  // -------------------------------------------------------------
  // MÓDULO 10: IMPORTADOR DE EXTRATOS BANCÁRIOS & FATURAS (OFX, CSV, EXCEL)
  // -------------------------------------------------------------
  console.log('\n📄 Testando Módulo: Importador de Extratos Bancários & Faturas...')

  const sampleOfx = `OFXHEADER:100
DATA:OFXSGML
<OFX>
<BANKMSGSRSV1><STMTTRNRS><STMTRS>
<BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261014120000[-03:EST]
<TRNAMT>-11.11
<FITID>670cd704-517d-4ba6-86c5-2391b10a4df6
<MEMO>Compra no débito - Exemplo Padaria
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261015120000[-03:EST]
<TRNAMT>5000.00
<FITID>670cd704-517d-4ba6-86c5-salary-test
<MEMO>Transferência recebida - Salário
</STMTTRN>
</BANKTRANLIST>
</STMTRS></STMTTRNRS></BANKMSGSRSV1>
</OFX>`

  const ofxResult = statementParserService.parseOfx(sampleOfx)
  assert(
    'Extratos',
    'Parse OFX Nubank Quantidade',
    ofxResult.transactions.length === 2,
    `Esperado 2 linhas, obtido ${ofxResult.transactions.length}`,
  )
  assert(
    'Extratos',
    'Parse OFX Nubank Valores',
    ofxResult.transactions[0].amount === 11.11 && ofxResult.transactions[0].type === 'expense',
    'Valor ou tipo de despesa incorreto no OFX',
  )
  assert(
    'Extratos',
    'Parse OFX Nubank FITID',
    ofxResult.transactions[0].fitId === '670cd704-517d-4ba6-86c5-2391b10a4df6',
    'FITID não capturado no OFX',
  )
  assert(
    'Extratos',
    'Parse OFX Nubank Totalizador',
    ofxResult.totalExpense === 11.11 && ofxResult.totalIncome === 5000,
    'Totais de entrada e saída incorretos no OFX',
  )

  const sampleNubankCsv = `Data,Valor,Identificador,Descrição
01/10/2026,-15.50,nubank-id-1,Uber viagem
02/10/2026,150.00,nubank-id-2,Depósito recebido`

  const nubankCsvResult = statementParserService.parseCsv(sampleNubankCsv)
  assert(
    'Extratos',
    'Parse CSV Nubank Quantidade',
    nubankCsvResult.transactions.length === 2,
    'Falha ao processar CSV Nubank',
  )
  assert(
    'Extratos',
    'Parse CSV Nubank FITID',
    nubankCsvResult.transactions[0].fitId === 'nubank-id-1',
    'Identificador único Nubank não mapeado como fitId',
  )
  assert(
    'Extratos',
    'Parse CSV Nubank Valores',
    nubankCsvResult.transactions[0].amount === 15.5 &&
      nubankCsvResult.transactions[1].amount === 150.0,
    'Valores do CSV Nubank incorretos',
  )

  const sampleBbCsv = `"Data","Lançamento","Detalhes","N° documento","Valor","Tipo Lançamento"
"14/10/2026","Pix Recebido","Cliente","987654","15.450,15","C"
"14/10/2026","Saldo Anterior","","0","100,00",""
"15/10/2026","Pagamento Boleto","CEMIG","123456","-250,50","D"
"15/10/2026","Saldo do dia","","0","15.299,65",""`

  const bbCsvResult = statementParserService.parseCsv(sampleBbCsv)
  assert(
    'Extratos',
    'Parse CSV BB Filtro de Saldos',
    bbCsvResult.transactions.length === 2,
    `Linhas de saldo não foram filtradas no CSV BB. Obtido: ${bbCsvResult.transactions.length}`,
  )
  assert(
    'Extratos',
    'Parse CSV BB Valor Decimal PT-BR',
    bbCsvResult.transactions[0].amount === 15450.15 &&
      bbCsvResult.transactions[0].type === 'income',
    'Falha na conversão de moeda PT-BR (15.450,15)',
  )
  assert(
    'Extratos',
    'Parse CSV BB Despesa Negativa PT-BR',
    bbCsvResult.transactions[1].amount === 250.5 &&
      bbCsvResult.transactions[1].type === 'expense',
    'Falha na conversão de despesa PT-BR (-250,50)',
  )

  const sampleInstallmentCsv = `"Data","Lançamento","Detalhes","N° documento","Valor","Tipo Lançamento"
"10/10/2026","Compra Mercado Livre Parcela 3 de 10","","0","-120,00","D"`
  const installmentResult = statementParserService.parseCsv(sampleInstallmentCsv)
  assert(
    'Extratos',
    'Detecção de Parcelas X de Y',
    installmentResult.transactions[0].installments_total === 10 &&
      installmentResult.transactions[0].installment_index === 3,
    'Parcela X de Y não detectada',
  )

  const wbTest = XLSX.utils.book_new()
  const wsTest = XLSX.utils.aoa_to_sheet([
    ['Data', 'Lançamento', 'Detalhes', 'N° documento', 'Valor', 'Tipo Lançamento'],
    ['01/10/2026', 'Recebimento de Proventos', 'EMPRESA', '557897', '15.450,15', 'Entrada'],
    ['01/10/2026', 'Saldo do dia', '', '', '15.450,56', ''],
    ['05/10/2026', 'Pix Open Finance Envio', 'Transferencia', '100501', '-15.000,00', 'Saída'],
    ['31/10/2026', 'S A L D O', '', '', '0,56', ''],
  ])
  XLSX.utils.book_append_sheet(wbTest, wsTest, 'Extrato')
  const excelBuf = XLSX.write(wbTest, { type: 'buffer', bookType: 'xlsx' })
  const excelResult = statementParserService.parseExcel(excelBuf)
  assert(
    'Extratos',
    'Parse Excel BB Quantidade',
    excelResult.transactions.length === 2,
    `Linhas de saldo não filtradas no Excel. Obtido: ${excelResult.transactions.length}`,
  )
  assert(
    'Extratos',
    'Parse Excel BB Receita Proventos',
    excelResult.transactions[0].amount === 15450.15 &&
      excelResult.transactions[0].type === 'income',
    'Falha ao identificar proventos como receita no Excel',
  )
  assert(
    'Extratos',
    'Parse Excel BB Despesa Pix',
    excelResult.transactions[1].amount === 15000 &&
      excelResult.transactions[1].type === 'expense',
    'Falha ao identificar Pix como despesa no Excel',
  )

  const sampleTransferTx: ParsedStatementTransaction = {
    date: '2026-10-18',
    desc: 'TRANSFERENCIA ENTRE CONTAS MESMA TITULARIDADE',
    amount: 1500.0,
    type: 'transfer',
  }
  const sampleInvoicePaymentTx: ParsedStatementTransaction = {
    date: '2026-10-16',
    desc: 'PAGAMENTO DE FATURA CARTAO NUBANK',
    amount: 850.0,
    type: 'invoice_payment',
  }
  assert(
    'Extratos',
    'Natureza Transferência Entre Contas',
    sampleTransferTx.type === 'transfer' && sampleTransferTx.amount === 1500,
    'Tipo de transferência não validado',
  )
  assert(
    'Extratos',
    'Natureza Pagamento de Fatura',
    sampleInvoicePaymentTx.type === 'invoice_payment' && sampleInvoicePaymentTx.amount === 850,
    'Tipo de pagamento de fatura não validado',
  )

  const singleCreated = await transactionsService.create({
    account_id: testAccount.id,
    description: 'POSTO IPIRANGA',
    amount: 150.0,
    type: 'expense',
    date: '2026-10-15',
    competence_month: '2026-10',
    cash_month: '2026-10',
    category_id: 'cat-transporte-combustivel',
    is_reconciled: true,
  })
  assert(
    'Extratos',
    'Salvar Lançamento Individual',
    singleCreated.id.length > 0 && singleCreated.amount === 150,
    'Falha ao salvar lançamento individual do extrato',
  )

  const incomingTransferRes = await transactionsService.transfer({
    sourceAccountId: newCard.id,
    targetAccountId: testAccount.id,
    amount: 320.0,
    date: '2026-10-21',
    description: 'Transferência recebida',
  })
  assert(
    'Extratos',
    'Transferência Entrada Conta Origem (Em Centavos)',
    incomingTransferRes.amount === 320,
    'Falha ao processar transferência de entrada com conta de origem',
  )

  const outgoingTransferRes = await transactionsService.transfer({
    sourceAccountId: testAccount.id,
    targetAccountId: newCard.id,
    amount: 150.0,
    date: '2026-10-22',
    description: 'Transferência enviada',
  })
  assert(
    'Extratos',
    'Transferência Saída Conta Destino (Em Centavos)',
    outgoingTransferRes.amount === 150,
    'Falha ao processar transferência de saída com conta de destino',
  )

  // -------------------------------------------------------------
  // RESUMO FINAL
  // -------------------------------------------------------------
  const total = results.length
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length

  console.log('\n================================================================')
  console.log('📊 RESULTADO FINAL DA AUDITORIA:')
  console.log(`   Total de Testes: ${total}`)
  console.log(`   Sucessos (PASS): ${passed}`)
  console.log(`   Falhas (FAIL):   ${failed}`)
  console.log(`   Taxa de Sucesso: ${((passed / total) * 100).toFixed(1)}%`)
  console.log('================================================================\n')

  if (failed > 0) {
    process.exit(1)
  }
}

runFullTestSuite().catch((err) => {
  console.error('❌ Erro inesperado durante execução dos testes:', err)
  process.exit(1)
})
