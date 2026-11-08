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
  RotateCcw,
  RefreshCw,
  Database,
  KeyRound,
  FileText,
  Info,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
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
  const { user, setVaultPin } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [stats, setStats] = useState<LocalStorageStats | null>(null)
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  // PIN do Cofre Local
  const [newPin, setNewPin] = useState('')
  const [savingPin, setSavingPin] = useState(false)

  // Modais de Ações
  const [confirmWipeOpen, setConfirmWipeOpen] = useState(false)
  const [confirmClearTxOpen, setConfirmClearTxOpen] = useState(false)
  const [confirmClearCacheOpen, setConfirmClearCacheOpen] = useState(false)

  // Modais de Backup / Restauração
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportPassword, setExportPassword] = useState('')
  const [exportPasswordConfirm, setExportPasswordConfirm] = useState('')
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

  // Configurar PIN local do cofre
  const handleSaveVaultPin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user?.email) return
    if (newPin.trim().length < 4) {
      toast({
        title: 'PIN muito curto',
        description: 'Informe no mínimo 4 caracteres para proteger o desbloqueio offline do seu cofre.',
        variant: 'destructive',
      })
      return
    }
    setSavingPin(true)
    try {
      await setVaultPin(user.email, newPin.trim())
      setNewPin('')
      toast({
        title: 'PIN do Cofre Atualizado!',
        description: 'O desbloqueio offline deste perfil neste navegador agora exige seu PIN local.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar PIN',
        description: err?.message || 'Não foi possível atualizar o PIN do cofre.',
        variant: 'destructive',
      })
    } finally {
      setSavingPin(false)
    }
  }

  // AÇÃO 1: Exportar Backup Criptografado Obrigatório (AES-GCM 256-bit + PBKDF2)
  const handleExportBackup = async () => {
    const cleanPwd = exportPassword.trim()
    if (cleanPwd.length < 6) {
      toast({
        title: 'Senha obrigatória (mín. 6 caracteres)',
        description: 'Para proteger seus dados financeiros fora do navegador, defina uma senha de pelo menos 6 caracteres.',
        variant: 'destructive',
      })
      return
    }
    if (exportPasswordConfirm && exportPasswordConfirm.trim() !== cleanPwd) {
      toast({
        title: 'As senhas não coincidem',
        description: 'Confirme exatamente a mesma senha para gerar o backup criptografado.',
        variant: 'destructive',
      })
      return
    }

    setExporting(true)
    try {
      const { filename, content } = await backupService.createBackup(cleanPwd)
      backupService.triggerDownload(filename, content)
      setExportModalOpen(false)
      setExportPassword('')
      setExportPasswordConfirm('')
      reloadStats()
      toast({
        title: 'Backup criptografado concluído!',
        description: `Arquivo "${filename}" protegido com AES-GCM salvo no seu dispositivo.`,
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

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: 'Arquivo excede o limite de segurança',
        description: 'O tamanho máximo permitido para arquivo de backup é 50 MB.',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      const text = await file.text()
      const inspection = await backupService.inspectBackupFile(text)
      setRestoreFileContent(text)
      setRestoreIsEncrypted(inspection.isEncrypted)
      setRestoreModalOpen(true)
    } catch (err: any) {
      toast({
        title: 'Arquivo de backup inválido',
        description: err?.message || 'Selecione um arquivo .gestiobackup íntegro.',
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
      description: 'Sessão encerrada e memória limpa. Seu banco IndexedDB permanece preservado.',
    })
    window.location.href = '/'
  }

  // AÇÃO 4: Atualizar Aplicativo (Renovar apenas caches estáticos do shell preservando o banco IndexedDB)
  const handleUpdateApp = async () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const keys = await caches.keys()
        const appShellKeys = keys.filter((k) => k.startsWith('gestio-financas-shell-'))
        await Promise.all(appShellKeys.map((k) => caches.delete(k)))
      } catch {
        // ignore
      }
    }
    if ('serviceWorker' in navigator) {
      try {
        const regs = await navigator.serviceWorker.getRegistrations()
        for (const reg of regs) {
          await reg.update()
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' })
          }
        }
      } catch {
        // ignore
      }
    }
    toast({
      title: 'Atualizando código da aplicação...',
      description: 'Seu banco de dados IndexedDB permanece preservado.',
    })
    setTimeout(() => window.location.reload(), 800)
  }

  // AÇÃO 5: Limpar Apenas Cache de Ativos Estáticos do App Shell
  const handleClearStaticCache = async () => {
    if (typeof window !== 'undefined' && 'caches' in window) {
      try {
        const keys = await caches.keys()
        const appShellKeys = keys.filter((k) => k.startsWith('gestio-financas-shell-'))
        await Promise.all(appShellKeys.map((k) => caches.delete(k)))
      } catch {
        // ignore
      }
    }
    setConfirmClearCacheOpen(false)
    toast({
      title: 'Cache de arquivos estáticos limpo!',
      description: 'Apenas o cache do Service Worker (gestio-financas-shell) foi renovado.',
    })
  }

  // AÇÃO 6: Zerar apenas Lançamentos
  const handleClearTransactions = () => {
    localDataPrivacyService.clearOnlyTransactions()
    reloadStats()
    setConfirmClearTxOpen(false)
    toast({
      title: 'Lançamentos zerados!',
      description: 'Suas contas e categorias continuam ativas neste cofre.',
    })
    setTimeout(() => window.location.reload(), 800)
  }

  // AÇÃO 7: Apagar Meus Dados (Exclusão Local Completa deste Cofre)
  const handleWipeAll = async () => {
    await indexedDbStore.purgeAllData()
    localDataPrivacyService.wipeAllLocalData()
    setConfirmWipeOpen(false)
    toast({
      title: 'Dados do cofre excluídos.',
      description: 'O compartimento local foi limpo neste navegador.',
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
              <span>Cofre Local Isolado por Perfil • IndexedDB</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Armazenamento Local &amp; Backup Criptografado
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Seus lançamentos, cartões, metas, regras e orçamentos são gravados{' '}
              <strong className="text-white font-semibold">
                no compartimento IndexedDB exclusivo do seu perfil neste navegador
              </strong>
              , sem servidor de banco de dados centralizado.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap flex-shrink-0">
            <Button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-10 px-4 rounded-xl gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Backup Criptografado</span>
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
          <p className="font-bold">Limitações do Armazenamento Local e Importância do Backup:</p>
          <p>
            Limpar dados do site, utilizar navegação anônima/privada, trocar de perfil/navegador ou
            sofrer remoção de armazenamento pelo sistema operacional pode apagar sua base local. A
            persistência solicitada via <code>navigator.storage.persist()</code> reduz o risco de
            remoção automática pelo navegador, mas <strong>não substitui backups regulares</strong>.
            Exporte backups criptografados periodicamente.
          </p>
          {lastBackup ? (
            <p className="text-[11px] font-semibold text-emerald-800 pt-1">
              Último backup registrado neste aparelho:{' '}
              {new Date(lastBackup).toLocaleString('pt-BR')}
            </p>
          ) : (
            <p className="text-[11px] font-bold text-rose-700 pt-1">
              Atenção: Nenhum backup criptografado foi exportado ainda neste dispositivo.
            </p>
          )}
        </div>
      </div>

      {/* Configuração de PIN / Senha do Cofre Local */}
      {user && user.email !== 'visitante@gestio.app' && (
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-600" />
              <span>Proteção de Desbloqueio Offline (PIN / Senha Local do Cofre)</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Exija um PIN ou senha local sempre que alguém tentar desbloquear seu cofre (
              <strong>{user.email}</strong>) neste navegador.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <form
              onSubmit={handleSaveVaultPin}
              className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3"
            >
              <div className="flex-1 space-y-1">
                <Label htmlFor="vaultPinConfig" className="text-xs font-semibold text-slate-700">
                  Novo PIN / Senha Local (mínimo 4 caracteres)
                </Label>
                <Input
                  id="vaultPinConfig"
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value)}
                  placeholder="Digite o PIN para proteger seu cofre neste aparelho"
                  className="h-10 text-xs"
                />
              </div>
              <Button
                type="submit"
                disabled={savingPin || newPin.trim().length < 4}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-10 px-5 rounded-xl"
              >
                {savingPin ? 'Salvando...' : 'Definir PIN do Cofre'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Grid de Garantias Técnicas Reais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-1">
              <Lock className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Isolamento por Perfil
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Cada conta autenticada utiliza um banco IndexedDB separado.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5 pt-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Compartimento exclusivo por identidade.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Limpeza de memória ao bloquear sessão.</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-1">
              <Smartphone className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-900">
              IndexedDB Transacional
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Confirmação na UI somente após concluir a transação local.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5 pt-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Cálculos monetários em centavos inteiros.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Tratamento explícito de limite de quota.</span>
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white">
          <CardHeader className="pb-2">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-1">
              <HardDrive className="w-4 h-4" />
            </div>
            <CardTitle className="text-sm font-bold text-slate-900">
              Backup Criptografado
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              AES-GCM 256 bits com derivação PBKDF2 (100.000 iterações).
            </CardDescription>
          </CardHeader>
          <CardContent className="text-xs text-slate-600 space-y-1.5 pt-1">
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Senha obrigatória na exportação.</span>
            </p>
            <p className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Verificação de integridade antes de restaurar.</span>
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
                Auditoria de Armazenamento Local (Cofre Atual)
              </CardTitle>
            </div>
            <span className="text-[11px] font-semibold text-slate-400">
              Atualizado {stats?.lastUpdated || 'agora'}
            </span>
          </div>
          <CardDescription className="text-xs text-slate-500">
            Resumo dos registros financeiros gravados no compartimento IndexedDB ativo.
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
              <span className="text-[10px] text-slate-400 block mt-0.5">neste cofre</span>
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
                {indexedDbStore.isPersistedStorage
                  ? 'Persistência Concedida'
                  : 'Armazenamento Padrão'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">sujeito ao navegador</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* DIFERENCIAÇÃO CLARA DAS AÇÕES DA INTERFACE */}
      <Card className="border-slate-200 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-600" />
            <span>Ações de Controle de Sessão, Cache Estático e Dados</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Separação explícita entre bloqueio de sessão, atualização de código, limpeza de cache
            estático e exclusão de registros.
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
                Limpa os dados em memória e bloqueia a sessão em todas as abas abertas, preservando
                integralmente o banco no IndexedDB.
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
                Atualiza apenas os arquivos estáticos da interface mantendo todos os dados do
                IndexedDB preservados.
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
                <span>Limpar Cache de Arquivos Estáticos (Service Worker)</span>
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Remove apenas os caches de arquivos estáticos (<code>gestio-financas-shell-*</code>
                ). Não altera lançamentos nem contas.
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
                <span>Zerar Apenas Lançamentos Deste Cofre</span>
              </h4>
              <p className="text-[11px] text-amber-900/80 leading-relaxed">
                Apaga os lançamentos e extratos importados deste perfil, preservando contas
                bancárias e categorias.
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
                <span>Apagar Todos os Dados Deste Cofre</span>
              </h4>
              <p className="text-[11px] text-rose-900/80 leading-relaxed">
                Exclusão total e irreversível do compartimento IndexedDB atual. Exige confirmação
                explícita.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setConfirmWipeOpen(true)}
              className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex-shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              <span>Apagar Tudo Deste Cofre</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* MODAL: Exportar Backup Criptografado Obrigatório */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-600" />
              <span>Exportar Backup Criptografado</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              Gera um arquivo <strong>.gestiobackup</strong> criptografado com{' '}
              <strong>AES-GCM (256 bits)</strong> e derivação <strong>PBKDF2</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Senha de Proteção do Backup (Obrigatória, mín. 6 caracteres) *
              </Label>
              <Input
                type="password"
                value={exportPassword}
                onChange={(e) => setExportPassword(e.target.value)}
                placeholder="Defina uma senha forte (mín. 6 caracteres)"
                className="text-xs"
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Confirmar Senha do Backup *
              </Label>
              <Input
                type="password"
                value={exportPasswordConfirm}
                onChange={(e) => setExportPasswordConfirm(e.target.value)}
                placeholder="Repita a senha do backup"
                className="text-xs"
                required
              />
              <p className="text-[10px] text-slate-500 pt-1">
                Guarde esta senha com segurança. Sem ela, não será possível descriptografar o
                arquivo de backup.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setExportModalOpen(false)} className="text-xs">
              Cancelar
            </Button>
            <Button
              onClick={handleExportBackup}
              disabled={exporting || exportPassword.trim().length < 6}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              {exporting ? 'Criptografando...' : 'Baixar Backup Criptografado'}
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
              <span>Restaurar Backup no Cofre Atual</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              A restauração validará a integridade do arquivo e substituirá os registros atuais
              deste cofre pelos dados do backup selecionado.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-[11px] flex items-center justify-between gap-2">
            <span>Deseja salvar uma cópia de segurança do estado atual antes de substituir?</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setRestoreModalOpen(false)
                setExportModalOpen(true)
              }}
              className="text-[11px] font-bold border-emerald-300 text-emerald-800 hover:bg-emerald-100 flex-shrink-0"
            >
              Baixar Atual Primeiro
            </Button>
          </div>

          {restoreIsEncrypted && (
            <div className="space-y-2 py-2">
              <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Informe a senha de descriptografia do backup:</span>
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
            <strong>Atenção:</strong> Os dados atuais deste cofre serão substituídos pelo conteúdo
            do arquivo após validação.
          </div>

          <div className="flex justify-end gap-2 pt-3">
            <Button
              variant="outline"
              onClick={() => setRestoreModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmRestore}
              disabled={restoring || (restoreIsEncrypted && !restorePassword)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold gap-1.5"
            >
              {restoring ? 'Validando e Restaurando...' : 'Confirmar e Restaurar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmação: Limpar Cache Estático */}
      <Dialog open={confirmClearCacheOpen} onOpenChange={setConfirmClearCacheOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Limpar Cache Estático do Service Worker?
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              Isso removerá apenas os caches de arquivos estáticos (
              <code>gestio-financas-shell-*</code>). Seus lançamentos, contas e relatórios no
              IndexedDB continuarão intactos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmClearCacheOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleClearStaticCache}
              className="bg-slate-800 text-white text-xs font-bold"
            >
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
              Esta ação removerá todos os lançamentos salvos neste cofre local, preservando suas
              contas cadastradas e categorias.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setConfirmClearTxOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleClearTransactions}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold"
            >
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
              <span>Apagar Todos os Dados Deste Cofre?</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600 pt-2 leading-relaxed">
              Todos os registros gravados no compartimento IndexedDB atual serão excluídos
              permanentemente. Exporte um backup criptografado antes se desejar guardar uma cópia.
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
