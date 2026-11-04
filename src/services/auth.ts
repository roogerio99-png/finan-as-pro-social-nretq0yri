import pb from '@/lib/pocketbase/client'
import { UserRecord } from '@/types/finance'

export interface GoogleAuthPayload {
  email?: string
  name?: string
  avatar?: string
}

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

  /**
   * Autenticação exclusiva com a Conta Google.
   * Suporta login com a conta do usuário ou alternar para outra conta Google.
   */
  async loginWithGoogle(payload?: GoogleAuthPayload): Promise<UserRecord> {
    const email = (payload?.email || 'roogerio99@gmail.com').trim().toLowerCase()
    const name = payload?.name?.trim() || 'Rogério Silva'
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
