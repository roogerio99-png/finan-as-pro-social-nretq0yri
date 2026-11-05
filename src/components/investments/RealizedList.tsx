import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ASSET_CLASS_LABELS, brl, formatDayBR, type RealizedSale } from '@/services/investmentsCalc'

interface RealizedListProps {
  sales: RealizedSale[]
  saleTax: Record<string, number>
}

const Money: React.FC<{ label: string; value: number; colored?: boolean }> = ({
  label,
  value,
  colored,
}) => {
  const tone = !colored ? '' : value >= 0 ? 'text-emerald-700' : 'text-rose-600'
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className={`font-semibold break-words ${tone}`}>{brl.format(value)}</dd>
    </div>
  )
}

// Vendas mais recentes primeiro. Cada venda traz o PM vigente na data da venda e o imposto rateado.
export const RealizedList: React.FC<RealizedListProps> = ({ sales, saleTax }) => {
  if (sales.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Nenhuma venda registrada ainda. O resultado de cada venda aparece aqui.
      </p>
    )
  }

  const ordered = [...sales].sort((a, b) => b.date.localeCompare(a.date))

  return (
    <div className="space-y-2">
      {ordered.map((s) => (
        <Card key={s.id} className="min-w-0">
          <CardContent className="p-3 sm:p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500">{formatDayBR(s.date)}</span>
              <span className="font-bold text-slate-900">{s.ticker}</span>
              <Badge variant="outline">{ASSET_CLASS_LABELS[s.assetClass]}</Badge>
              {s.dayTrade && <Badge variant="outline">Day trade</Badge>}
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-2 text-sm">
              <div>
                <dt className="text-xs text-slate-500">Quantidade</dt>
                <dd className="font-semibold">
                  {s.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}
                </dd>
              </div>
              <Money label="PM na venda" value={s.avgPrice} />
              <Money label="Preço de venda" value={s.sellPrice} />
              <Money label="Taxas" value={s.fees} />
              <Money label="Resultado bruto" value={s.gross} colored />
              <Money label="Resultado líquido" value={s.net} colored />
              <Money label="Imposto correspondente" value={saleTax[s.id] ?? 0} />
            </dl>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
