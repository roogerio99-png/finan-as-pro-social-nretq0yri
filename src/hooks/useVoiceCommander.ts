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
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
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
      stopListening()
    }
  }, [])

  // Limpeza de recursos de áudio e animação
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop())
      } catch {
        // ignore
      }
      streamRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close()
      } catch {
        // ignore
      }
      audioContextRef.current = null
    }

    setAudioLevel(0)
  }, [])

  // Solicita permissão de forma ativa e explícita ao navegador
  const requestPermission = useCallback(async (): Promise<boolean> => {
    setIsRequestingPermission(true)
    try {
      const result = await microphoneService.requestPermission()
      setPermissionState(result.state)

      if (result.granted) {
        setPermissionModalOpen(false)
        return true
      } else {
        if (result.state === 'denied') {
          setPermissionModalOpen(true)
        }
        return false
      }
    } finally {
      setIsRequestingPermission(false)
    }
  }, [])

  // Loop de animação do medidor de volume do microfone
  const startAudioMeter = useCallback(async () => {
    try {
      const { stream, audioContext, analyser } = await microphoneService.createAudioStream()
      streamRef.current = stream
      audioContextRef.current = audioContext
      analyserRef.current = analyser

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateMeter = () => {
        if (!analyserRef.current) return

        analyserRef.current.getByteFrequencyData(dataArray)
        let sum = 0
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i]
        }
        const average = sum / dataArray.length
        // Normaliza de 0 a 100 com sensibilidade
        const level = Math.min(100, Math.round((average / 128) * 100))
        setAudioLevel(level)

        animationFrameRef.current = requestAnimationFrame(updateMeter)
      }

      updateMeter()
    } catch (err) {
      console.warn('Não foi possível iniciar medidor de áudio:', err)
    }
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

  // Inicia a captura e transcrição de fala
  const startListening = useCallback(async () => {
    // 1. Garante permissão do navegador primeiro
    let currentPerm = permissionState
    if (currentPerm !== 'granted') {
      const granted = await requestPermission()
      if (!granted) {
        setPermissionModalOpen(true)
        return
      }
      currentPerm = 'granted'
    }

    // 2. Verifica suporte a SpeechRecognition
    const SpeechRecognition = microphoneService.getSpeechRecognitionConstructor()
    if (!SpeechRecognition) {
      if (onError) {
        onError('Navegador sem suporte nativo a transcrição de voz. Recomendamos Google Chrome ou Edge.')
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
        setInterimText('')
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
        console.warn('[VoiceCommander] Erro de reconhecimento:', err)

        if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'permission-denied') {
          setPermissionState('denied')
          setPermissionModalOpen(true)
        } else if (err === 'no-speech') {
          // Apenas silêncio
        } else if (err !== 'aborted') {
          if (onError) {
            onError(`Falha na captura: ${err}`)
          }
        }
      }

      recognition.onend = () => {
        setIsListening(false)
        cleanupAudio()
      }

      recognition.start()
    } catch (err: any) {
      stopListening()
      console.error('[VoiceCommander] Falha ao instanciar SpeechRecognition:', err)
      setPermissionModalOpen(true)
    }
  }, [
    permissionState,
    requestPermission,
    stopListening,
    startAudioMeter,
    cleanupAudio,
    onInterimResult,
    onFinalResult,
    onError,
  ])

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
