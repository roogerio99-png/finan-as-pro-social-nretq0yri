import { CategoryRecord } from '@/types/finance'

export interface NodeDialogState {
  level: 1 | 2
  parent?: string // nome do grupo quando level = 2
  id?: string // presente quando editando
  name: string
  original?: string // nome original ao renomear (name é o campo editável)
  code: string // código do subgrupo; grupo usa o prefixo "N.0"
  description: string // descrição do gasto
}

export const emptyNode = (): NodeDialogState => ({ level: 1, name: '', code: '', description: '' })
