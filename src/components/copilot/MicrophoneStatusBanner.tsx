import React from 'react'
import { Mic, MicOff, CheckCircle2, Lock, Sparkles, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MicPermissionState } from '@/services/microphoneService'

interface MicrophoneStatusBannerProps {
  permissionState: MicPermissionState
  isRequesting: boolean
  onRequestPermission: () => void
  onOpenHelpModal: () => void
}

export const MicrophoneStatusBanner: React.FC<MicrophoneStatusBannerProps> = ({
  permissionState,
  isRequesting,
  onRequestPermission,
  onOpenHelpModal,
}) => {
  if (permissionState === 'granted') {
    return (
      <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-emerald-50/80 border border-emerald-200 text-emerald-800 text-xs">
        <div className="flex items-center gap-2 font-medium">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600"></span>
          </span>
          <span>Microfone 100% autorizado e pronto para receber seus comandos de voz.</span>
        </div>
        <div className="text-[11px] font-semibold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-xs">
          Nativo Ativo
        </div>
      </div>
    )
  }

  if (permissionState === 'denied') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
        <div className="flex items-start gap-2.5">
          <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700 shrink-0 mt-0.5">
            <MicOff className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold">Acesso ao microfone está bloqueado no navegador</p>
            <p className="text-amber-700 text-[11px] mt-0.5">
              O navegador bloqueou o microfone para este site. Clique ao lado do link para liberar e começar a ditar.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={onOpenHelpModal}
          variant="outline"
          size="sm"
          className="rounded-xl border-amber-300 bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold gap-1.5 shrink-0 shadow-xs"
        >
          <Lock className="w-3.5 h-3.5 text-amber-600" />
          Como Desbloquear
        </Button>
      </div>
    )
  }

  if (permissionState === 'prompt') {
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-emerald-50 border border-indigo-100 shadow-xs text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm shrink-0">
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Lançamento Rápido por Voz
            </p>
            <p className="text-slate-600 text-[11px] mt-0.5">
              Cadastre despesas e receitas falando naturalmente (ex: <em>"Almoço 42 reais"</em>).
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={onRequestPermission}
          disabled={isRequesting}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-2 px-4 shadow-sm shrink-0 active:scale-95 transition-all"
        >
          {isRequesting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Aguardando Permissão...
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5" />
              Ativar Microfone Agora
            </>
          )}
        </Button>
      </div>
    )
  }

  return null
}
