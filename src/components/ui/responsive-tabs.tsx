import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { cn } from '@/lib/utils'

/**
 * ResponsiveTabsList: container de abas que se adapta automaticamente a qualquer largura de tela.
 *
 * No mobile / telas estreitas:
 * - Rolagem horizontal suave com snap para itens (scroll-smooth, snap-x snap-mandatory)
 * - Remove barra de rolagem nativa feia (.no-scrollbar)
 * - Mantém padding e flex-nowrap para que cada aba tenha espaço natural para seu texto
 * - Suporta gradiente suave / indicador visual de overflow quando há conteúdo além da borda
 * - Auto-scroll: ao montar ou trocar de aba ativa, a aba rola automaticamente para ficar visível
 *
 * No desktop (sm+ / md+):
 * - Se comporta como o TabsList normal inline-flex ou grade configurável, preservando o layout desktop sem regressões.
 */
export interface ResponsiveTabsListProps extends React.ComponentPropsWithoutRef<
  typeof TabsPrimitive.List
> {
  /** Se deve mostrar indicadores visuais de borda esfumada quando rolável. Padrão: true */
  showEdgeFade?: boolean
}

export const ResponsiveTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  ResponsiveTabsListProps
>(({ className, children, showEdgeFade = true, ...props }, ref) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  // Medir se há overflow e se há conteúdo à esquerda ou à direita
  const checkScroll = React.useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    const tolerance = 2 // tolerância para arredondamento de subpixels
    setCanScrollLeft(scrollLeft > tolerance)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - tolerance)
  }, [])

  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return
    checkScroll()

    el.addEventListener('scroll', checkScroll, { passive: true })
    window.addEventListener('resize', checkScroll)

    const ro = new ResizeObserver(() => {
      checkScroll()
    })
    ro.observe(el)

    return () => {
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
      ro.disconnect()
    }
  }, [checkScroll])

  // Rolar automaticamente para manter o gatilho ativo visível
  React.useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const scrollActiveIntoView = () => {
      const activeTrigger = el.querySelector<HTMLElement>('[data-state="active"]')
      if (activeTrigger) {
        // Se já está visível com margem, evita scroll brusco
        const parentRect = el.getBoundingClientRect()
        const targetRect = activeTrigger.getBoundingClientRect()

        const isFullyVisible =
          targetRect.left >= parentRect.left + 8 && targetRect.right <= parentRect.right - 8

        if (!isFullyVisible) {
          activeTrigger.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'center',
          })
        }
      }
    }

    // Executa no mount e com pequeno delay para permitir renderização do Radix
    const timer = setTimeout(scrollActiveIntoView, 50)
    return () => clearTimeout(timer)
  })

  return (
    <div className="relative w-full min-w-0">
      {/* Indicador esfumado à esquerda */}
      {showEdgeFade && canScrollLeft && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white/95 to-transparent z-10 rounded-l-2xl sm:hidden"
        />
      )}

      {/* Contêiner com rolagem horizontal */}
      <div
        ref={containerRef}
        className="w-full overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory sm:overflow-visible sm:snap-none"
      >
        <TabsPrimitive.List
          ref={ref}
          className={cn(
            'inline-flex items-center min-w-full sm:min-w-0 bg-white border border-slate-200 rounded-2xl p-1 shadow-xs',
            className,
          )}
          {...props}
        >
          {children}
        </TabsPrimitive.List>
      </div>

      {/* Indicador esfumado à direita */}
      {showEdgeFade && canScrollRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/95 to-transparent z-10 rounded-r-2xl sm:hidden"
        />
      )}
    </div>
  )
})
ResponsiveTabsList.displayName = 'ResponsiveTabsList'
