// Suíte de Testes de Integração e Validação de Funcionalidades
// Testa linha a linha: Incluir, Alterar, Consultar e Excluir em todos os módulos

// 1. Polyfill de ambiente browser para execução headless em Node
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

// 2. Importação dos Serviços do Gestio Finanças
import { accountsService } from '../src/services/accounts.ts'
import { categoriesService } from '../src/services/categories.ts'
import { transactionsService } from '../src/services/transactions.ts'
import { budgetsService } from '../src/services/budgets.ts'
import { debtsService } from '../src/services/debts.ts'
import { dreamsService } from '../src/services/dreams.ts'
import { deparaService } from '../src/services/depara.ts'
import { invoicesService } from '../src/services/invoices.ts'
import { copilotService } from '../src/services/copilotService.ts'
import { localDataPrivacyService } from '../src/services/localDataPrivacy.ts'

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
    console.log(`  ✅ [${module}] ${action}`);
  } else {
    results.push({ module, action, status: 'FAIL', details: message })
    console.error(`  ❌ [${module}] ${action} - FALHOU: ${message}`);
  }
}

async function runFullTestSuite() {
  console.log('================================================================');
  console.log('🧪 INICIANDO BATERIA DE TESTES DE INTEGRAÇÃO - GESTIO FINANÇAS');
  console.log('================================================================\n');

  // -------------------------------------------------------------
  // MÓDULO 1: CATEGORIAS & SUBGRUPOS (Carga Inicial + CRUD)
  // -------------------------------------------------------------
  console.log('📁 Testando Módulo: Categorias & Subgrupos...');
  const initialCategories = await categoriesService.getAll()
  assert(
    'Categorias',
    'Carga Inicial Pré-Configurada',
    initialCategories.length >= 10,
    `Esperado >= 10 categorias padrão, encontrado ${initialCategories.length}`,
  )

  // 1.1 Incluir Categoria
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

  // 1.2 Alterar Categoria
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

  // 1.3 Excluir Categoria
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
  console.log('\n💳 Testando Módulo: Contas & Cartões...');

  // 2.1 Incluir Conta Corrente
  const newAccount = await accountsService.create({
    name: 'Banco do Brasil Corrente',
    type: 'checking',
    initial_balance: 1500.0,
    color: '#0038A8',
    status: 'active',
  })
  assert('Contas', 'Incluir Conta Corrente', !!newAccount.id, 'Falha ao criar conta corrente')

  // 2.2 Incluir Cartão de Crédito
  const newCard = await accountsService.create({
    name: 'Cartão XP Visa Infinite',
    type: 'credit_card',
    credit_limit: 15000.0,
    closing_day: 20,
    due_day: 5,
    color: '#000000',
    status: 'active',
  })
  assert('Contas', 'Incluir Cartão de Crédito', !!newCard.id && newCard.credit_limit === 15000, 'Falha ao criar cartão')

  // 2.3 Alterar Conta
  const updatedAccount = await accountsService.update(newAccount.id, {
    name: 'Banco do Brasil - Principal',
    initial_balance: 2000.0,
  })
  assert('Contas', 'Alterar Conta', updatedAccount.name === 'Banco do Brasil - Principal', 'Falha ao alterar nome da conta')

  // 2.4 Consultar Contas Ativas
  const activeAccounts = await accountsService.getAll()
  assert('Contas', 'Consultar Contas', activeAccounts.length >= 2, 'Contas criadas não listadas')

  // 2.5 Excluir Conta
  const accDeleted = await accountsService.delete(newAccount.id)
  const afterDeleteAccounts = await accountsService.getAll()
  assert('Contas', 'Excluir Conta', accDeleted && !afterDeleteAccounts.some((a) => a.id === newAccount.id), 'Conta não excluída')

  // -------------------------------------------------------------
  // MÓDULO 3: LANÇAMENTOS FINANCEIROS (Receita, Despesa, Parcela, Transf.)
  // -------------------------------------------------------------
  console.log('\n📝 Testando Módulo: Lançamentos Financeiros...');

  // Re-cria uma conta para vincular lançamentos
  const testAccount = await accountsService.create({
    name: 'Conta Teste Lançamentos',
    type: 'checking',
    initial_balance: 5000.0,
  })

  // 3.1 Incluir Receita
  const incomeTx = await transactionsService.create({
    description: 'Salário Mensal CLT',
    amount: 6500.0,
    type: 'income',
    date: '2026-11-05',
    account_id: testAccount.id,
    status: 'completed',
  })
  assert('Lançamentos', 'Incluir Receita', !!incomeTx.id && incomeTx.amount === 6500, 'Falha ao incluir receita')

  // 3.2 Incluir Despesa à Vista
  const expenseTx = await transactionsService.create({
    description: 'Supermercado Semanal',
    amount: 450.0,
    type: 'expense',
    date: '2026-11-06',
    account_id: testAccount.id,
    status: 'completed',
  })
  assert('Lançamentos', 'Incluir Despesa', !!expenseTx.id && expenseTx.amount === 450, 'Falha ao incluir despesa')

  // 3.3 Incluir Compra Parcelada no Cartão
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
  assert('Lançamentos', 'Incluir Despesa Parcelada (10x)', installmentTx.installments_total === 10, 'Parcelas não gravadas')

  // 3.4 Alterar Lançamento
  const updatedTx = await transactionsService.update(expenseTx.id, {
    description: 'Supermercado Mensal Pão de Açúcar',
    amount: 520.0,
  })
  assert('Lançamentos', 'Alterar Lançamento', updatedTx.amount === 520 && updatedTx.description.includes('Pão de Açúcar'), 'Falha na alteração')

  // 3.5 Consultar Lista de Lançamentos
  const allTxs = await transactionsService.getAll()
  assert('Lançamentos', 'Consultar Lançamentos', allTxs.length >= 3, 'Lançamentos não encontrados')

  // 3.6 Excluir Lançamento
  const txDeleted = await transactionsService.delete(expenseTx.id)
  const remainingTxs = await transactionsService.getAll()
  assert('Lançamentos', 'Excluir Lançamento', txDeleted && !remainingTxs.some((t) => t.id === expenseTx.id), 'Lançamento não removido')

  // -------------------------------------------------------------
  // MÓDULO 4: ORÇAMENTO COM SEMÁFORO (CRUD + Cálculos)
  // -------------------------------------------------------------
  console.log('\n🎯 Testando Módulo: Orçamentos com Semáforo...');

  // 4.1 Incluir Meta de Grupo
  const groupBudget = await budgetsService.create({
    month: '2026-11',
    category_group: 'Custos Fixos',
    target_type: 'group',
    limit_amount: 3000.0,
    warning_threshold: 75,
    danger_threshold: 90,
  })
  assert('Orçamentos', 'Incluir Meta por Grupo', !!groupBudget.id && groupBudget.limit_amount === 3000, 'Falha ao criar meta de grupo')

  // 4.2 Incluir Meta por Subgrupo
  const subBudget = await budgetsService.create({
    month: '2026-11',
    category_group: 'Alimentação',
    target_type: 'subgroup',
    limit_amount: 1200.0,
    warning_threshold: 75,
    danger_threshold: 90,
  })
  assert('Orçamentos', 'Incluir Meta por Subgrupo', !!subBudget.id && subBudget.limit_amount === 1200, 'Falha ao criar meta de subgrupo')

  // 4.3 Teste de Upsert Inteligente
  const upsertedBudget = await budgetsService.upsert('2026-11', 'Alimentação', 1400.0, 75, 90, 'subgroup')
  assert('Orçamentos', 'Upsert de Meta (Atualização)', upsertedBudget.limit_amount === 1400, 'Upsert não atualizou o valor')

  // 4.4 Alterar Meta
  const updatedBudget = await budgetsService.update(groupBudget.id, {
    limit_amount: 3500.0,
  })
  assert('Orçamentos', 'Alterar Meta Orçamentária', updatedBudget.limit_amount === 3500, 'Falha ao alterar limite')

  // 4.5 Excluir Meta
  const budgetDeleted = await budgetsService.delete(groupBudget.id)
  assert('Orçamentos', 'Excluir Meta Orçamentária', budgetDeleted, 'Falha ao excluir meta')

  // -------------------------------------------------------------
  // MÓDULO 5: DÍVIDAS & ESTRATÉGIAS DE QUITAÇÃO (CRUD + Simulações)
  // -------------------------------------------------------------
  console.log('\n🛡️ Testando Módulo: Dívidas & Estratégias de Quitação...');

  // 5.1 Incluir Dívida
  const newDebt = await debtsService.create({
    creditor: 'Empréstimo Pessoal Caixa',
    total_debt: 10000.0,
    current_balance: 8500.0,
    interest_rate_monthly: 3.5,
    minimum_payment: 350.0,
    due_day: 10,
    status: 'active',
  })
  assert('Dívidas', 'Incluir Dívida', !!newDebt.id && newDebt.current_balance === 8500, 'Falha ao criar dívida')

  // 5.2 Alterar Dívida
  const updatedDebt = await debtsService.update(newDebt.id, {
    current_balance: 7500.0,
    notes: 'Amortização extraordinária de R$ 1.000 realizada',
  })
  assert('Dívidas', 'Alterar Dívida', updatedDebt.current_balance === 7500, 'Falha ao atualizar saldo da dívida')

  // 5.3 Simulação de Quitação (Avalanche)
  const simulation = debtsService.simulatePayoff([updatedDebt], 'avalanche', 500)
  assert(
    'Dívidas',
    'Simulação Método Avalanche',
    simulation.steps.length > 0 && simulation.steps[simulation.steps.length - 1].totalRemaining === 0,
    'Simulação de quitação falhou',
  )

  // 5.4 Excluir Dívida
  const debtDeleted = await debtsService.delete(newDebt.id)
  assert('Dívidas', 'Excluir Dívida', debtDeleted, 'Falha ao excluir dívida')

  // -------------------------------------------------------------
  // MÓDULO 6: SONHOS & METAS FINANCEIRAS (CRUD + Aporte)
  // -------------------------------------------------------------
  console.log('\n🌟 Testando Módulo: Sonhos & Metas...');

  // 6.1 Incluir Sonho
  const newDream = await dreamsService.create({
    title: 'Reserva de Emergência 6 Meses',
    target_amount: 30000.0,
    current_amount: 5000.0,
    monthly_contribution: 1000.0,
    target_date: '2028-12-31',
    status: 'in_progress',
  })
  assert('Sonhos', 'Incluir Sonho/Meta', !!newDream.id && newDream.target_amount === 30000, 'Falha ao criar sonho')

  // 6.2 Adicionar Aporte
  const dreamWithContribution = await dreamsService.addContribution(newDream.id, 1500.0)
  assert('Sonhos', 'Adicionar Aporte', dreamWithContribution.current_amount === 6500, 'Aporte não somou ao saldo atual')

  // 6.3 Alterar Sonho
  const updatedDream = await dreamsService.update(newDream.id, {
    title: 'Reserva de Emergência e Oportunidade',
  })
  assert('Sonhos', 'Alterar Sonho', updatedDream.title.includes('Oportunidade'), 'Falha ao alterar título do sonho')

  // 6.4 Excluir Sonho
  const dreamDeleted = await dreamsService.delete(newDream.id)
  assert('Sonhos', 'Excluir Sonho', dreamDeleted, 'Falha ao excluir sonho')

  // -------------------------------------------------------------
  // MÓDULO 7: REGRAS DE CONCILIAÇÃO DE-PARA (CRUD)
  // -------------------------------------------------------------
  console.log('\n🔄 Testando Módulo: Regras De-Para de Conciliação...');

  // 7.1 Incluir Regra De-Para
  const newRule = await deparaService.create({
    pattern: 'UBER *TRIP',
    category_id: initialCategories[0]?.id || 'cat_default',
    confidence: 90,
  })
  assert('De-Para', 'Incluir Regra De-Para', !!newRule.id, 'Falha ao criar regra De-Para')

  // 7.2 Alterar Regra De-Para
  const updatedRule = await deparaService.update(newRule.id, {
    confidence: 98,
  })
  assert('De-Para', 'Alterar Regra De-Para', updatedRule.confidence === 98, 'Falha ao alterar confiança')

  // 7.3 Excluir Regra De-Para
  const ruleDeleted = await deparaService.delete(newRule.id)
  assert('De-Para', 'Excluir Regra De-Para', ruleDeleted, 'Falha ao excluir regra')

  // -------------------------------------------------------------
  // MÓDULO 8: COPILOTO FINANCEIRO IA (NLP, 50/30/20, Diagnóstico)
  // -------------------------------------------------------------
  console.log('\n🤖 Testando Módulo: Copiloto Financeiro IA...');

  // 8.1 Parser de Linguagem Natural
  const testAccounts = await accountsService.getAll()
  const testCategories = await categoriesService.getAll()

  const nlpResult = await copilotService.parseNaturalTransaction(
    'Almoço no restaurante 65 reais hoje no débito',
    testAccounts,
    testCategories,
  )
  assert('Copiloto IA', 'Parser Linguagem Natural: Valor', nlpResult.parseResult.amount === 65, `Esperado 65, recebido ${nlpResult.parseResult.amount}`)
  assert('Copiloto IA', 'Parser Linguagem Natural: Tipo', nlpResult.parseResult.type === 'expense', 'Tipo não reconhecido como despesa')

  // 8.2 Proposta de Orçamento 50/30/20
  const smartBudget = await copilotService.generateSmartBudget(5000)
  assert('Copiloto IA', 'Orçamento 50/30/20 Calculado', smartBudget.recommendations.length >= 5, 'Recomendações de orçamento incompletas')

  // 8.3 Aplicação de Orçamento em Lote
  const appliedCount = await copilotService.applyBudgetRecommendations(smartBudget.recommendations, '2026-11')
  assert('Copiloto IA', 'Aplicação de Orçamento em Lote', appliedCount >= 5, `Esperado >= 5 metas aplicadas, aplicado ${appliedCount}`)

  // 8.4 Diagnóstico de Saúde Financeira
  const diag = await copilotService.getDiagnostic()
  assert('Copiloto IA', 'Diagnóstico de Saúde Financeira', diag.score >= 0 && diag.score <= 100, `Score fora da faixa: ${diag.score}`)

  // 8.5 Chat com o Copiloto
  const chatReply = await copilotService.askCopilot('Como posso economizar este mês?')
  assert('Copiloto IA', 'Chatbot Conversacional', chatReply.length > 30, 'Resposta do chatbot vazia ou muito curta')

  // -------------------------------------------------------------
  // MÓDULO 9: PRIVACIDADE LOCAL & BACKUP
  // -------------------------------------------------------------
  console.log('\n🔒 Testando Módulo: Privacidade Local & Backup...');

  const stats = localDataPrivacyService.getStats()
  assert('Privacidade', 'Cálculo de Estatísticas Locais', stats.categoriesCount > 0, 'Contagem de categorias local inválida')

  // Limpeza de transações de teste
  localDataPrivacyService.clearOnlyTransactions()
  const afterClearTxs = await transactionsService.getAll()
  assert('Privacidade', 'Limpeza Segura de Transações', afterClearTxs.length === 0, 'Lançamentos não foram zerados')

  // -------------------------------------------------------------
  // RESUMO FINAL
  // -------------------------------------------------------------
  const total = results.length
  const passed = results.filter((r) => r.status === 'PASS').length
  const failed = results.filter((r) => r.status === 'FAIL').length

  console.log('\n================================================================');
  console.log(`📊 RESULTADO FINAL DA AUDITORIA:`);
  console.log(`   Total de Testes: ${total}`);
  console.log(`   Sucessos (PASS): ${passed}`);
  console.log(`   Falhas (FAIL):   ${failed}`);
  console.log(`   Taxa de Sucesso: ${((passed / total) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runFullTestSuite().catch((err) => {
  console.error('❌ Erro inesperado durante execução dos testes:', err);
  process.exit(1);
});
