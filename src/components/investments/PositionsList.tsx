import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { investmentsService } from '@/services/investments'
import { ASSET_CLASS_LABELS, brl, type PositionView } from '@/services/investmentsCalc'

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
  onQuoteSaved: () => Promise<void>
}

export const PositionsList: React.FC<PositionsListProps> = ({ positions, onQuoteSaved }) => {
  if (positions.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Nenhuma posição aberta. Registre uma compra para começar.
      </p>
    )
  }

  return (
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
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{p.ticker}</p>
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
  )
}
