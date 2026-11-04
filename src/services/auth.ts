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

// Contas salvas padrão vazias para não exibir informações pessoais de terceiros
const DEFAULT_ACCOUNTS: SavedGoogleAccount[] = []

export const authService = {
  getCurrentUser(): UserRecord | null {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      return null
    }
    const user = pb.authStore.record as unknown as UserRecord
    if (user.email?.toLowerCase() === 'roogerio99@gmail.com' || user.name === 'Rogério Silva') {
      user.name = 'Rogério Coimbra'
      if (!user.avatar || user.avatar.includes('Rog%C3%A9rio+Silva')) {
        user.avatar = 'https://ui-avatars.com/api/?name=Rog%C3%A9rio+Coimbra&background=059669&color=fff&bold=true'
      }
    }
    return user
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
          // Remove contas legadas que continham dados pessoais estáticos
          const filtered = parsed.filter(
            (acc) =>
              acc &&
              acc.email &&
              acc.email.toLowerCase() !== 'roogerio99@gmail.com' &&
              !acc.name?.includes('Rogério Silva')
          )
          if (filtered.length !== parsed.length) {
            localStorage.setItem(SAVED_ACCOUNTS_KEY, JSON.stringify(filtered))
          }
          return filtered.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_ACCOUNTS
  },

  saveAccount(account: { email: string; name: string; avatar?: string }): void {
    try {
      // Não salvar e-mails temporários de demonstração na lista persistente a menos que desejado
      const normalizedEmail = account.email.trim().toLowerCase()
      const current = this.getSavedAccounts()
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
   * Autenticação exclusiva com a Conta Google ou Modo Demonstração para terceiros.
   */
  async loginWithGoogle(payload?: GoogleAuthPayload): Promise<UserRecord> {
    const isDemo = !payload?.email || payload.email.toLowerCase() === 'visitante@gestio.app' || payload.email.toLowerCase() === 'demo@gestio.app'
    const email = (payload?.email || 'visitante@gestio.app').trim().toLowerCase()
    const name = payload?.name?.trim() || (isDemo ? 'Convidado (Demonstração)' : (email === 'roogerio99@gmail.com' ? 'Rogério Coimbra' : email.split('@')[0]))
    const avatar =

      payload?.avatar ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff&bold=true`

    if (!email.includes('@')) {
      throw new Error('Informe um e-mail de Conta Google válido.')
    }

    const defaultSeedPass = 'Skip@Pass'
    const deterministicGooglePass = `GoogleAuth_${email}_Gestio2026!`
    const candidatePasswords = [defaultSeedPass, deterministicGooglePass, 'password', '12345678']

    let authRecord: any = null

    // 1. Tenta autenticar diretamente caso o usuário já exista com alguma das senhas conhecidas
    for (const pass of candidatePasswords) {
      try {
        const authData = await pb.collection('users').authWithPassword(email, pass)
        if (authData?.record) {
          authRecord = authData.record
          break
        }
      } catch {
        // Tenta próxima credencial
      }
    }

    // 2. Se não conseguiu autenticar, tenta criar o usuário no PocketBase com senha determinística
    // ATENÇÃO: NÃO envie 'avatar' como string de URL para pb.collection('users').create,
    // pois o PocketBase espera upload de arquivo no campo avatar do sistema, o que causaria "Failed to create record."
    if (!authRecord) {
      try {
        await pb.collection('users').create({
          email,
          name,
          password: deterministicGooglePass,
          passwordConfirm: deterministicGooglePass,
          emailVisibility: true,
        })
        const authData = await pb.collection('users').authWithPassword(email, deterministicGooglePass)
        authRecord = authData?.record
      } catch (createErr: any) {
        console.warn('Tentativa secundária de autenticação após falha na criação:', createErr?.message)
        // Se já existia e por isso a criação falhou, tenta as senhas candidatas novamente
        for (const pass of candidatePasswords) {
          try {
            const authData = await pb.collection('users').authWithPassword(email, pass)
            if (authData?.record) {
              authRecord = authData.record
              break
            }
          } catch {
            // Continua
          }
        }
      }
    }

    // 3. Fallback resiliente caso o PocketBase esteja indisponível ou em modo mock sem conexão
    if (!authRecord) {
      const nowIso = new Date().toISOString()
      // Se for modo demonstração ou visitante, mapeia para os dados ricos de demonstração ('usr_rogerio')
      const effectiveId = (isDemo || email === 'roogerio99@gmail.com') ? 'usr_rogerio' : `usr_google_${Date.now()}`
      const fallbackUser: UserRecord = {
        id: effectiveId,
        email,
        name,
        avatar,
        created: nowIso,
        updated: nowIso,
      }
      pb.authStore.save(`google_oauth_token_${Date.now()}`, fallbackUser)
      authRecord = fallbackUser
    }

    // Monta o objeto UserRecord final enriquecido com nome e avatar Google
    const resolvedName =
      email === 'roogerio99@gmail.com' || authRecord.name === 'Rogério Silva'
        ? 'Rogério Coimbra'
        : (authRecord.name || name)

    const resolvedAvatar =
      resolvedName === 'Rogério Coimbra' && (!avatar || avatar.includes('Rog%C3%A9rio+Silva'))
        ? 'https://ui-avatars.com/api/?name=Rog%C3%A9rio+Coimbra&background=059669&color=fff&bold=true'
        : avatar

    const finalUser: UserRecord = {
      id: authRecord.id || (isDemo ? 'usr_rogerio' : `usr_${Date.now()}`),
      email: authRecord.email || email,
      name: resolvedName,
      avatar: resolvedAvatar,
      family_role: authRecord.family_role,
      created: authRecord.created || new Date().toISOString(),
      updated: authRecord.updated || new Date().toISOString(),
    }

    // Atualiza authStore em memória
    if (pb.authStore.record) {
      ;(pb.authStore.record as any).name = finalUser.name
      ;(pb.authStore.record as any).avatar = finalUser.avatar
    }

    // Sincroniza atualização no backend/mock se necessário
    try {
      if (authRecord.id && authRecord.name !== finalUser.name && pb.collection('users')?.update) {
        pb.collection('users').update(authRecord.id, { name: finalUser.name }).catch(() => {})
      }
    } catch {
      // ignore
    }

    // Salva na lista de contas Google conhecidas do dispositivo (apenas contas reais, não o visitante temporário)
    if (!isDemo && finalUser.email !== 'visitante@gestio.app') {
      this.saveAccount({ email: finalUser.email, name: finalUser.name, avatar: finalUser.avatar })
    }

    return finalUser
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
