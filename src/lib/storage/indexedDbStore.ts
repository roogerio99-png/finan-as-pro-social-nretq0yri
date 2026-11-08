/**
 * Repositório Local Durável baseado em IndexedDB
 * Substitui o armazenamento em nuvem e localStorage para todos os dados financeiros.
 * Opera de forma 100% autônoma no dispositivo do usuário (PWA Offline-First).
 */

const DB_NAME = 'GestioFinancas_DB_v1'
const DB_VERSION = 1

export const STORES = [
  'accounts',
  'categories',
  'transactions',
  'budgets',
  'debts',
  'dreams',
  'depara_rules',
  'invoices',
  'payments',
  'vault_meta',
] as const

export type StoreName = (typeof STORES)[number]

class LocalIndexedDbStore {
  private dbPromise: Promise<IDBDatabase> | null = null
  private memoryFallback: Map<string, Map<string, any>> = new Map()
  public isPersistedStorage = false

  constructor() {
    for (const name of STORES) {
      this.memoryFallback.set(name, new Map())
    }
  }

  /**
   * Abre a conexão com o banco IndexedDB ou retorna fallback caso indisponível
   */
  async getDb(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return null
    }

    if (this.dbPromise) {
      return this.dbPromise
    }

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        for (const storeName of STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' })

            // Índices para otimização de consulta
            if (storeName === 'transactions') {
              store.createIndex('user_id', 'user_id', { unique: false })
              store.createIndex('date', 'date', { unique: false })
              store.createIndex('account_id', 'account_id', { unique: false })
              store.createIndex('category_id', 'category_id', { unique: false })
              store.createIndex('competence_month', 'competence_month', { unique: false })
              store.createIndex('cash_month', 'cash_month', { unique: false })
            } else if (storeName === 'categories') {
              store.createIndex('user_id', 'user_id', { unique: false })
              store.createIndex('type', 'type', { unique: false })
              store.createIndex('group_code', 'group_code', { unique: false })
            } else if (storeName === 'accounts') {
              store.createIndex('user_id', 'user_id', { unique: false })
              store.createIndex('status', 'status', { unique: false })
            } else if (storeName === 'budgets') {
              store.createIndex('user_id', 'user_id', { unique: false })
              store.createIndex('month', 'month', { unique: false })
            } else {
              if (storeName !== 'vault_meta') {
                store.createIndex('user_id', 'user_id', { unique: false })
              }
            }
          }
        }
      }

      request.onsuccess = async () => {
        const db = request.result

        // Solicita persistência de dados no navegador quando suportada
        this.requestPersistence()

        resolve(db)
      }

      request.onerror = () => {
        console.warn('[IndexedDB] Erro ao abrir banco local, usando fallback seguro em memória:', request.error)
        resolve(null as any)
      }

      request.onblocked = () => {
        console.warn('[IndexedDB] Conexão bloqueada por outra aba aberta com versão antiga.')
      }
    })

    return this.dbPromise
  }

  /**
   * Solicita que o navegador proteja a base contra remoção automática por falta de espaço
   */
  async requestPersistence(): Promise<boolean> {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persist()
        this.isPersistedStorage = isPersisted
        return isPersisted
      } catch {
        // Ignora recusa do navegador
      }
    }
    return false
  }

  /**
   * Recupera todos os registros de uma coleção com transação de leitura
   */
  async getAll<T = any>(storeName: StoreName): Promise<T[]> {
    const db = await this.getDb()
    if (!db) {
      const map = this.memoryFallback.get(storeName)
      return map ? Array.from(map.values()) : []
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readonly')
        const store = tx.objectStore(storeName)
        const request = store.getAll()

        request.onsuccess = () => resolve(request.result || [])
        request.onerror = () => reject(request.error)
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Grava ou atualiza um registro com garantia de transação concluída (ACID)
   */
  async put<T extends { id: string }>(storeName: StoreName, record: T): Promise<T> {
    const db = await this.getDb()
    if (!db) {
      this.memoryFallback.get(storeName)?.set(record.id, record)
      return record
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.put(record)

        tx.oncomplete = () => resolve(record)
        tx.onerror = () => {
          console.error(`[IndexedDB] Falha ao persistir em ${storeName}:`, tx.error)
          reject(new Error(`Falha ao gravar no armazenamento local (${tx.error?.message || 'Erro desconhecido'}).`))
        }
        tx.onabort = () => {
          reject(new Error('A gravação dos dados foi cancelada pelo navegador (possível falta de espaço no disco).'))
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Exclui um registro da coleção de forma durável
   */
  async delete(storeName: StoreName, id: string): Promise<boolean> {
    const db = await this.getDb()
    if (!db) {
      this.memoryFallback.get(storeName)?.delete(id)
      return true
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.delete(id)

        tx.oncomplete = () => resolve(true)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(new Error('Exclusão abortada pelo navegador.'))
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Limpa uma coleção inteira
   */
  async clear(storeName: StoreName): Promise<void> {
    const db = await this.getDb()
    if (!db) {
      this.memoryFallback.get(storeName)?.clear()
      return
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.clear()

        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Exporta todas as coleções locais para criação de Backup
   */
  async exportFullDatabase(): Promise<Record<string, any[]>> {
    const dump: Record<string, any[]> = {}
    for (const storeName of STORES) {
      dump[storeName] = await this.getAll(storeName)
    }
    return dump
  }

  /**
   * Restaura o banco de dados completo a partir de um backup com substituição atômica
   */
  async restoreFullDatabase(data: Record<string, any[]>): Promise<void> {
    const db = await this.getDb()
    if (!db) {
      for (const storeName of STORES) {
        const map = this.memoryFallback.get(storeName)
        if (map) {
          map.clear()
          const items = data[storeName] || []
          for (const item of items) {
            if (item && item.id) map.set(item.id, item)
          }
        }
      }
      return
    }

    // Executa em transação única envolvendo todas as stores para garantir atomicidade
    const targetStores = STORES.filter((s) => s !== 'vault_meta')

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(targetStores, 'readwrite')

        for (const storeName of targetStores) {
          const store = tx.objectStore(storeName)
          store.clear()
          const items = data[storeName] || []
          for (const item of items) {
            if (item && item.id) {
              store.put(item)
            }
          }
        }

        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(new Error(`Falha na restauração do backup: ${tx.error?.message}`))
        tx.onabort = () => reject(new Error('A restauração foi cancelada para preservar a integridade da base.'))
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Exclusão local explícita de todos os dados pelo usuário ("Apagar Meus Dados")
   */
  async purgeAllData(): Promise<void> {
    const db = await this.getDb()
    if (!db) {
      for (const map of this.memoryFallback.values()) {
        map.clear()
      }
      return
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORES, 'readwrite')
        for (const storeName of STORES) {
          tx.objectStore(storeName).clear()
        }
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
      } catch (err) {
        reject(err)
      }
    })
  }
}

export const indexedDbStore = new LocalIndexedDbStore()
