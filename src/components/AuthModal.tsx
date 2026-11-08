import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Wallet, ShieldCheck, X, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const { loginWithGoogle } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleGoogleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setError('Informe um e-mail válido da sua Conta Google para continuar.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const logged = await loginWithGoogle({
        email: trimmedEmail,
        name: name.trim() || undefined,
      })
      toast({
        title: 'Autenticado com sucesso!',
        description: `Cofre isolado ativo para ${logged.email}.`,
      })
      onClose()
    } catch (err: any) {
      const msg = err?.message || 'Falha ao autenticar com a Conta Google.'
      setError(msg)
      toast({
        title: 'Autenticação não concluída',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-slate-200 shadow-2xl bg-white rounded-2xl overflow-hidden relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        <CardHeader className="text-center pb-2 pt-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto mb-2 shadow-md">
            <Wallet className="w-6 h-6" />
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider mb-1">
            Identidade &amp; Cofre Local Isolado
          </div>
          <CardTitle className="text-xl font-black text-slate-900">
            Entrar com Sua Conta Google
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Informe sua própria Conta Google para abrir seu compartimento local exclusivo neste
            navegador.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleGoogleSignIn} className="space-y-3">
            <div className="space-y-1 text-left">
              <Label htmlFor="modalGoogleEmail" className="text-xs font-semibold text-slate-700">
                E-mail da Conta Google *
              </Label>
              <Input
                id="modalGoogleEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@gmail.com"
                required
                autoFocus
                className="h-10 rounded-xl text-sm"
              />
            </div>

            <div className="space-y-1 text-left">
              <Label htmlFor="modalGoogleName" className="text-xs font-semibold text-slate-700">
                Nome de Exibição
              </Label>
              <Input
                id="modalGoogleName"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="h-10 rounded-xl text-sm"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-1/3 h-11 rounded-xl text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-11 rounded-xl gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Autenticando...' : 'Confirmar Conta'}</span>
              </Button>
            </div>
          </form>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Isolamento local por perfil no IndexedDB.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
