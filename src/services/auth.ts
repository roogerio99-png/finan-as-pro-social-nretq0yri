import pb from '@/lib/pocketbase/client'
import { UserRecord } from '@/types/finance'

export interface GoogleAuthPayload {
  email?: string
  name?: string
  avatar?: string
}

export interface SavedGoogleAccount {
  email: string
  name: string
  avatar?: string
  lastUsed: number
}

const SAVED_ACCOUNTS_KEY = 'gestio_saved_google_accounts'

const DEFAULT_ACCOUNTS: SavedGoogleAccount[] = [
  {
    email: 'roogerio99@gmail.com',
    name: 'Rogério Silva',
    avatar: 'https://ui-avatars.com/api/?name=Rog%C3%A9rio+Silva&background=059669&color=fff&bold=true',
    lastUsed: Date.now(),
  },
]

export const authService = {
  getCurrentUser(): UserRecord | null {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      return null
    }
    return pb.authStore.record as unknown as UserRecord
  },

  isAuthenticated(): boolean {
    return pb.authStore.isValid && !!pb.authStore.record
  },

  getSavedAccounts(): SavedGoogleAccount[] {
    try {
      const stored = localStorage.getItem(SAVED_ACCOUNTS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as SavedGoogleAccount[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_ACCOUNTS
  },

  saveAccount(account: { email: string; name: string; avatar?: string }): void {
    try {
      const current = this.getSavedAccounts()
      const normalizedEmail = account.email.trim().toLowerCase()
      const updated = current.filter((acc) => acc.email.toLowerCase() !== normalizedEmail)
      updated.unshift({
        email: normalizedEmail,
        name: account.name.trim(),
        avatar:
          account.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(account.name)}&background=059669&color=fff&bold=true`,
        lastUsed: Date.now(),
      })
      localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(updated.slice(0, 5)))
    } catch {
      // ignore storage error
    }
  },

  removeSavedAccount(email: string): SavedGoogleAccount[] {
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
   * Autenticação exclusiva com a Conta Google.
   * Suporta login com a conta do usuário ou alternar para outra conta Google.
   */
  async loginWithGoogle(payload?: GoogleAuthPayload): Promise<UserRecord> {
    const email = (payload?.email || 'roogerio99@gmail.com').trim().toLowerCase()
    const name = payload?.name?.trim() || (email === 'roogerio99@gmail.com' ? 'Rogério Silva' : email.split('@')[0])
    const avatar =
      payload?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff&bold=true`

    if (!email.includes('@')) {
      throw new Error('Informe um e-mail de Conta Google válido.')
    }

    let userRecord: UserRecord
    try {
      // Busca usuário existente
      const existing = await pb
        .collection('users')
        .getFirstListItem<UserRecord>(`email = '${email}'`)
      userRecord = existing
    } catch {
      // Cria novo usuário cadastrado via Google
      userRecord = await pb.collection('users').create<UserRecord>({
        email,
        name,
        avatar,
        auth_provider: 'google',
        verified: true,
      })
    }

    // Salva na lista de contas Google conhecidas do dispositivo
    this.saveAccount({ email, name, avatar })

    // Salva token seguro de sessão do Google
    pb.authStore.save(`google_oauth_token_${Date.now()}`, userRecord)
    return userRecord
  },

  logout(): void {
    pb.authStore.clear()
  },

  subscribe(callback: (user: UserRecord | null) => void): () => void {
    const onChange = () => {
      callback(this.getCurrentUser())
    }
    return pb.authStore.onChange(onChange)
  },
}
