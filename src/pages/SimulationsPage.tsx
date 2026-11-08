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
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { Calculator, TrendingUp, Percent, Coins, Info, Calendar, ArrowRight } from 'lucide-react'
import { FormulaBlock } from '@/components/simulations/FormulaBlock'
import { FutureValueCalculator } from '@/components/simulations/FutureValueCalculator'
import { FixedDepositCalculator } from '@/components/simulations/FixedDepositCalculator'
import {
  parseFinancialInput,
  monthlyCompoundRate,
  monthlySimpleRate,
  calculateRuleOf72,
  RatePeriod,
  TimePeriod,
  DepositTiming,
} from '@/components/simulations/simulationMath'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})
const compact = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})
const num2 = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const compoundChartConfig = {
  montante: { label: 'Montante Final', color: '#10b981' },
  investido: { label: 'Total Investido', color: '#64748b' },
} satisfies ChartConfig

const simpleChartConfig = {
  simples: { label: 'Juros Simples (Linear)', color: '#f59e0b' },
  compostos: { label: 'Juros Compostos (Exponencial)', color: '#10b981' },
  capital: { label: 'Capital Inicial', color: '#94a3b8' },
} satisfies ChartConfig

type CompoundPoint = { mes: number; montante: number; investido: number }

const CompoundCalculator: React.FC = () => {
  const [initial, setInitial] = useState('1000')
  const [monthly, setMonthly] = useState('100')
  const [rate, setRate] = useState('1')
  const [ratePeriod, setRatePeriod] = useState<RatePeriod>('mensal')
  const [timeValue, setTimeValue] = useState('12')
  const [timeUnit, setTimeUnit] = useState<TimePeriod>('meses')
  const [depositTiming, setDepositTiming] = useState<DepositTiming>('fim')

  const result = useMemo(() => {
    const p0 = parseFinancialInput(initial)
    const pM = parseFinancialInput(monthly)
    const rawTime = parseFinancialInput(timeValue)
    // Converte anos para meses se selecionado
    const totalMonths = Math.min(
      Math.max(timeUnit === 'anos' ? Math.round(rawTime * 12) : Math.round(rawTime), 0),
      600,
    )
    const i = monthlyCompoundRate(parseFinancialInput(rate), ratePeriod)

    const series: CompoundPoint[] = [{ mes: 0, montante: p0, investido: p0 }]
    let bal = p0

    for (let k = 1; k <= totalMonths; k++) {
      if (depositTiming === 'inicio') {
        // Antecipado: aporte entra no início do mês e já rende juros no mês corrente
        bal = (bal + pM) * (1 + i)
      } else {
        // Postecipado: rendimento sobre o saldo anterior + aporte no fim do mês
        bal = bal * (1 + i) + pM
      }
      series.push({ mes: k, montante: bal, investido: p0 + pM * k })
    }

    const invested = p0 + pM * totalMonths
    const final = series[series.length - 1]?.montante ?? p0
    const interest = Math.max(0, final - invested)

    // Regra dos 72 com base na taxa mensal efetiva
    const rule72 = calculateRuleOf72(i)

    return {
      series,
      invested,
      final,
      interest,
      totalMonths,
      effectiveMonthlyRate: i * 100,
      effectiveAnnualRate: (Math.pow(1 + i, 12) - 1) * 100,
      rule72,
    }
  }, [initial, monthly, rate, ratePeriod, timeValue, timeUnit, depositTiming])

  return (
    <div className="space-y-4">
      {/* 1. Primeiro: Painel de Parâmetros e Entradas do Cálculo */}
      <Card className="p-4 sm:p-5 border-slate-200 shadow-xs rounded-2xl bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Valor Inicial */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Valor Inicial (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={initial}
              onChange={(e) => setInitial(e.target.value)}
              placeholder="0,00"
              className="text-xs font-semibold rounded-xl"
            />
          </div>

          {/* Aporte Mensal */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Aporte Mensal (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={monthly}
              onChange={(e) => setMonthly(e.target.value)}
              placeholder="0,00"
              className="text-xs font-semibold rounded-xl"
            />
          </div>

          {/* Taxa de Juros */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Taxa de Juros (%)</Label>
            <div className="flex gap-1.5">
              <Input
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0,00"
                className="flex-1 text-xs font-semibold rounded-xl"
              />
              <select
                value={ratePeriod}
                onChange={(e) => setRatePeriod(e.target.value as RatePeriod)}
                className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-800 cursor-pointer"
                aria-label="Período da taxa"
              >
                <option value="mensal">a.m.</option>
                <option value="anual">a.a.</option>
              </select>
            </div>
          </div>

          {/* Prazo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Prazo</Label>
            <div className="flex gap-1.5">
              <Input
                type="text"
                inputMode="numeric"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                placeholder="12"
                className="flex-1 text-xs font-semibold rounded-xl"
              />
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value as TimePeriod)}
                className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-800 cursor-pointer"
                aria-label="Unidade do prazo"
              >
                <option value="meses">meses</option>
                <option value="anos">anos</option>
              </select>
            </div>
            {timeUnit === 'anos' && (
              <p className="text-[11px] text-slate-500 font-medium">
                = {result.totalMonths} meses
              </p>
            )}
          </div>

          {/* Momento do Aporte */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Momento do Aporte</Label>
            <select
              value={depositTiming}
              onChange={(e) => setDepositTiming(e.target.value as DepositTiming)}
              className="h-10 w-full rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-800 cursor-pointer"
            >
              <option value="fim">Fim do mês (Postecipado)</option>
              <option value="inicio">Início do mês (Antecipado)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Cards de Resultados do Cálculo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-emerald-50/80 border-emerald-200 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-emerald-800">
            <Coins className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Montante Final</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-900 mt-1.5 tabular-nums">
            {brl.format(result.final)}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium">
            Após {result.totalMonths} meses
          </span>
        </Card>

        <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <Calculator className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Investido</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1.5 tabular-nums">
            {brl.format(result.invested)}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Capital inicial + aportes
          </span>
        </Card>

        <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider">Total em Juros</span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-600 mt-1.5 tabular-nums">
            {brl.format(result.interest)}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium">
            {result.invested > 0
              ? `+${num2.format((result.interest / result.invested) * 100)}% de ganho real`
              : 'Rendimento'}
          </span>
        </Card>
      </div>

      {/* 2. Segundo: Demonstração e Evolução Mês a Mês */}
      <Card className="p-4 sm:p-5 border-slate-200 shadow-xs rounded-2xl bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Evolução do Patrimônio Mês a Mês</h3>
            <p className="text-xs text-slate-500">
              A curva verde mostra o efeito dos juros sobre juros em relação ao total aportado.
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1 rounded-lg">
            Taxa Efetiva: {num2.format(result.effectiveMonthlyRate)}% a.m. ({num2.format(result.effectiveAnnualRate)}% a.a.)
          </div>
        </div>

        <ChartContainer config={compoundChartConfig} className="mt-3 h-64 w-full sm:h-72">
          <LineChart data={result.series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="mes"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              tickFormatter={(v: number) => `Mês ${v}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={65}
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
            <Legend />
            <Line
              type="monotone"
              dataKey="montante"
              name="Montante Final"
              stroke="var(--color-montante)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="investido"
              name="Total Investido"
              stroke="var(--color-investido)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </Card>

      {/* Regra dos 72 com precisão */}
      {result.rule72 && result.rule72.years > 0 && (
        <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 shadow-2xs">
          <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold">Regra dos 72 (Cálculo Rigoroso):</span> Com a taxa informada de{' '}
            <strong>{num2.format(result.effectiveAnnualRate)}% ao ano</strong> ({num2.format(result.effectiveMonthlyRate)}% a.m.), seu
            investimento inicial dobraria de valor em aproximadamente{' '}
            <span className="font-extrabold text-emerald-950 underline">
              {result.rule72.years < 1
                ? `${Math.round(result.rule72.months)} meses`
                : `${result.rule72.years.toFixed(1)} anos (~${Math.round(result.rule72.months)} meses)`}
            </span>{' '}
            sem necessidade de novos aportes.
          </p>
        </div>
      )}

      {/* 3. Terceiro: Como o Cálculo é Feito (Fórmulas e Metodologia) */}
      <FormulaBlock
        intro={
          <span>
            Os juros são calculados sobre o saldo acumulado do mês anterior (o chamado{' '}
            <span className="font-semibold text-emerald-800">“juros sobre juros”</span>),
            garantindo crescimento exponencial. Você pode escolher aportes no início do mês
            (antecipado) ou no fim do mês (postecipado).
          </span>
        }
        formulas={[
          { text: 'M = C · (1 + i)^t', desc: 'Montante acumulado sem aportes regulares' },
          {
            text: 'M = C · (1 + i)^t + Aporte · [((1 + i)^t − 1) / i]',
            desc: 'Aportes no FIM do mês (Postecipado)',
          },
          {
            text: 'M = C · (1 + i)^t + Aporte · [((1 + i)^t − 1) / i] · (1 + i)',
            desc: 'Aportes no INÍCIO do mês (Antecipado)',
          },
          { text: 'J = M − Total Investido', desc: 'Total de juros gerados' },
        ]}
        legend={[
          { symbol: 'M (Montante)', meaning: 'valor total acumulado ao final do período' },
          { symbol: 'C (Capital)', meaning: 'depósito inicial' },
          { symbol: 'Aporte', meaning: 'valor depositado periodicamente a cada mês' },
          {
            symbol: 'i (Taxa)',
            meaning: 'taxa decimal ao mês (ex.: 1% a.m. = 0,01). Taxas anuais são convertidas por equivalência: (1 + i_a)^(1/12) − 1',
          },
          {
            symbol: 't (Prazo)',
            meaning: 'tempo total em meses (se informado em anos, é multiplicado por 12)',
          },
        ]}
        notes={[
          'Suporta qualquer formato de número (ex.: 1000, 1.000 ou 1.000,00).',
          'Taxa anual é convertida rigorosamente para a taxa mensal equivalente pela fórmula de juros compostos.',
        ]}
      />
    </div>
  )
}

const SimpleCalculator: React.FC = () => {
  const [capital, setCapital] = useState('1000')
  const [rate, setRate] = useState('1')
  const [ratePeriod, setRatePeriod] = useState<RatePeriod>('mensal')
  const [timeValue, setTimeValue] = useState('12')
  const [timeUnit, setTimeUnit] = useState<TimePeriod>('meses')

  const result = useMemo(() => {
    const c = parseFinancialInput(capital)
    const rawTime = parseFinancialInput(timeValue)
    const m = Math.min(
      Math.max(timeUnit === 'anos' ? Math.round(rawTime * 12) : Math.round(rawTime), 0),
      600,
    )
    const i = monthlySimpleRate(parseFinancialInput(rate), ratePeriod)
    const iComp = monthlyCompoundRate(parseFinancialInput(rate), ratePeriod)

    // Juros simples: juros = capital × taxa × tempo (linear estrito)
    const interest = c * i * m
    const final = c + interest

    // Comparativo: mesmo capital e taxa no regime composto
    const compoundInterest = c * (Math.pow(1 + iComp, m) - 1)
    const compoundFinal = c + compoundInterest

    // Evolução temporal comparativa mês a mês
    const series = []
    const step = Math.max(1, Math.floor(m / 24))
    for (let k = 0; k <= m; k += (k + step > m && k !== m ? m - k : step)) {
      const simVal = c + c * i * k
      const compVal = c * Math.pow(1 + iComp, k)
      series.push({
        mes: k,
        simples: simVal,
        compostos: compVal,
        capital: c,
      })
      if (k === m) break
    }

    return {
      final,
      interest,
      compoundFinal,
      compoundInterest,
      totalMonths: m,
      series,
      difference: Math.max(0, compoundInterest - interest),
    }
  }, [capital, rate, ratePeriod, timeValue, timeUnit])

  return (
    <div className="space-y-4">
      {/* 1. Primeiro: Parâmetros do Cálculo */}
      <Card className="p-4 sm:p-5 border-slate-200 shadow-xs rounded-2xl bg-white">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Capital Inicial (R$)</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={capital}
              onChange={(e) => setCapital(e.target.value)}
              placeholder="0,00"
              className="text-xs font-semibold rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Taxa de Juros (%)</Label>
            <div className="flex gap-1.5">
              <Input
                type="text"
                inputMode="decimal"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="0,00"
                className="flex-1 text-xs font-semibold rounded-xl"
              />
              <select
                value={ratePeriod}
                onChange={(e) => setRatePeriod(e.target.value as RatePeriod)}
                className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-800 cursor-pointer"
                aria-label="Período da taxa"
              >
                <option value="mensal">a.m.</option>
                <option value="anual">a.a.</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700">Prazo</Label>
            <div className="flex gap-1.5">
              <Input
                type="text"
                inputMode="numeric"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                placeholder="12"
                className="flex-1 text-xs font-semibold rounded-xl"
              />
              <select
                value={timeUnit}
                onChange={(e) => setTimeUnit(e.target.value as TimePeriod)}
                className="h-10 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-bold text-slate-800 cursor-pointer"
                aria-label="Unidade do prazo"
              >
                <option value="meses">meses</option>
                <option value="anos">anos</option>
              </select>
            </div>
            {timeUnit === 'anos' && (
              <p className="text-[11px] text-slate-500 font-medium">
                = {result.totalMonths} meses
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Cards de Resultados do Cálculo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 bg-amber-50/80 border-amber-200 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-amber-800">
            <Coins className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Montante Simples
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-amber-950 mt-1.5 tabular-nums">
            {brl.format(result.final)}
          </p>
          <span className="text-[11px] text-amber-700 font-medium">
            Juros: {brl.format(result.interest)}
          </span>
        </Card>

        <Card className="p-4 bg-emerald-50/80 border-emerald-200 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-emerald-800">
            <TrendingUp className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Em Juros Compostos
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1.5 tabular-nums">
            {brl.format(result.compoundFinal)}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium">
            Juros: {brl.format(result.compoundInterest)}
          </span>
        </Card>

        <Card className="p-4 bg-white border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center gap-2 text-indigo-700">
            <Percent className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              Diferença Exponencial
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-indigo-900 mt-1.5 tabular-nums">
            +{brl.format(result.difference)}
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            A mais nos juros compostos
          </span>
        </Card>
      </div>

      {/* 2. Segundo: Demonstração e Evolução Mês a Mês */}
      <Card className="p-4 sm:p-5 border-slate-200 shadow-xs rounded-2xl bg-white">
        <h3 className="text-sm font-bold text-slate-900">
          Comparativo Visual: Juros Simples vs. Juros Compostos
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Veja como a reta amarela (linear) fica para trás da curva verde (exponencial) com o passar
          do tempo.
        </p>
        <ChartContainer config={simpleChartConfig} className="mt-3 h-64 w-full sm:h-72">
          <LineChart data={result.series} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="mes"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              interval="preserveStartEnd"
              tickFormatter={(v: number) => `Mês ${v}`}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={65}
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
            <Legend />
            <Line
              type="monotone"
              dataKey="compostos"
              name="Juros Compostos"
              stroke="var(--color-compostos)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="linear"
              dataKey="simples"
              name="Juros Simples"
              stroke="var(--color-simples)"
              strokeWidth={2.5}
              dot={false}
            />
            <Line
              type="linear"
              dataKey="capital"
              name="Capital Inicial"
              stroke="var(--color-capital)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </Card>

      {/* 3. Terceiro: Como o Cálculo é Feito (Fórmulas e Metodologia) */}
      <FormulaBlock
        intro={
          <span>
            No regime de juros simples, o rendimento é calculado exclusivamente sobre o capital
            inicial e{' '}
            <span className="font-semibold text-amber-800">
              não rende juros sobre juros acumulados
            </span>
            . O crescimento do montante é estritamente linear ao longo do tempo.
          </span>
        }
        formulas={[
          { text: 'J = C · i · t', desc: 'Total de juros gerados no regime simples' },
          { text: 'M = C + J = C · (1 + i · t)', desc: 'Montante final acumulado' },
          {
            text: 'M_composto = C · (1 + i)^t',
            desc: 'Comparativo: o que renderia em juros compostos',
          },
        ]}
        legend={[
          { symbol: 'M (Montante)', meaning: 'valor final acumulado' },
          { symbol: 'C (Capital)', meaning: 'capital inicial aplicado' },
          {
            symbol: 'i (Taxa)',
            meaning: 'taxa de juros mensal em formato decimal (ex.: 1% = 0,01). Taxas anuais dividem-se linearmente por 12.',
          },
          {
            symbol: 't (Prazo)',
            meaning: 'tempo em meses (se informado em anos, é multiplicado por 12)',
          },
        ]}
        notes={[
          'Suporta qualquer formato de número (ex.: 1000, 1.000 ou 1.000,00).',
          'No regime simples, taxa anual é dividida proporcionalmente por 12 (linear).',
        ]}
      />
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
                Simulações Financeiras
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-tight">
                Calculadoras matemáticas de juros compostos, juros simples e Banco Central (CALFW)
                para projeção patrimonial.
              </p>
            </div>
          </div>
        </header>

        <Tabs defaultValue="compostos">
          <TabsList className="grid h-auto grid-rows-2 gap-1 w-full grid-cols-2 sm:grid-cols-4 sm:grid-rows-1 sm:h-10 max-w-3xl mb-4">
            <TabsTrigger
              value="compostos"
              className="min-w-0 px-2 py-2 sm:py-1.5 text-xs sm:text-sm font-bold text-center leading-tight"
            >
              <span className="sm:hidden">Compostos</span>
              <span className="hidden sm:inline">Juros Compostos</span>
            </TabsTrigger>
            <TabsTrigger
              value="simples"
              className="min-w-0 px-2 py-2 sm:py-1.5 text-xs sm:text-sm font-bold text-center leading-tight"
            >
              <span className="sm:hidden">Simples</span>
              <span className="hidden sm:inline">Juros Simples</span>
            </TabsTrigger>
            <TabsTrigger
              value="valor-futuro"
              className="min-w-0 px-2 py-2 sm:py-1.5 text-xs sm:text-sm font-bold text-center leading-tight"
            >
              <span className="sm:hidden">Valor Futuro</span>
              <span className="hidden sm:inline">Valor Futuro de um Capital</span>
            </TabsTrigger>
            <TabsTrigger
              value="aporte-fixo"
              className="min-w-0 px-2 py-2 sm:py-1.5 text-xs sm:text-sm font-bold text-center leading-tight"
            >
              <span className="sm:hidden">Aporte Fixo</span>
              <span className="hidden sm:inline">Aplicação com Aporte Fixo</span>
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
