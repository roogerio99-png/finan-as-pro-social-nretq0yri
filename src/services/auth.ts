import pb from '@/lib/pocketbase/client'
import { UserRecord } from '@/types/finance'
import { indexedDbStore } from '@/lib/storage/indexedDbStore'
import { vaultCrypto } from '@/lib/storage/vaultCrypto'
import {
  authenticateWithGooglePopup,
  signOutFirebaseAuth,
} from '@/lib/firebase/authClient'

export interface GoogleAuthPayload {
  email?: string
  name?: string
  avatar?: string
  sub?: string // UID validado pelo provedor Google OAuth / Firebase Auth
  verifiedByGoogle?: boolean
  vaultPassword?: string // Senha/PIN opcional do cofre local
}

export interface SavedGoogleAccount {
  email: string
  name: string
  sub?: string
  verifiedByGoogle?: boolean
  vaultId: string
  avatar?: string
  hasPin?: boolean
  pinHash?: string
  pinSalt?: string
  lastUsed: number
}

const SAVED_ACCOUNTS_KEY = 'gestio_local_vault_profiles_v3'
const LEGACY_SAVED_ACCOUNTS_KEYS = [
  'gestio_saved_google_accounts',
  'gestio_local_vault_profiles_v2',
]

/**
 * Gera um avatar SVG 100% local (Data URI) sem requisições a APIs externas (ex: ui-avatars.com)
 */
