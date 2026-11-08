import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { authService } from '@/services/auth'
import {
  ShieldCheck,
  Smartphone,
  Lock,
  KeyRound,
  Copy,
  Check,
  CheckCircle2,
  Loader2,
  ArrowLeft,
  Sparkles,
  Layers,
  CreditCard,
  TrendingUp,
  HardDrive,
  EyeOff,
  UserPlus,
  Trash2,
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

export const GoogleLoginPage: React.FC = () => {
  const { loginWithGoogle, savedAccounts, removeSavedAccount } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  // Estados de controle de autenticação e modais
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null)
  const [googleChooserOpen, setGoogleChooserOpen] = useState(false)
  const [isUsingAnotherAccount, setIsUsingAnotherAccount] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [customName, setCustomName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copiedLink, setCopiedLink] = useState(false)
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false)

  // Copiar link da aplicação para outros computadores
  const handleCopyLink = async () => {
    try {
      const urlToCopy = window.location.origin || window.location.href
      await navigator.clipboard.writeText(urlToCopy)
      setCopiedLink(true)
      toast({
        title: 'Link copiado com sucesso!',
        description:
          'Cole no navegador de outros computadores ou envie para seu celular para acessar.',
      })
      setTimeout(() => setCopiedLink(false), 3000)
    } catch {
      toast({
        title: 'Endereço da plataforma:',
        description: window.location.href,
      })
    }
  }

  // Efetua autenticação direta ou via Conta Google
  const handleSignIn = async (email?: string, name?: string) => {
    const targetEmail = (email || 'visitante@gestio.app').trim()
    setLoadingEmail(targetEmail)
    setError(null)
    try {
      const loggedUser = await loginWithGoogle({ email: targetEmail, name })
      setGoogleChooserOpen(false)
      toast({
        title: `Bem-vindo(a), ${loggedUser.name}!`,
        description: email
          ? `Sessão iniciada com a Conta Google (${targetEmail}).`
          : 'Acesso de avaliação liberado com sucesso.',
      })
      navigate('/painel')
    } catch (err: any) {
      const rawMsg = err?.message || ''
      let friendly = 'Não foi possível autenticar com a Conta Google. Tente novamente.'
      if (
        rawMsg.toLowerCase().includes('failed to create record') ||
        rawMsg.toLowerCase().includes('unique')
      ) {
        friendly = 'Erro temporário ao sincronizar a conta. Tente novamente.'
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
      setError('Por favor, informe um e-mail válido da Conta Google (ex: seu.email@gmail.com).')
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
    return 'G'
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 antialiased selection:bg-indigo-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background ambient lighting glows (Task Account visual aesthetic) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-80 bg-gradient-to-b from-indigo-600/15 via-blue-600/5 to-transparent blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header - Idêntico ao Task Account com PRO pill e botão Copiar Link */}
      <header className="relative z-10 max-w-6xl w-full mx-auto flex items-center justify-between py-2 sm:py-3">
        {/* Marca / Identidade do App */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-blue-600 to-indigo-800 p-[1px] shadow-lg shadow-indigo-950/60 flex items-center justify-center">
            <div className="w-full h-full bg-[#0a0f1d] rounded-[11px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-indigo-400 stroke-[2.2]" />
            </div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-black text-white tracking-tight leading-none">
                Gestio Finanças
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-400 mt-1 hidden sm:block">
              Gestão Financeira Pessoal &amp; Familiar • Competência &amp; Caixa
            </span>
          </div>
        </div>

        {/* Ações Topo Direito: Copiar Link p/ Outros PCs & Instalar App */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800/90 border border-emerald-500/40 text-emerald-400 hover:text-emerald-300 text-xs font-semibold transition-all shadow-lg shadow-emerald-950/20 hover:border-emerald-400 hover:shadow-emerald-500/10 cursor-pointer"
            title="Copiar link para abrir em outros computadores ou navegadores"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Link Copiado!</span>
                <span className="sm:hidden">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Copiar Link p/ Outros PCs</span>
                <span className="sm:hidden">Copiar Link</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
            title="Instalar Gestio Finanças no seu Celular ou PC"
          >
            <Smartphone className="w-3.5 h-3.5 text-slate-400" />
            <span>Instalar App</span>
          </button>
        </div>
      </header>

      {/* Main Login Card - Design Dark Corporativo com Exclusividade de Conta Google */}
      <main className="relative z-10 max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-[#0c1222]/90 backdrop-blur-2xl rounded-3xl p-7 sm:p-9 text-slate-100 shadow-2xl shadow-black/80 border border-slate-800/90 relative overflow-hidden space-y-6">
          {/* Subtle top glowing hairline */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/70 to-transparent pointer-events-none" />

          {/* Badge superior: Portal de Acesso Corporativo / Seguro */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-xs font-medium shadow-xs">
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Portal de Acesso Seguro</span>
            </div>
          </div>

          {/* Título & Descrição de Acesso */}
          <div className="text-center space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Acesso ao Cofre Local
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm mx-auto">
              Armazenamento <strong className="text-emerald-400 font-semibold">100% no seu dispositivo</strong> (PWA Offline-First). Seus dados financeiros não dependem de servidores externos.
            </p>
          </div>

          {/* Alerta de erro amigável se houver */}
          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs font-medium leading-relaxed">
              {error}
            </div>
          )}

          {/* Botão Principal: Acesso Direto ao Cofre Local */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={Boolean(loadingEmail)}
              onClick={() => {
                setError(null)
                authService.loginLocal('Minhas Finanças')
                toast({
                  title: 'Cofre Local Aberto',
                  description: 'Você está no modo offline seguro com dados salvos no IndexedDB.',
                })
                navigate('/')
              }}
              className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm h-12 rounded-2xl border border-emerald-400/80 shadow-lg shadow-emerald-950/40 hover:shadow-xl transition-all active:scale-[0.99] cursor-pointer"
            >
              <ShieldCheck className="w-5 h-5 text-slate-950 flex-shrink-0" />
              <span>Acessar Meu Cofre Local (Sem Servidor)</span>
            </button>

            <button
              type="button"
              disabled={Boolean(loadingEmail)}
              onClick={() => {
                setError(null)
                setGoogleChooserOpen(true)
              }}
              className="w-full flex items-center justify-center gap-3 bg-slate-900/90 hover:bg-slate-800 text-slate-200 font-semibold text-xs h-10 rounded-xl border border-slate-700/80 transition-all cursor-pointer"
            >
              {/* Ícone Multicolorido do Google */}
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
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
              <span>Personalizar Perfil com Conta Google</span>
            </button>
          </div>

          {/* Destaque de Privacidade Local & Garantia Zero Terceiros */}
          <div className="p-4 rounded-2xl bg-[#080d19]/80 border border-slate-800/90 text-left space-y-2">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                Salvo 100% no seu Dispositivo
              </span>
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(true)}
                className="text-[11px] font-semibold text-emerald-400/90 hover:text-emerald-300 underline cursor-pointer"
              >
                Como funciona
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Os dados de login e lançamentos residem unicamente na memória deste aparelho. Nenhuma
              informação pessoal ou financeira é repassada para terceiros.
            </p>
          </div>

          {/* Acesso Convidado (Modo Demonstração) - Ideal para compartilhamento com terceiros sem expor dados */}
          <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
            <button
              type="button"
              disabled={Boolean(loadingEmail)}
              onClick={() => handleSignIn('visitante@gestio.app', 'Visitante Convidado')}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Modo Avaliação / Convidado (Sem Login)</span>
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
              className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-medium text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instalar Aplicativo no Celular (PWA)</span>
            </button>
          </div>
        </div>

        {/* Recursos em Destaque no Rodapé da Tela */}
        <div className="mt-6 grid grid-cols-3 gap-2.5 text-center text-slate-400 text-[11px]">
          <div className="p-3 rounded-2xl bg-[#0c1222]/60 border border-slate-800/80 flex flex-col items-center justify-center">
            <Layers className="w-4 h-4 text-indigo-400 mb-1" />
            <span className="block font-bold text-slate-200">Regime Duplo</span>
            <span className="text-[10px] text-slate-400">Caixa &amp; Comp.</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#0c1222]/60 border border-slate-800/80 flex flex-col items-center justify-center">
            <CreditCard className="w-4 h-4 text-emerald-400 mb-1" />
            <span className="block font-bold text-slate-200">Faturas &amp; Cartão</span>
            <span className="text-[10px] text-slate-400">Desembolso real</span>
          </div>
          <div className="p-3 rounded-2xl bg-[#0c1222]/60 border border-slate-800/80 flex flex-col items-center justify-center">
            <TrendingUp className="w-4 h-4 text-blue-400 mb-1" />
            <span className="block font-bold text-slate-200">Planejamento</span>
            <span className="text-[10px] text-slate-400">Metas &amp; Dívidas</span>
          </div>
        </div>
      </main>

      {/* MODAL OFICIAL: Escolha de Conta Google (Idêntico ao Google Chrome OAuth Popup) */}
      <Dialog open={googleChooserOpen} onOpenChange={setGoogleChooserOpen}>
        <DialogContent className="sm:max-w-[420px] bg-white rounded-3xl p-6 sm:p-7 text-slate-900 border-none shadow-2xl">
          <DialogHeader className="text-left space-y-1">
            {/* Cabeçalho da Janela de Login Google */}
            <div className="flex items-center gap-2 mb-2">
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
              <span className="text-sm font-semibold text-slate-800">Fazer Login com o Google</span>
            </div>

            <DialogTitle className="text-2xl font-normal text-slate-900 tracking-tight">
              Escolha uma conta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-600">
              Prosseguir para{' '}
              <span className="text-blue-600 font-semibold">gestio-financas.app</span>
            </DialogDescription>
          </DialogHeader>

          {/* Conteúdo: Lista de Contas Disponíveis ou Formulário de Outra Conta */}
          {!isUsingAnotherAccount ? (
            <div className="space-y-1.5 pt-3">
              {/* Opção 1: Rogério Coimbra (Conta Principal Conhecida) */}
              <button
                type="button"
                disabled={Boolean(loadingEmail)}
                onClick={() => handleSignIn('roogerio99@gmail.com', 'Rogério Coimbra')}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-slate-100 transition-colors text-left group cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <div className="w-10 h-10 rounded-full bg-purple-700 text-white font-semibold text-base flex items-center justify-center flex-shrink-0 shadow-xs">
                  R
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    Rogério Coimbra
                  </div>
                  <div className="text-xs text-slate-500 truncate">roogerio99@gmail.com</div>
                </div>
                {loadingEmail === 'roogerio99@gmail.com' && (
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                )}
              </button>

              {/* Contas salvas dinamicamente no navegador (se houver) */}
              {savedAccounts &&
                savedAccounts
                  .filter((acc) => acc.email !== 'roogerio99@gmail.com')
                  .map((acc) => (
                    <div
                      key={acc.email}
                      className="flex items-center justify-between p-2 rounded-2xl hover:bg-slate-100 transition-colors"
                    >
                      <button
                        type="button"
                        disabled={Boolean(loadingEmail)}
                        onClick={() => handleSignIn(acc.email, acc.name)}
                        className="flex-1 flex items-center gap-3.5 p-1 text-left min-w-0 cursor-pointer"
                      >
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-semibold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                          {getInitials(acc.name, acc.email)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold text-slate-900 truncate">
                            {acc.name}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{acc.email}</div>
                        </div>
                        {loadingEmail === acc.email && (
                          <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSavedAccount(acc.email)}
                        className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                        title="Remover conta deste dispositivo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

              <div className="border-t border-slate-100 my-2" />

              {/* Opção 2: Usar outra conta Google */}
              <button
                type="button"
                onClick={() => setIsUsingAnotherAccount(true)}
                className="w-full flex items-center gap-3.5 p-3 rounded-2xl hover:bg-slate-100 transition-colors text-left cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full border border-slate-300 flex items-center justify-center text-slate-600 flex-shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="text-sm font-medium text-slate-800">Usar outra conta</div>
              </button>
            </div>
          ) : (
            /* Formulário quando clica em 'Usar outra conta' */
            <form onSubmit={handleCustomSubmit} className="space-y-3.5 pt-2">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsUsingAnotherAccount(false)}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800">
                  Informar outra Conta Google
                </span>
              </div>

              <div className="space-y-1 text-left">
                <Label htmlFor="googleEmail" className="text-xs font-semibold text-slate-700">
                  E-mail da Conta Google
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
              </div>

              <div className="space-y-1 text-left">
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
                  onClick={() => setIsUsingAnotherAccount(false)}
                  className="w-1/3 h-11 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={Boolean(loadingEmail)}
                  className="w-2/3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-11 rounded-xl gap-2 shadow-xs cursor-pointer"
                >
                  {loadingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Conectando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Continuar</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Rodapé Google: Português (Brasil) • Ajuda • Privacidade • Termos */}
          <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span className="hover:text-slate-800 cursor-pointer">Português (Brasil) ▾</span>
            <div className="flex items-center gap-3">
              <span className="hover:text-slate-800 cursor-pointer">Ajuda</span>
              <span className="hover:text-slate-800 cursor-pointer">Privacidade</span>
              <span className="hover:text-slate-800 cursor-pointer">Termos</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Garantia de Privacidade e Armazenamento Local */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-3xl p-6 text-slate-900 border-none shadow-2xl">
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

          <div className="space-y-3.5 py-2 text-xs text-slate-700">
            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-1">
              <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-xs">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                1. Salvo Exclusivamente no seu Celular / Aparelho
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Todas as contas, cartões, extratos e lançamentos ficam armazenados na memória local
                segura do seu navegador/aplicativo. Não há envio para servidores externos ou bancos
                de dados remotos de terceiros.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Lock className="w-4 h-4 text-teal-600" />
                2. Autenticação Segura com Conta Google
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                A identificação com a Conta Google é utilizada para criar seu perfil e associar suas
                finanças localmente no seu aparelho. Sua senha pessoal da Google nunca é solicitada
                nem exposta.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <EyeOff className="w-4 h-4 text-indigo-600" />
                3. Zero Compartilhamento com Terceiros
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Não há anúncios, rastreadores comerciais ou scripts invasivos. Nenhuma informação
                financeira ou de perfil é transferida ou comercializada com terceiros.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <HardDrive className="w-4 h-4 text-blue-600" />
                4. Soberania e Backup nas suas Mãos
              </h4>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Ao entrar no app, acesse <strong>Cadastros &gt; Privacidade</strong> para baixar um
                arquivo de backup em JSON com todos os seus dados a qualquer momento ou limpar os
                registros se for transferir o celular para outra pessoa.
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
      <footer className="relative z-10 max-w-6xl w-full mx-auto text-center py-2 text-xs text-slate-500">
        Gestio Finanças &copy; {new Date().getFullYear()} — Plataforma Segura com Armazenamento 100%
        Local no Aparelho
      </footer>
    </div>
  )
}

export default GoogleLoginPage
