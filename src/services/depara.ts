import pb from '@/lib/pocketbase/client'
import { DeparaRuleRecord, CategoryRecord, DeparaSuggestionSource } from '@/types/finance'

// ===== Categorização automática (De-Para inteligente) =====
// Toda a inteligência é local: normalização de texto, extração de palavras-
// chave do histórico bancário e contagem de uso das regras. Sem IA externa.

/** Normaliza: maiúsculas, sem acentos, espaços colapsados. */
export const normalizeText = (s: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()

// Palavras genéricas de histórico bancário que não identificam um
// estabelecimento (não viram regra).
const STOPWORDS = new Set([
  'DE',
  'DO',
  'DA',
  'DOS',
  'DAS',
  'COM',
  'PARA',
  'POR',
  'COMPRA',
  'PAGAMENTO',
  'PAGTO',
  'PAG',
  'CREDITO',
  'DEBITO',
  'PIX',
  'TED',
  'DOC',
  'TRANSACAO',
  'TRANSACAO',
  'SAO',
  'LTDA',
  'MEA',
  'EIRELI',
  'BRASIL',
  'BRAZIL',
  'BR',
  'LOJA',
  'SHOP',
  'STORE',
  'BILHETE',
  'TARIFA',
  'VALOR',
  'REF',
  'REFERENTE',
  'MENSALIDADE',
  'ESTORNO',
  'CANC',
  'CANCELADA',
  'COMPRAS',
  'CARTAO',
  'CARTÃO',
])

/**
 * Extrai palavras-chave do histórico (ex: 'UBER DO BRASIL*1234' → ['UBER']).
 * - remove sufixos numéricos de autorização (ex: '*1234', '-4567');
 * - descarta tokens numéricos, muito curtos e palavras genéricas;
 * - devolve em ordem de aparecimento (o primeiro costuma ser a marca).
 */
export const extractKeywords = (description: string): string[] => {
  const norm = normalizeText(description)
  const tokens = norm.split(/[^A-Z0-9]+/).filter(Boolean)
  const keywords: string[] = []
  for (const raw of tokens) {
    // Remove cauda numérica/alfanumérica de autorização (ex: IFOOD99, NETFLIX1)
    const core = raw.replace(/[0-9]+.*$/, '')
    if (core.length < 3) continue
    if (!/[A-Z]/.test(core)) continue
    if (STOPWORDS.has(core)) continue
    if (!keywords.includes(core)) keywords.push(core)
  }
  return keywords
}

export interface CategorySuggestion {
  categoryId: string
  source: DeparaSuggestionSource
  ruleId?: string
  matchedPattern?: string
}

/** Regras mais usadas primeiro; desempate por padrão mais específico. */
const rulesByPriority = (rules: DeparaRuleRecord[]): DeparaRuleRecord[] =>
  [...rules].sort(
    (a, b) =>
      (b.usage_count || 0) - (a.usage_count || 0) ||
      normalizeText(b.pattern || '').length - normalizeText(a.pattern || '').length,
  )

const isSingleWordPattern = (pattern: string): boolean => !normalizeText(pattern).includes(' ')

export const deparaService = {
  async list(): Promise<DeparaRuleRecord[]> {
    return await pb.collection('depara_rules').getFullList<DeparaRuleRecord>({
      filter: pb.authStore.record ? `user_id = '${pb.authStore.record.id}'` : '',
      expand: 'category_id',
      sort: '-created',
    })
  },

  async getAll(): Promise<DeparaRuleRecord[]> {
    return this.list()
  },

  async create(
    patternOrData: string | { pattern: string; category_id?: string; categoryId?: string; confidence?: number },
    categoryId?: string,
  ): Promise<DeparaRuleRecord> {
    let cleanPattern = ''
    let catId = ''
    let confidence = 100

    if (typeof patternOrData === 'object' && patternOrData !== null) {
      cleanPattern = normalizeText(patternOrData.pattern)
      catId = patternOrData.category_id || patternOrData.categoryId || ''
      if (patternOrData.confidence !== undefined) confidence = patternOrData.confidence
    } else {
      cleanPattern = normalizeText(String(patternOrData || ''))
      catId = categoryId || ''
    }

    return await pb.collection('depara_rules').create<DeparaRuleRecord>({
      user_id: pb.authStore.record?.id,
      pattern: cleanPattern,
      category_id: catId,
      confidence,
      usage_count: 0,
    })
  },

  async update(
    id: string,
    data: { pattern?: string; category_id?: string; confidence?: number },
  ): Promise<DeparaRuleRecord> {
    const payload: Record<string, any> = {}
    if (data.pattern !== undefined) payload.pattern = normalizeText(data.pattern)
    if (data.category_id !== undefined) payload.category_id = data.category_id
    if (data.confidence !== undefined) payload.confidence = data.confidence
    return await pb.collection('depara_rules').update<DeparaRuleRecord>(id, payload, {
      expand: 'category_id',
    })
  },

  async delete(id: string): Promise<boolean> {
    return await pb.collection('depara_rules').delete(id)
  },

  /** Incrementa o uso da regra: regras mais confirmadas ganham prioridade. */
  async bumpUsage(rule: DeparaRuleRecord): Promise<DeparaRuleRecord> {
    const updated = await pb.collection('depara_rules').update<DeparaRuleRecord>(
      rule.id,
      {
        usage_count: (rule.usage_count || 0) + 1,
        last_used: new Date().toISOString(),
      },
      { expand: 'category_id' },
    )
    return updated
  },

  /**
   * Sugere uma categoria para uma descrição:
   * 1. Regra aprendida contida no histórico — 'exact' (padrão multi-palavra,
   *    alta confiança) ou 'keyword' (palavra-chave do estabelecimento).
   *    Entre várias, vence a mais usada e depois a mais específica.
   * 2. Semelhança com o nome da categoria/subgrupo — 'heuristic'.
   */
  suggestCategory(
    description: string,
    rules: DeparaRuleRecord[],
    categories: CategoryRecord[],
  ): CategorySuggestion | undefined {
    const normDesc = normalizeText(description)
    if (!normDesc) return undefined

    const matching = rulesByPriority(
      rules.filter((r) => normDesc.includes(normalizeText(r.pattern))),
    )
    if (matching.length > 0) {
      const rule = matching[0]
      return {
        categoryId: rule.category_id,
        source: isSingleWordPattern(rule.pattern) ? 'keyword' : 'exact',
        ruleId: rule.id,
        matchedPattern: rule.pattern,
      }
    }

    // Busca heurística pelo nome da categoria ou subgrupo
    for (const cat of categories) {
      if (normDesc.includes(normalizeText(cat.name))) {
        return { categoryId: cat.id, source: 'heuristic' }
      }
      if (cat.subgroup_level3 && normDesc.includes(normalizeText(cat.subgroup_level3))) {
        return { categoryId: cat.id, source: 'heuristic' }
      }
      if (normDesc.includes(normalizeText(cat.group_level2))) {
        return { categoryId: cat.id, source: 'heuristic' }
      }
    }

    return undefined
  },

  /** Compatibilidade: devolve só o id da categoria sugerida. */
  matchCategory(
    description: string,
    rules: DeparaRuleRecord[],
    categories: CategoryRecord[],
  ): string | undefined {
    return this.suggestCategory(description, rules, categories)?.categoryId
  },

  /**
   * Aprendizado ao confirmar uma categoria para uma descrição:
   * - se já existe regra que casa com o histórico e aponta para a categoria,
   *   incrementa o uso dela (regras mais usadas vencem);
   * - senão, cria uma regra nova pela palavra-chave do estabelecimento
   *   (ex: 'UBER DO BRASIL*1234' → regra 'UBER').
   * Devolve a regra criada/atualizada (ou null se nada mudou).
   */
  async applyConfirmed(
    description: string,
    categoryId: string,
    rules: DeparaRuleRecord[],
  ): Promise<DeparaRuleRecord | null> {
    if (!description || !categoryId) return null

    const normDesc = normalizeText(description)
    const matching = rulesByPriority(
      rules.filter((r) => normDesc.includes(normalizeText(r.pattern))),
    )
    const sameCategory = matching.filter((r) => r.category_id === categoryId)
    if (sameCategory.length > 0) {
      try {
        return await this.bumpUsage(sameCategory[0])
      } catch {
        return null
      }
    }

    const existingPatterns = new Set(rules.map((r) => normalizeText(r.pattern)))
    const freshKeyword = extractKeywords(description).find((k) => !existingPatterns.has(k))
    if (freshKeyword) {
      try {
        return await this.create(freshKeyword, categoryId)
      } catch {
        // Regra duplicada (corrida com outro salvamento) — ignora.
        return null
      }
    }
    return null
  },
}
