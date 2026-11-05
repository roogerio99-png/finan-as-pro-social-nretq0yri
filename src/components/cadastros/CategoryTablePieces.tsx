import { cn } from '@/lib/utils'

export const CATEGORY_COLUMNS =
  'grid grid-cols-[86px_minmax(0,1fr)_minmax(0,2fr)_auto] md:grid-cols-[96px_220px_minmax(0,1fr)_auto] gap-x-3 items-center'

export const CategoryGridHeader: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100',
      CATEGORY_COLUMNS,
      className,
    )}
  >
    <span>Cód. Grupo</span>
    <span>Subgrupo</span>
    <span className="hidden md:block">Descrição do Gasto</span>
    <span className="md:hidden">Descrição</span>
    <span />
  </div>
)

export const CategoryCodeBadge: React.FC<{
  code?: string
  className?: string
}> = ({ code, className }) =>
  code ? (
    <span
      className={cn(
        'inline-flex items-center justify-center font-mono text-[11px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200',
        className,
      )}
    >
      {code}
    </span>
  ) : (
    <span className="text-[11px] text-slate-300 font-mono">—</span>
  )
