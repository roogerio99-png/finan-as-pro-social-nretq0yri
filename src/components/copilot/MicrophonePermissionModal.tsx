import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Mic, MicOff, Lock, RefreshCw, CheckCircle2, Monitor, Smartphone, ShieldCheck } from 'lucide-react'
import { microphoneService } from '@/services/microphoneService'

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleTestPermission = async () => {
    setTesting(true)
    setTestSuccess(false)
    setErrorMessage(null)

    try {
      const result = await microphoneService.requestPermission()
      if (result.granted) {
        setTestSuccess(true)
        setTimeout(() => {
          onOpenChange(false)
          if (onPermissionGranted) onPermissionGranted()
        }, 1200)
      } else {
        setTestSuccess(false)
        setErrorMessage(
          'O microfone continua bloqueado no navegador. Siga os passos abaixo e tente novamente.',
        )
      }
    } catch (err: any) {
      setTestSuccess(false)
      setErrorMessage(err?.message || 'Erro ao testar microfone.')
    } finally {
      setTesting(false)
    }
  }

  const handleReload = () => {
    window.location.reload()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-6">
        <DialogHeader className="space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <MicOff className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-center text-slate-900">
            Como Liberar o Microfone no Navegador
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-slate-500">
            Por política de segurança do Google Chrome e Edge, quando o acesso é bloqueado, o navegador não abre o balão de permissão de novo até que você libere no topo da página:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2 text-xs">
          {/* Passo 1 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
              1
            </div>
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-indigo-600" /> Clique no ícone ao lado do endereço
              </p>
              <p className="text-slate-600 mt-0.5 text-[11px]">
                No topo da tela do navegador, clique no ícone de <strong>controles deslizantes ou cadeado</strong> que fica à esquerda de <em>https://gestio-financas-app.web.app</em>.
              </p>
            </div>
          </div>

          {/* Passo 2 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
              2
            </div>
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <Mic className="w-3.5 h-3.5 text-indigo-600" /> Mude Microfone para "Permitir"
              </p>
              <p className="text-slate-600 mt-0.5 text-[11px]">
                Localize a linha <strong>Microfone</strong> e mude de "Bloqueado" para <strong>Permitir</strong> (ou ligue a chavinha azul, ou clique em <strong>Redefinir permissões</strong>).
              </p>
            </div>
          </div>

          {/* Passo 3 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700">
            <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5">
              3
            </div>
            <div>
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" /> Clique em Testar ou Recarregar
              </p>
              <p className="text-slate-600 mt-0.5 text-[11px]">
                Após liberar, clique no botão azul abaixo <strong>"Testar Permissão Agora"</strong> para começar a usar a voz imediatamente.
              </p>
            </div>
          </div>

          {/* Dica para Android e iPhone */}
          <div className="space-y-2 pt-1">
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-950 flex items-start gap-2">
              <Smartphone className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong>No Celular Android (Chrome):</strong> Se você já permitiu no site mas continua sem ouvir, o próprio Android bloqueou o Chrome. Vá em:
                <br />
                <em>Configurações do Celular ➔ Aplicativos ➔ Chrome ➔ Permissões ➔ Microfone ➔ Permitir durante o uso do app</em>.
              </div>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <strong>No iPhone (Safari):</strong> Toque no ícone <strong>aA</strong> ao lado da barra de endereço ➔ <em>Ajustes do Site ➔ Microfone: Permitir</em>.
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        {testSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Microfone liberado com sucesso! Abrindo reconhecimento de voz...</span>
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
