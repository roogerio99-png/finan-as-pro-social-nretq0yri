export type LicenseStatus = 'TRIAL' | 'ACTIVE' | 'BLOCKED'

export interface AppLicenseConfig {
  status: LicenseStatus
  version: string
  appName: string
  trialNotice: string
  blockedMessage: string
  checkoutUrl: string
  supportContact: string
  allowedAdmins: string[]
  updatedAt: string
}

const DEFAULT_CONFIG: AppLicenseConfig = {
  status: 'TRIAL',
  version: '1.0.0',
  appName: 'Gestio Finanças',
  trialNotice: 'Versão de Testes Autorizada para Convidados',
  blockedMessage:
    'O período de testes gratuitos do Gestio Finanças foi encerrado. Para continuar com acesso completo às suas finanças, adquira sua licença ou plano de assinatura.',
  checkoutUrl:
    'https://wa.me/5599999999999?text=Olá!%20Gostaria%20de%20adquirir%20minha%20assinatura%20do%20Gestio%20Finanças',
  supportContact: 'suporte@gestiofinancas.com.br',
  allowedAdmins: ['roogerio99@gmail.com'],
  updatedAt: new Date().toISOString(),
}

const LICENSE_CACHE_KEY = 'gestio_app_license_cache'

export const licenseService = {
  async fetchLicense(): Promise<AppLicenseConfig> {
    try {
      // Adiciona timestamp para não pegar cache estático
      const res = await fetch(`/app-license.json?t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (res.ok) {
        const remote = (await res.json()) as AppLicenseConfig
        if (remote && remote.status) {
          localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify(remote))
          return remote
        }
      }
    } catch {
      // ignore
    }

    // Fallback de cache local
    try {
      const cached = localStorage.getItem(LICENSE_CACHE_KEY)
      if (cached) return JSON.parse(cached)
    } catch {
      // ignore
    }

    return DEFAULT_CONFIG
  },

  isBlocked(config: AppLicenseConfig, userEmail?: string | null): boolean {
    if (config.status !== 'BLOCKED') return false

    // Administradores autorizados nunca são bloqueados
    const emailNorm = String(userEmail || '').trim().toLowerCase()
    const isAdmin = config.allowedAdmins.some((a) => a.toLowerCase() === emailNorm)
    if (isAdmin) return false

    return true
  },
}
