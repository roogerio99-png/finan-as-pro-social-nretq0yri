import React, { useMemo } from 'react'
import { CategoryRecord } from '@/types/finance'
import { buildGroups, subLabel, GroupView } from '@/components/cadastros/categoriesTree'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

interface CategoryCascadeSelectProps {
  categories: CategoryRecord[]
  type: 'income' | 'expense'
  /** Categoria atualmente vinculada (id do registro: grupo OU subgrupo). */
  categoryId: string
  onCategoryChange: (id: string) => void
  /** 'form' renderiza rótulos acima dos dois selects (diálogo); 'compact' é inline (conciliação). */
  variant?: 'form' | 'compact'
  /** Classe extra nos selects (ex.: destaque roxo da sugestão do De-Para). */
  selectClassName?: string
  idPrefix?: string
  disabled?: boolean
}

const FORM_SELECT =
  'w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-50 disabled:text-slate-400'
const COMPACT_SELECT =
  'border rounded-xl px-2.5 py-1.5 text-xs w-full bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-400'

/** Rótulo de grupo com código ERP: "2.0 Alimentação e Despensa". */
const groupOptionLabel = (g: { name: string; groupCode?: string }): string =>
  g.groupCode ? `${g.groupCode} ${g.name}` : g.name

/**
 * Seleção em cascata do plano de contas: o primeiro select lista apenas os
 * GRUPOS (ex: "2.0 Alimentação e Despensa"); o segundo lista apenas os
 * SUBGRUPOS do grupo escolhido (ex: "2.1 Mercado Principal") e fica
 * desabilitado até que uma categoria seja escolhida. O subgrupo é opcional:
 * deixar vazio vincula o lançamento ao próprio grupo.
 *
 * Fonte única de verdade é `categoryId` (id do registro, grupo ou subgrupo —
 * mesmo modelo de dados de antes): os valores exibidos são DERIVADOS dele,
 * então pré-cargas (edição, sugestão De-Para, voz) refletem nos dois campos
 * sem estado extra, e trocar a categoria limpa o subgrupo automaticamente.
 */
export const CategoryCascadeSelect: React.FC<CategoryCascadeSelectProps> = ({
  categories,
  type,
  categoryId,
  onCategoryChange,
  variant = 'form',
  selectClassName,
  idPrefix = 'cat',
  disabled = false,
}) => {
  const groupViews = useMemo(() => buildGroups(categories, type), [categories, type])
  const selectedCat = categories.find((c) => c.id === categoryId)

  // Estado local para garantir que o grupo permaneça selecionado visualmente
  const [selectedGroupName, setSelectedGroupName] = React.useState<string>(() => {
    return selectedCat?.group_level1 || ''
  })

  React.useEffect(() => {
    if (selectedCat?.group_level1) {
      setSelectedGroupName(selectedCat.group_level1)
    } else if (!categoryId) {
      setSelectedGroupName('')
    }
  }, [categoryId, selectedCat])

  const activeGroup: GroupView | undefined = groupViews.find((g) => g.name === selectedGroupName)
  const subgroups = activeGroup?.subgroups ?? []

  const handleGroupChange = (name: string) => {
    setSelectedGroupName(name)
    if (!name) {
      onCategoryChange('')
      return
    }
    const group = groupViews.find((g) => g.name === name)
    if (!group) return

    // Se tiver registro canônico puro de grupo, usa ele
    if (group.record?.id) {
      onCategoryChange(group.record.id)
    } else if (group.subgroups.length > 0 && group.subgroups[0].record?.id) {
      // Se não tiver registro puro do grupo, seleciona o primeiro subgrupo por padrão
      onCategoryChange(group.subgroups[0].record.id)
    } else if (group.items.length > 0) {
      onCategoryChange(group.items[0].id)
    }
  }

  const handleSubgroupChange = (name: string) => {
    if (!name) {
      // Voltou para a opção vazia: mantém no grupo
      const group = groupViews.find((g) => g.name === selectedGroupName)
      if (group?.record?.id) {
        onCategoryChange(group.record.id)
      } else if (group?.items.length) {
        onCategoryChange(group.items[0].id)
      }
      return
    }
    const sub = subgroups.find((s) => s.name === name)
    if (sub) {
      onCategoryChange(sub.record?.id || sub.items[0]?.id || '')
    }
  }

  const selectCls = cn(variant === 'form' ? FORM_SELECT : COMPACT_SELECT, selectClassName)

  const groupSelect = (
    <select
      id={`${idPrefix}-group`}
      value={selectedGroupName}
      onChange={(e) => handleGroupChange(e.target.value)}
      className={selectCls}
      disabled={disabled}
    >
      <option value="">Selecione uma categoria...</option>
      {groupViews.map((g) => (
        <option key={g.key} value={g.name}>
          {groupOptionLabel(g)}
        </option>
      ))}
      {/* Categoria salva fora das opções visíveis (ex.: grupo inativo) segue exibida. */}
      {!activeGroup && selectedGroupName && (
        <option value={selectedGroupName}>{selectedGroupName}</option>
      )}
    </select>
  )

  const subgroupSelect = (
    <select
      id={`${idPrefix}-subgroup`}
      value={selectedCat?.group_level2 || ''}
      onChange={(e) => handleSubgroupChange(e.target.value)}
      className={selectCls}
      disabled={disabled || !selectedGroupName}
    >
      {!selectedGroupName ? (
        <option value="">Escolha uma categoria primeiro</option>
      ) : subgroups.length === 0 ? (
        <option value="">Sem subgrupos nesta categoria</option>
      ) : (
        <option value="">Selecione o subgrupo (opcional)...</option>
      )}
      {subgroups.map((s) => (
        <option key={s.key} value={s.name}>
          {subLabel(s)}
        </option>
      ))}
    </select>
  )

  if (variant === 'form') {
    return (
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-group`}>Categoria (Plano de Contas)</Label>
          {groupSelect}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-subgroup`}>Subgrupo (opcional)</Label>
          {subgroupSelect}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {groupSelect}
      {subgroupSelect}
    </div>
  )
}
