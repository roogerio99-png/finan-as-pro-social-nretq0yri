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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'

export const GoogleLoginPage: React.FC = () => {
  const { loginWithGoogle, savedAccounts, removeSavedAccount } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [loadingEmail, setLoadingEmail] = useState<string | null>(null)
  const [showCustomGoogle, setShowCustomGoogle] = useState(false)
  const [customEmail, setCustomEmail] = useState('')
  const [customName, setCustomName] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSignIn = async (email: string, name?: string) => {
    setLoadingEmail(email)
    setError(null)
    try {
      await loginWithGoogle({ email, name })
      toast({
        title: 'Bem-vindo(a) ao Gestio!',
        description: `Conectado com sucesso como ${email}.`,
      })
      navigate('/painel')
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar com o Google. Tente novamente.')
    } finally {
      setLoadingEmail(null)
    }
  }

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = customEmail.trim()
    if (!trimmed || !trimmed.includes('@')) {
      setError('Informe um e-mail de Conta Google válido (ex: seu.nome@gmail.com).')
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
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 antialiased selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <div className="max-w-5xl w-full mx-auto flex items-center justify-between py-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center text-emerald-400 shadow-sm">
            <Wallet className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <span className="text-lg font-extrabold text-white tracking-tight leading-none">
                Gestio
              </span>
              <span className="text-emerald-400 font-black text-xl leading-none -ml-0.5">.</span>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mt-0.5">
              Finanças Conscientes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-800/60 border border-slate-700/60 px-3 py-1.5 rounded-full">
          <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden sm:inline">Pronto para Celular</span>
          <span className="font-semibold text-emerald-400">PWA</span>
        </div>
      </div>

      {/* Main Login Card */}
      <div className="max-w-md w-full mx-auto my-auto py-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 text-slate-900 shadow-2xl border border-slate-100 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-1 border border-emerald-100">
              <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Acesso com Conta Google
            </h1>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
              Selecione sua conta para entrar ou cadastrar uma nova conta Google para acessar suas finanças.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
              {error}
            </div>
          )}

          {!showCustomGoogle ? (
            /* Lista de Contas Google Salvas (Google Account Chooser) */
            <div className="space-y-4">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                  Contas Google neste dispositivo
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
                          className="flex-1 flex items-center gap-3 text-left min-w-0 pr-2 focus-visible:outline-hidden"
                        >
                          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs relative">
                            {getInitials(account.name, account.email)}
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs">
                              {/* Mini ícone Google */}
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
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

                        {savedAccounts.length > 1 && (
                          <button
                            type="button"
                            title="Remover conta deste dispositivo"
                            onClick={(e) => {
                              e.stopPropagation()
                              removeSavedAccount(account.email)
                            }}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Botão Oficial: Usar Outra Conta Google */}
              <button
                type="button"
                onClick={() => setShowCustomGoogle(true)}
                className="w-full flex items-center justify-center gap-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs h-11 rounded-xl transition-all shadow-2xs hover:border-slate-300"
              >
                <UserPlus className="w-4 h-4 text-emerald-600" />
                <span>Entrar com outra Conta Google</span>
              </button>
            </div>
          ) : (
            /* Formulário para Informar Nova Conta Google */
            <form onSubmit={handleCustomSubmit} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCustomGoogle(false)}
                  className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
                  title="Voltar às contas"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800">
                  Adicionar nova Conta Google
                </span>
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
              </div>

              <div className="space-y-1.5 text-left">
                <Label htmlFor="googleName" className="text-xs font-semibold text-slate-700">
                  Nome Completo
                </Label>
                <Input
                  id="googleName"
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Nome de exibição"
                  className="h-11 rounded-xl text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomGoogle(false)}
                  className="w-1/3 h-11 rounded-xl text-xs font-semibold"
                >
                  Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={Boolean(loadingEmail)}
                  className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-xl gap-2 shadow-xs"
                >
                  {loadingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Conectar com Google</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Termos de Segurança */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-2">
            <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
              <span>Ambiente criptografado com isolamento familiar por usuário.</span>
            </p>
          </div>
        </div>

        {/* Recursos Destaque */}
        <div className="mt-8 grid grid-cols-3 gap-2 text-center text-slate-400 text-[11px]">
          <div className="p-2.5 rounded-2xl bg-slate-800/40 border border-slate-800">
            <span className="block font-bold text-emerald-400 mb-0.5">Caixa &amp; Comp.</span>
            Regime duplo
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-800/40 border border-slate-800">
            <span className="block font-bold text-emerald-400 mb-0.5">Faturas &amp; Cartão</span>
            Desembolso real
          </div>
          <div className="p-2.5 rounded-2xl bg-slate-800/40 border border-slate-800">
            <span className="block font-bold text-emerald-400 mb-0.5">Modo PWA</span>
            App no Celular
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto text-center py-2 text-xs text-slate-500">
        Gestio Finanças &copy; {new Date().getFullYear()} — Autenticação Exclusiva Google Identity
      </footer>
    </div>
  )
}
