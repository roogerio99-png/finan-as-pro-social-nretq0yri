import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Captura de fala pelo microfone com a Web Speech API do navegador
 * (webkitSpeechRecognition / SpeechRecognition), em pt-BR.
 * Não usa nenhum serviço externo nem chave de API — é o mesmo recurso nativo
 * do navegador (Chrome/Edge; no Safari/Firefox sem suporte mostra-se mensagem).
 */

interface SpeechRecognitionAlternativeLike {
  transcript: string
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike
  isFinal: boolean
  length: number
}

interface SpeechRecognitionEventLike {
  resultIndex: number
  results: { length: number; [index: number]: SpeechRecognitionResultLike }
}

interface SpeechRecognitionLike {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: { error?: string }) => void) | null
  onend: (() => void) | null
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike

const getRecognitionCtor = (): SpeechRecognitionCtor | null => {
  const w = window as unknown as Record<string, unknown>
  return (
    (w.SpeechRecognition as SpeechRecognitionCtor) ||
    (w.webkitSpeechRecognition as SpeechRecognitionCtor) ||
    null
  )
}

export type VoiceState = 'idle' | 'listening' | 'unsupported' | 'error'

export interface UseVoiceInputResult {
  supported: boolean
  state: VoiceState
  listening: boolean
  transcript: string
  interim: string
  error: string | null
  start: () => void
  stop: () => void
  reset: () => void
}

export const useVoiceInput = (
  onFinalTranscript?: (transcript: string) => void,
): UseVoiceInputResult => {
  const [supported, setSupported] = useState<boolean>(true)
  const [listening, setListening] = useState<boolean>(false)
  const [transcript, setTranscript] = useState<string>('')
  const [interim, setInterim] = useState<string>('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const finalRef = useRef<string>('')
  const callbackRef = useRef(onFinalTranscript)
  callbackRef.current = onFinalTranscript

  useEffect(() => {
    setSupported(!!getRecognitionCtor())
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        // ignore
      }
    }
  }, [])

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      // ignore
    }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setSupported(false)
      setError(
        'Seu navegador não suporta comando por voz. Use Chrome ou Edge no celular/desktop, ou preencha o formulário manualmente.',
      )
      return
    }
    setError(null)
    setTranscript('')
    setInterim('')
    finalRef.current = ''

    try {
      const recognition = new Ctor()
      recognitionRef.current = recognition
      recognition.lang = 'pt-BR'
      recognition.continuous = false
      recognition.interimResults = true
      recognition.maxAlternatives = 1

      recognition.onresult = (event) => {
        let finalText = ''
        let interimText = ''
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const res = event.results[i]
          if (res.isFinal) {
            finalText += res[0].transcript + ' '
          } else {
            interimText += res[0].transcript + ' '
          }
        }
        if (finalText) {
          finalRef.current = (finalRef.current + ' ' + finalText).replace(/\s+/g, ' ').trim()
          setTranscript(finalRef.current)
        }
        setInterim(interimText.trim())
      }

      recognition.onerror = (event) => {
        const code = event.error || 'unknown'
        setListening(false)
        if (code === 'not-allowed' || code === 'service-not-allowed') {
          setError(
            'Permissão de microfone negada. Libere o acesso ao microfone nas configurações do navegador.',
          )
        } else if (code === 'no-speech') {
          setError('Não consegui ouvir nada. Fale novamente.')
        } else if (code !== 'aborted') {
          setError('Falha ao capturar a fala. Tente novamente ou use o formulário manual.')
        }
      }

      recognition.onend = () => {
        setListening(false)
        const final = finalRef.current.trim()
        if (final && callbackRef.current) callbackRef.current(final)
      }

      recognition.start()
      setListening(true)
    } catch {
      setListening(false)
      setError('Não foi possível iniciar o microfone. Tente novamente ou use o formulário manual.')
    }
  }, [])

  const reset = useCallback(() => {
    setTranscript('')
    setInterim('')
    setError(null)
    finalRef.current = ''
  }, [])

  return {
    supported,
    state: !supported ? 'unsupported' : listening ? 'listening' : error ? 'error' : 'idle',
    listening,
    transcript,
    interim,
    error,
    start,
    stop,
    reset,
  }
}
