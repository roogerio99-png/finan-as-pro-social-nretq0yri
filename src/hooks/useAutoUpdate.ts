import { useEffect, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

interface VersionPayload {
  version: string
  buildTimestamp: number
  releaseDate: string
  description?: string
}

const STORAGE_KEY = 'gestio_app_active_build_timestamp'
const LAST_RELOAD_TIME_KEY = 'gestio_app_last_auto_reload_time'
const CACHE_PREFIX = 'gestio-financas-shell-'

/**
 * Verifica se o usuário está no meio de uma edição ou importação que não pode ser interrompida por reload automático
 */
function hasActiveUserWorkInProgress(): boolean {
  if (typeof document === 'undefined') return false

  // Se houver modal/dialog aberto
  const openDialog = document.querySelector('[role="dialog"], [data-state="open"]')
  if (openDialog) return true

  // Se o foco atual estiver em um campo de formulário
  const activeEl = document.activeElement
  if (
    activeEl &&
    (activeEl.tagName === 'INPUT' ||
      activeEl.tagName === 'TEXTAREA' ||
      activeEl.tagName === 'SELECT' ||
      (activeEl as HTMLElement).isContentEditable)
  ) {
    return true
  }

  // Se estiver na tela de conciliação/importação de extrato ou automação de-para
  if (
    typeof window !== 'undefined' &&
    (window.location.pathname.includes('conciliacao') ||
      window.location.pathname.includes('extratos') ||
      window.location.pathname.includes('de-para'))
  ) {
    return true
  }

  return false
}

export const useAutoUpdate = () => {
  const { toast } = useToast()
  const isUpdatingRef = useRef(false)

  const checkVersion = async () => {
    if (isUpdatingRef.current) return

    try {
      const res = await fetch('/version.json', {
        cache: 'no-store',
      })
      if (!res.ok) return

      const remote = (await res.json()) as VersionPayload
      if (!remote || !remote.buildTimestamp) return

      const localBuildStr = localStorage.getItem(STORAGE_KEY)
      const localBuild = Number(localBuildStr) || 0

      if (!localBuild) {
        localStorage.setItem(STORAGE_KEY, String(remote.buildTimestamp))
        return
      }

      if (remote.buildTimestamp <= localBuild) {
        return
      }

      // Trava contra recarregamentos repetidos
      const lastReload = Number(sessionStorage.getItem(LAST_RELOAD_TIME_KEY) || 0)
      if (Date.now() - lastReload < 60000) {
        localStorage.setItem(STORAGE_KEY, String(remote.buildTimestamp))
        return
      }

      // Nunca interromper formulário, modal ou importação em andamento
      if (hasActiveUserWorkInProgress()) {
        return
      }

      isUpdatingRef.current = true
      sessionStorage.setItem(LAST_RELOAD_TIME_KEY, String(Date.now()))
      localStorage.setItem(STORAGE_KEY, String(remote.buildTimestamp))

      toast({
        title: 'Nova versão disponível',
        description:
          'Atualizando arquivos da interface. Seus dados locais no IndexedDB permanecem preservados.',
      })

      // Limpa somente caches do prefixo do shell da aplicação
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const keys = await caches.keys()
          const shellKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX))
          await Promise.all(shellKeys.map((k) => caches.delete(k)))
        } catch {
          // ignore
        }
      }

      // Solicita ativação coordenada ao Service Worker em espera
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const reg of registrations) {
            await reg.update()
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
          }
        } catch {
          // ignore
        }
      }

      setTimeout(() => {
        if (!hasActiveUserWorkInProgress()) {
          window.location.reload()
        } else {
          isUpdatingRef.current = false
        }
      }, 1200)
    } catch {
      // Ignora erro em modo offline
    }
  }

  useEffect(() => {
    const initialTimer = setTimeout(checkVersion, 2000)

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const interval = setInterval(checkVersion, 60000)

    return () => {
      clearTimeout(initialTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  }, [])
}
