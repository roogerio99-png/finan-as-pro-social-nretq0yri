import React, { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { brl, darfDueDate, type MonthTax, type GroupTax } from '@/services/investmentsCalc'

interface MonthlyTaxPanelProps {
  monthly: MonthTax[]
  year: string
}

const currentMonthISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

const monthLabel = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

const Stat: React.FC<{ label: string; value: string; strong?: boolean }> = ({
  label,
  value,
  strong,
}) => (
  <div className="min-w-0 rounded-lg border border-slate-200 p-3">
    <p className="text-xs text-slate-500">{label}</p>
    <p
      className={`break-words font-bold ${strong ? 'text-lg text-slate-900' : 'text-sm text-slate-800'}`}
    >
      {value}
    </p>
  </div>
)

const fmtQty = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 8 })

const GroupCard: React.FC<{ group: GroupTax }> = ({ group: g }) => (
  <Card className="min-w-0">
    <CardHeader className="p-4 pb-2">
      <CardTitle className="text-sm flex flex-wrap items-center gap-2">
        {g.label}
        <Badge variant="outline">{Math.round(g.rate * 100)}%</Badge>
      </CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-0 grid grid-cols-2 gap-2">
      <Stat label="Total vendido" value={brl.format(g.sold)} />
      <Stat label="Resultado líquido" value={brl.format(g.net)} />
      <Stat
        label="Isenção aplicada"
        value={
          g.exemptionLimit === null
            ? 'Não se aplica'
            : g.exempt
              ? `Sim (até ${brl.format(g.exemptionLimit)})`
              : `Não (acima de ${brl.format(g.exemptionLimit)})`
        }
      />
      <Stat label="Base tributável" value={brl.format(g.taxableBase)} />
      <Stat label="Imposto devido" value={brl.format(g.tax)} />
      <Stat label="Prejuízo a compensar" value={brl.format(g.carryAfter)} />
    </CardContent>
    {g.detectedQty > 0 && (
      <CardContent className="p-4 pt-0">
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
          Day trade detectado por compra e venda na mesma data:{' '}
          <span className="font-semibold">{fmtQty(g.detectedQty)} un.</span> entraram neste regime
          automaticamente, sem marcação manual.
        </p>
      </CardContent>
    )}
  </Card>
)

// Apuração mensal: por mês, separa as bases (swing, day, FII, cripto, outros) e mostra isenção e imposto.
export const MonthlyTaxPanel: React.FC<MonthlyTaxPanelProps> = ({ monthly, year }) => {
  const [selected, setSelected] = useState<string>(
    monthly.length > 0 ? monthly[monthly.length - 1].month : currentMonthISO(),
  )
  const current = monthly.find((m) => m.month === selected) ?? null
  const yearMonths = monthly.filter((m) => m.month.startsWith(year))
  const yearTax = yearMonths.reduce((acc, m) => acc + m.tax, 0)

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold">Mês da apuração</Label>
          <Input
            type="month"
            value={selected}
            onChange={(e) => e.target.value && setSelected(e.target.value)}
            className="w-full sm:w-auto"
          />
        </div>
        {current && (
          <p className="text-xs text-slate-500 sm:text-right">
            DARF deste mês vence em <span className="font-semibold">{darfDueDate(selected)}</span>{' '}
            (código 6015 para ações e ETFs). Nota educacional: o pagamento é feito até o último dia
            útil do mês seguinte, e o feriado não é considerado no cálculo.
          </p>
        )}
      </div>

      {!current ? (
        <p className="text-sm text-slate-500 text-center py-6">
          Sem vendas em {monthLabel(selected)}. A apuração aparece no mês de cada venda.
        </p>
      ) : (
        <>
          {current.detectedTickers.length > 0 && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2.5">
              Day trade detectado neste mês por compra e venda do mesmo ticker na mesma data (
              {current.detectedTickers.join(', ')}): a parte casada entra no regime de 20% sem
              isenção, mesmo sem marcação manual.
            </p>
          )}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="Total vendido no mês" value={brl.format(current.sold)} />
            <Stat label="Resultado líquido" value={brl.format(current.net)} />
            <Stat label="Base tributável" value={brl.format(current.taxableBase)} />
            <Stat label="Imposto devido no mês" value={brl.format(current.tax)} strong />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {current.groups.map((g) => (
              <GroupCard key={g.key} group={g} />
            ))}
          </div>
        </>
      )}

      <Card className="min-w-0">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm">Resumo de {year}</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0 space-y-3">
          <p className="text-sm text-slate-700">
            Imposto acumulado no ano: <span className="font-bold">{brl.format(yearTax)}</span>
          </p>
          {yearMonths.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhuma venda em {year}.</p>
          ) : (
            <div className="space-y-2">
              {yearMonths.map((m) => (
                <button
                  key={m.month}
                  type="button"
                  onClick={() => setSelected(m.month)}
                  className={`w-full flex items-center justify-between gap-2 rounded-lg border p-3 text-left text-sm ${
                    m.month === selected ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200'
                  }`}
                >
                  <span className="font-semibold capitalize">{monthLabel(m.month)}</span>
                  <span className="text-right text-xs text-slate-600">
                    Vendido {brl.format(m.sold)} · Líquido {brl.format(m.net)} ·{' '}
                    <span className="font-bold text-slate-900">Imposto {brl.format(m.tax)}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
