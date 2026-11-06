import { useEffect, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'

interface VersionPayload {
  version: string
  buildTimestamp: number
  releaseDate: string
  description?: string
}

// Timestamp do momento em que este cliente foi compilado
const CURRENT_CLIENT_BUILD = 1793996200000

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

      // Se a versão remota for mais recente que a que está rodando no cliente
      if (remote.buildTimestamp > CURRENT_CLIENT_BUILD) {
        isUpdatingRef.current = true

        toast({
          title: 'Nova versão disponível!',
          description:
            'Atualizando telas e parâmetros do sistema... Seus lançamentos locais continuam 100% preservados.',
        })

        // Atualiza os caches do Service Worker
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations()
          for (const reg of registrations) {
            await reg.update()
          }
        }

        // Aguarda 1.2s para o usuário ler o aviso e recarrega de forma suave
        setTimeout(() => {
          window.location.reload()
        }, 1200)
      }
    } catch {
      // Ignora erro em modo offline
    }
  }

  useEffect(() => {
    // 1. Checa imediatamente ao carregar
    checkVersion()

    // 2. Checa quando o usuário volta para o app no celular ou troca de aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkVersion()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', checkVersion)

    // 3. Polling periódico leve a cada 90 segundos
    const interval = setInterval(checkVersion, 90 * 1000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', checkVersion)
      clearInterval(interval)
    }
  }, [])
}
