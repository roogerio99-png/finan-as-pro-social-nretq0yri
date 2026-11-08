/**
 * Repositório Local Durável baseado em IndexedDB com Compartimentos Isolados por Perfil
 * Cada perfil autenticado opera em seu próprio banco IndexedDB isolado (GestioFinancas_Vault_<profileId>).
 * Garante transações ACID, tratamento de falta de espaço (QuotaExceededError) e sincronização entre abas.
 */

const DB_PREFIX = 'GestioFinancas_Vault_'
const DB_VERSION = 2

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

export interface VaultSyncMessage {
  type: 'VAULT_LOCKED' | 'PROFILE_SWITCHED' | 'DATA_UPDATED' | 'DATA_PURGED'
  profileId: string | null
  storeName?: string
  timestamp: number
}

class LocalIndexedDbStore {
  private activeProfileId: string | null = null
  private activeDb: IDBDatabase | null = null
  private dbPromise: Promise<IDBDatabase | null> | null = null
  // Fallback em memória estritamente particionado por profileId -> storeName -> recordId
  private memoryCompartments: Map<string, Map<string, Map<string, any>>> = new Map()
  public isPersistedStorage = false
  public persistenceRefused = false
  private channel: BroadcastChannel | null = null
  private syncListeners: ((msg: VaultSyncMessage) => void)[] = []

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('gestio_vault_sync_channel')
        this.channel.onmessage = (event) => {
          const msg = event.data as VaultSyncMessage
          if (msg && msg.type) {
            for (const listener of this.syncListeners) {
              try {
                listener(msg)
              } catch {
                // ignore listener error
              }
            }
          }
        }
      } catch {
        // BroadcastChannel não suportado neste contexto
      }
    }
  }

  public onSyncMessage(cb: (msg: VaultSyncMessage) => void): () => void {
    this.syncListeners.push(cb)
    return () => {
      this.syncListeners = this.syncListeners.filter((l) => l !== cb)
    }
  }

  public onBroadcast(cb: (msg: VaultSyncMessage) => void): () => void {
    return this.onSyncMessage(cb)
  }

  public broadcast(msg: Omit<VaultSyncMessage, 'timestamp'>): void {
    const fullMsg: VaultSyncMessage = { ...msg, timestamp: Date.now() }
    try {
      this.channel?.postMessage(fullMsg)
    } catch {
      // ignore
    }
  }

  private getCompartmentKey(profileId?: string | null): string {
    const raw = (profileId ?? this.activeProfileId ?? 'unauthenticated').trim()
    return raw.replace(/[^a-zA-Z0-9_-]/g, '_')
  }

  private getMemoryStore(storeName: StoreName, profileId?: string | null): Map<string, any> {
    const compKey = this.getCompartmentKey(profileId)
    if (!this.memoryCompartments.has(compKey)) {
      const storeMap = new Map<string, Map<string, any>>()
      for (const s of STORES) {
        storeMap.set(s, new Map())
      }
      this.memoryCompartments.set(compKey, storeMap)
    }
    return this.memoryCompartments.get(compKey)!.get(storeName)!
  }

  /**
   * Alterna o compartimento ativo do cofre para o perfil identificado ou bloqueia (null).
   * Fecha imediatamente a conexão anterior para impedir vazamento entre contas no mesmo navegador.
   */
  async setActiveProfile(profileId: string | null): Promise<void> {
    const normalized = profileId ? profileId.trim() : null
    if (this.activeProfileId === normalized && (normalized === null || this.activeDb)) {
      return
    }

    if (this.activeDb) {
      try {
        this.activeDb.close()
      } catch {
        // ignore
      }
      this.activeDb = null
    }
    this.dbPromise = null
    this.activeProfileId = normalized

    if (normalized) {
      await this.getDb()
    }
  }

  public getActiveProfile(): string | null {
    return this.activeProfileId
  }

  /**
   * Abre a conexão com o banco IndexedDB exclusivo do perfil ativo
   */
  async getDb(): Promise<IDBDatabase | null> {
    if (!this.activeProfileId) {
      return null
    }

    if (typeof window === 'undefined' || typeof indexedDB === 'undefined') {
      return null
    }

    if (this.activeDb) {
      return this.activeDb
    }

    if (this.dbPromise) {
      return this.dbPromise
    }

    const dbName = `${DB_PREFIX}${this.getCompartmentKey(this.activeProfileId)}`

    this.dbPromise = new Promise((resolve) => {
      const request = indexedDB.open(dbName, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        for (const storeName of STORES) {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' })

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
            } else if (storeName !== 'vault_meta') {
              store.createIndex('user_id', 'user_id', { unique: false })
            }
          }
        }
      }

      request.onsuccess = () => {
        const db = request.result
        this.activeDb = db

        db.onversionchange = () => {
          db.close()
          this.activeDb = null
          this.dbPromise = null
        }

        this.requestPersistence()
        resolve(db)
      }

      request.onerror = () => {
        console.warn('[IndexedDB] Erro ao abrir cofre local, usando compartimento em memória:', request.error)
        resolve(null)
      }

      request.onblocked = () => {
        console.warn('[IndexedDB] Conexão aguardando liberação de outra aba aberta.')
      }
    })

    return this.dbPromise
  }

  /**
   * Solicita ao navegador armazenamento persistente com tratamento explícito de recusa
   */
  async requestPersistence(): Promise<boolean> {
    if (typeof window !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const alreadyPersisted = navigator.storage.persisted
          ? await navigator.storage.persisted()
          : false
        if (alreadyPersisted) {
          this.isPersistedStorage = true
          this.persistenceRefused = false
          return true
        }
        const granted = await navigator.storage.persist()
        this.isPersistedStorage = granted
        this.persistenceRefused = !granted
        return granted
      } catch {
        this.persistenceRefused = true
      }
    }
    return false
  }

  /**
   * Recupera todos os registros de uma coleção do cofre ativo com transação de leitura
   */
  async getAll<T = any>(storeName: StoreName): Promise<T[]> {
    if (!this.activeProfileId) return []

    const db = await this.getDb()
    if (!db) {
      const map = this.getMemoryStore(storeName)
      return Array.from(map.values())
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
   * Grava ou atualiza um registro somente após concluir a transação local (ACID)
   * Detecta falta de espaço (QuotaExceededError) sem confirmação falsa de salvamento.
   */
  async put<T extends { id: string }>(storeName: StoreName, record: T): Promise<T> {
    if (!this.activeProfileId) {
      throw new Error('Sessão bloqueada. Desbloqueie seu cofre antes de gravar registros.')
    }

    const db = await this.getDb()
    if (!db) {
      this.getMemoryStore(storeName).set(record.id, record)
      return record
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.put(record)

        tx.oncomplete = () => {
          this.broadcast({
            type: 'DATA_UPDATED',
            profileId: this.activeProfileId,
            storeName,
          })
          resolve(record)
        }
        tx.onerror = () => {
          const errName = tx.error?.name || ''
          if (errName === 'QuotaExceededError') {
            reject(
              new Error(
                'Espaço de armazenamento insuficiente no dispositivo (QuotaExceededError). Exporte um backup e libere espaço no aparelho.',
              ),
            )
          } else {
            reject(
              new Error(
                `Falha ao gravar no banco local (${tx.error?.message || 'Erro de escrita'}). O lançamento não foi confirmado.`,
              ),
            )
          }
        }
        tx.onabort = () => {
          const errName = tx.error?.name || ''
          if (errName === 'QuotaExceededError') {
            reject(
              new Error(
                'Gravação abortada por falta de espaço no dispositivo. Nenhum dado parcial foi salvo.',
              ),
            )
          } else {
            reject(
              new Error(
                'A transação local foi interrompida antes da confirmação. Tente novamente.',
              ),
            )
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Exclui um registro da coleção de forma durável após confirmação da transação
   */
  async delete(storeName: StoreName, id: string): Promise<boolean> {
    if (!this.activeProfileId) {
      throw new Error('Sessão bloqueada. Faça login para excluir registros.')
    }

    const db = await this.getDb()
    if (!db) {
      this.getMemoryStore(storeName).delete(id)
      return true
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.delete(id)

        tx.oncomplete = () => {
          this.broadcast({
            type: 'DATA_UPDATED',
            profileId: this.activeProfileId,
            storeName,
          })
          resolve(true)
        }
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(new Error('Exclusão abortada pelo navegador.'))
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Limpa uma coleção inteira do perfil ativo
   */
  async clear(storeName: StoreName): Promise<void> {
    if (!this.activeProfileId) return

    const db = await this.getDb()
    if (!db) {
      this.getMemoryStore(storeName).clear()
      return
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(storeName, 'readwrite')
        const store = tx.objectStore(storeName)
        store.clear()

        tx.oncomplete = () => {
          this.broadcast({
            type: 'DATA_UPDATED',
            profileId: this.activeProfileId,
            storeName,
          })
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Exporta todas as coleções do cofre ativo para criação de Backup
   */
  async exportFullDatabase(): Promise<Record<string, any[]>> {
    if (!this.activeProfileId) {
      throw new Error('Nenhum cofre desbloqueado para exportar.')
    }
    const dump: Record<string, any[]> = {}
    for (const storeName of STORES) {
      dump[storeName] = await this.getAll(storeName)
    }
    return dump
  }

  /**
   * Restaura o banco de dados do perfil ativo a partir de um backup validado com substituição atômica
   */
  async restoreFullDatabase(data: Record<string, any[]>): Promise<void> {
    if (!this.activeProfileId) {
      throw new Error('Desbloqueie seu cofre antes de restaurar um backup.')
    }

    const currentUserId = this.activeProfileId
    const db = await this.getDb()
    if (!db) {
      for (const storeName of STORES) {
        if (storeName === 'vault_meta') continue
        const map = this.getMemoryStore(storeName)
        map.clear()
        const items = data[storeName] || []
        for (const item of items) {
          if (item && item.id) {
            map.set(item.id, { ...item, user_id: currentUserId })
          }
        }
      }
      return
    }

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
              store.put({ ...item, user_id: currentUserId })
            }
          }
        }

        tx.oncomplete = () => {
          this.broadcast({
            type: 'DATA_UPDATED',
            profileId: this.activeProfileId,
          })
          resolve()
        }
        tx.onerror = () =>
          reject(new Error(`Falha na restauração do backup: ${tx.error?.message}`))
        tx.onabort = () =>
          reject(
            new Error(
              'A restauração foi abortada pelo navegador e nenhuma alteração parcial foi aplicada.',
            ),
          )
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Exclusão local explícita de todos os dados do cofre ativo ("Apagar Meus Dados")
   */
  async purgeAllData(): Promise<void> {
    if (!this.activeProfileId) return

    const compKey = this.getCompartmentKey(this.activeProfileId)
    this.memoryCompartments.delete(compKey)

    const db = await this.getDb()
    if (!db) {
      return
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = db.transaction(STORES, 'readwrite')
        for (const storeName of STORES) {
          tx.objectStore(storeName).clear()
        }
        tx.oncomplete = () => {
          this.broadcast({
            type: 'DATA_PURGED',
            profileId: this.activeProfileId,
          })
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      } catch (err) {
        reject(err)
      }
    })
  }
}

export const indexedDbStore = new LocalIndexedDbStore()
