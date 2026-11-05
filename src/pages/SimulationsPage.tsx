import React, { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar, Legend } from 'recharts'
import { Calculator, TrendingUp, Percent, Coins, Info } from 'lucide-react'
import { FormulaBlock } from '@/components/simulations/FormulaBlock'
import { FutureValueCalculator } from '@/components/simulations/FutureValueCalculator'
import { FixedDepositCalculator } from '@/components/simulations/FixedDepositCalculator'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
const compact = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

type RatePeriod = 'mensal' | 'anual'

// Converte a taxa informada para taxa mensal equivalente (juros compostos)
const monthlyCompoundRate = (rate: number, period: RatePeriod) => {
  if (rate <= 0) return 0
  return period === 'mensal' ? rate / 100 : Math.pow(1 + rate / 100, 1 / 12) - 1
}

// Converte a taxa informada para taxa mensal linear (juros simples)
const monthlySimpleRate = (rate: number, period: RatePeriod) => {
  if (rate <= 0) return 0
  return period === 'mensal' ? rate / 100 : rate / 12 / 100
}

const parseNum = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

const compoundChartConfig = {
  montante: { label: 'Montante', color: '#10b981' },
  investido: { label: 'Total investido', color: '#94a3b8' },
} satisfies ChartConfig

const simpleChartConfig = {
  simples: { label: 'Juros simples', color: '#f59e0b' },
  compostos: { label: 'Juros compostos', color: '#10b981' },
} satisfies ChartConfig

type CompoundPoint = { mes: number; montante: number; investido: number }

