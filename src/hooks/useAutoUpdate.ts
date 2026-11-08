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

export const useAutoUpdate = () => {
  const { toast } = useToast()
  const isUpdatingRef = useRef(false)

  const checkVersion = async () => {
    if (isUpdatingRef.current) return

    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store',
      })
      if (!res.ok) return

      const remote = (await res.json()) as VersionPayload
      if (!remote || !remote.buildTimestamp) return

      const localBuildStr = localStorage.getItem(STORAGE_KEY)

      // Na primeira visita ou primeira inicialização deste dispositivo, apenas memoriza a versão atual
      if (!localBuildStr) {
        localStorage.setItem(STORAGE_KEY, String(remote.buildTimestamp))
        return
      }

      const localBuild = Number(localBuildStr) || 0

      // Se a versão remota for idêntica ou menor, o app já está atualizado
      if (remote.buildTimestamp <= localBuild) {
        return
      }

      // Trava contra loop infinito: se já recarregou nos últimos 60 segundos, não recarrega de novo
      const lastReload = Number(sessionStorage.getItem(LAST_RELOAD_TIME_KEY) || 0)
      if (Date.now() - lastReload < 60000) {
        localStorage.setItem(STORAGE_KEY, String(remote.buildTimestamp))
        return
      }

      // Nova versão detectada!
      isUpdatingRef.current = true
      sessionStorage.setItem(LAST_RELOAD_TIME_KEY, String(Date.now()))
      localStorage.setItem(STORAGE_KEY, String(remote.buildTimestamp))

      toast({
        title: 'Atualização do Sistema',
        description:
          'Nova melhoria de tela publicada. Sincronizando parâmetros locais...',
      })

      // Limpa os caches locais do navegador para garantir que o bundle novo seja carregado imediatamente
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const keys = await caches.keys()
          await Promise.all(keys.map((k) => caches.delete(k)))
        } catch {
          // ignore
        }
      }

      // Atualiza caches do Service Worker caso disponível
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const reg of registrations) {
            await reg.update()
          }
        } catch {
          // ignore
        }
      }

      // Recarrega uma única vez de forma suave após 1.5s
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch {
      // Ignora erro em modo offline
    }
  }

  useEffect(() => {
    // 1. Checa 3 segundos após o app iniciar (evita piscar no carregamento inicial)
    const initialTimer = setTimeout(checkVersion, 3000)

    // 2. Checa quando o usuário volta para o app no celular ou troca de aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 3. Polling leve a cada 2 minutos
    const interval = setInterval(checkVersion, 120 * 1000)

    return () => {
      clearTimeout(initialTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  }, [])
}
