import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Lock, RefreshCw, CheckCircle2, ShieldAlert } from 'lucide-react'

interface MicrophonePermissionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPermissionGranted?: () => void
}

export const MicrophonePermissionModal: React.FC<MicrophonePermissionModalProps> = ({
  open,
  onOpenChange,
  onPermissionGranted,
}) => {
  const [testing, setTesting] = useState(false)
  const [testSuccess, setTestSuccess] = useState(false)

  const handleTestPermission = async () => {
    setTesting(true)
    setTestSuccess(false)
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        stream.getTracks().forEach((track) => track.stop())
        setTestSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          if (onPermissionGranted) onPermissionGranted()
        }, 1200)
      } else {
        window.location.reload()
      }
    } catch {
      setTestSuccess(false)
    } finally {
      setTesting(false)
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <MicOff className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-center text-slate-900">
            Acesso ao Microfone Bloqueado
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            O seu navegador bloqueou o microfone para este site. Como o navegador não abre a caixa de diálogo novamente depois de bloqueado, siga os passos abaixo para liberar:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
              1
            </div>
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" /> Clique no cadeado ou ícone de opções
              </p>
              <p className="text-slate-600 mt-0.5 text-[11px]">
                No topo do navegador, clique no ícone de <strong>cadeado ou controles de site</strong> à esquerda de <em>https://gestio-financas-app.web.app</em>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
              2
            </div>
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-600" /> Ative o Microfone
              </p>
              <p className="text-slate-600 mt-0.5 text-[11px]">
                Procure a opção <strong>Microfone</strong> e altere para <strong>Permitir</strong> (ou clique em <strong>Redefinir permissões</strong>).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
              3
            </div>
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Recarregue ou Teste
              </p>
              <p className="text-slate-600 mt-0.5 text-[11px]">
                Após mudar para Permitir, clique no botão de testar abaixo para ativar o comando de voz imediatamente.
              </p>
            </div>
          </div>
        </div>

        {testSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Microfone liberado com sucesso! Abrindo gravação...</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleReload}
            className="flex-1 rounded-xl text-xs font-semibold gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Recarregar Página
          </Button>

          <Button
            type="button"
            onClick={handleTestPermission}
            disabled={testing}
            className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5 shadow-sm"
          >
            <Mic className="w-3.5 h-3.5" />
            {testing ? 'Testando...' : 'Testar Permissão Agora'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
