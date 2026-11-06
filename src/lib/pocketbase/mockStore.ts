// In-memory and localStorage persistence mock for PocketBase
// Enables full offline and standalone execution in AI Studio

export interface MockRecord {
  id: string
  created: string
  updated: string
  [key: string]: any
}

const STORAGE_PREFIX = 'gestio_financas_pb_'

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return defaultValue
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

// Initial seed generators
function createInitialData() {
  const now = new Date()
  const nowIso = now.toISOString()
  const currentYearMonth = nowIso.slice(0, 7)

  const defaultUser: MockRecord = {
    id: 'usr_rogerio',
    email: 'roogerio99@gmail.com',
    name: 'Rogério Coimbra',
    verified: true,
    created: nowIso,
    updated: nowIso,
  }

  const defaultFamily: MockRecord = {
    id: 'fam_silva',
    name: 'Família Coimbra',
    created_by: defaultUser.id,
    members: [defaultUser.id],
    created: nowIso,
    updated: nowIso,
  }

  // Carga inicial: somente categorias e subgrupos vêm pré-cadastrados
  const seededAccounts: MockRecord[] = []

  const seededCategories: MockRecord[] = [
    {
      id: 'cat_salario',
      user_id: defaultUser.id,
      name: 'Salário Principal',
      type: 'income',
      group_level1: 'Receitas',
      group_level2: 'Renda Ativa',
      subgroup_level3: 'Salário CLT',
      icon: 'Briefcase',
      color: '#16A34A',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_dividendos',
      user_id: defaultUser.id,
      name: 'Rendimentos e Dividendos',
      type: 'income',
      group_level1: 'Receitas',
      group_level2: 'Renda Passiva',
      subgroup_level3: 'Investimentos',
      icon: 'TrendingUp',
      color: '#059669',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_freela',
      user_id: defaultUser.id,
      name: 'Freela & Extras',
      type: 'income',
      group_level1: 'Receitas',
      group_level2: 'Renda Extra',
      subgroup_level3: 'Serviços',
      icon: 'PlusCircle',
      color: '#10B981',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_aluguel',
      user_id: defaultUser.id,
      name: 'Aluguel & Condomínio',
      type: 'expense',
      group_level1: 'Custos Fixos',
      group_level2: 'Habitação',
      subgroup_level3: 'Moradia',
      icon: 'Home',
      color: '#2563EB',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_energia',
      user_id: defaultUser.id,
      name: 'Energia, Água & Gás',
      type: 'expense',
      group_level1: 'Custos Fixos',
      group_level2: 'Habitação',
      subgroup_level3: 'Utilidades',
      icon: 'Zap',
      color: '#3B82F6',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_mercado',
      user_id: defaultUser.id,
      name: 'Supermercado Mensal',
      type: 'expense',
      group_level1: 'Custos Fixos',
      group_level2: 'Alimentação',
      subgroup_level3: 'Feira e Mercado',
      icon: 'ShoppingCart',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_saude',
      user_id: defaultUser.id,
      name: 'Plano de Saúde',
      type: 'expense',
      group_level1: 'Custos Fixos',
      group_level2: 'Saúde',
      subgroup_level3: 'Convênio',
      icon: 'HeartPulse',
      color: '#0EA5E9',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_telecom',
      user_id: defaultUser.id,
      name: 'Internet e Celular',
      type: 'expense',
      group_level1: 'Custos Fixos',
      group_level2: 'Comunicação',
      subgroup_level3: 'Telecom',
      icon: 'Wifi',
      color: '#06B6D4',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_restaurantes',
      user_id: defaultUser.id,
      name: 'Restaurantes e Delivery',
      type: 'expense',
      group_level1: 'Estilo de Vida',
      group_level2: 'Lazer & Alimentação',
      subgroup_level3: 'Ifood & Jantares',
      icon: 'Utensils',
      color: '#F59E0B',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_streaming',
      user_id: defaultUser.id,
      name: 'Streaming & Assinaturas',
      type: 'expense',
      group_level1: 'Estilo de Vida',
      group_level2: 'Lazer',
      subgroup_level3: 'Netflix/Spotify',
      icon: 'Tv',
      color: '#D97706',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_transporte',
      user_id: defaultUser.id,
      name: 'Combustível e Uber',
      type: 'expense',
      group_level1: 'Estilo de Vida',
      group_level2: 'Transporte',
      subgroup_level3: 'Locomoção',
      icon: 'Car',
      color: '#B45309',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_vestuario',
      user_id: defaultUser.id,
      name: 'Vestuário e Compras',
      type: 'expense',
      group_level1: 'Estilo de Vida',
      group_level2: 'Pessoal',
      subgroup_level3: 'Roupas',
      icon: 'ShoppingBag',
      color: '#EA580C',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_reserva_sonho',
      user_id: defaultUser.id,
      name: 'Aporte Reserva de Emergência',
      type: 'expense',
      group_level1: 'Investimentos e Sonhos',
      group_level2: 'Segurança',
      subgroup_level3: 'Tesouro Selic',
      icon: 'ShieldCheck',
      color: '#8B5CF6',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_viagem_sonho',
      user_id: defaultUser.id,
      name: 'Aporte Viagem de Férias',
      type: 'expense',
      group_level1: 'Investimentos e Sonhos',
      group_level2: 'Metas',
      subgroup_level3: 'Eurotrip 2026',
      icon: 'Plane',
      color: '#7C3AED',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_divida_parcela',
      user_id: defaultUser.id,
      name: 'Parcela Renegociação Empréstimo',
      type: 'expense',
      group_level1: 'Dívidas',
      group_level2: 'Bancário',
      subgroup_level3: 'Empréstimo Pessoal',
      icon: 'CreditCard',
      color: '#DC2626',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
  ]

  const seededTransactions: MockRecord[] = []

  const seededBudgets: MockRecord[] = []
  const seededDebts: MockRecord[] = []
  const seededDreams: MockRecord[] = []
  const seededDeparaRules: MockRecord[] = []

  return {
    users: [defaultUser],
    families: [defaultFamily],
    accounts: seededAccounts,
    categories: seededCategories,
    transactions: seededTransactions,
    budgets: seededBudgets,
    debts: seededDebts,
    dreams: seededDreams,
    depara_rules: seededDeparaRules,
    invoices: [] as MockRecord[],
    payments: [] as MockRecord[],
  }
}

class MockAuthStore {
  isValid = true
  token = 'mock_jwt_token_gestio_financas'
  record: MockRecord | null = null
  private listeners: (() => void)[] = []

  constructor(initialUser: MockRecord | null) {
    this.record = initialUser
    this.isValid = !!initialUser
  }

  save(token: string, record: MockRecord) {
    if (record && (record.email === 'roogerio99@gmail.com' || record.name === 'Rogério Silva')) {
      record.name = 'Rogério Coimbra'
    }
    this.token = token
    this.record = record
    this.isValid = true
    this.notify()
  }

  clear() {
    this.token = ''
    this.record = null
    this.isValid = false
    this.notify()
  }

  onChange(callback: () => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notify() {
    for (const cb of this.listeners) {
      try {
        cb()
      } catch (err) {
        console.warn('AuthStore listener error:', err)
      }
    }
  }
}

export class MockPocketBase {
  baseUrl = ''
  authStore: MockAuthStore
  private collections: Record<string, MockRecord[]> = {}
  private subscriptions: Record<string, ((event: any) => void)[]> = {}

  constructor() {
    const initial = createInitialData()
    for (const [col, defaultRecords] of Object.entries(initial)) {
      this.collections[col] = getStored(col, defaultRecords)
    }

    // Auto-migração para sincronizar o nome correto de Rogério Coimbra
    if (this.collections.users) {
      let usersMigrated = false
      for (const u of this.collections.users) {
        if (u.email === 'roogerio99@gmail.com' || u.name === 'Rogério Silva') {
          u.name = 'Rogério Coimbra'
          usersMigrated = true
        }
      }
      if (usersMigrated) {
        this.persist('users')
      }
    }

    if (this.collections.families) {
      let famMigrated = false
      for (const f of this.collections.families) {
        if (f.name === 'Família Silva') {
          f.name = 'Família Coimbra'
          famMigrated = true
        }
      }
      if (famMigrated) {
        this.persist('families')
      }
    }

    const defaultUser = this.collections.users?.[0] || null
    if (
      defaultUser &&
      (defaultUser.email === 'roogerio99@gmail.com' || defaultUser.name === 'Rogério Silva')
    ) {
      defaultUser.name = 'Rogério Coimbra'
    }
    this.authStore = new MockAuthStore(defaultUser)

    // Limpeza da base de lançamentos de teste para permitir ingresso com dados reais
    const PURGE_TX_KEY = 'pocketbase_mock_transactions_cleared_for_real_data_v2'
    if (typeof window !== 'undefined' && !localStorage.getItem(PURGE_TX_KEY)) {
      this.clearAllTransactions()
      localStorage.setItem(PURGE_TX_KEY, 'true')
    }
  }

  clearAllTransactions() {
    this.collections.transactions = []
    this.collections.invoices = []
    this.collections.payments = []
    this.persist('transactions')
    this.persist('invoices')
    this.persist('payments')
    if (this.collections.accounts) {
      for (const a of this.collections.accounts) {
        a.current_balance = a.initial_balance ?? 0
      }
      this.persist('accounts')
    }
    this.emit('transactions', 'delete', { id: '*', created: '', updated: '' })
  }

  autoCancellation(_flag: boolean) {
    // no-op
  }

  private persist(col: string) {
    setStored(col, this.collections[col] || [])
  }

  private emit(col: string, action: 'create' | 'update' | 'delete', record: MockRecord) {
    const subs = this.subscriptions[col] || []
    const wildSubs = this.subscriptions['*'] || []
    const event = { action, record }
    for (const fn of [...subs, ...wildSubs]) {
      try {
        fn(event)
      } catch (e) {
        console.warn('Realtime event error:', e)
      }
    }
  }

  collection<T = MockRecord>(name: string) {
    if (!this.collections[name]) {
      this.collections[name] = getStored(name, [])
    }

    return {
      getFullList: async <R = T>(options?: {
        filter?: string
        sort?: string
        expand?: string
      }): Promise<R[]> => {
        let items = [...(this.collections[name] || [])]
        items = this.applyFilter(name, items, options?.filter)
        items = this.applySort(items, options?.sort)
        if (options?.expand) {
          items = items.map((item) => this.expandRecord(name, item, options.expand!))
        }
        return items as unknown as R[]
      },

      getList: async <R = T>(
        page: number = 1,
        perPage: number = 30,
        options?: {
          filter?: string
          sort?: string
          expand?: string
        },
      ): Promise<{
        items: R[]
        page: number
        perPage: number
        totalItems: number
        totalPages: number
      }> => {
        let items = [...(this.collections[name] || [])]
        items = this.applyFilter(name, items, options?.filter)
        items = this.applySort(items, options?.sort)
        const totalItems = items.length
        const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
        const start = (page - 1) * perPage
        const paginated = items.slice(start, start + perPage)
        const expanded = options?.expand
          ? paginated.map((item) => this.expandRecord(name, item, options.expand!))
          : paginated

        return {
          items: expanded as unknown as R[],
          page,
          perPage,
          totalItems,
          totalPages,
        }
      },

      getOne: async <R = T>(id: string, options?: { expand?: string }): Promise<R> => {
        const found = this.collections[name]?.find((r) => r.id === id)
        if (!found) {
          throw new Error(`Record with id '${id}' not found in collection '${name}'.`)
        }
        const item = options?.expand ? this.expandRecord(name, found, options.expand) : found
        return item as unknown as R
      },

      getFirstListItem: async <R = T>(
        filter: string,
        options?: { expand?: string },
      ): Promise<R> => {
        let items = [...(this.collections[name] || [])]
        items = this.applyFilter(name, items, filter)
        if (items.length === 0) {
          throw new Error(`No record found matching filter '${filter}' in collection '${name}'.`)
        }
        const found = items[0]
        const item = options?.expand ? this.expandRecord(name, found, options.expand) : found
        return item as unknown as R
      },

      create: async <R = T>(data: any, options?: { expand?: string }): Promise<R> => {
        const id = data.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const nowIso = new Date().toISOString()
        const newRecord: MockRecord = {
          ...data,
          id,
          created: nowIso,
          updated: nowIso,
        }
        this.collections[name].unshift(newRecord)
        this.persist(name)
        this.emit(name, 'create', newRecord)
        const item = options?.expand
          ? this.expandRecord(name, newRecord, options.expand)
          : newRecord
        return item as unknown as R
      },

      update: async <R = T>(id: string, data: any, options?: { expand?: string }): Promise<R> => {
        const index = this.collections[name].findIndex((r) => r.id === id)
        if (index === -1) {
          throw new Error(`Record '${id}' not found to update in '${name}'.`)
        }
        const updated = {
          ...this.collections[name][index],
          ...data,
          id,
          updated: new Date().toISOString(),
        }
        this.collections[name][index] = updated
        this.persist(name)
        this.emit(name, 'update', updated)
        const item = options?.expand ? this.expandRecord(name, updated, options.expand) : updated
        return item as unknown as R
      },

      delete: async (id: string): Promise<boolean> => {
        const rec = this.collections[name].find((r) => r.id === id)
        this.collections[name] = this.collections[name].filter((r) => r.id !== id)
        this.persist(name)
        if (rec) this.emit(name, 'delete', rec)
        return true
      },

      authWithPassword: async (email: string, _password: string) => {
        let user = this.collections.users?.find((u) => u.email === email)
        if (!user) {
          user = {
            id: 'usr_' + Date.now(),
            email,
            name: email === 'roogerio99@gmail.com' ? 'Rogério Coimbra' : email.split('@')[0],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          }
          this.collections.users.push(user)
          this.persist('users')
        } else if (user.email === 'roogerio99@gmail.com' || user.name === 'Rogério Silva') {
          user.name = 'Rogério Coimbra'
          this.persist('users')
        }
        this.authStore.save('mock_jwt_' + user.id, user)
        return { token: this.authStore.token, record: user }
      },

      requestPasswordReset: async (_email: string) => {
        return true
      },

      subscribe: async (topic: string, callback: (event: any) => void) => {
        const key = topic === '*' ? name : `${name}/${topic}`
        if (!this.subscriptions[key]) {
          this.subscriptions[key] = []
        }
        this.subscriptions[key].push(callback)
        return async () => {
          this.subscriptions[key] = this.subscriptions[key].filter((fn) => fn !== callback)
        }
      },

      unsubscribe: async (topic?: string) => {
        const key = !topic || topic === '*' ? name : `${name}/${topic}`
        delete this.subscriptions[key]
      },
    }
  }

  async send<T = any>(path: string, options?: { method?: string; body?: any }): Promise<T> {
    const method = (options?.method || 'GET').toUpperCase()
    const body = options?.body || {}

    // POST /backend/v1/transfers
    if (path === '/backend/v1/transfers' && method === 'POST') {
      const { source_account_id, target_account_id, amount, date, description, notes } = body
      const accounts = this.collections.accounts || []
      const srcAcc = accounts.find((a) => a.id === source_account_id)
      const tgtAcc = accounts.find((a) => a.id === target_account_id)

      if (srcAcc) {
        srcAcc.current_balance = (srcAcc.current_balance ?? srcAcc.initial_balance ?? 0) - amount
      }
      if (tgtAcc) {
        tgtAcc.current_balance = (tgtAcc.current_balance ?? tgtAcc.initial_balance ?? 0) + amount
      }
      this.persist('accounts')

      const txRecord = await this.collection('transactions').create({
        user_id: this.authStore.record?.id,
        account_id: source_account_id,
        transfer_account_id: target_account_id,
        amount,
        type: 'transfer',
        date: date || new Date().toISOString().slice(0, 10),
        competence_month: (date || new Date().toISOString()).slice(0, 7),
        cash_month: (date || new Date().toISOString()).slice(0, 7),
        description: description || 'Transferência entre contas',
        notes,
      })

      return { id: txRecord.id, amount } as unknown as T
    }

    // POST /backend/v1/invoices
    if (path === '/backend/v1/invoices' && method === 'POST') {
      const { card_account_id, reference_month } = body
      const card = this.collections.accounts?.find((a) => a.id === card_account_id)
      const transactions = this.collections.transactions || []
      const cardTxs = transactions.filter(
        (t) =>
          t.account_id === card_account_id &&
          t.type === 'expense' &&
          t.cash_month === reference_month,
      )
      const totalAmount = cardTxs.reduce((sum, t) => sum + (t.amount || 0), 0)

      let existing = this.collections.invoices?.find(
        (inv) => inv.card_account_id === card_account_id && inv.reference_month === reference_month,
      )

      if (existing) {
        existing.total_amount = totalAmount
        existing.items_count = cardTxs.length
        existing.updated = new Date().toISOString()
        this.persist('invoices')
        return this.expandRecord(
          'invoices',
          existing,
          'card_account_id,payment_account_id',
        ) as unknown as T
      } else {
        const created = await this.collection('invoices').create({
          user_id: this.authStore.record?.id,
          card_account_id,
          reference_month,
          total_amount: totalAmount,
          items_count: cardTxs.length,
          status: 'open',
          due_date: `${reference_month}-${String(card?.due_day || 10).padStart(2, '0')}`,
        })
        return this.expandRecord(
          'invoices',
          created,
          'card_account_id,payment_account_id',
        ) as unknown as T
      }
    }

    // POST /backend/v1/invoice-movements
    if (path === '/backend/v1/invoice-movements' && method === 'POST') {
      const { invoice_id, payment_account_id, paid_date, amount, notes } = body
      const invoice = this.collections.invoices?.find((i) => i.id === invoice_id)
      const paymentAcc = this.collections.accounts?.find((a) => a.id === payment_account_id)

      const payAmount = amount || invoice?.total_amount || 0

      if (paymentAcc) {
        paymentAcc.current_balance =
          (paymentAcc.current_balance ?? paymentAcc.initial_balance ?? 0) - payAmount
        this.persist('accounts')
      }

      if (invoice) {
        invoice.status = 'paid'
        invoice.paid_date = paid_date
        invoice.payment_account_id = payment_account_id
        this.persist('invoices')
      }

      const txRecord = await this.collection('transactions').create({
        user_id: this.authStore.record?.id,
        account_id: payment_account_id,
        invoice_id,
        amount: payAmount,
        type: 'invoice_payment',
        date: paid_date,
        competence_month: paid_date.slice(0, 7),
        cash_month: paid_date.slice(0, 7),
        description: `Pagamento Fatura ${invoice?.reference_month || ''}`,
        notes,
      })

      return {
        movement_id: txRecord.id,
        invoice_id,
        amount: payAmount,
      } as unknown as T
    }

    // DELETE /backend/v1/invoice-movements/:movementId
    if (path.startsWith('/backend/v1/invoice-movements/') && method === 'DELETE') {
      const movementId = path.split('/').pop()
      const tx = this.collections.transactions?.find((t) => t.id === movementId)
      if (tx) {
        if (tx.invoice_id) {
          const inv = this.collections.invoices?.find((i) => i.id === tx.invoice_id)
          if (inv) {
            inv.status = 'open'
            delete inv.paid_date
            delete inv.payment_account_id
            this.persist('invoices')
          }
        }
        if (tx.account_id) {
          const acc = this.collections.accounts?.find((a) => a.id === tx.account_id)
          if (acc) {
            acc.current_balance = (acc.current_balance ?? acc.initial_balance ?? 0) + tx.amount
            this.persist('accounts')
          }
        }
        await this.collection('transactions').delete(tx.id)
      }
      return { ok: true } as unknown as T
    }

    // POST /backend/v1/invoice-payments
    if (path === '/backend/v1/invoice-payments' && method === 'POST') {
      const {
        source_transaction_id,
        installment_index,
        amount,
        cash_month,
        paid_date,
        payment_account_id,
        card_account_id,
        notes,
      } = body

      const payAcc = this.collections.accounts?.find((a) => a.id === payment_account_id)
      if (payAcc) {
        payAcc.current_balance = (payAcc.current_balance ?? payAcc.initial_balance ?? 0) - amount
        this.persist('accounts')
      }

      const tx = this.collections.transactions?.find((t) => t.id === source_transaction_id)
      if (tx) {
        tx.installments_paid = (tx.installments_paid || 0) + 1
        this.persist('transactions')
      }

      const payment = await this.collection('payments').create({
        user_id: this.authStore.record?.id,
        source_transaction_id,
        installment_index,
        amount,
        cash_month,
        paid_date,
        payment_account_id,
        card_account_id,
        notes,
      })

      return payment as unknown as T
    }

    // DELETE /backend/v1/invoice-payments/:id
    if (path.startsWith('/backend/v1/invoice-payments/') && method === 'DELETE') {
      const paymentId = path.split('/').pop()
      const pmt = this.collections.payments?.find((p) => p.id === paymentId)
      if (pmt) {
        if (pmt.payment_account_id) {
          const acc = this.collections.accounts?.find((a) => a.id === pmt.payment_account_id)
          if (acc) {
            acc.current_balance = (acc.current_balance ?? acc.initial_balance ?? 0) + pmt.amount
            this.persist('accounts')
          }
        }
        if (pmt.source_transaction_id) {
          const tx = this.collections.transactions?.find((t) => t.id === pmt.source_transaction_id)
          if (tx && (tx.installments_paid || 0) > 0) {
            tx.installments_paid = Math.max(0, (tx.installments_paid || 1) - 1)
            this.persist('transactions')
          }
        }
        await this.collection('payments').delete(paymentId!)
      }
      return { ok: true } as unknown as T
    }

    // POST /backend/v1/invoice-item-exclude
    if (path === '/backend/v1/invoice-item-exclude' && method === 'POST') {
      const { invoice_id, transaction_id, installment_index, notes } = body
      const invoice = this.collections.invoices?.find((i) => i.id === invoice_id)
      const tx = this.collections.transactions?.find((t) => t.id === transaction_id)
      const refMonth = invoice?.reference_month || ''
      const [yy, mm] = (refMonth || '2026-11').split('-').map(Number)
      const t = yy * 12 + (mm - 1) + 1
      const deferMonth = `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`

      if (!this.collections.invoice_adjustments) {
        this.collections.invoice_adjustments = []
      }
      const adj = {
        id: 'adj_' + Date.now(),
        user_id: this.authStore.record?.id,
        family_id: invoice?.family_id,
        transaction_id,
        installment_index: installment_index || 0,
        action: 'exclude',
        amount: tx?.amount || 0,
        invoice_month: refMonth,
        defer_month: deferMonth,
        invoice_id,
        notes,
        resolved: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      this.collections.invoice_adjustments.push(adj)
      this.persist('invoice_adjustments')

      return {
        invoice_id,
        reference_month: refMonth,
        total_amount: invoice?.total_amount || 0,
        items_count: 0,
        items: [],
        deferred_month: deferMonth,
      } as unknown as T
    }

    // POST /backend/v1/invoice-item-value
    if (path === '/backend/v1/invoice-item-value' && method === 'POST') {
      const { invoice_id, transaction_id, installment_index, value, notes } = body
      const invoice = this.collections.invoices?.find((i) => i.id === invoice_id)
      const refMonth = invoice?.reference_month || ''

      if (!this.collections.invoice_adjustments) {
        this.collections.invoice_adjustments = []
      }
      const adj = {
        id: 'adj_' + Date.now(),
        user_id: this.authStore.record?.id,
        family_id: invoice?.family_id,
        transaction_id,
        installment_index: installment_index || 0,
        action: 'set_value',
        amount: Number(value) || 0,
        invoice_month: refMonth,
        invoice_id,
        notes,
        resolved: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      this.collections.invoice_adjustments.push(adj)
      this.persist('invoice_adjustments')

      if (invoice) {
        invoice.total_amount = Number(value) || 0
        this.persist('invoices')
      }

      return {
        invoice_id,
        reference_month: refMonth,
        total_amount: Number(value) || 0,
        items_count: 1,
        items: [],
      } as unknown as T
    }

    // GET /backend/v1/invoice-adjustments?invoice_id=...
    if (path.startsWith('/backend/v1/invoice-adjustments')) {
      return (this.collections.invoice_adjustments || []) as unknown as T
    }

    // Skip connectors API
    if (path.startsWith('/api/skip/connectors')) {
      return [] as unknown as T
    }

    return {} as unknown as T
  }

  private applyFilter(col: string, items: MockRecord[], filterStr?: string): MockRecord[] {
    if (!filterStr || !filterStr.trim()) return items

    // Parse simple filter expressions like "field = 'value'", "a = '1' && b = '2'", "a = '1' || b = '2'"
    return items.filter((record) => {
      return this.evaluateExpression(record, filterStr.trim())
    })
  }

  private evaluateExpression(record: MockRecord, expr: string): boolean {
    // Strip wrapping parentheses
    if (expr.startsWith('(') && expr.endsWith(')')) {
      expr = expr.slice(1, -1).trim()
    }

    // Handle OR expressions
    if (expr.includes(' || ')) {
      const parts = expr.split(' || ')
      return parts.some((p) => this.evaluateExpression(record, p.trim()))
    }

    // Handle AND expressions
    if (expr.includes(' && ')) {
      const parts = expr.split(' && ')
      return parts.every((p) => this.evaluateExpression(record, p.trim()))
    }

    // Simple comparison: key = 'val' or key != 'val'
    const equalMatch = expr.match(/^([\w.]+)\s*=\s*['"]?([^'"]*)['"]?$/)
    if (equalMatch) {
      const [, key, val] = equalMatch
      return String(record[key] ?? '') === val
    }

    const notEqualMatch = expr.match(/^([\w.]+)\s*!=\s*['"]?([^'"]*)['"]?$/)
    if (notEqualMatch) {
      const [, key, val] = notEqualMatch
      return String(record[key] ?? '') !== val
    }

    return true
  }

  private applySort(items: MockRecord[], sortStr?: string): MockRecord[] {
    if (!sortStr || !sortStr.trim()) return items
    const criteria = sortStr.split(',').map((s) => s.trim())

    return [...items].sort((a, b) => {
      for (const crit of criteria) {
        const desc = crit.startsWith('-')
        const field = desc ? crit.slice(1) : crit
        const valA = a[field] ?? ''
        const valB = b[field] ?? ''
        if (valA < valB) return desc ? 1 : -1
        if (valA > valB) return desc ? -1 : 1
      }
      return 0
    })
  }

  private expandRecord(col: string, record: MockRecord, expandStr: string): MockRecord {
    const expanded = { ...record, expand: { ...(record.expand || {}) } }
    const relations = expandStr.split(',').map((s) => s.trim())

    for (const rel of relations) {
      if (rel === 'category_id' && record.category_id) {
        expanded.expand.category_id = this.collections.categories?.find(
          (c) => c.id === record.category_id,
        )
      } else if (rel === 'account_id' && record.account_id) {
        expanded.expand.account_id = this.collections.accounts?.find(
          (a) => a.id === record.account_id,
        )
      } else if (rel === 'card_account_id' && record.card_account_id) {
        expanded.expand.card_account_id = this.collections.accounts?.find(
          (a) => a.id === record.card_account_id,
        )
      } else if (rel === 'payment_account_id' && record.payment_account_id) {
        expanded.expand.payment_account_id = this.collections.accounts?.find(
          (a) => a.id === record.payment_account_id,
        )
      } else if (rel === 'source_transaction_id' && record.source_transaction_id) {
        expanded.expand.source_transaction_id = this.collections.transactions?.find(
          (t) => t.id === record.source_transaction_id,
        )
      }
    }

    return expanded
  }
}