export function generateLocalAvatarSvg(nameOrEmail: string): string {
  const clean = (nameOrEmail || 'U').trim()
  const parts = clean.split(/\s+/).filter(Boolean)
  const initials =
    parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : clean.slice(0, 2).toUpperCase()

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="#059669"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="#ffffff" font-family="system-ui, sans-serif" font-size="38" font-weight="700">${initials.replace(/[<>&"']/g, '')}</text></svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

/**
 * Deriva identificador de compartimento local estável a partir do e-mail autenticado
 */
export function deriveProfileVaultId(email: string, _sub?: string): string {
  const normEmail = email.trim().toLowerCase()
  if (normEmail === 'visitante@gestio.app' || normEmail === 'demo@gestio.app') {
    return 'usr_convidado_demo'
  }
  const seed = `email_${normEmail}`
  let h1 = 0xdeadbeef ^ seed.length
  let h2 = 0x41c6ce57 ^ seed.length
  for (let i = 0; i < seed.length; i++) {
    const ch = seed.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  const hex = (h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')
  return `usr_v_${hex}`
}

export const authService = {
  getCurrentUser(): UserRecord | null {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      return null
    }
    return pb.authStore.record as unknown as UserRecord
  },

  isAuthenticated(): boolean {
    return pb.authStore.isValid && !!pb.authStore.record && !!pb.authStore.record.id
  },

  /**
   * Inicializa a sessão na abertura do app, carregando o compartimento IndexedDB correspondente
   * caso já exista uma sessão verificada ativa neste perfil do navegador.
   */
  async initializeSession(): Promise<UserRecord | null> {
    if (typeof window !== 'undefined') {
      try {
        for (const legacyKey of LEGACY_SAVED_ACCOUNTS_KEYS) {
          localStorage.removeItem(legacyKey)
        }
      } catch {
        // ignore
      }
    }

    const current = this.getCurrentUser()
    if (!current || !current.id) {
      pb.lockCompartment?.()
      return null
    }

    // Bloqueia sessões antigas que tenham sido criadas como visitante/demo ou sem token verificado
    const token = pb.authStore.token || ''
    if (
      current.email === 'visitante@gestio.app' ||
      current.email === 'demo@gestio.app' ||
      (!token.startsWith('google_oauth_') &&
        !token.startsWith('google_verified_') &&
        !token.startsWith('offline_vault_'))
    ) {
      this.lockVault()
      return null
    }

    await pb.initFromIndexedDb?.(current.id)
    return current
  },

  /**
   * Bloqueia o acesso ao cofre local, limpando o estado em memória, encerrando a sessão Firebase Auth
   * e preservando a base no IndexedDB. Coordena o bloqueio com outras abas abertas.
   */
  lockVault(): void {
    pb.lockCompartment?.()
    pb.authStore.clear()
    void signOutFirebaseAuth()
    indexedDbStore.broadcast({ type: 'VAULT_LOCKED', profileId: null })
  },

  /**
   * Lista apenas os perfis cujos cofres locais já foram autenticados via Google neste navegador.
   */
  getSavedAccounts(): SavedGoogleAccount[] {
    if (typeof window === 'undefined') return []
    try {
      const stored = localStorage.getItem(SAVED_ACCOUNTS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as SavedGoogleAccount[]
        if (Array.isArray(parsed)) {
          return parsed
            .filter((acc) => acc && acc.email && acc.vaultId)
            .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
        }
      }
    } catch {
      // fallback
    }
    return []
  },

  saveAccount(account: {
    email: string
    name: string
    vaultId: string
    sub?: string
    verifiedByGoogle?: boolean
    avatar?: string
    pinHash?: string
    pinSalt?: string
  }): void {
    if (typeof window === 'undefined') return
    try {
      const normalizedEmail = account.email.trim().toLowerCase()
      if (normalizedEmail === 'visitante@gestio.app' || normalizedEmail === 'demo@gestio.app') {
        return
      }
      const current = this.getSavedAccounts()
      const existing = current.find((acc) => acc.email.toLowerCase() === normalizedEmail)
      const updated = current.filter((acc) => acc.email.toLowerCase() !== normalizedEmail)

      const pinHash = account.pinHash ?? existing?.pinHash
      const pinSalt = account.pinSalt ?? existing?.pinSalt

      updated.unshift({
        email: normalizedEmail,
        name: account.name.trim(),
        vaultId: account.vaultId,
        sub: account.sub || existing?.sub,
        verifiedByGoogle: account.verifiedByGoogle ?? existing?.verifiedByGoogle ?? true,
        avatar: account.avatar || existing?.avatar || generateLocalAvatarSvg(account.name),
        hasPin: Boolean(pinHash && pinSalt),
        pinHash,
        pinSalt,
        lastUsed: Date.now(),
      })
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated.slice(0, 8)))
    } catch {
      // ignore storage error
    }
  },

  removeSavedAccount(email: string): SavedGoogleAccount[] {
    if (typeof window === 'undefined') return []
    try {
      const current = this.getSavedAccounts()
      const normalizedEmail = email.trim().toLowerCase()
      const updated = current.filter((acc) => acc.email.toLowerCase() !== normalizedEmail)
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated))
      return updated
    } catch {
      return []
    }
  },

  /**
   * Configura uma senha/PIN local para proteger o desbloqueio do cofre neste navegador
   */
  async setVaultPin(email: string, pin: string): Promise<void> {
    if (!pin || pin.trim().length < 4) {
      throw new Error('O PIN/Senha do cofre deve ter no mínimo 4 caracteres.')
    }
    const normEmail = email.trim().toLowerCase()
    const salt = vaultCrypto.generateSalt()
    const saltB64 = btoa(String.fromCharCode(...salt))
    const hash = await vaultCrypto.hashPassword(pin.trim(), salt)

    const current = this.getSavedAccounts()
    const target = current.find((a) => a.email.toLowerCase() === normEmail)
    if (target) {
      this.saveAccount({
        ...target,
        pinHash: hash,
        pinSalt: saltB64,
      })
    }
  },

  /**
   * Desbloqueio Offline Explícito: desbloqueia somente um cofre local já autenticado neste navegador
   * mediante validação obrigatória de PIN local quando configurado.
   */
  async unlockOfflineVault(email: string, pin?: string): Promise<UserRecord> {
    const normEmail = email.trim().toLowerCase()
    const saved = this.getSavedAccounts().find((a) => a.email.toLowerCase() === normEmail)
    if (!saved) {
      throw new Error(
        'Nenhum cofre local encontrado para esta conta neste dispositivo. Realize a autenticação com sua Conta Google primeiro.',
      )
    }

    if (saved.hasPin && saved.pinHash && saved.pinSalt) {
      if (!pin || !pin.trim()) {
        throw new Error('Informe a senha/PIN do seu cofre local para desbloqueá-lo.')
      }
      const binary = atob(saved.pinSalt)
      const saltBytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        saltBytes[i] = binary.charCodeAt(i)
      }
      const computedHash = await vaultCrypto.hashPassword(pin.trim(), saltBytes)
      if (computedHash !== saved.pinHash) {
        throw new Error('Senha/PIN do cofre local incorreta. O cofre permanece bloqueado.')
      }
    }

    const nowIso = new Date().toISOString()
    const unlockedUser: UserRecord = {
      id: saved.vaultId,
      email: saved.email,
      name: saved.name,
      avatar: saved.avatar || generateLocalAvatarSvg(saved.name),
      created: nowIso,
      updated: nowIso,
    }

    pb.activateUserCompartmentSync?.(unlockedUser as any)
    pb.authStore.save(`offline_vault_${saved.vaultId}_${Date.now()}`, unlockedUser as any)
    await pb.initFromIndexedDb?.(saved.vaultId)
    this.saveAccount(saved)

    return unlockedUser
  },

  /**
   * Autenticação interativa real via Firebase Authentication (GoogleAuthProvider + signInWithPopup),
   * idêntica à validação de Conta Google utilizada no aplicativo Task Account.
   */
  async loginWithGooglePopup(loginHint?: string): Promise<UserRecord> {
    const verified = await authenticateWithGooglePopup(loginHint)
    return await this.loginWithGoogle({
      email: verified.email,
      name: verified.name,
      avatar: verified.avatar,
      sub: verified.uid,
      verifiedByGoogle: true,
    })
  },

  /**
   * Ativa o cofre local isolado correspondente às credenciais validadas da Conta Google.
   * Se chamado sem payload válido, falha imediatamente (sem fallback silencioso).
   */
  async loginWithGoogle(payload?: GoogleAuthPayload): Promise<UserRecord> {
    if (!payload || !payload.email || !payload.email.trim()) {
      throw new Error(
        'Autenticação Google não concluída. Valide sua Conta Google oficial para acessar.',
      )
    }

    const email = payload.email.trim().toLowerCase()
    if (!email.includes('@') || email.startsWith('@') || email.endsWith('@')) {
      throw new Error('Endereço de e-mail inválido retornado pela autenticação Google.')
    }

    const isDemo = email === 'visitante@gestio.app' || email === 'demo@gestio.app'
    const name =
      payload.name?.trim() || (isDemo ? 'Convidado (Demonstração)' : email.split('@')[0])
    const avatar = payload.avatar || generateLocalAvatarSvg(name)

    const existingSaved = this.getSavedAccounts().find((a) => a.email.toLowerCase() === email)
    const vaultId = existingSaved?.vaultId || deriveProfileVaultId(email, payload.sub)

    // Se já houver cofre protegido por PIN para esta conta neste navegador, valida caso exigido
    if (
      existingSaved?.hasPin &&
      existingSaved.pinHash &&
      existingSaved.pinSalt &&
      payload.vaultPassword !== undefined
    ) {
      const binary = atob(existingSaved.pinSalt)
      const saltBytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) {
        saltBytes[i] = binary.charCodeAt(i)
      }
      const computedHash = await vaultCrypto.hashPassword(payload.vaultPassword.trim(), saltBytes)
      if (computedHash !== existingSaved.pinHash) {
        throw new Error('Senha de proteção do cofre local incorreta.')
      }
    }

    const nowIso = new Date().toISOString()
    const finalUser: UserRecord = {
      id: vaultId,
      email,
      name,
      avatar,
      created: nowIso,
      updated: nowIso,
    }

    // Ativa o compartimento isolado deste perfil (Conta B nunca acessa o cofre da Conta A)
    pb.activateUserCompartmentSync?.(finalUser as any)
    const tokenPrefix = payload.verifiedByGoogle ? 'google_oauth' : 'google_verified'
    pb.authStore.save(`${tokenPrefix}_${vaultId}_${Date.now()}`, finalUser as any)
    await pb.initFromIndexedDb?.(vaultId)

    if (!isDemo) {
      let pinHash: string | undefined
      let pinSalt: string | undefined
      if (payload.vaultPassword && payload.vaultPassword.trim().length >= 4) {
        const salt = vaultCrypto.generateSalt()
        pinSalt = btoa(String.fromCharCode(...salt))
        pinHash = await vaultCrypto.hashPassword(payload.vaultPassword.trim(), salt)
      }
      this.saveAccount({
        email: finalUser.email,
        name: finalUser.name,
        vaultId,
        sub: payload.sub,
        verifiedByGoogle: payload.verifiedByGoogle ?? true,
        avatar: finalUser.avatar,
        pinHash,
        pinSalt,
      })
    }

    return finalUser
  },

  /**
   * Mantido apenas para compatibilidade interna de testes automatizados
   */
  async loginDemo(): Promise<UserRecord> {
    return await this.loginWithGoogle({
      email: 'visitante@gestio.app',
      name: 'Convidado (Demonstração)',
    })
  },

  logout(): void {
    this.lockVault()
  },

  subscribe(callback: (user: UserRecord | null) => void): () => void {
    const onChange = () => {
      callback(this.getCurrentUser())
    }
    return pb.authStore.onChange(onChange)
  },
}
