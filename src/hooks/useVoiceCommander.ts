import { useState, useEffect, useRef, useCallback } from 'react'
import { microphoneService, MicPermissionState } from '@/services/microphoneService'

interface UseVoiceCommanderProps {
  onFinalResult?: (transcript: string) => void
  onInterimResult?: (transcript: string) => void
  onError?: (error: string) => void
}

export function useVoiceCommander({
  onFinalResult,
  onInterimResult,
  onError,
}: UseVoiceCommanderProps = {}) {
  const [permissionState, setPermissionState] = useState<MicPermissionState>('prompt')
  const [isListening, setIsListening] = useState(false)
  const [isRequestingPermission, setIsRequestingPermission] = useState(false)
  const [audioLevel, setAudioLevel] = useState(0)
  const [interimText, setInterimText] = useState('')
  const [permissionModalOpen, setPermissionModalOpen] = useState(false)

  const recognitionRef = useRef<any>(null)
  const interimTextRef = useRef<string>('')
  const animationFrameRef = useRef<number | null>(null)

  // Verifica o estado inicial da permissão no mount
  useEffect(() => {
    let isMounted = true

    const check = async () => {
      const state = await microphoneService.getPermissionStatus()
      if (isMounted) {
        setPermissionState(state)
      }
    }

    check()

    // Ouve alterações de permissão nativas do navegador
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'microphone' as any })
        .then((permissionStatus) => {
          permissionStatus.onchange = () => {
            if (isMounted) {
              setPermissionState(permissionStatus.state as MicPermissionState)
            }
          }
        })
        .catch(() => {})
    }

    return () => {
      isMounted = false
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort()
        } catch {
          // ignore
        }
      }
    }
  }, [])

  // Limpeza de recursos de animação
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    setAudioLevel(0)
  }, [])

  // Loop visual suave para onda sonora durante a escuta.
  // 100% livre de conflito de hardware: não abre getUserMedia simultâneo ao SpeechRecognition,
  // permitindo que o microfone opere sem travar no Android e iOS.
  const startAudioMeter = useCallback(() => {
    let frame = 0
    const updateMeter = () => {
      frame += 0.2
      // Ondulação harmônica suave
      const baseWave = 22 + Math.sin(frame) * 14 + Math.cos(frame * 1.6) * 10
      // Quando há palavras sendo faladas, intensifica a amplitude
      const speakingBoost = interimTextRef.current.length > 0 ? 45 : 0
      const currentLevel = Math.min(100, Math.round(baseWave + speakingBoost))
      setAudioLevel(currentLevel)

      animationFrameRef.current = requestAnimationFrame(updateMeter)
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    animationFrameRef.current = requestAnimationFrame(updateMeter)
  }, [])

  // Interrompe a escuta
  const stopListening = useCallback(() => {
    setIsListening(false)

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }

    cleanupAudio()
  }, [cleanupAudio])

  // Inicia a captura e transcrição de fala de forma síncrona com o clique do usuário
  const startListening = useCallback(() => {
    const SpeechRecognition = microphoneService.getSpeechRecognitionConstructor()
    if (!SpeechRecognition) {
      if (onError) {
        onError(
          'Seu navegador não suporta reconhecimento nativo de voz. No celular, use o Google Chrome ou Safari.',
        )
      }
      return
    }

    stopListening()

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.lang = 'pt-BR'
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsListening(true)
        setPermissionState('granted')
        setInterimText('')
        interimTextRef.current = ''
        startAudioMeter()
      }

      recognition.onresult = (event: any) => {
        let interim = ''
        let final = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript
          } else {
            interim += event.results[i][0].transcript
          }
        }

        const currentText = (final || interim).trim()
        setInterimText(currentText)
        interimTextRef.current = currentText

        if (onInterimResult && currentText) {
          onInterimResult(currentText)
        }

        if (final.trim().length > 0) {
          stopListening()
          if (onFinalResult) {
            onFinalResult(final.trim())
          }
        }
      }

      recognition.onerror = (event: any) => {
        stopListening()
        const err = event.error
        console.warn('[VoiceCommander] Erro de fala:', err)

        if (err === 'not-allowed' || err === 'permission-denied') {
          setPermissionState('denied')
          setPermissionModalOpen(true)
        } else if (err === 'service-not-allowed') {
          if (onError) {
            onError('Serviço de voz do celular indisponível ou em modo de economia de energia.')
          }
        } else if (err === 'audio-capture') {
          if (onError) {
            onError('Microfone em uso por outro aplicativo no celular. Feche outros apps de áudio e tente de novo.')
          }
        } else if (err === 'network') {
          if (onError) {
            onError('O reconhecimento de voz do aparelho necessita de conexão com a internet.')
          }
        } else if (err === 'no-speech') {
          // Silêncio, não precisa exibir erro
        } else if (err !== 'aborted') {
          if (onError) {
            onError(`Microfone: ${err}`)
          }
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        cleanupAudio()
      }

      // Disparo síncrono preservando o gesto do usuário no Android e iOS
      recognition.start()
    } catch (err: any) {
      stopListening()
      console.warn('[VoiceCommander] Falha ao iniciar reconhecimento:', err)
      setPermissionModalOpen(true)
    }
  }, [stopListening, startAudioMeter, cleanupAudio, onInterimResult, onFinalResult, onError])

  // Solicita permissão ativa (pode ser usado pelo botão do banner)
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsRequestingPermission(true)
    try {
      const result = await microphoneService.requestPermission()
      setPermissionState(result.state)

      if (result.granted) {
        setPermissionModalOpen(false)
        // Se autorizado, já dispara a escuta imediatamente
        startListening()
        return true
      } else {
        if (result.state === 'denied') {
          setPermissionModalOpen(true)
        } else if (onError && result.errorMessage) {
          onError(result.errorMessage)
        }
        return false
      }
    } finally {
      setIsRequestingPermission(false)
    }
  }, [startListening, onError])

  // Alterna o microfone
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, stopListening, startListening])

  return {
    permissionState,
    isListening,
    isRequestingPermission,
    audioLevel,
    interimText,
    permissionModalOpen,
    setPermissionModalOpen,
    requestPermission,
    startListening,
    stopListening,
    toggleListening,
  }
}
