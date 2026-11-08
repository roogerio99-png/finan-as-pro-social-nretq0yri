/**
 * Serviço de Backup e Restauração Criptografada do Gestio Finanças
 * Opera 100% no dispositivo (client-side) gerando e importando arquivos .gestiobackup
 * protegidos obrigatoriamente por AES-GCM 256 bits com derivação PBKDF2 (100.000 iterações).
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
const MAX_BACKUP_BYTES = 50 * 1024 * 1024 // Limite de segurança de 50 MB para restauração

export const backupService = {
  getLastBackupDate(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(LAST_BACKUP_STORAGE_KEY)
  },

  setLastBackupDate(): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(LAST_BACKUP_STORAGE_KEY, new Date().toISOString())
  },

  /**
   * Gera backup criptografado obrigatório (AES-GCM 256-bit + PBKDF2 100.000 iterações).
   * Exige senha de no mínimo 6 caracteres para impedir exportação acidental em texto puro.
   */
  async createBackup(password: string): Promise<{ filename: string; content: string }> {
    const cleanPassword = (password || '').trim()
    if (cleanPassword.length < 6) {
      throw new Error(
        'Defina uma senha de proteção com no mínimo 6 caracteres para criptografar o arquivo de backup.',
      )
    }

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
      version: '0.1.0',
      schemaVersion: 1,
      createdAt: nowIso,
      deviceInfo:
        typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 80) : 'LocalDevice',
      isEncrypted: true,
      counts,
    }

    const payload = await vaultCrypto.encrypt(data, cleanPassword)
    const encryptedBackup: EncryptedBackupFile = {
      metadata,
      payload,
    }
    const fileContent = JSON.stringify(encryptedBackup, null, 2)
    const filename = `gestio_financas_backup_${dateFormatted}_protegido.gestiobackup`

    this.setLastBackupDate()
    return { filename, content: fileContent }
  },

  /**
   * Valida formato, limites e versão do esquema antes de restaurar
   */
  async inspectBackupFile(fileContent: string): Promise<{
    metadata: BackupMetadata
    isEncrypted: boolean
    schemaCompatible: boolean
  }> {
    if (!fileContent || typeof fileContent !== 'string') {
      throw new Error('Conteúdo do arquivo de backup vazio ou inválido.')
    }

    if (fileContent.length > MAX_BACKUP_BYTES) {
      throw new Error('O arquivo excede o limite de segurança de 50 MB para restauração local.')
    }

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
    if (!schemaCompatible) {
      throw new Error(
        `Versão de esquema incompatível (${metadata.schemaVersion}). Atualize o aplicativo antes de restaurar.`,
      )
    }

    return {
      metadata,
      isEncrypted: !!metadata.isEncrypted,
      schemaCompatible,
    }
  },

  /**
   * Restaura o banco de dados a partir de um backup, com validação estrita de senha, esquema e integridade
   */
  async restoreBackup(
    fileContent: string,
    password?: string,
  ): Promise<{ restoredCounts: Record<string, number> }> {
    const inspection = await this.inspectBackupFile(fileContent)
    const parsed = JSON.parse(fileContent)

    let finalData: Record<string, any[]>

    if (inspection.isEncrypted) {
      if (!password || password.trim().length === 0) {
        throw new Error(
          'Este arquivo de backup está criptografado e requer a senha definida na sua criação.',
        )
      }

      if (!parsed.payload) {
        throw new Error('Estrutura de dados criptografados ausente no arquivo de backup.')
      }

      try {
        finalData = await vaultCrypto.decrypt(parsed.payload, password.trim())
      } catch (err: any) {
        throw new Error(err?.message || 'Senha incorreta ou arquivo de backup adulterado.')
      }
    } else {
      if (!parsed.data || typeof parsed.data !== 'object') {
        throw new Error('Estrutura de registros financeiros ausente no arquivo de backup.')
      }
      finalData = parsed.data
    }

    if (!finalData || typeof finalData !== 'object' || Array.isArray(finalData)) {
      throw new Error('Estrutura interna do backup inválida após verificação.')
    }

    // Valida que cada coleção presente é uma lista válida antes de tocar no IndexedDB
    for (const [col, records] of Object.entries(finalData)) {
      if (!Array.isArray(records)) {
        throw new Error(`Coleção "${col}" corrompida no arquivo de backup.`)
      }
    }

    await indexedDbStore.restoreFullDatabase(finalData)

    const restoredCounts: Record<string, number> = {}
    for (const [k, v] of Object.entries(finalData)) {
      restoredCounts[k] = Array.isArray(v) ? v.length : 0
    }

    return { restoredCounts }
  },

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
