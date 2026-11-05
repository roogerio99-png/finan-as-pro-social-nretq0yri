import React, { useState } from 'react'
import { Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { investmentsService } from '@/services/investments'
import { ASSET_CLASS_LABELS, brl, type PositionView } from '@/services/investmentsCalc'
import { PositionDetailDialog } from '@/components/investments/PositionDetailDialog'
import type { InvestmentOperation } from '@/services/investments'

interface QuoteFieldProps {
  ticker: string
  quote: number | null
  onSaved: () => Promise<void>
}

// Cotação atual informada manualmente. Vazio remove a cotação.
const QuoteField: React.FC<QuoteFieldProps> = ({ ticker, quote, onSaved }) => {
  const { toast } = useToast()
  const [value, setValue] = useState(quote !== null ? String(quote) : '')

  const save = async () => {
    const raw = value.trim()
    const next = raw === '' ? null : parseFloat(raw.replace(',', '.'))
    if (next !== null && (!Number.isFinite(next) || next < 0)) {
      toast({
        title: 'Cotação inválida',
        description: 'Informe um valor positivo.',
        variant: 'destructive',
      })
      return
    }
    if (next === quote) return
    try {
      await investmentsService.setQuote(ticker, next)
      await onSaved()
    } catch (err) {
      toast({
        title: 'Não foi possível salvar a cotação',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold">Cotação atual (R$, opcional)</Label>
      <Input
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
        placeholder="Informe para ver o resultado não realizado"
      />
    </div>
  )
}

interface PositionsListProps {
  positions: PositionView[]
  operations: InvestmentOperation[]
  onQuoteSaved: () => Promise<void>
}

export const PositionsList: React.FC<PositionsListProps> = ({
  positions,
  operations,
  onQuoteSaved,
}) => {
  const [detail, setDetail] = useState<PositionView | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const openDetail = (p: PositionView) => {
    setDetail(p)
    setDetailOpen(true)
  }

  if (positions.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Nenhuma posição aberta. Registre uma compra para começar.
      </p>
    )
  }

  return (
    <>
      <div className="grid gap-3 md:grid-cols-2">
        {positions.map((p) => {
          const unrealizedClass =
            p.unrealized === null
              ? 'text-slate-500'
              : p.unrealized >= 0
                ? 'text-emerald-700'
                : 'text-rose-600'
          return (
            <Card key={p.ticker} className="min-w-0">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => openDetail(p)}
                      className="group flex items-center gap-1 text-left font-bold text-slate-900 truncate hover:text-emerald-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 rounded-sm cursor-pointer"
                      aria-label={`Detalhar posição de ${p.ticker}`}
                      title="Clique para ver as movimentações que geraram esta posição"
                    >
                      <span className="truncate">{p.ticker}</span>
                      <Info className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-emerald-700" />
                    </button>
                    <p className="text-xs text-slate-500">{ASSET_CLASS_LABELS[p.assetClass]}</p>
                  </div>
                  <Badge variant="secondary">
                    {p.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })} un.
                  </Badge>
                </div>

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Preço médio</dt>
                    <dd className="font-semibold">{brl.format(p.avgPrice)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Custo total</dt>
                    <dd className="font-semibold">{brl.format(p.totalCost)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Valor de mercado</dt>
                    <dd className="font-semibold">
                      {p.marketValue !== null ? brl.format(p.marketValue) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Resultado não realizado</dt>
                    <dd className={`font-semibold ${unrealizedClass}`}>
                      {p.unrealized !== null ? brl.format(p.unrealized) : '—'}
                    </dd>
                  </div>
                </dl>

                <QuoteField
                  key={`${p.ticker}-${p.quote ?? 'none'}`}
                  ticker={p.ticker}
                  quote={p.quote}
                  onSaved={onQuoteSaved}
                />
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Detalhe: movimentações que geraram a posição. Fechar volta à lista intacta. */}
      {detail && (
        <PositionDetailDialog
          ticker={detail.ticker}
          assetClass={detail.assetClass}
          operations={operations}
          open={detailOpen}
          onOpenChange={(openState) => {
            setDetailOpen(openState)
            if (!openState) setDetail(null)
          }}
        />
      )}
    </>
  )
}
