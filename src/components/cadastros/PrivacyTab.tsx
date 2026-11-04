import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  ShieldCheck,
  Smartphone,
  HardDrive,
  Download,
  Trash2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  EyeOff,
  Database,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { localDataPrivacyService, LocalStorageStats } from '@/services/localDataPrivacy'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export const PrivacyTab: React.FC = () => {
  const { toast } = useToast()
  const [stats, setStats] = useState<LocalStorageStats | null>(null)
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false)
  const [confirmClearTxOpen, setConfirmClearTxOpen] = useState(false)

  const reloadStats = () => {
    setStats(localDataPrivacyService.getStats())
  }

  useEffect(() => {
    reloadStats()
  }, [])

  const handleExport = () => {
    try {
      localDataPrivacyService.exportLocalData()
      toast({
        title: 'Backup local gerado com sucesso!',
        description: 'O arquivo JSON com seus dados financeiros foi salvo no seu aparelho.',
      })
    } catch {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o arquivo de backup local.',
        variant: 'destructive',
      })
    }
  }

  const handleClearTransactions = () => {
    localDataPrivacyService.clearOnlyTransactions()
    reloadStats()
    setConfirmClearTxOpen(false)
    toast({
      title: 'Lançamentos zerados!',
      description: 'A base de lançamentos deste dispositivo está limpa para você inserir seus dados reais.',
    })
    window.location.reload()
  }

  const handleWipeAll = () => {
    localDataPrivacyService.wipeAllLocalData()
    setConfirmWipeOpen(false)
    toast({
      title: 'Dados apagados deste aparelho!',
      description: 'Todos os registros locais foram excluídos com sucesso.',
    })
    window.location.href = '/'
  }

  return (
    <div className="space-y-6">
      {/* Banner Principal de Garantia */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-950 text-white border border-emerald-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garantia de Privacidade &amp; Soberania de Dados</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Armazenamento 100% no seu Aparelho
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              O Gestio Finanças foi projetado com arquitetura <strong>Local-First</strong>. Seus dados de login, cartões, despesas e receitas ficam salvos <strong>exclusivamente na memória deste dispositivo</strong> (celular ou computador) e <strong>nunca são repassados a terceiros</strong>, intermediários ou anunciantes.
            </p>
          </div>

          <Button
            type="button"
            onClick={handleExport}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer flex-shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Baixar Backup (JSON)</span>
          </Button>
        </div>
      </div>

      {/* Grid de Auditoria e Garantias */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1">
              <Lock className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-900">Zero Transmissão a Terceiros</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Nenhuma empresa externa recebe seu e-mail, gastos ou valores bancários.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5 pt-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Sem venda ou compartilhamento de dados.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Sem rastreadores ou pixels de anúncio.</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-1">
              <Smartphone className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-900">Sandbox no Celular</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Isolamento nativo garantido pelo seu sistema operacional.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5 pt-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Armazenamento local criptografado pelo aparelho.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Funciona totalmente offline caso precise.</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-1">
              <HardDrive className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-900">Controle Total do Usuário</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Você pode exportar ou apagar tudo com um único clique.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5 pt-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Exportação completa em formato aberto (JSON).</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Limpeza imediata a qualquer momento.</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas Locais do Dispositivo */}
      <Card className="border-slate-200 shadow-xs rounded-2xl bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Auditoria de Dados Salvos Neste Dispositivo
              </CardTitle>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Atualizado {stats?.lastUpdated || 'agora'}
            </span>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Resumo transparente de tudo o que está gravado na memória do seu navegador/celular.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Lançamentos</span>
              <span className="text-xl font-black text-slate-900">{stats?.transactionsCount ?? 0}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">salvos localmente</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Contas &amp; Cartões</span>
              <span className="text-xl font-black text-slate-900">{stats?.accountsCount ?? 0}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">neste aparelho</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Categorias</span>
              <span className="text-xl font-black text-slate-900">{stats?.categoriesCount ?? 0}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">plano de contas</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">Armazenamento</span>
              <span className="text-xl font-black text-emerald-600">
                {((stats?.totalBytesApprox || 0) / 1024).toFixed(1)} KB
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">100% no seu navegador</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zona de Gestão & Limpeza do Aparelho */}
      <Card className="border-rose-100 bg-rose-50/30 shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-rose-100 bg-white">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>Gerenciamento &amp; Limpeza Local do Aparelho</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Ações seguras para resetar dados antes de repassar o celular para terceiros ou para iniciar com dados financeiros 100% reais.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-slate-200">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900">Limpar Lançamentos (Zerar Extrato)</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Remove todos os lançamentos e despesas de teste mantendo suas contas bancárias e categorias estruturadas para você cadastrar dados reais.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmClearTxOpen(true)}
              className="text-xs font-bold text-slate-700 hover:text-amber-800 hover:bg-amber-50 border-slate-300 flex-shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-600" />
              <span>Zerar Apenas Lançamentos</span>
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-rose-200">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-900">Excluir Todos os Dados Deste Aparelho</h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Apaga todas as contas salvas, sessões, lançamentos e configurações deste celular/computador. Recomendado se você for emprestar ou vender este dispositivo.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmWipeOpen(true)}
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex-shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Apagar Tudo Deste Aparelho</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Modal Confirmação: Limpar Lançamentos */}
      <Dialog open={confirmClearTxOpen} onOpenChange={setConfirmClearTxOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              <span>Zerar Lançamentos Financeiros?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              Esta ação removerá todos os lançamentos salvos localmente no seu aparelho para permitir que você insira seus dados financeiros reais. Suas contas cadastradas e categorias serão preservadas.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setConfirmClearTxOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleClearTransactions} className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold">
              Confirmar e Zerar Lançamentos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação: Wipe Completo */}
      <Dialog open={confirmWipeOpen} onOpenChange={setConfirmWipeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-900 flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Apagar Todos os Dados Deste Aparelho?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              Todos os dados do Gestio Finanças gravados no armazenamento local deste navegador serão apagados imediatamente. Recomendamos que você faça o download do <strong>Backup JSON</strong> antes se desejar guardar uma cópia.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setConfirmWipeOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleWipeAll} variant="destructive" className="text-xs font-bold">
              Sim, Apagar Tudo
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
