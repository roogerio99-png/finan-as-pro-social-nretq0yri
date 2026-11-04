import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CreditCard, Sparkles, LogIn, UserPlus, KeyRound } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const { login, register, requestPasswordReset, loginAsDefault } = useAuth()
  const { toast } = useToast()

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
        toast({ title: 'Bem-vindo de volta!', description: 'Login realizado com sucesso.' })
        onClose()
      } else if (mode === 'register') {
        await register(email, password, name)
        toast({ title: 'Conta criada!', description: 'Seja bem-vindo ao Gestio Finanças.' })
        onClose()
      } else if (mode === 'forgot') {
        await requestPasswordReset(email)
        toast({
          title: 'E-mail enviado',
          description: 'Verifique sua caixa de entrada para redefinir a senha.',
        })
        setMode('login')
      }
    } catch (err: any) {
      toast({
        title: 'Erro de autenticação',
        description: err.message || 'Verifique seus dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleQuickDemo = async () => {
    setLoading(true)
    try {
      await loginAsDefault()
      toast({
        title: 'Acesso Rápido liberado!',
        description: 'Conectado com conta de demonstração.',
      })
      onClose()
    } catch (err: any) {
      toast({ title: 'Aviso', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-slate-200 shadow-2xl bg-white rounded-2xl overflow-hidden">
        <CardHeader className="text-center pb-2 pt-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md">
            <CreditCard className="w-6 h-6" />
          </div>
          <CardTitle className="text-2xl font-black text-slate-900">
            {mode === 'login' && 'Entrar no Gestio Finanças'}
            {mode === 'register' && 'Criar Nova Conta'}
            {mode === 'forgot' && 'Recuperar Senha'}
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            {mode === 'login' && 'Acesse seus dados e planejamento financeiro familiar.'}
            {mode === 'register' && 'Cadastre-se para organizar suas contas e sair do vermelho.'}
            {mode === 'forgot' && 'Informe seu e-mail para receber as instruções.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <div className="space-y-1">
                <Label htmlFor="authName" className="text-xs">
                  Seu Nome
                </Label>
                <Input
                  id="authName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  required
                />
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="authEmail" className="text-xs">
                E-mail
              </Label>
              <Input
                id="authEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <Label htmlFor="authPass" className="text-xs">
                    Senha
                  </Label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-emerald-600 hover:underline"
                    >
                      Esqueceu a senha?
                    </button>
                  )}
                </div>
                <Input
                  id="authPass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl shadow-xs"
            >
              {loading
                ? 'Processando...'
                : mode === 'login'
                  ? 'Entrar'
                  : mode === 'register'
                    ? 'Criar Conta'
                    : 'Enviar E-mail de Recuperação'}
            </Button>
          </form>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-100" />
            </div>
            <div className="relative flex justify-center text-[11px] uppercase tracking-wider text-slate-400 bg-white px-2">
              ou
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={handleQuickDemo}
            className="w-full border-emerald-200 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 text-xs font-bold gap-1.5 rounded-xl"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Entrar com Conta de Demonstração
          </Button>

          <div className="text-center text-xs text-slate-500 pt-2">
            {mode === 'login' ? (
              <p>
                Não tem uma conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className="font-bold text-emerald-600 hover:underline"
                >
                  Cadastre-se grátis
                </button>
              </p>
            ) : (
              <p>
                Já tem conta?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="font-bold text-emerald-600 hover:underline"
                >
                  Fazer login
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
