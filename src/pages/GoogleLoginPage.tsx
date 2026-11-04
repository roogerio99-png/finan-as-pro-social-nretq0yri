import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import {
  Wallet,
  ShieldCheck,
  Smartphone,
  Lock,
  UserPlus,
  Trash2,
  CheckCircle2,
  Loader2,
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Layers,
  CreditCard,
  TrendingUp,
  HardDrive,
  EyeOff,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { localDataPrivacyService } from '@/services/localDataPrivacy'

export const GoogleLoginPage: React.FC = () => {
  const { loginWithGoogle, savedAccounts, removeSavedAccount } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [loadingEmail, setLoadingEmail] = useState<string | null>(null)
  const [showCustomGoogle, setShowCustomGoogle] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [customName, setCustomName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false)

  const handleSignIn = async (email?: string, name?: string) => {
    const targetEmail = email || 'visitante@gestio.app'
    setLoadingEmail(targetEmail)
    setError(null)
    try {
      await loginWithGoogle({ email, name })
      toast({
        title: 'Bem-vindo(a) ao Gestio Finanças!',
        description: email
          ? `Conectado com sucesso com a conta ${email}.`
          : 'Acesso de demonstração liberado com sucesso.',
      })
      navigate('/painel')
    } catch (err: any) {
      const rawMsg = err?.message || ''
      let friendly = 'Falha ao autenticar com a Conta Google. Tente novamente.'
      if (rawMsg.toLowerCase().includes('failed to create record') || rawMsg.toLowerCase().includes('unique')) {
        friendly = 'Não foi possível registrar a conta no momento. Tente novamente em instantes.'
      } else if (rawMsg.toLowerCase().includes('failed to authenticate')) {
        friendly = 'Não foi possível validar as credenciais informadas.'
      } else if (rawMsg) {
        friendly = rawMsg
      }
      setError(friendly)
    } finally {
      setLoadingEmail(null)
    }
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = customEmail.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Por favor, informe um endereço de e-mail válido (ex: seu.email@gmail.com).')
      return
    }
    handleSignIn(trimmed, customName.trim() || undefined)
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/)
      if (parts.length >= 2) return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      return parts[0].slice(0, 2).toUpperCase()
    }
    if (email) return email.slice(0, 2).toUpperCase()
    return 'U'
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 antialiased selection:bg-emerald-500 selection:text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-emerald-500/10 via-emerald-600/5 to-transparent blur-3xl pointer-events-none" />

      {/* Top Header */}
      <header className="relative z-10 max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 border border-emerald-400/30 flex items-center justify-center text-white shadow-lg shadow-emerald-950/40">
            <Wallet className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="text-xl font-black text-white tracking-tight leading-none">
                Gestio
              </span>
              <span className="text-emerald-400 font-black text-2xl leading-none -ml-0.5">.</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
              Finanças Conscientes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline font-medium">Ambiente Seguro</span>
            <span className="text-emerald-400 font-semibold">• Google Auth</span>
          </div>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
            className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/70 hover:bg-emerald-900/90 border border-emerald-700/60 px-3 py-1.5 rounded-full cursor-pointer transition-colors shadow-xs"
            title="Instalar aplicativo Gestio Finanças no seu celular"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold">Instalar App</span>
          </button>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl shadow-black/40 border border-slate-100/90 space-y-6">
          {/* Header Card */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-1 border border-emerald-100/80 shadow-xs">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Acesso ao Gestio Finanças
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Acesse com sua Conta Google. Seus dados de login e finanças ficam salvos exclusivamente no armazenamento local deste aparelho.
            </p>
          </div>

          {/* Destaque de Privacidade Local & Zero Terceiros */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-slate-50 border border-emerald-200/80 text-left space-y-1.5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                100% no seu Celular • Zero Terceiros
              </span>
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(true)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
              >
                Como funciona
              </button>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Login, cartões e lançamentos residem unicamente na memória deste aparelho. Nenhuma informação pessoal é enviada ou repassada a terceiros.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {!showCustomGoogle ? (
            <div className="space-y-4">
              {/* Botão Oficial: Continuar com o Google */}
              <button
                type="button"
                disabled={Boolean(loadingEmail)}
                onClick={() => setShowCustomGoogle(true)}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm h-12 rounded-2xl border border-slate-300 shadow-xs hover:border-slate-400 hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
              >
                {/* Ícone Oficial Google */}
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Continuar com o Google</span>
              </button>

              {/* Botão Especial: Acesso Rápido de Demonstração (Sem Login) */}
              <div className="relative my-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200/80" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-wider">
                  <span className="bg-white px-3 text-slate-400">Ou para avaliação rápida</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-50 border border-emerald-100 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>Modo Demonstração (Convidado)</span>
                  </div>
                  <span className="text-[10px] bg-emerald-100/80 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                    Acesso Imediato
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Explore todos os painéis, relatórios, faturas de cartão e simuladores com dados de teste, sem precisar informar dados pessoais.
                </p>
                <Button
                  type="button"
                  variant="default"
                  disabled={Boolean(loadingEmail)}
                  onClick={() => handleSignIn('visitante@gestio.app', 'Visitante Convidado')}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  {loadingEmail === 'visitante@gestio.app' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Iniciando ambiente...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Entrar como Convidado</span>
                    </>
                  )}
                </Button>
              </div>

              {/* Lista de Contas Salvas NESTE Dispositivo (Apenas se o usuário tiver feito login anterior no navegador) */}
              {savedAccounts && savedAccounts.length > 0 && (
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                    Contas salvas neste dispositivo
                  </span>

                  <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200/90 overflow-hidden bg-white shadow-2xs">
                    {savedAccounts.map((account) => {
                      const isSelectedLoading = loadingEmail === account.email
                      return (
                        <div
                          key={account.email}
                          className="group flex items-center justify-between p-3 hover:bg-slate-50 transition-colors"
                        >
                          <button
                            type="button"
                            disabled={Boolean(loadingEmail)}
                            onClick={() => handleSignIn(account.email, account.name)}
                            className="flex-1 flex items-center gap-3 text-left min-w-0 pr-2 focus-visible:outline-hidden cursor-pointer"
                          >
                            <div className="w-9 h-9 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs relative">
                              {getInitials(account.name, account.email)}
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center shadow-xs">
                                <svg className="w-2 h-2" viewBox="0 0 24 24">
                                  <path
                                    fill="#4285F4"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                  />
                                  <path
                                    fill="#34A853"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                  />
                                  <path
                                    fill="#FBBC05"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                                  />
                                  <path
                                    fill="#EA4335"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                                  />
                                </svg>
                              </div>
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {account.name}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">{account.email}</p>
                            </div>
                            {isSelectedLoading ? (
                              <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                            )}
                          </button>

                          <button
                            type="button"
                            title="Remover conta salva deste dispositivo"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeSavedAccount(account.email)
                            }}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Formulário: Conectar com e-mail Google */
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomGoogle(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                  title="Voltar"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                    <UserPlus className="w-3 h-3 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    Informar Conta Google
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="googleEmail" className="text-xs font-semibold text-slate-700">
                  E-mail da sua Conta Google
                </Label>
                <Input
                  id="googleEmail"
                  type="email"
                  value={customEmail}
                  onChange={(e) => setCustomEmail(e.target.value)}
                  placeholder="exemplo@gmail.com"
                  className="h-11 rounded-xl text-sm"
                  required
                  autoFocus
                />
                <p className="text-[10px] text-slate-400">
                  Você pode usar qualquer endereço Google (pessoal ou Workspace).
                </p>
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="googleName" className="text-xs font-semibold text-slate-700">
                  Nome Completo (Opcional)
                </Label>
                <Input
                  id="googleName"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Como prefere ser chamado(a)?"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomGoogle(false)}
                  className="w-1/3 h-11 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={Boolean(loadingEmail)}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-xl gap-2 shadow-xs cursor-pointer"
                >
                  {loadingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Acessar com Google</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Termos de Segurança, Privacidade e Instalação */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-2.5">
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
              className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-800 font-bold text-xs transition-colors cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Instalar Aplicativo no Celular (PWA)</span>
            </button>
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(true)}
                className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Dados 100% locais no aparelho • Sem repasse a terceiros</span>
              </button>
              <span className="text-[10px] text-slate-400">
                Isolamento estrito por usuário na memória segura deste navegador.
              </span>
            </div>
          </div>
        </div>

        {/* Recursos Destaque em Grid Minimalista */}
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-slate-400 text-[11px]">
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center">
            <Layers className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="block font-bold text-slate-200">Regime Duplo</span>
            <span className="text-[10px] text-slate-400">Caixa &amp; Comp.</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center">
            <CreditCard className="w-4 h-4 text-teal-400 mb-1" />
            <span className="block font-bold text-slate-200">Faturas &amp; Cartão</span>
            <span className="text-[10px] text-slate-400">Desembolso real</span>
          </div>
          <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-col items-center justify-center">
            <TrendingUp className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="block font-bold text-slate-200">Planejamento</span>
            <span className="text-[10px] text-slate-400">Metas &amp; Dívidas</span>
          </div>
        </div>
      </main>

      {/* Modal de Garantia de Privacidade e Armazenamento Local */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6">
          <DialogHeader className="text-left space-y-1 pb-2 border-b border-slate-100">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold w-fit">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Garantia de Privacidade Local</span>
            </div>
            <DialogTitle className="text-lg font-black text-slate-900">
              Seus dados pertencem apenas a você
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Transparência total sobre como seus dados de login e finanças são tratados no Gestio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs text-slate-700">
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
              <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                1. Salvo Exclusivamente no seu Celular / Aparelho
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Todas as contas, cartões, extratos e lançamentos ficam armazenados na memória local segura do seu navegador/aplicativo (sandbox local). Não há envio para servidores centrais ou bancos de dados remotos de terceiros.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Lock className="w-4 h-4 text-teal-600" />
                2. Autenticação Segura com Conta Google
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                A identificação com a Conta Google é utilizada para criar seu perfil e associar suas finanças localmente no seu aparelho. Sua senha pessoal da Google nunca é solicitada nem exposta.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <EyeOff className="w-4 h-4 text-indigo-600" />
                3. Zero Compartilhamento com Terceiros
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Não há anúncios, rastreadores comerciais, pixels do Facebook/Meta ou ferramentas de espionagem. Nenhuma informação financeira ou de perfil é vendida ou transferida a terceiros.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <HardDrive className="w-4 h-4 text-blue-600" />
                4. Soberania e Backup nas suas Mãos
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Ao entrar no app, acesse <strong>Cadastros &gt; Privacidade</strong> para baixar um arquivo de backup em JSON com todos os seus dados a qualquer momento ou limpar os registros deste dispositivo se for transferir o celular para outra pessoa.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              type="button"
              onClick={() => setPrivacyModalOpen(false)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 px-5 rounded-xl cursor-pointer"
            >
              Entendido
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="relative z-10 max-w-5xl w-full mx-auto text-center py-2 text-xs text-slate-500">
        Gestio Finanças &copy; {new Date().getFullYear()} — Plataforma Segura com Armazenamento 100% Local no Aparelho
      </footer>
    </div>
  )
}
export default GoogleLoginPage
