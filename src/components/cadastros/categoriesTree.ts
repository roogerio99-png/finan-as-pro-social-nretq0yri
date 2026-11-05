import { CategoryRecord } from '@/types/finance'

export type CatType = 'income' | 'expense'

export interface SubView {
  key: string
  name: string
  record?: CategoryRecord
  items: CategoryRecord[]
  status: 'active' | 'inactive'
}

export interface GroupView {
  key: string
  name: string
  record?: CategoryRecord
  items: CategoryRecord[]
  subgroups: SubView[]
  status: 'active' | 'inactive'
  groupCode?: string
  description?: string
}

const isNumericCode = (c?: string) => !!c && /^\d+(\.\d+)*$/.test(c)

export type CategoryType = 'income' | 'expense'

/** Chave de ordenação numérica de um código ERP ("1.3" -> [1,3]); códigos
 * livres (não numéricos) e ausentes vão para o fim da lista. */
export const codeKey = (code?: string): number[] => {
  if (!isNumericCode(code)) return [Number.MAX_SAFE_INTEGER]
  return code!.split('.').map((p) => parseInt(p, 10) || 0)
}

export const compareCodes = (a?: string, b?: string): number => {
  const ka = codeKey(a)
  const kb = codeKey(b)
  const len = Math.max(ka.length, kb.length)
  for (let i = 0; i < len; i++) {
    const d = (ka[i] ?? 0) - (kb[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

/** Rótulo de subgrupo com código: "1.3 Concessionárias e Utilidades". */
export const subLabel = (s: { name: string; record?: CategoryRecord }): string => {
  const code = s.record?.code
  return code ? `${code} ${s.name}` : s.name
}

/** Rótulo de opção de categoria para selects (Lançamentos, Conciliação, De-Para):
 * com código: "1.3 Concessionárias e Utilidades · Habitação e Moradia";
 * legado: "Aluguel · Custos Fixos". */
export const categoryOptionLabel = (c: CategoryRecord): string => {
  const head = c.code ? `${c.code} ${c.name}` : c.name
  return c.group_level1 && c.group_level1 !== c.name ? `${head} · ${c.group_level1}` : head
}

const isActive = (c: CategoryRecord) => (c.status ?? 'active') === 'active'

/** Agrupa os registros em grupos (nível 1) e subgrupos (nível 2), ordenados
 * pelo código ERP numérico; legados sem código ficam ao fim. */
export const buildGroups = (all: CategoryRecord[], type: CatType): GroupView[] => {
  const rows = all.filter((c) => c.type === type)
  const map = new Map<string, CategoryRecord[]>()
  for (const r of rows) {
    const key = r.group_level1 || 'Sem grupo'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(r)
  }

  const groups: GroupView[] = Array.from(map.entries()).map(([name, items]) => {
    const record = items.find((i) => !i.group_level2 && !i.subgroup_level3)
    const groupCode = record?.group_code || items.find((i) => i.group_code)?.group_code
    const subMap = new Map<string, CategoryRecord[]>()
    for (const it of items) {
      if (it === record) continue
      const sk = it.group_level2 || ''
      if (!subMap.has(sk)) subMap.set(sk, [])
      subMap.get(sk)!.push(it)
    }
    const subgroups: SubView[] = Array.from(subMap.entries()).map(([sName, sItems]) => ({
      key: sName || '(sem subgrupo)',
      name: sName,
      record: sItems.find((i) => !i.subgroup_level3) || sItems[0],
      items: sItems,
      status: sItems.some(isActive) ? 'active' : 'inactive',
    }))
    subgroups.sort((a, b) => compareCodes(a.record?.code, b.record?.code))
    return {
      key: name,
      name,
      record,
      items,
      subgroups,
      groupCode,
      description: record?.description || '',
      status: items.some(isActive) ? 'active' : 'inactive',
    }
  })

  groups.sort((a, b) => {
    const byCode = compareCodes(a.groupCode, b.groupCode)
    if (byCode !== 0) return byCode
    return a.name.localeCompare(b.name, 'pt-BR')
  })
  return groups
}

/** Próximo código livre de grupo: prefixo numérico máximo + 1 ("11.0"). */
export const nextGroupCode = (all: CategoryRecord[], type: CatType): string => {
  const prefixes = all
    .filter((c) => c.type === type && isNumericCode(c.group_code))
    .map((c) => parseInt(c.group_code!.split('.')[0], 10) || 0)
  const start = type === 'income' ? 0 : 1
  const next = prefixes.length > 0 ? Math.max(...prefixes) + 1 : start
  return `${next}.0`
}

/** Próximo código livre de subgrupo dentro do grupo pai: "1" -> "1.N+1". */
export const nextSubCode = (all: CategoryRecord[], groupName: string): string => {
  const group = all.find((c) => c.group_level1 === groupName && !c.group_level2)
  const prefix = group?.group_code?.split('.')[0]
  if (!prefix || !/^\d+$/.test(prefix)) return ''
  const suffixes = all
    .filter(
      (c) =>
        c.group_level1 === groupName &&
        !!c.group_level2 &&
        isNumericCode(c.code) &&
        c.code!.startsWith(`${prefix}.`),
    )
    .map((c) => parseInt(c.code!.split('.')[1], 10) || 0)
  const next = suffixes.length > 0 ? Math.max(...suffixes) + 1 : 1
  return `${prefix}.${next}`
}
