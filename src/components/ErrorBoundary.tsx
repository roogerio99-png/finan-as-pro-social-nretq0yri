import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary capturou erro não tratado:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.href = '/painel'
  }

  private handleReload = () => {
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-2xs">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Ops! Algo inesperado aconteceu
            </h2>

            <p className="text-xs text-slate-600 leading-relaxed">
              O sistema identificou uma inconsistência momentânea e protegeu seus dados para evitar
              corrupção de saldo ou lançamentos.
            </p>

            {this.state.error && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left overflow-auto max-h-32 text-[11px] font-mono text-slate-600">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Button
                variant="outline"
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-semibold"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Recarregar Aplicativo
              </Button>
              <Button
                onClick={this.handleReset}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center gap-2 h-10 rounded-xl text-xs font-bold shadow-xs"
              >
                <Home className="w-3.5 h-3.5" />
                Ir ao Início
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
