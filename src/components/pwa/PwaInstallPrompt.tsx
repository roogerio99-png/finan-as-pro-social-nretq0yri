import React, { useState, useEffect } from 'react'
import {
  Smartphone,
  Download,
  X,
  Share2,
  PlusSquare,
  CheckCircle2,
  Monitor,
  Sparkles,
  ShieldCheck,
  Zap,
  HelpCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isStandalone, setIsStandalone] = useState(false)
  const [isIos, setIsIos] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'desktop'>('android')
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 1. Verifica se já está em modo PWA / Aplicativo Instalado
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')

    setIsStandalone(isStandaloneMode)

    // 2. Detecta sistema operacional
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent)
    const isAndroidDevice = /android/.test(userAgent)

    setIsIos(isIosDevice)
    setIsAndroid(isAndroidDevice)

    if (isIosDevice) {
      setActiveTab('ios')
    } else if (isAndroidDevice) {
      setActiveTab('android')
    } else {
      setActiveTab('desktop')
    }

    // 3. Verifica se foi dispensado recentemente nesta sessão
    const wasDismissed = sessionStorage.getItem('gestio_pwa_dismissed') === 'true'
    if (wasDismissed) {
      setDismissed(true)
    }

    // 4. Captura evento nativo do Chrome / Edge / Android
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    // 5. Escuta evento global personalizado para abrir instruções
    const handleManualOpen = () => {
      if (deferredPrompt) {
        handleTriggerInstall()
      } else {
        setShowModal(true)
      }
    }

    // 6. Escuta quando o app é instalado com sucesso
    const handleAppInstalled = () => {
      setIsStandalone(true)
      setDeferredPrompt(null)
      setShowModal(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('open-pwa-install', handleManualOpen)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('open-pwa-install', handleManualOpen)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [deferredPrompt])

  const handleTriggerInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt()
        const choice = await deferredPrompt.userChoice
        if (choice.outcome === 'accepted') {
          setIsStandalone(true)
        }
      } catch (err) {
        console.warn('Erro ao acionar prompt nativo:', err)
        setShowModal(true)
      } finally {
        setDeferredPrompt(null)
      }
    } else {
      setShowModal(true)
    }
  }

  const handleDismissBanner = () => {
    setDismissed(true)
    sessionStorage.setItem('gestio_pwa_dismissed', 'true')
  }

  // Não exibe o banner se o usuário já estiver dentro do aplicativo instalado
  const showBanner = !isStandalone && !dismissed

  return (
    <>
      {/* Banner Superior Discreto para Celular / Desktop */}
      {showBanner && (
        <aside
          aria-label="Instalação do aplicativo no celular"
          className="fixed top-0 left-0 right-0 z-50 bg-slate-900/95 text-white backdrop-blur-md border-b border-emerald-800/40 shadow-xl px-4 py-2.5 transition-all"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center flex-shrink-0 shadow-xs border border-emerald-400/30">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 truncate">
                  Instalar SimplaFin no Celular
                  <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    App PWA Oficial
                  </span>
                </p>
                <p className="text-[11px] text-slate-300 truncate">
                  Acesse em tela cheia com 1 toque, máxima velocidade e sem barras do navegador.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <Button
                size="sm"
                onClick={handleTriggerInstall}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-3 rounded-lg gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar App</span>
              </Button>
              <button
                type="button"
                onClick={handleDismissBanner}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                title="Fechar aviso temporariamente"
                aria-label="Dispensar aviso de instalação"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {/* Modal Completo com Instruções Passo a Passo por Plataforma */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl p-5 sm:p-6 bg-white max-h-[90vh] overflow-y-auto">
          <DialogHeader className="text-left space-y-2 pb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shadow-2xs">
              <Smartphone className="w-5 h-5 stroke-[2.2]" />
            </div>
            <DialogTitle className="text-lg font-black text-slate-900 tracking-tight">
              Instalar Aplicativo no Celular
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              O SimplaFin é um aplicativo progressivo (PWA). Você não precisa baixar pela Play
              Store ou App Store — instale diretamente pelo navegador em segundos.
            </DialogDescription>
          </DialogHeader>

          {/* Seletor de Plataforma */}
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as any)}
            className="w-full mt-1"
          >
            <TabsList className="grid grid-cols-3 w-full bg-slate-100 p-1 rounded-xl h-10">
              <TabsTrigger
                value="android"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-2xs"
              >
                Android
              </TabsTrigger>
              <TabsTrigger
                value="ios"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-2xs"
              >
                iPhone / iPad
              </TabsTrigger>
              <TabsTrigger
                value="desktop"
                className="text-xs font-bold rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-2xs"
              >
                Computador
              </TabsTrigger>
            </TabsList>

            {/* Guia Android */}
            <TabsContent value="android" className="space-y-4 pt-3 focus-visible:outline-none">
              {deferredPrompt ? (
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2.5">
                  <p className="text-xs font-bold text-emerald-900">
                    Seu navegador suporta instalação direta!
                  </p>
                  <Button
                    onClick={handleTriggerInstall}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 rounded-xl gap-2 shadow-xs"
                  >
                    <Download className="w-4 h-4" />
                    <span>Instalar Agora no Android</span>
                  </Button>
                </div>
              ) : null}

              <div className="space-y-2.5 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 text-xs mb-1">
                  Pelo Google Chrome ou Samsung Internet:
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    No canto superior direito do navegador, toque nos{' '}
                    <strong>três pontinhos ⋮</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Toque em <strong>"Instalar aplicativo"</strong> ou{' '}
                    <strong>"Adicionar à tela inicial"</strong>.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    Confirme em <strong>"Instalar"</strong>. O ícone oficial do SimplaFin
                    aparecerá na grade de aplicativos do seu celular.
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* Guia iOS (iPhone / iPad) */}
            <TabsContent value="ios" className="space-y-4 pt-3 focus-visible:outline-none">
              <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 text-xs mb-1">
                  No Safari da Apple (navegador padrão):
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Toque no botão de <strong>Compartilhar</strong>{' '}
                    <Share2 className="w-3.5 h-3.5 inline text-blue-600 -mt-0.5 mx-0.5" /> na barra
                    inferior do Safari.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Role para cima no menu de opções e toque em{' '}
                    <strong>
                      "Adicionar à Tela de Início"{' '}
                      <PlusSquare className="w-3.5 h-3.5 inline text-slate-800 -mt-0.5 mx-0.5" />
                    </strong>
                    .
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    3
                  </span>
                  <span>
                    Toque em <strong>"Adicionar"</strong> no canto superior direito. Pronto!
                  </span>
                </div>
              </div>
            </TabsContent>

            {/* Guia Desktop / Computador */}
            <TabsContent value="desktop" className="space-y-4 pt-3 focus-visible:outline-none">
              <div className="space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <p className="font-bold text-slate-900 text-xs mb-1">
                  No Google Chrome, Microsoft Edge ou Brave:
                </p>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    1
                  </span>
                  <span>
                    Na barra de endereços (onde fica o link do site), clique no ícone de{' '}
                    <strong>instalação de aplicativo</strong> (computador com uma seta para baixo).
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                    2
                  </span>
                  <span>
                    Clique em <strong>"Instalar"</strong>. O SimplaFin abrirá em uma janela
                    independente como um software nativo no seu computador!
                  </span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Vantagens do App */}
          <div className="mt-2 pt-3 border-t border-slate-100">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Vantagens do Aplicativo Instalado:
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
              <div className="flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <span>Tela cheia nativa</span>
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>Conta Google segura</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                <span>Carregamento rápido</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                <span>Acesso em 1 toque</span>
              </div>
            </div>
          </div>

          <Button
            onClick={() => setShowModal(false)}
            className="w-full mt-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs h-10 rounded-xl"
          >
            Entendi, obrigado!
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}
export default PwaInstallPrompt
