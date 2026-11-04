import React, { useState, useEffect } from 'react'
import { Smartphone, Download, X, Share2, PlusSquare, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [showIosInstructions, setShowIosInstructions] = useState(false)
  const [showGenericInstructions, setShowGenericInstructions] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Verifica se já está rodando como app instalado no celular
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    setIsStandalone(isStandaloneMode)

    // Detecta iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIos(isIosDevice)

    // Verifica se usuário já dispensou nesta sessão
    const wasDismissed = sessionStorage.getItem('pwa_prompt_dismissed') === 'true'
    if (wasDismissed) {
      setDismissed(true)
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const manualOpenHandler = () => {
      if (deferredPrompt) {
        handleInstallClick()
      } else if (isIosDevice) {
        setShowIosInstructions(true)
      } else {
        setShowGenericInstructions(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('open-pwa-install', manualOpenHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('open-pwa-install', manualOpenHandler)
    }
  }, [deferredPrompt, isIos])

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choiceResult = await deferredPrompt.userChoice
      if (choiceResult.outcome === 'accepted') {
        setIsStandalone(true)
      }
      setDeferredPrompt(null)
    } else if (isIos) {
      setShowIosInstructions(true)
    }
  }

  const handleDismiss = () => {
    setDismissed(true)
    sessionStorage.setItem('pwa_prompt_dismissed', 'true')
  }

  const showBanner = !isStandalone && !dismissed && (Boolean(deferredPrompt) || isIos)

  return (
    <>
      {showBanner && (
        <aside
          aria-label="Instalação do aplicativo no celular"
          className="fixed top-16 left-0 right-0 z-30 bg-slate-900/95 text-white backdrop-blur-md border-b border-slate-800 shadow-lg px-4 py-3 transition-all"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                  Instale o Gestio no seu Celular
                  <span className="hidden sm:inline text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Aplicativo PWA
                  </span>
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  Acesse direto da tela inicial, em tela cheia e com máxima velocidade.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleInstallClick}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar</span>
              </Button>
              <button
                onClick={handleDismiss}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                title="Dispensar aviso"
                aria-label="Dispensar aviso de instalação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Modal explicativo para iOS Safari */}
      {showIosInstructions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Como instalar no iPhone / iPad
              </h3>
              <button
                onClick={() => setShowIosInstructions(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              No Safari da Apple, você pode adicionar o Gestio Finanças direto na sua tela inicial:
            </p>

            <ol className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  1
                </span>
                <span>
                  Toque no ícone de <strong>Compartilhar</strong>{' '}
                  <Share2 className="w-3.5 h-3.5 inline text-blue-600 -mt-0.5" /> na barra do
                  navegador.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  2
                </span>
                <span>
                  Role a lista e escolha{' '}
                  <strong>
                    Adicionar à Tela de Início{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-slate-800 -mt-0.5" />
                  </strong>
                  .
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                  3
                </span>
                <span>
                  Confirme em <strong>Adicionar</strong> no canto superior direito.
                </span>
              </li>
            </ol>

            <Button
              onClick={() => setShowIosInstructions(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Entendi
            </Button>
          </div>
        </div>
      )}

      {/* Modal explicativo geral / Android / Chrome */}
      {showGenericInstructions && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-emerald-600" />
                Instalar no seu Aparelho
              </h3>
              <button
                onClick={() => setShowGenericInstructions(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              O Gestio Finanças é um aplicativo progressivo (PWA). Para instalá-lo no seu celular:
            </p>

            <div className="space-y-2 text-xs text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
              <p className="font-semibold text-slate-800">
                1. Toque nos três pontinhos ⋮ no topo do navegador Google Chrome.
              </p>
              <p className="font-semibold text-slate-800">
                2. Selecione <strong>"Instalar aplicativo"</strong> ou{' '}
                <strong>"Adicionar à tela inicial"</strong>.
              </p>
              <p className="text-[11px] text-emerald-700 font-medium">
                O aplicativo ficará salvo no seu celular como um app nativo, sem barras de navegação!
              </p>
            </div>

            <Button
              onClick={() => setShowGenericInstructions(false)}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 rounded-xl"
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Fechar
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
