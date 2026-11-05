import { CategoryRecord } from '@/types/finance'

export interface NodeDialogState {
  level: 1 | 2
  parent?: string // nome do grupo quando level = 2
  id?: string // presente quando editando
  name: string
  original?: string // nome original ao renomear (name é o campo editável)
  originalCode?: string // código carregado na abertura da edição (para detectar mudança)
  originalDescription?: string // descrição carregada na abertura da edição
  code: string // código do subgrupo; grupo usa o prefixo "N.0"
  description: string // descrição do gasto
  type?: 'income' | 'expense' // tipo do plano de contas na edição (receita/despesa)
}

export const emptyNode = (): NodeDialogState => ({ level: 1, name: '', code: '', description: '' })
