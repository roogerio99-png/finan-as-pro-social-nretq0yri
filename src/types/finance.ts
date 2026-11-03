export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'cash'
export type TransactionType = 'income' | 'expense' | 'transfer'
export type DebtStatus = 'active' | 'renegotiating' | 'paid'
export type DreamStatus = 'in_progress' | 'achieved' | 'paused'

export interface UserRecord {
  id: string
  email: string
  name: string
  avatar?: string
  family_role?: string
  created: string
  updated: string
}

export interface FamilyRecord {
  id: string
  name: string
  created_by: string
  members: string[]
  created: string
  updated: string
}

export interface AccountRecord {
  id: string
  user_id: string
  family_id?: string
  name: string
  type: AccountType
  initial_balance: number
  current_balance?: number
  credit_limit?: number
  closing_day?: number
  due_day?: number
  color?: string
  status?: 'active' | 'archived'
  created: string
  updated: string
}

export interface CategoryRecord {
  id: string
  user_id?: string
  name: string
  type: 'income' | 'expense'
  group_level1: string // Ex: Custos Fixos, Estilo de Vida, Investimentos e Sonhos, Dívidas, Receitas
  group_level2: string // Ex: Habitação, Alimentação, Lazer...
  subgroup_level3?: string
  icon?: string
  color?: string
  status?: 'active' | 'inactive'
  created: string
  updated: string
}

export interface TransactionRecord {
  id: string
  user_id: string
  family_id?: string
  account_id: string
  category_id?: string
  description: string
  amount: number
  type: TransactionType
  date: string // YYYY-MM-DD
  competence_month: string // YYYY-MM
  cash_month: string // YYYY-MM
  is_reconciled?: boolean
  import_batch_id?: string
  notes?: string
  created: string
  updated: string
  // Expansões
  expand?: {
    account_id?: AccountRecord
    category_id?: CategoryRecord
    user_id?: UserRecord
  }
}

export interface BudgetRecord {
  id: string
  user_id: string
  month: string // YYYY-MM
  category_group: string
  limit_amount: number
  warning_threshold?: number // padrão 75
  danger_threshold?: number // padrão 90
  created: string
  updated: string
}

export interface DebtRecord {
  id: string
  user_id: string
  creditor: string
  total_debt: number
  current_balance: number
  interest_rate_monthly: number
  minimum_payment: number
  due_day?: number
  status: DebtStatus
  notes?: string
  created: string
  updated: string
}

export interface DreamRecord {
  id: string
  user_id: string
  title: string
  target_amount: number
  current_amount: number
  target_date: string
  monthly_contribution?: number
  icon?: string
  category?: string
  status: DreamStatus
  created: string
  updated: string
}

export interface DeparaRuleRecord {
  id: string
  user_id: string
  pattern: string
  category_id: string
  confidence?: number
  created: string
  updated: string
  expand?: {
    category_id?: CategoryRecord
  }
}

export interface StatementImportLine {
  id: string
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  suggested_category_id?: string
  selected_category_id?: string
  competence_month: string
  cash_month: string
  is_duplicate: boolean
  duplicate_reason?: string
  status: 'pending' | 'ready' | 'dismissed'
}
