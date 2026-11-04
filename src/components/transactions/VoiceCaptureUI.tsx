import React from 'react'
import { Mic, Square, Loader2, Quote, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface VoiceCaptureBarProps {
  listening: boolean
  transcript: string
  interim: string
  error: string | null
  onStart: () => void
  onStop: () => void
  onClear: () => void
  className?: string
}

/**
 * Barra que mostra o estado da captura de voz e a transcrição da fala
 * para conferência do usuário (o que foi ouvido fica sempre visível).
 */
export const VoiceCaptureBar: React.FC<VoiceCaptureBarProps> = ({
  listening,
  transcript,
  interim,
  error,
  onStart,
  onStop,
  onClear,
  className,
}) => (
  <div
    className={cn(
      'bg-white rounded-2xl border shadow-xs p-4 space-y-3',
      listening
        ? 'border-emerald-300 bg-emerald-50/40'
        : error
          ? 'border-rose-200'
          : 'border-slate-200',
      className,
    )}
  >
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex items-center gap-2 flex-shrink-0">
        {listening ? (
          <Button
            onClick={onStop}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl h-10 font-bold animate-pulse"
          >
            <Square className="w-4 h-4" /> Parar de ouvir
          </Button>
        ) : (
          <Button
            onClick={onStart}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 rounded-xl h-10 font-bold"
          >
            <Mic className="w-4 h-4" /> Falar novo lançamento
          </Button>
        )}
      </div>
      <p className="text-[11px] sm:text-xs text-slate-500 leading-snug">
        {listening
          ? 'Ouvindo... diga, por exemplo: "crie uma despesa mercado de valor 250 reais na data 5 de novembro pago pela conta Nubank".'
          : 'Fale algo como "paguei 89 reais de internet pelo cartão Ultravioleta hoje" — o formulário será preenchido para você revisar antes de salvar.'}
      </p>
    </div>

    {(transcript || interim || listening) && (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1">
            <Quote className="w-3 h-3" /> Transcrição da fala
          </span>
          {!listening && transcript && (
            <button
              onClick={onClear}
              className="text-[10px] font-bold text-slate-400 hover:text-slate-600 underline"
            >
              limpar
            </button>
          )}
        </div>
        <p className="text-xs text-slate-800 leading-relaxed">
          {transcript || interim || (
            <span className="text-slate-400 italic">aguardando você falar...</span>
          )}
          {listening && interim && <span className="text-slate-400"> {interim}</span>}
        </p>
      </div>
    )}

    {error && (
      <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">
        {error}
      </p>
    )}
  </div>
)

/**
 * Botão flutuante de microfone — sempre visível na tela de Lançamentos,
 * inclusive sobrepondo o menu inferior no mobile (posição acima dele).
 */
export const VoiceFab: React.FC<{
  listening: boolean
  starting: boolean
  onClick: () => void
}> = ({ listening, starting, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={listening ? 'Parar captura de voz' : 'Lançar por voz'}
    title={listening ? 'Parar captura de voz' : 'Lançar por voz'}
    className={cn(
      'fixed z-50 right-4 bottom-20 sm:bottom-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95',
      listening
        ? 'bg-rose-600 text-white animate-pulse'
        : 'bg-emerald-600 hover:bg-emerald-700 text-white',
    )}
  >
    {starting ? (
      <Loader2 className="w-6 h-6 animate-spin" />
    ) : listening ? (
      <Square className="w-5 h-5" />
    ) : (
      <Mic className="w-6 h-6" />
    )}
    {listening && (
      <span className="absolute inset-0 rounded-full ring-4 ring-emerald-300/60 animate-ping" />
    )}
  </button>
)

/** Dica exibida quando o navegador não suporta a Web Speech API. */
export const VoiceUnsupportedNote: React.FC = () => (
  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-2.5">
    <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
    <p className="text-xs text-amber-800 leading-relaxed">
      <strong>Comando por voz não disponível neste navegador.</strong> Use o Google Chrome ou o
      Microsoft Edge (celular ou computador) para lançar falando, ou preencha o formulário manual
      normalmente — ele continua funcionando como alternativa.
    </p>
  </div>
)
