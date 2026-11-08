import pb from '@/lib/pocketbase/client'
/**
 * Utilitários de Privacidade e Gestão de Dados Locais
 * Garante transparência de que todos os dados de login e lançamentos
 * residem exclusivamente no armazenamento local (localStorage/IndexedDB) do dispositivo do usuário.
 */

export interface LocalStorageStats {
  transactionsCount: number
  accountsCount: number
  categoriesCount: number
  budgetsCount: number
  debtsCount: number
  dreamsCount: number
  savedAccountsCount: number
  totalBytesApprox: number
  lastUpdated?: string
}

export const localDataPrivacyService = {
  /**
   * Coleta métricas de dados salvos localmente neste aparelho
   */
  getStats(): LocalStorageStats {
    let txCount = 0
    let accCount = 0
    let catCount = 0
    let budgCount = 0
    let debtsCount = 0
    let dreamsCount = 0
    let savedAccountsCount = 0
    let totalBytes = 0

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key) continue
        const val = localStorage.getItem(key) || ''
        totalBytes += key.length + val.length

        if (key.includes('transactions')) {
          try {
            const arr = JSON.parse(val)
            if (Array.isArray(arr)) txCount = arr.length
          } catch {
            // ignore
          }
        } else if (key.includes('accounts') && !key.includes('saved_google')) {
          try {
            const arr = JSON.parse(val)
            if (Array.isArray(arr)) accCount = arr.length
          } catch {
            // ignore
          }
        } else if (key.includes('categories')) {
          try {
            const arr = JSON.parse(val)
            if (Array.isArray(arr)) catCount = arr.length
          } catch {
            // ignore
          }
        } else if (key.includes('budgets')) {
          try {
            const arr = JSON.parse(val)
            if (Array.isArray(arr)) budgCount = arr.length
          } catch {
            // ignore
          }
        } else if (key.includes('debts')) {
          try {
            const arr = JSON.parse(val)
            if (Array.isArray(arr)) debtsCount = arr.length
          } catch {
            // ignore
          }
        } else if (key.includes('dreams')) {
          try {
            const arr = JSON.parse(val)
            if (Array.isArray(arr)) dreamsCount = arr.length
          } catch {
            // ignore
          }
        } else if (key === 'gestio_saved_google_accounts') {
          try {
            const arr = JSON.parse(val)
            if (Array.isArray(arr)) savedAccountsCount = arr.length
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // fallback
    }

    if (catCount === 0) {
      try {
        const storeCats = typeof pb.getCollectionRecords === 'function' ? pb.getCollectionRecords('categories') : []
        if (storeCats && storeCats.length > 0) catCount = storeCats.length
        if (txCount === 0) txCount = (pb.getCollectionRecords?.('transactions') || []).length
        if (accCount === 0) accCount = (pb.getCollectionRecords?.('accounts') || []).length
        if (budgCount === 0) budgCount = (pb.getCollectionRecords?.('budgets') || []).length
        if (debtsCount === 0) debtsCount = (pb.getCollectionRecords?.('debts') || []).length
        if (dreamsCount === 0) dreamsCount = (pb.getCollectionRecords?.('dreams') || []).length
      } catch {
        // ignore
      }
    }

    return {
      transactionsCount: txCount,
      accountsCount: accCount,
      categoriesCount: catCount,
      budgetsCount: budgCount,
      debtsCount,
      dreamsCount,
      savedAccountsCount,
      totalBytesApprox: totalBytes,
      lastUpdated: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }
  },

  /**
   * Exporta todos os dados do Gestio Finanças do aparelho para um arquivo JSON baixável
   */
  exportLocalData(): void {
    const dump: Record<string, any> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('gestio_') || key.startsWith('pocketbase_'))) {
        try {
          dump[key] = JSON.parse(localStorage.getItem(key) || '{}')
        } catch {
          dump[key] = localStorage.getItem(key)
        }
      }
    }

    const jsonStr = JSON.stringify(dump, null, 2)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const dateStr = new Date().toISOString().split('T')[0]
    a.href = url
    a.download = `gestio-financas-backup-local-${dateStr}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  },

  /**
   * Limpa apenas os lançamentos e faturas para quem vai iniciar com dados reais
   */
  clearOnlyTransactions(): void {
    if (typeof (pb as any).clearAllTransactions === 'function') {
      (pb as any).clearAllTransactions()
    }
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (key && (key.includes('transactions') || key.includes('invoices') || key.includes('payments'))) {
        localStorage.setItem(key, JSON.stringify([]))
      }
    }
  },

  /**
   * Limpa totalmente o armazenamento local deste aparelho e redefine sessão
   */
  wipeAllLocalData(): void {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.startsWith('gestio_') || key.startsWith('pocketbase_'))) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k))
  },
}
