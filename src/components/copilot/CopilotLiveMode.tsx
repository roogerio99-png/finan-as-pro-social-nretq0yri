import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Volume2,
  VolumeX,
  Radio,
  Zap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { copilotService } from '@/services/copilotService'
import { transactionsService } from '@/services/transactions'
import { accountsService } from '@/services/accounts'
import { categoriesService } from '@/services/categories'
import { AccountRecord, CategoryRecord } from '@/types/finance'

interface CopilotLiveModeProps {
  isOpen: boolean
  onClose: () => void
  onTransactionCreated?: () => void
  onReviewTransaction?: (data: {
    type?: 'income' | 'expense' | 'transfer'
    description?: string
    amount?: number | string | null
    date?: string
    accountId?: string
    categoryId?: string
    suggestedCategoryName?: string
  }) => void
}

type LiveState = 'idle' | 'listening' | 'thinking' | 'speaking'

export const CopilotLiveMode: React.FC<CopilotLiveModeProps> = ({
  isOpen,
  onClose,
  onTransactionCreated,
  onReviewTransaction,
}) => {
  const [liveState, setLiveState] = useState<LiveState>('idle')
  const [transcript, setTranscript] = useState('')
  const [lastBotReply, setLastBotReply] = useState(
    'Olá! Estou no modo live ouvindo você. Pode me pedir para registrar um gasto, perguntar seu saldo ou pedir dicas de orçamento.',
  )
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false)
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [categories, setCategories] = useState<CategoryRecord[]>([])

  const recognitionRef = useRef<any>(null)
  const isComponentMounted = useRef(false)
  const isSpeakingRef = useRef(false)

  // Referência para o processador de inteligência ao vivo (evita dependência circular e TDZ)
  const handleUserLiveQueryRef = useRef<(userSaid: string) => Promise<void>>(() => Promise.resolve())

  // Interrompe a escuta do microfone
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        // ignore
      }
      recognitionRef.current = null
    }
  }, [])

  // Interrompe a fala sintética
  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    isSpeakingRef.current = false
  }, [])

  // Inicializa o reconhecimento contínuo de voz
  const startListening = useCallback(() => {
    if (isSpeakingRef.current || isMuted || !isOpen) return

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) return

    stopListening()

    try {
      const recognition = new SpeechRecognition()
      recognition.lang = 'pt-BR'
      recognition.continuous = false
      recognition.interimResults = true

      recognition.onstart = () => {
        setLiveState('listening')
      }

      recognition.onresult = (event: any) => {
        let interimText = ''
        let finalText = ''

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalText += event.results[i][0].transcript
          } else {
            interimText += event.results[i][0].transcript
          }
        }

        const currentSaid = finalText || interimText
        setTranscript(currentSaid)

        if (finalText.trim().length > 0) {
          handleUserLiveQueryRef.current(finalText.trim())
        }
      }

      recognition.onerror = (e: any) => {
        if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
          setLiveState('idle')
          setLastBotReply(
            'Acesso ao microfone negado. Por favor, clique no cadeado da barra de endereço do seu navegador e autorize o microfone.',
          )
        } else if (e.error !== 'no-speech') {
          console.warn('Erro de fala no modo live:', e.error)
        }
      }

      recognition.onend = () => {
        if (isOpen && !isSpeakingRef.current && !isMuted) {
          // Reinicia levemente a escuta para manter a sessão live contínua
          setTimeout(() => {
            if (isOpen && !isSpeakingRef.current && !isMuted) {
              startListening()
            }
          }, 300)
        }
      }

      recognitionRef.current = recognition
      recognition.start()
    } catch {
      // ignore
    }
  }, [isOpen, isMuted, stopListening])

  // Função para fazer o Copiloto falar
  const speakText = useCallback(
    (text: string) => {
      if (isSpeakerMuted || typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setLiveState('idle')
        startListening()
        return
      }

      stopListening()
      window.speechSynthesis.cancel()

      // Limpa marcações markdown para leitura limpa em áudio
      const cleanSpeech = text
        .replace(/\*\*/g, '')
        .replace(/•/g, '')
        .replace(/💡|🎯|📊|📈|✍️|👉/g, '')
        .trim()

      const utterance = new SpeechSynthesisUtterance(cleanSpeech)
      utterance.lang = 'pt-BR'
      utterance.rate = 1.05
      utterance.pitch = 1.0

      // Busca voz nativa em português se disponível
      const voices = window.speechSynthesis.getVoices()
      const ptVoice = voices.find((v) => v.lang.startsWith('pt') || v.lang.includes('BR'))
      if (ptVoice) {
        utterance.voice = ptVoice
      }

      utterance.onstart = () => {
        isSpeakingRef.current = true
        setLiveState('speaking')
      }

      utterance.onend = () => {
        isSpeakingRef.current = false
        if (isComponentMounted.current && isOpen && !isMuted) {
          setLiveState('listening')
          startListening()
        } else {
          setLiveState('idle')
        }
      }

      utterance.onerror = () => {
        isSpeakingRef.current = false
        if (isComponentMounted.current && isOpen && !isMuted) {
          setLiveState('listening')
          startListening()
        }
      }

      window.speechSynthesis.speak(utterance)
    },
    [isOpen, isMuted, isSpeakerMuted, startListening, stopListening],
  )

  // Carrega contas e categorias ao abrir
  useEffect(() => {
    isComponentMounted.current = true
    if (isOpen) {
      Promise.all([accountsService.getAll(), categoriesService.getAll()]).then(([accs, cats]) => {
        if (isComponentMounted.current) {
          setAccounts(accs)
          setCategories(cats)
        }
      })
      speakText('Modo Live ativado. Pode falar comigo normalmente que estou te ouvindo.')
    }

    return () => {
      isComponentMounted.current = false
      stopListening()
      stopSpeaking()
    }
  }, [isOpen, speakText, stopListening, stopSpeaking])

  // Processador de inteligência ao vivo
  const handleUserLiveQuery = async (userSaid: string) => {
    setLiveState('thinking')
    stopListening()

    const lower = userSaid.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

    // 1. Comando de desligar
    if (lower.includes('desligar') || lower.includes('tchau') || lower.includes('encerrar chamada') || lower.includes('sair do live')) {
      speakText('Encerrando modo ao vivo. Até logo!')
      setTimeout(() => {
        onClose()
      }, 2000)
      return
    }

    // 2. Intenção de Lançamento (ex: "gastei 45 no almoço", "paguei luz 120", "recebi 500")
    if (
      lower.includes('gastei') ||
      lower.includes('paguei') ||
      lower.includes('comprei') ||
      lower.includes('recebi') ||
      lower.includes('salario') ||
      lower.includes('pix de') ||
      lower.includes('anota') ||
      lower.includes('lanca')
    ) {
      try {
        const parsed = await copilotService.parseNaturalTransaction(userSaid, accounts, categories)

        if (parsed.parseResult.amount !== null && parsed.parseResult.amount > 0) {
          const todayIso = new Date().toISOString().split('T')[0]
          const txDate = parsed.parseResult.date || todayIso

          let accId = parsed.suggestedAccountId
          if (!accId && accounts.length > 0) accId = accounts[0].id

          const tipoStr = parsed.parseResult.type === 'income' ? 'receita' : 'despesa'
          const catStr = parsed.suggestedCategoryName ? `em ${parsed.suggestedCategoryName}` : ''
          const valorFormatado = parsed.parseResult.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
          const reply = `Entendido! Preenchi a tela com a ${tipoStr} de ${valorFormatado} ${catStr}. Por favor, revise e confirme as informações na tela.`
          
          setLastBotReply(reply)
          speakText(reply)

          if (onReviewTransaction) {
            setTimeout(() => {
              onClose()
              onReviewTransaction({
                type: parsed.parseResult.type,
                description: parsed.parseResult.description || 'Lançamento via Modo Live',
                amount: parsed.parseResult.amount,
                date: txDate,
                accountId: accId || undefined,
                categoryId: parsed.suggestedCategoryId || undefined,
                suggestedCategoryName: parsed.suggestedCategoryName,
              })
            }, 2300)
            return
          }

          await transactionsService.create({
            description: parsed.parseResult.description || 'Lançamento via Modo Live',
            amount: parsed.parseResult.amount,
            type: parsed.parseResult.type,
            date: txDate,
            account_id: accId || undefined,
            category_id: parsed.suggestedCategoryId || undefined,
            status: 'completed',
          })

          if (onTransactionCreated) onTransactionCreated()
          return
        }
      } catch (err) {
        console.error('Erro ao processar lançamento live:', err)
      }
    }

    // 3. Intenção de Consulta de Saldo / Resumo do Mês
    if (lower.includes('saldo') || lower.includes('quanto tenho') || lower.includes('resumo') || lower.includes('como estao')) {
      try {
        const diag = await copilotService.getDiagnostic()
        const reply = `Suas entradas este mês estão em ${diag.totalIncomeMonth.toFixed(0)} reais, e suas despesas em ${diag.totalExpenseMonth.toFixed(0)} reais. Seu resultado atual é de ${diag.balanceMonth.toFixed(0)} reais.`
        setLastBotReply(reply)
        speakText(reply)
        return
      } catch {
        // fallback
      }
    }

    // 4. Intenção de Dica de Economia
    if (lower.includes('economizar') || lower.includes('onde gastando') || lower.includes('cortar')) {
      try {
        const diag = await copilotService.getDiagnostic()
        const top = diag.topExpenseCategories[0]
        let reply = 'Para economizar, foque em planejar compras com a regra de 48 horas.'
        if (top) {
          reply = `Atualmente sua maior saída é com ${top.name}, somando ${top.amount.toFixed(0)} reais. Estipular um teto semanal para essa categoria trará uma grande economia.`
        }
        setLastBotReply(reply)
        speakText(reply)
        return
      } catch {
        // fallback
      }
    }

    // 5. Pergunta Geral para o Copiloto
    try {
      const answer = await copilotService.askCopilot(userSaid)
      // Encurta para áudio conciso falado
      const shortAnswer = answer.split('\n\n')[0] || answer
      setLastBotReply(shortAnswer)
      speakText(shortAnswer)
    } catch {
      const fallbackReply = 'Entendi sua fala. Posso registrar novos gastos, checar seu saldo ou analisar suas metas. Como prefere continuar?'
      setLastBotReply(fallbackReply)
      speakText(fallbackReply)
    }
  }

  handleUserLiveQueryRef.current = handleUserLiveQuery

  // Alterna mute do microfone
  const toggleMute = () => {
    if (isMuted) {
      setIsMuted(false)
      startListening()
    } else {
      setIsMuted(true)
      stopListening()
      setLiveState('idle')
    }
  }

  // Alterna alto-falante
  const toggleSpeaker = () => {
    if (!isSpeakerMuted) {
      stopSpeaking()
      setIsSpeakerMuted(true)
    } else {
      setIsSpeakerMuted(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 text-white animate-in fade-in duration-200">
      {/* Topo do Modo Live */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span>Copiloto Live • Tempo Real</span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Fale livremente sem precisar clicar
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleSpeaker}
            className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
            title={isSpeakerMuted ? 'Ativar voz do Copiloto' : 'Silenciar voz do Copiloto'}
          >
            {isSpeakerMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
          </Button>

          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
          >
            <PhoneOff className="w-5 h-5 text-rose-500" />
          </Button>
        </div>
      </div>

      {/* Centro: Esfera de Voz / Orbe Interativa (Estilo Gemini Live) */}
      <div className="flex flex-col items-center justify-center my-auto space-y-8 max-w-lg mx-auto text-center">
        <div className="relative flex items-center justify-center">
          {/* Ondas Sonoras Expansivas */}
          {liveState === 'speaking' && (
            <div className="absolute w-64 h-64 rounded-full bg-purple-500/20 animate-ping pointer-events-none" />
          )}
          {liveState === 'listening' && (
            <div className="absolute w-56 h-56 rounded-full bg-emerald-500/20 animate-pulse pointer-events-none" />
          )}
          {liveState === 'thinking' && (
            <div className="absolute w-52 h-52 rounded-full bg-indigo-500/20 animate-spin pointer-events-none" />
          )}

          {/* Orbe Central */}
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full transition-all duration-500 flex items-center justify-center shadow-2xl relative ${
              liveState === 'speaking'
                ? 'bg-gradient-to-tr from-purple-600 via-indigo-500 to-pink-500 scale-105 shadow-purple-500/50'
                : liveState === 'listening'
                  ? 'bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-600 scale-100 shadow-emerald-500/40'
                  : liveState === 'thinking'
                    ? 'bg-gradient-to-tr from-indigo-600 via-slate-800 to-purple-600 scale-95 shadow-indigo-500/30'
                    : 'bg-slate-800 border-2 border-slate-700 shadow-none'
            }`}
          >
            <Sparkles className="w-12 h-12 text-white/90 animate-pulse" />
          </div>
        </div>

        {/* Status Textual do Modo Live */}
        <div className="space-y-2">
          <div className="text-sm font-extrabold uppercase tracking-widest text-indigo-400">
            {liveState === 'speaking'
              ? 'Copiloto falando...'
              : liveState === 'listening'
                ? 'Ouvindo você...'
                : liveState === 'thinking'
                  ? 'Processando...'
                  : isMuted
                    ? 'Microfone pausado'
                    : 'Aguardando fala'}
          </div>

          {/* Legenda em Tempo Real */}
          <div className="min-h-[64px] flex items-center justify-center px-4">
            <p className="text-base sm:text-lg font-medium text-slate-200 max-w-md line-clamp-3 leading-relaxed">
              {liveState === 'listening' && transcript
                ? `"${transcript}"`
                : lastBotReply}
            </p>
          </div>
        </div>
      </div>

      {/* Controles Inferiores da Chamada */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto w-full pt-4">
        {/* Botão de Microfone Mudo */}
        <Button
          size="lg"
          onClick={toggleMute}
          className={`h-14 w-14 rounded-full flex items-center justify-center transition-all ${
            isMuted
              ? 'bg-rose-600 hover:bg-rose-700 text-white'
              : 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
          }`}
          title={isMuted ? 'Desmutar microfone' : 'Mutar microfone'}
        >
          {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
        </Button>

        {/* Botão de Encerrar Modo Live */}
        <Button
          size="lg"
          onClick={onClose}
          className="h-14 px-8 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold gap-2 text-sm shadow-xl"
        >
          <PhoneOff className="w-5 h-5" />
          Encerrar Modo Live
        </Button>
      </div>
    </div>
  )
}