const CompoundCalculator: React.FC = () => {
  const [initial, setInitial] = useState('1000')
  const [monthly, setMonthly] = useState('100')
  const [rate, setRate] = useState('1')
  const [period, setPeriod] = useState<RatePeriod>('mensal')
  const [months, setMonths] = useState('12')

  const result = useMemo(() => {
    const p0 = parseNum(initial)
    const pM = parseNum(monthly)
    const m = Math.min(Math.max(Math.round(parseNum(months)), 0), 600)
    const i = monthlyCompoundRate(parseNum(rate), period)

    const series: CompoundPoint[] = [{ mes: 0, montante: p0, investido: p0 }]
    let bal = p0
    for (let k = 1; k <= m; k++) {
      bal = bal * (1 + i) + pM
      series.push({ mes: k, montante: bal, investido: p0 + pM * k })
    }

    const invested = p0 + pM * m
    const final = series[series.length - 1].montante
    const interest = final - invested

    // Regra dos 72: tempo aproximado para dobrar com a taxa anual efetiva
    const annualRate = Math.pow(1 + i, 12) - 1
    const doubleMonths = annualRate > 0 ? 72 / (annualRate * 100) : 0

    return { series, invested, final, interest, doubleMonths }
  }, [initial, monthly, rate, period, months])

  return (
    <div className="space-y-4">
      <FormulaBlock
        intro={
          <span>
            Os juros são calculados sobre o valor do mês anterior (o famoso{' '}
            <span className="font-semibold">“juros sobre juros”</span>): o saldo cresce de forma
            exponencial. Com aporte mensal, o cálculo é iterativo mês a mês — juros sobre o saldo
            anterior + o aporte —, então o resultado de t meses é a soma dessa repetição.
          </span>
        }
        formulas={[
          { text: 'M = C · (1 + i)^t', desc: 'Montante final, sem aporte mensal' },
          { text: 'J = M − C', desc: 'Total de juros ganhos' },
          {
            text: 'bal = bal · (1 + i) + aporte',
            desc: 'Com aporte mensal: mês a mês (aporte no fim do mês)',
          },
        ]}
        legend={[
          { symbol: 'M (Montante)', meaning: 'valor total final' },
          { symbol: 'C (Capital)', meaning: 'valor inicial' },
          {
            symbol: 'i (Taxa)',
            meaning: 'percentual convertido para decimal na fórmula (ex.: 1% = 0,01)',
          },
          {
            symbol: 't (Tempo)',
            meaning: 'deve estar na mesma unidade da taxa (se a taxa é ao mês, o tempo em meses)',
          },
        ]}
        notes={[
          'Ex.: 1% a.m. = 0,01. Taxa anual (a.a.) é convertida para a taxa mensal equivalente: (1 + i_a)^(1/12) − 1.',
          'Com aporte mensal, o resultado final também vale J = M − C − total aportado.',
        ]}
      />
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Valor inicial (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={initial}
              onChange={(e) => setInitial(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Aporte mensal (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Taxa de juros (%)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="flex-1"
              />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as RatePeriod)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-xs font-semibold text-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Período da taxa"
              >
                <option value="mensal">a.m.</option>
                <option value="anual">a.a.</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Prazo (meses)</Label>
            <Input
              type="number"
              min="0"
              max="600"
              step="1"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              placeholder="12"
              inputMode="numeric"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-emerald-50/70 border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <Coins className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Montante final</span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-1.5 tabular-nums">
            {brl.format(result.final)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <Calculator className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total investido</span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1.5 tabular-nums">
            {brl.format(result.invested)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total de juros</span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1.5 tabular-nums">
            {brl.format(result.interest)}
          </p>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900">Evolução mês a mês</h3>
        <ChartContainer config={compoundChartConfig} className="mt-3 h-64 w-full sm:h-72">
          <LineChart data={result.series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="mes"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              tickFormatter={(v: number) => `${v}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => compact.format(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span className="font-bold tabular-nums">
                      {name}: {brl.format(Number(value))}
                    </span>
                  )}
                  labelFormatter={(label) => `Mês ${label}`}
                />
              }
            />
            <Line
              type="monotone"
              dataKey="montante"
              stroke="var(--color-montante)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="investido"
              stroke="var(--color-investido)"
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </Card>

      {result.doubleMonths > 0 && (
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-emerald-50/70 border border-emerald-100 text-xs text-emerald-900">
          <Info className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p>
            <span className="font-bold">Regra dos 72:</span> com essa taxa, o valor dobraria em
            aproximadamente{' '}
            <span className="font-bold">
              {Math.round(result.doubleMonths)} mes
              {Math.round(result.doubleMonths) === 1 ? '' : 'es'}
            </span>{' '}
            ({compact.format(result.doubleMonths)} meses). Divida 72 pela taxa anual para estimar o
            tempo de dobrar um investimento.
          </p>
        </div>
      )}
    </div>
  )
}

const SimpleCalculator: React.FC = () => {
  const [capital, setCapital] = useState('1000')
  const [rate, setRate] = useState('1')
  const [period, setPeriod] = useState<RatePeriod>('mensal')
  const [months, setMonths] = useState('12')

  const result = useMemo(() => {
    const c = parseNum(capital)
    const m = Math.min(Math.max(Math.round(parseNum(months)), 0), 600)
    const i = monthlySimpleRate(parseNum(rate), period)

    // Juros simples: juros = capital × taxa × tempo (linear)
    const interest = c * i * m
    const final = c + interest

    // Comparativo: mesmo capital e taxa, mas com juros compostos
    const compoundInterest = c * (Math.pow(1 + i, m) - 1)

    return {
      final,
      interest,
      compoundInterest,
      series: [
        { tipo: 'Simples', simples: interest },
        { tipo: 'Compostos', compostos: compoundInterest },
      ],
    }
  }, [capital, rate, period, months])

  return (
    <div className="space-y-4">
      <FormulaBlock
        intro={
          <span>
            Os juros são calculados apenas sobre o valor inicial (capital) e{' '}
            <span className="font-semibold">não mudam ao longo do tempo</span>: os juros de cada
            período incidem sempre sobre o mesmo capital.
          </span>
        }
        formulas={[
          { text: 'J = C · i · t', desc: 'Total de juros ganhos' },
          { text: 'M = C + J', desc: 'Montante final (equivale a M = C · (1 + i · t))' },
        ]}
        legend={[
          { symbol: 'M (Montante)', meaning: 'valor total final' },
          { symbol: 'C (Capital)', meaning: 'valor inicial' },
          {
            symbol: 'i (Taxa)',
            meaning: 'percentual convertido para decimal na fórmula (ex.: 1% = 0,01)',
          },
          {
            symbol: 't (Tempo)',
            meaning: 'deve estar na mesma unidade da taxa (se a taxa é ao mês, o tempo em meses)',
          },
        ]}
        notes={[
          'Ex.: 1% a.m. = 0,01. No regime simples, a taxa anual (a.a.) vira mensal dividindo por 12 (linear), mantendo a mesma unidade de tempo.',
        ]}
      />
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Capital (R$)</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Taxa de juros (%)</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0,00"
                inputMode="decimal"
                className="flex-1"
              />
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as RatePeriod)}
                className="h-9 rounded-md border border-input bg-transparent px-2 text-xs font-semibold text-slate-700 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Período da taxa"
              >
                <option value="mensal">a.m.</option>
                <option value="anual">a.a.</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Prazo (meses)</Label>
            <Input
              type="number"
              min="0"
              max="600"
              step="1"
              value={months}
              onChange={(e) => setMonths(e.target.value)}
              placeholder="12"
              inputMode="numeric"
            />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="p-4 bg-emerald-50/70 border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <Coins className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Montante final</span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-1.5 tabular-nums">
            {brl.format(result.final)}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-slate-500">
            <TrendingUp className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Juros totais (capital × taxa × tempo)
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1.5 tabular-nums">
            {brl.format(result.interest)}
          </p>
        </Card>
      </div>

      <Card className="p-4 sm:p-5">
        <h3 className="text-sm font-bold text-slate-900">Simples vs. Compostos no mesmo cenário</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Juros ganhos no mesmo capital, taxa e prazo — no regime simples os juros não rendem sobre
          juros.
        </p>
        <ChartContainer config={simpleChartConfig} className="mt-3 h-56 w-full sm:h-64">
          <BarChart data={result.series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="tipo" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v: number) => compact.format(v)}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <span className="font-bold tabular-nums">
                      {name}: {brl.format(Number(value))}
                    </span>
                  )}
                />
              }
            />
            <Legend />
            <Bar dataKey="simples" fill="var(--color-simples)" radius={6} />
            <Bar dataKey="compostos" fill="var(--color-compostos)" radius={6} />
          </BarChart>
        </ChartContainer>
      </Card>
    </div>
  )
}

export const SimulationsPage: React.FC = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/60">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
        <header className="mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Simulações
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-tight">
                Calculadoras de juros compostos e simples para planejar seu dinheiro — nada é salvo,
                é só simulação.
              </p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="compostos">
          <TabsList className="grid w-full grid-cols-4 max-w-3xl mb-4">
            <TabsTrigger value="compostos" className="text-xs sm:text-sm font-bold">
              Juros Compostos
            </TabsTrigger>
            <TabsTrigger value="simples" className="text-xs sm:text-sm font-bold">
              Juros Simples
            </TabsTrigger>
            <TabsTrigger value="valor-futuro" className="text-xs sm:text-sm font-bold">
              Valor Futuro de um Capital
            </TabsTrigger>
            <TabsTrigger value="aporte-fixo" className="text-xs sm:text-sm font-bold">
              Aplicação com Aporte Fixo
            </TabsTrigger>
          </TabsList>
          <TabsContent value="compostos">
            <CompoundCalculator />
          </TabsContent>
          <TabsContent value="simples">
            <SimpleCalculator />
          </TabsContent>
          <TabsContent value="valor-futuro">
            <FutureValueCalculator />
          </TabsContent>
          <TabsContent value="aporte-fixo">
            <FixedDepositCalculator />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
