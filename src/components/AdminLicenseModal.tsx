import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  ShieldCheck,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Download,
} from 'lucide-react'
import { AppLicenseConfig, LicenseStatus } from '@/services/licenseService'
import { useToast } from '@/hooks/use-toast'

interface Props {
  isOpen: boolean
  onClose: () => void
  currentLicense: AppLicenseConfig
  onSaveLicense: (updated: AppLicenseConfig) => void
}

export const AdminLicenseModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentLicense,
  onSaveLicense,
}) => {
  const { toast } = useToast()
  const [status, setStatus] = useState<LicenseStatus>(currentLicense.status)
  const [blockedMessage, setBlockedMessage] = useState(currentLicense.blockedMessage)
  const [checkoutUrl, setCheckoutUrl] = useState(currentLicense.checkoutUrl)
  const [supportContact, setSupportContact] = useState(currentLicense.supportContact)

  const handleSave = () => {
    const updated: AppLicenseConfig = {
      ...currentLicense,
      status,
      blockedMessage,
      checkoutUrl,
      supportContact,
      updatedAt: new Date().toISOString(),
    }

    onSaveLicense(updated)
    toast({
      title: 'Configuração de Licença Salva!',
      description: `Status do aplicativo atualizado para: ${status === 'BLOCKED' ? '🔴 Bloqueado (Comercial)' : '🟢 Aberto para Testes'}`,
    })
    onClose()
  }

  const handleDownloadLicenseJson = () => {
    const updated: AppLicenseConfig = {
      ...currentLicense,
      status,
      blockedMessage,
      checkoutUrl,
      supportContact,
      updatedAt: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(updated, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'app-license.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md sm:max-w-lg p-6">
        <DialogHeader>
          <div className="flex items-center gap-2 text-emerald-700 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4" />
            <span>Controle Central do Proprietário</span>
          </div>
          <DialogTitle className="text-xl font-black text-slate-900 mt-1">
            Gestão de Licenciamento &amp; Acesso
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Controle se o Gestio Finanças está liberado gratuitamente para testes ou restrito apenas para
            assinantes pagantes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Seletor de Modo */}
          <div>
            <Label className="text-xs font-bold text-slate-700">Status de Acesso Global</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setStatus('TRIAL')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  status === 'TRIAL'
                    ? 'border-emerald-500 bg-emerald-50/60 text-emerald-950 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs">🟢 Testes Gratuitos</span>
                  {status === 'TRIAL' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                </div>
                <span className="text-[11px] text-slate-500 mt-1">
                  Qualquer convidado pode testar 100% no celular.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('BLOCKED')}
                className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                  status === 'BLOCKED'
                    ? 'border-amber-500 bg-amber-50/60 text-amber-950 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-xs">🔴 Bloqueio Comercial</span>
                  {status === 'BLOCKED' && <Lock className="w-4 h-4 text-amber-600" />}
                </div>
                <span className="text-[11px] text-slate-500 mt-1">
                  Exige plano/assinatura para liberar o uso.
                </span>
              </button>
            </div>
          </div>

          {/* Mensagem de Bloqueio */}
          <div>
            <Label className="text-xs font-bold text-slate-700">Mensagem para os Usuários Bloqueados</Label>
            <Textarea
              value={blockedMessage}
              onChange={(e) => setBlockedMessage(e.target.value)}
              rows={3}
              className="mt-1 text-xs resize-none"
              placeholder="Digite a mensagem que o usuário verá ao ser bloqueado..."
            />
          </div>

          {/* Link de Checkout / WhatsApp de Vendas */}
          <div>
            <Label className="text-xs font-bold text-slate-700">Link de Assinatura / WhatsApp Comercial</Label>
            <Input
              value={checkoutUrl}
              onChange={(e) => setCheckoutUrl(e.target.value)}
              className="mt-1 text-xs"
              placeholder="https://wa.me/55... ou link de pagamento"
            />
          </div>

          {/* E-mail de Suporte */}
          <div>
            <Label className="text-xs font-bold text-slate-700">E-mail ou Contato de Suporte</Label>
            <Input
              value={supportContact}
              onChange={(e) => setSupportContact(e.target.value)}
              className="mt-1 text-xs"
              placeholder="suporte@gestiofinancas.com.br"
            />
          </div>

          {/* Aviso do Admin */}
          <div className="bg-slate-100 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <span>
              <strong>Seu acesso (roogerio99@gmail.com)</strong> é imune a bloqueios e continuará funcionando
              sempre, mesmo quando você ativar o modo comercial para terceiros.
            </span>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              onClick={handleSave}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl cursor-pointer"
            >
              Salvar Alterações
            </Button>
            <Button
              variant="outline"
              onClick={handleDownloadLicenseJson}
              className="text-xs border-slate-300 text-slate-700 gap-1.5 h-10 rounded-xl cursor-pointer"
              title="Baixar arquivo app-license.json para subir no repositório"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar JSON</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
