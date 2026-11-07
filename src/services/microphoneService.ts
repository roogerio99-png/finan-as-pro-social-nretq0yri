/**
 * Serviço de Gerenciamento de Microfone e Permissões do Navegador
 * Gestio Finanças - Comunicação Segura e Local
 */

export type MicPermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported'

export interface MicPermissionResult {
  granted: boolean
  state: MicPermissionState
  errorName?: string
  errorMessage?: string
}

export const microphoneService = {
  /**
   * Verifica se o navegador possui suporte básico a captura de áudio
   */
  isAudioCaptureSupported(): boolean {
    return Boolean(
      typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function',
    )
  },

  /**
   * Verifica se o navegador possui motor nativo de fala para texto (SpeechRecognition)
   */
  isSpeechRecognitionSupported(): boolean {
    if (typeof window === 'undefined') return false
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    return typeof SR === 'function'
  },

  /**
   * Obtém o construtor do SpeechRecognition com proteção contra instâncias ilegais
   */
  getSpeechRecognitionConstructor(): any {
    if (typeof window === 'undefined') return null
    return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null
  },

  /**
   * Consulta o estado atual da permissão de microfone sem abrir janelas
   */
  async getPermissionStatus(): Promise<MicPermissionState> {
    if (!this.isAudioCaptureSupported()) return 'unsupported'

    try {
      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        const status = await navigator.permissions.query({ name: 'microphone' as any })
        return status.state as MicPermissionState
      }
    } catch {
      // Alguns navegadores (ex: Firefox) não suportam query({ name: 'microphone' })
    }

    return 'prompt'
  },

  /**
   * Dispara a solicitação NATIVA do navegador para autorizar o microfone.
   * Abre o balão do Chrome/Edge/Safari: "gestio-financas quer usar seu microfone [Permitir] [Bloquear]"
   */
  async requestPermission(): Promise<MicPermissionResult> {
    if (!this.isAudioCaptureSupported()) {
      return {
        granted: false,
        state: 'unsupported',
        errorName: 'NotSupportedError',
        errorMessage: 'Seu navegador não suporta captura de microfone pela web.',
      }
    }

    try {
      // Chamada nativa padrão W3C que ativa o balão de permissão do navegador
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Permissão concedida com sucesso: libera a stream de teste imediatamente
      stream.getTracks().forEach((track) => track.stop())

      return {
        granted: true,
        state: 'granted',
      }
    } catch (err: any) {
      const errorName = err?.name || 'PermissionDeniedError'
      const isDenied =
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        errorName === 'SecurityError'

      return {
        granted: false,
        state: isDenied ? 'denied' : 'prompt',
        errorName,
        errorMessage: err?.message || 'Permissão para uso do microfone não concedida.',
      }
    }
  },

  /**
   * Abre um fluxo de áudio para medir volume e alimentar o visualizador de voz
   */
  async createAudioStream(): Promise<{
    stream: MediaStream
    audioContext: AudioContext
    analyser: AnalyserNode
  }> {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    })

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
    const audioContext = new AudioContextClass()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    const source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)

    return { stream, audioContext, analyser }
  },
}
