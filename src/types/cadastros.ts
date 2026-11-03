// Tipos e rótulos do módulo Cadastros (usuários, contas/cartões, plano de contas)
import type { AccountType } from '@/types/finance'

export type FamilyRole = 'admin' | 'member'

export const familyRoleLabels: Record<FamilyRole, string> = {
  admin: 'Responsável',
  member: 'Membro',
}

export const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Conta Corrente',
  savings: 'Poupança',
  credit_card: 'Cartão de Crédito',
  investment: 'Investimento',
  cash: 'Espécie',
}

export const expenseGroupSuggestions = [
  'Custos Fixos / Essenciais',
  'Estilo de Vida / Variáveis',
  'Investimentos e Sonhos',
  'Dívidas e Empréstimos',
]

export const subgroupSuggestions = [
  'Moradia',
  'Alimentação',
  'Saúde',
  'Educação',
  'Transporte',
  'Lazer',
  'Utilidades',
  'Comunicação',
]

export interface AccountFormValues {
  name: string
  type: AccountType
  initial_balance: string
  credit_limit: string
  closing_day: string
  due_day: string
  color: string
}

export interface CategoryFormValues {
  type: 'income' | 'expense'
  group_level1: string
  group_level2: string
  subgroup_level3: string
  name: string
  color: string
}
