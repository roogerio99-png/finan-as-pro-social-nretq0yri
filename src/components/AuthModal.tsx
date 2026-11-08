import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Wallet, ShieldCheck, X, AlertTriangle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AuthModalProps {
  open: boolean
  onClose: () => void
}

export const AuthModal: React.FC<AuthModalProps> = ({ open, onClose }) => {
  const { loginWithGooglePopup } = useAuth()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)
    try {
      const logged = await loginWithGooglePopup()
      toast({
        title: 'Autenticado com sucesso!',
        description: `Conta Google validada (${logged.email}). Cofre isolado ativo.`,
      })
      onClose()
    } catch (err: any) {
      const msg =
        err?.message ||
        'Não foi possível validar sua Conta Google. Verifique se o pop-up não foi bloqueado.'
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
            Autenticação Google Oficial &amp; Cofre Isolado
          </div>
          <CardTitle className="text-xl font-black text-slate-900">
            Entrar com Conta Google
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Valide sua Conta Google oficial para abrir seu compartimento local exclusivo neste
            navegador.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md disabled:opacity-75"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              )}
              <span>{loading ? 'Conectando ao Google...' : 'Entrar com Conta Google'}</span>
            </button>

            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full h-10 rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Validação Google OAuth 2.0 • Isolamento local por perfil.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
