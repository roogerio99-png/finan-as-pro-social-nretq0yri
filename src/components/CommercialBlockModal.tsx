import React from 'react'
import { AppLicenseConfig } from '@/services/licenseService'
import { localDataPrivacyService } from '@/services/localDataPrivacy'
import { Button } from '@/components/ui/button'
import {
  Lock,
  ExternalLink,
  Download,
  LogOut,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface Props {
  license: AppLicenseConfig
}

export const CommercialBlockModal: React.FC<Props> = ({ license }) => {
  const { logout } = useAuth()

  const handleExportData = () => {
    localDataPrivacyService.exportLocalData()
  }

  const handleOpenCheckout = () => {
    window.open(license.checkoutUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 text-center space-y-5">
        {/* Ícone de Cadeado Comercial */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 border border-amber-300 flex items-center justify-center text-3xl mx-auto shadow-inner">
          <Lock className="w-8 h-8 stroke-[2.2]" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Versão Comercial</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Período de Demonstração Encerrado
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {license.blockedMessage}
          </p>
        </div>

        {/* Garantia LGPD e Segurança Local */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-left space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Seus dados continuam 100% seguros</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-normal">
            Todos os seus lançamentos e faturas estão intactos na memória do seu celular e nunca foram
            compartilhados com terceiros.
          </p>
        </div>

        {/* Ações */}
        <div className="space-y-2.5 pt-2">
          <Button
            onClick={handleOpenCheckout}
            className="w-full h-11 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md gap-2 transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
          >
            <span>Adquirir Acesso / Assinatura</span>
            <ExternalLink className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            onClick={handleExportData}
            className="w-full h-10 rounded-xl border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs gap-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Meus Dados (Backup Local)</span>
          </Button>

          <Button
            variant="ghost"
            onClick={logout}
            className="w-full text-slate-500 hover:text-slate-800 text-xs font-medium gap-1.5 h-8 cursor-pointer"
          >
            <LogOut className="w-3 h-3" />
            <span>Sair da Conta</span>
          </Button>
        </div>

        <p className="text-[10px] text-slate-400">
          Dúvidas? Entre em contato pelo suporte:{' '}
          <span className="font-semibold text-slate-600">{license.supportContact}</span>
        </p>
      </div>
    </div>
  )
}
