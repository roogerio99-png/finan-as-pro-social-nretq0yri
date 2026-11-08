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
  version: '0.1.0',
  appName: 'SimplaFin',
  trialNotice: 'Versão de Testes Locais — Cofres Isolados por Perfil',
  blockedMessage:
    'O período de avaliação foi encerrado. Para continuar utilizando o SimplaFin, entre em contato com o suporte.',
  checkoutUrl:
    'https://wa.me/5599999999999?text=Ol%C3%A1!%20Gostaria%20de%20informacoes%20sobre%20o%20SimplaFin',
  supportContact: 'suporte@simplafin.com.br',
  allowedAdmins: [],
  updatedAt: new Date().toISOString(),
}

const LICENSE_CACHE_KEY = 'gestio_app_license_cache'

export const licenseService = {
  async fetchLicense(): Promise<AppLicenseConfig> {
    try {
      const res = await fetch('/app-license.json', {
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

    const emailNorm = String(userEmail || '').trim().toLowerCase()
    const isAdmin =
      Array.isArray(config.allowedAdmins) &&
      config.allowedAdmins.some((a) => a.toLowerCase() === emailNorm)
    if (isAdmin) return false

    return true
  },
}
