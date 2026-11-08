import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ShieldCheck,
  Smartphone,
  HardDrive,
  Download,
  Upload,
  Trash2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  RefreshCw,
  Database,
  KeyRound,
  FileText,
  Info,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { localDataPrivacyService, LocalStorageStats } from '@/services/localDataPrivacy'
import { backupService } from '@/services/backupService'
import { authService } from '@/services/auth'
import { indexedDbStore } from '@/lib/storage/indexedDbStore'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

export const PrivacyTab: React.FC = () => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState<LocalStorageStats | null>(null)
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  // Modais de Ações
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false)
  const [confirmClearTxOpen, setConfirmClearTxOpen] = useState(false)
  const [confirmClearCacheOpen, setConfirmClearCacheOpen] = useState(false)

  // Modais de Backup / Restauração
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [exporting, setExporting] = useState(false)

  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null)
  const [restorePassword, setRestorePassword] = useState('')
  const [restoreIsEncrypted, setRestoreIsEncrypted] = useState(false)
  const [restoring, setRestoring] = useState(false)

  const reloadStats = () => {
    setStats(localDataPrivacyService.getStats())
    setLastBackup(backupService.getLastBackupDate())
  }

  useEffect(() => {
    reloadStats()
  }, [])

  // AÇÃO 1: Exportar Backup (com ou sem senha AES-GCM)
  const handleExportBackup = async () => {
    setExporting(true)
    try {
      const { filename, content } = await backupService.createBackup(exportPassword)
      backupService.triggerDownload(filename, content)
      setExportModalOpen(false)
      setExportPassword('')
      reloadStats()
      toast({
        title: 'Backup concluído com sucesso!',
        description: `Arquivo "${filename}" salvo no seu dispositivo. Guarde-o em local seguro.`,
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar backup',
        description: err?.message || 'Falha ao consolidar registros do IndexedDB.',
        variant: 'destructive',
      })
    } finally {
      setExporting(false)
    }
  }

  // AÇÃO 2: Seleção de Arquivo para Restauração
  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const inspection = await backupService.inspectBackupFile(text)
      setRestoreFileContent(text)
      setRestoreIsEncrypted(inspection.isEncrypted)
      setRestoreModalOpen(true)
    } catch (err: any) {
      toast({
        title: 'Arquivo de backup inválido',
        description: err?.message || 'Selecione um arquivo .gestiobackup válido.',
        variant: 'destructive',
      })
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // AÇÃO 2.1: Confirmar Restauração por Substituição Atômica
  const handleConfirmRestore = async () => {
    if (!restoreFileContent) return
    setRestoring(true)
    try {
      const result = await backupService.restoreBackup(restoreFileContent, restorePassword)
      setRestoreModalOpen(false)
      setRestoreFileContent(null)
      setRestorePassword('')
      reloadStats()
      toast({
        title: 'Base de dados restaurada!',
        description: `${result.restoredCounts.transactions || 0} lançamentos e ${result.restoredCounts.accounts || 0} contas recuperados. Recarregando...`,
      })
      setTimeout(() => window.location.reload(), 1200)
    } catch (err: any) {
      toast({
        title: 'Falha na restauração',
        description: err?.message || 'Verifique a senha informada.',
        variant: 'destructive',
      })
    } finally {
      setRestoring(false)
    }
  }

  // AÇÃO 3: Bloquear Cofre / Sair
  const handleLockVault = () => {
    authService.lockVault()
    toast({
      title: 'Cofre bloqueado',
      description: 'Acesso encerrado. Seus dados permanecem intactos e protegidos no dispositivo.',
    })
    window.location.href = '/'
  }

  // AÇÃO 4: Atualizar Aplicativo (Renovar código preservando o banco IndexedDB)
  const handleUpdateApp = async () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      } catch {
        // ignore
      }
    }
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) {
          await reg.update()
        }
      } catch {
        // ignore
      }
    }
    toast({
      title: 'Atualizando aplicativo...',
      description: 'Recarregando última versão estática. Seu banco de dados IndexedDB permanece 100% preservado.',
    })
    setTimeout(() => window.location.reload(), 800)
  }

  // AÇÃO 5: Limpar Apenas Cache do Navegador (Assets Estáticos)
  const handleClearStaticCache = async () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const keys = await caches.keys()
        await Promise.all(keys.map((k) => caches.delete(k)))
      } catch {
        // ignore
      }
    }
    setConfirmClearCacheOpen(false)
    toast({
      title: 'Cache de arquivos limpo!',
      description: 'Apenas ícones e arquivos HTML/JS foram renovados. Nenhum lançamento financeiro foi tocado.',
    })
  }

  // AÇÃO 6: Zerar apenas Lançamentos
  const handleClearTransactions = () => {
    localDataPrivacyService.clearOnlyTransactions()
    reloadStats()
    setConfirmClearTxOpen(false)
    toast({
      title: 'Lançamentos zerados!',
      description: 'Suas contas e categorias continuam ativas para você inserir novos registros reais.',
    })
    setTimeout(() => window.location.reload(), 800)
  }

  // AÇÃO 7: Apagar Meus Dados (Exclusão Local Completa com Confirmação Dupla)
  const handleWipeAll = async () => {
    await indexedDbStore.purgeAllData()
    localDataPrivacyService.wipeAllLocalData()
    setConfirmWipeOpen(false)
    toast({
      title: 'Todos os dados locais foram excluídos.',
      description: 'O armazenamento do aparelho foi completamente limpo.',
    })
    window.location.href = '/'
  }

  return (
    <div className="space-y-6">
      {/* Banner Principal de Arquitetura Local */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-12 -mt-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Base Local Exclusiva • IndexedDB Privado</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Soberania &amp; Isolamento no seu Aparelho
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Todos os lançamentos, cartões, metas, regras e orçamentos residem{' '}
              <strong className="text-white font-semibold">exclusivamente no IndexedDB deste navegador</strong>. Nenhum dado financeiro é transmitido para servidores remotos ou bancos de dados na nuvem.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
            <Button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Backup</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700 font-bold text-xs h-10 px-4 rounded-xl gap-2 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span>Restaurar Backup</span>
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".gestiobackup,.json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* AVISO INSTITUCIONAL OBRIGATÓRIO DE PERSISTÊNCIA LOCAL */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs leading-relaxed text-amber-950">
          <p className="font-bold">Aviso Obrigatório de Persistência Local:</p>
          <p>
            Limpar dados do site, utilizar navegação anônima/privada, trocar de perfil/navegador ou sofrer remoção de armazenamento pelo sistema operacional pode apagar sua base local. A persistência solicitada ao navegador reduz riscos, mas <strong>não substitui backups regulares</strong>. Exporte seu backup periodicamente e guarde-o em local seguro não sincronizado.
          </p>
          {lastBackup ? (
            <p className="text-[11px] font-semibold text-emerald-800 pt-1">
              Último backup registrado neste aparelho: {new Date(lastBackup).toLocaleString('pt-BR')}
            </p>
          ) : (
            <p className="text-[11px] font-bold text-rose-700 pt-1">
              Atenção: Nenhum backup recente foi exportado ainda neste dispositivo.
            </p>
          )}
        </div>
      </div>

      {/* Grid de Auditoria e Garantias Técnicas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1">
              <Lock className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Zero Chamadas REST/SSE
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Operação local garantida sem sincronização ou tráfego de dados.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5 pt-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Sem tráfego de saldos ou transações na rede.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Sem rastreadores ou chamadas para APIs de terceiros.</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-1">
              <Smartphone className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-900">IndexedDB Transacional</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Banco persistente com confirmação estrita de gravação (ACID).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5 pt-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Lançamentos salvos apenas com transação confirmada.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Proteção com navigator.storage.persist() ativa.</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-1">
              <HardDrive className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Cofre com Senha Opcional
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Criptografia AES-GCM com derivação PBKDF2 Web Crypto.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5 pt-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Backups protegidos com senha do usuário.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Bloqueio de cofre sem perda de registros.</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estatísticas de Dados Salvos no Aparelho */}
      <Card className="border-slate-200 shadow-xs rounded-2xl bg-white overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 py-4 px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Auditoria de Armazenamento Local
              </CardTitle>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Atualizado {stats?.lastUpdated || 'agora'}
            </span>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Resumo dos registros financeiros gravados no banco IndexedDB deste dispositivo.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Lançamentos
              </span>
              <span className="text-xl font-black text-slate-900">
                {stats?.transactionsCount ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">salvos no IndexedDB</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Contas &amp; Cartões
              </span>
              <span className="text-xl font-black text-slate-900">{stats?.accountsCount ?? 0}</span>
              <span className="text-[10px] text-slate-400 block mt-0.5">neste aparelho</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Categorias ERP
              </span>
              <span className="text-xl font-black text-slate-900">
                {stats?.categoriesCount ?? 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">plano estrutural</span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                Status Persistência
              </span>
              <span className="text-sm font-bold text-emerald-700 block mt-1">
                {indexedDbStore.isPersistedStorage ? 'Protegido (Persistente)' : 'Ativo (PWA Local)'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">isolamento total</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIFERENCIAÇÃO CLARA DAS AÇÕES DA INTERFACE (Item 5 da Especificação) */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span>Ações de Controle do Aplicativo &amp; Dispositivo</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Ações com limites estritos para não confundir atualização, limpeza de cache estático e exclusão de dados.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* AÇÃO: Bloquear / Sair */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-700" />
                <span>Bloquear Cofre / Encerrar Sessão</span>
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Fecha o acesso imediato à visualização dos dados sem apagar absolutamente nada do IndexedDB.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleLockVault}
              className="text-xs font-bold text-slate-700 hover:bg-slate-200 border-slate-300 flex-shrink-0 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 mr-1" />
              <span>Bloquear Agora</span>
            </Button>
          </div>

          {/* AÇÃO: Atualizar Aplicativo */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-indigo-50/50 border border-indigo-200">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
                <span>Atualizar Versão do Aplicativo</span>
              </h4>
              <p className="text-[11px] text-indigo-900/80 leading-relaxed">
                Baixa a versão de código mais recente do servidor estático mantendo 100% dos seus lançamentos e anexos intactos.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleUpdateApp}
              className="text-xs font-bold text-indigo-800 bg-white hover:bg-indigo-100 border-indigo-300 flex-shrink-0 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              <span>Atualizar Código</span>
            </Button>
          </div>

          {/* AÇÃO: Limpar Cache de Ativos Estáticos */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-600" />
                <span>Limpar Cache de Arquivos Estáticos</span>
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Remove apenas os arquivos temporários do Service Worker (imagens, estilos e scripts). Não toca no banco de lançamentos.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmClearCacheOpen(true)}
              className="text-xs font-bold text-slate-700 hover:bg-slate-200 border-slate-300 flex-shrink-0 cursor-pointer"
            >
              <span>Limpar Apenas Cache</span>
            </Button>
          </div>

          {/* AÇÃO: Zerar Lançamentos */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-amber-50/50 border border-amber-200">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                <span>Zerar Apenas Lançamentos</span>
              </h4>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                Apaga os lançamentos de teste ou extratos importados, preservando as contas bancárias e categorias estruturadas.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmClearTxOpen(true)}
              className="text-xs font-bold text-amber-900 bg-white hover:bg-amber-100 border-amber-300 flex-shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1 text-amber-700" />
              <span>Zerar Lançamentos</span>
            </Button>
          </div>

          {/* AÇÃO: Apagar Meus Dados */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-rose-50/50 border border-rose-200">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Apagar Todos os Meus Dados Deste Aparelho</span>
              </h4>
              <p className="text-[11px] text-rose-900/80 leading-relaxed">
                Exclusão total e irreversível do banco IndexedDB e chaves locais. Exige confirmação explícita.
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

      {/* MODAL: Exportar Backup (com opção de senha) */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <span>Exportar Backup Local</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              Gera um arquivo <strong>.gestiobackup</strong> contendo todas as contas, lançamentos, orçamentos, sonhos e regras De-Para gravados no aparelho.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Senha de Criptografia (Opcional, recomendada)
              </Label>
              <Input
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Deixe em branco para backup não criptografado"
                className="text-xs"
              />
              <p className="text-[10px] text-slate-500">
                Se definir uma senha, o arquivo será criptografado com <strong>AES-GCM (256 bits)</strong> e só poderá ser restaurado com ela.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setExportModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleExportBackup}
              disabled={exporting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Gerando...' : 'Baixar Arquivo de Backup'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL: Restaurar Backup */}
      <Dialog open={restoreModalOpen} onOpenChange={setRestoreModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-600" />
              <span>Restaurar Backup no Aparelho</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              A restauração substituirá a base de dados atual pelos registros do backup selecionado.
            </DialogDescription>
          </DialogHeader>

          {restoreIsEncrypted && (
            <div className="space-y-2 py-2">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Este backup está protegido por senha:</span>
              </Label>
              <Input
                type="password"
                value={restorePassword}
                onChange={(e) => setRestorePassword(e.target.value)}
                placeholder="Digite a senha usada ao criar o backup"
                className="text-xs"
                autoFocus
              />
            </div>
          )}

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
            <strong>Atenção:</strong> Os dados atuais deste aparelho serão substituídos pelo conteúdo do arquivo de backup.
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setRestoreModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRestore}
              disabled={restoring || (restoreIsEncrypted && !restorePassword)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5"
            >
              {restoring ? 'Restaurando...' : 'Confirmar e Restaurar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação: Limpar Cache Estático */}
      <Dialog open={confirmClearCacheOpen} onOpenChange={setConfirmClearCacheOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Limpar Cache Estático do Navegador?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              Isso apagará apenas cópias locais de arquivos HTML/JS/CSS armazenadas pelo navegador. Seus lançamentos, contas e relatórios no IndexedDB continuarão intactos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setConfirmClearCacheOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button onClick={handleClearStaticCache} className="bg-slate-800 text-white text-xs font-bold">
              Limpar Apenas Arquivos Estáticos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
              Todos os registros gravados no IndexedDB deste navegador serão excluídos imediatamente. Recomendamos que você faça o download do <strong>Backup</strong> antes se desejar guardar uma cópia.
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
