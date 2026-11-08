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
      const localBuild = Number(localBuildStr) || 0

      // Se a versão já for conhecida e igual ou superior, o app já está atualizado
      if (localBuild && remote.buildTimestamp <= localBuild) {
        return
      }

      // Trava contra loop infinito: se já recarregou nos últimos 30 segundos, não recarrega de novo
      const lastReload = Number(sessionStorage.getItem(LAST_RELOAD_TIME_KEY) || 0)
      if (Date.now() - lastReload < 30000) {
        localStorage.setItem(STORAGE_KEY, String(remote.buildTimestamp))
        return
      }

      // Se for primeira leitura deste dispositivo mas houver um service worker ativo gerenciando a página,
      // força a sincronização para não ficar preso em bundles defasados de versões anteriores.
      if (!localBuild) {
        localStorage.setItem(STORAGE_KEY, String(remote.buildTimestamp))
        if (!navigator.serviceWorker?.controller) {
          return
        }
      }

      // Nova versão detectada!
      isUpdatingRef.current = true
      sessionStorage.setItem(LAST_RELOAD_TIME_KEY, String(Date.now()))
      localStorage.setItem(STORAGE_KEY, String(remote.buildTimestamp))

      toast({
        title: 'Atualização do Sistema',
        description:
          'Nova melhoria de conciliação e segurança publicada. Sincronizando...',
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

      // Atualiza caches do Service Worker caso disponível e envia comando de ativação imediata
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const reg of registrations) {
            reg.waiting?.postMessage({ type: 'SKIP_WAITING' })
            await reg.update()
          }
        } catch {
          // ignore
        }
      }

      // Recarrega uma única vez de forma suave após 1s
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch {
      // Ignora erro em modo offline
    }
  }

  useEffect(() => {
    // 1. Checa 1 segundo após o app iniciar
    const initialTimer = setTimeout(checkVersion, 1000)

    // 2. Checa quando o usuário volta para o app no celular ou troca de aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // 3. Polling ativo a cada 15 segundos para atualizar navegadores abertos
    const interval = setInterval(checkVersion, 15000)

    return () => {
      clearTimeout(initialTimer)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      clearInterval(interval)
    }
  }, [])
}
