/**
 * Serviço de Backup e Restauração Criptografada do Gestio Finanças
 * Opera 100% no dispositivo (client-side) gerando e importando arquivos .gestiobackup
 */

import { indexedDbStore } from '@/lib/storage/indexedDbStore'
import { vaultCrypto, EncryptedPayload } from '@/lib/storage/vaultCrypto'

export interface BackupMetadata {
  app: 'GestioFinancasPro'
  version: string
  schemaVersion: number
  createdAt: string
  deviceInfo: string
  isEncrypted: boolean
  counts: Record<string, number>
}

export interface UnencryptedBackupFile {
  metadata: BackupMetadata
  data: Record<string, any[]>
}

export interface EncryptedBackupFile {
  metadata: BackupMetadata
  payload: EncryptedPayload
}

const LAST_BACKUP_STORAGE_KEY = 'gestio_last_backup_timestamp'

export const backupService = {
  /**
   * Retorna a data do último backup realizado pelo usuário no dispositivo
   */
  getLastBackupDate(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(LAST_BACKUP_STORAGE_KEY)
  },

  /**
   * Registra o momento da realização de um backup
   */
  setLastBackupDate(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(LAST_BACKUP_STORAGE_KEY, new Date().toISOString())
  },

  /**
   * Gera o conteúdo do backup completo (criptografado ou em formato JSON estruturado)
   */
  async createBackup(password?: string): Promise<{ filename: string; content: string }> {
    const data = await indexedDbStore.exportFullDatabase()

    const counts: Record<string, number> = {}
    for (const [k, v] of Object.entries(data)) {
      counts[k] = Array.isArray(v) ? v.length : 0
    }

    const now = new Date()
    const nowIso = now.toISOString()
    const dateFormatted = nowIso.slice(0, 10).replace(/-/g, '')

    const metadata: BackupMetadata = {
      app: 'GestioFinancasPro',
      version: '0.0.65',
      schemaVersion: 1,
      createdAt: nowIso,
      deviceInfo: typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'LocalDevice',
      isEncrypted: !!password && password.trim().length > 0,
      counts,
    }

    let fileContent = ''
    let filename = `gestio_financas_backup_${dateFormatted}`

    if (password && password.trim().length > 0) {
      const payload = await vaultCrypto.encrypt(data, password.trim())
      const encryptedBackup: EncryptedBackupFile = {
        metadata,
        payload,
      }
      fileContent = JSON.stringify(encryptedBackup, null, 2)
      filename += '_protegido.gestiobackup'
    } else {
      const unencryptedBackup: UnencryptedBackupFile = {
        metadata,
        data,
      }
      fileContent = JSON.stringify(unencryptedBackup, null, 2)
      filename += '_completo.gestiobackup'
    }

    this.setLastBackupDate()
    return { filename, content: fileContent }
  },

  /**
   * Valida e inspeciona um arquivo de backup antes de restaurar
   */
  async inspectBackupFile(fileContent: string): Promise<{
    metadata: BackupMetadata
    isEncrypted: boolean
    schemaCompatible: boolean
  }> {
    let parsed: any
    try {
      parsed = JSON.parse(fileContent)
    } catch {
      throw new Error('Arquivo de backup inválido ou corrompido (formato JSON ilegível).')
    }

    if (!parsed || parsed.metadata?.app !== 'GestioFinancasPro') {
      throw new Error('O arquivo selecionado não é um backup oficial do Gestio Finanças.')
    }

    const metadata = parsed.metadata as BackupMetadata
    const schemaCompatible = metadata.schemaVersion === 1

    return {
      metadata,
      isEncrypted: !!metadata.isEncrypted,
      schemaCompatible,
    }
  },

  /**
   * Restaura o banco de dados a partir de um backup, com validação de senha e integridade
   */
  async restoreBackup(fileContent: string, password?: string): Promise<{ restoredCounts: Record<string, number> }> {
    const inspection = await this.inspectBackupFile(fileContent)
    const parsed = JSON.parse(fileContent)

    let finalData: Record<string, any[]>

    if (inspection.isEncrypted) {
      if (!password || password.trim().length === 0) {
        throw new Error('Este arquivo de backup está criptografado e requer a senha definida na sua criação.')
      }

      if (!parsed.payload) {
        throw new Error('Estrutura de dados criptografados ausente no arquivo de backup.')
      }

      try {
        finalData = await vaultCrypto.decrypt(parsed.payload, password.trim())
      } catch (err: any) {
        throw new Error(err?.message || 'Senha incorreta para descriptografar o backup.')
      }
    } else {
      if (!parsed.data) {
        throw new Error('Estrutura de registros financeiros ausente no arquivo de backup.')
      }
      finalData = parsed.data
    }

    // Executa a substituição atômica no IndexedDB
    await indexedDbStore.restoreFullDatabase(finalData)

    const restoredCounts: Record<string, number> = {}
    for (const [k, v] of Object.entries(finalData)) {
      restoredCounts[k] = Array.isArray(v) ? v.length : 0
    }

    return { restoredCounts }
  },

  /**
   * Baixa o arquivo gerado no computador/celular do usuário sem trafegar pela nuvem
   */
  triggerDownload(filename: string, content: string): void {
    if (typeof window === 'undefined') return
    const blob = new Blob([content], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },
}
