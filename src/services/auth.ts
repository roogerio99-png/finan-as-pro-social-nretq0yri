import pb from '@/lib/pocketbase/client'
import { UserRecord } from '@/types/finance'

export const authService = {
  getCurrentUser(): UserRecord | null {
    if (!pb.authStore.isValid || !pb.authStore.record) {
      return null
    }
    return pb.authStore.record as unknown as UserRecord
  },

  isAuthenticated(): boolean {
    return pb.authStore.isValid
  },

  async login(email: string, pass: string): Promise<UserRecord> {
    const authData = await pb.collection('users').authWithPassword(email, pass)
    return authData.record as unknown as UserRecord
  },

  async loginAsDefault(): Promise<UserRecord> {
    try {
      const authData = await pb
        .collection('users')
        .authWithPassword('roogerio99@gmail.com', 'Skip@Pass')
      return authData.record as unknown as UserRecord
    } catch {
      // Se não conseguir, tenta cadastrar ou reutilizar
      try {
        await pb.collection('users').create({
          email: 'roogerio99@gmail.com',
          password: 'Skip@Pass',
          passwordConfirm: 'Skip@Pass',
          name: 'Rogério Silva',
        })
        const authData = await pb
          .collection('users')
          .authWithPassword('roogerio99@gmail.com', 'Skip@Pass')
        return authData.record as unknown as UserRecord
      } catch (err: any) {
        throw new Error(err.message || 'Erro ao entrar com conta padrão')
      }
    }
  },

  async register(email: string, pass: string, name: string): Promise<UserRecord> {
    await pb.collection('users').create({
      email,
      password: pass,
      passwordConfirm: pass,
      name,
    })
    return this.login(email, pass)
  },

  async requestPasswordReset(email: string): Promise<void> {
    await pb.collection('users').requestPasswordReset(email)
  },

  logout(): void {
    pb.authStore.clear()
  },

  subscribe(callback: (user: UserRecord | null) => void): () => void {
    const onChange = () => {
      callback(this.getCurrentUser())
    }
    pb.authStore.onChange(onChange)
    return () => {
      // unsubscribe
    }
  },
}
