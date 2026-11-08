import React, { useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { Calculator, Coins, AlertCircle, Info } from 'lucide-react'
import { FormulaBlock } from '@/components/simulations/FormulaBlock'
import {
  FUTURE_VALUE_LABELS,
  growthSeries,
  parseInput,
  solveFutureValue,
  type FutureValueField,
  type FutureValueForm,
  type SolveOutcome,
} from '@/components/simulations/futureValueSolver'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const num2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

const EMPTY_FORM: FutureValueForm = { months: '', rate: '', capital: '', final: '' }

type Example = {
  id: string
  title: string
  text: string
  data: FutureValueForm
  summary: string[]
}

// Exemplos clássicos da Calculadora do Cidadão (BCB)
const EXAMPLES: Example[] = [
  {
    id: 'meses',
    title: 'Cálculo do nº de meses',
    text: 'Um cidadão está planejando comprar um bem no valor de R$ 449,70. Para isso deposita a quantia de R$ 350,00 em caderneta de poupança. Sabendo que o rendimento médio é de 1,05% ao mês, em quanto tempo terá dinheiro suficiente para comprar o bem?',
    data: { months: '', rate: '1,05', capital: '350', final: '449,70' },
    summary: [
      'Taxa de juros mensal = 1,05%',
      'Capital atual = 350',
      'Valor obtido ao final = 449,7',
    ],
  },
  {
    id: 'taxa',
    title: 'Cálculo da taxa de juros mensal',
    text: 'Um cidadão emprestou a quantia de R$ 800,00, ficando acertado que o tomador pagará no prazo de 6 meses a quantia de R$ 950,00. Quanto estará pagando de juros?',
    data: { months: '6', rate: '', capital: '800', final: '950' },
    summary: ['Nº de meses = 6', 'Capital atual = 800', 'Valor obtido ao final = 950'],
  },
  {
    id: 'capital',
    title: 'Cálculo do capital atual',
    text: 'Um cidadão pretende adquirir um bem daqui a 7 meses no valor de R$ 2500,00. Quanto terá que depositar hoje, sabendo que o rendimento de determinada aplicação é de 1,5% ao mês?',
    data: { months: '7', rate: '1,5', capital: '', final: '2500' },
    summary: ['Nº de meses = 7', 'Taxa de juros mensal = 1,5', 'Valor obtido ao final = 2500'],
  },
  {
    id: 'final',
    title: 'Cálculo do valor obtido ao final',
    text: 'Um cidadão recebe um abono salarial no valor de R$ 500,00 e resolveu depositá-lo em caderneta de poupança. Quanto obterá no prazo de 11 meses, sabendo que o rendimento médio da poupança é de 0,88% ao mês?',
    data: { months: '11', rate: '0,88', capital: '500', final: '' },
    summary: ['Nº de meses = 11', 'Taxa de juros mensal = 0,88', 'Capital atual = 500'],
  },
]

const resultText = (field: FutureValueField, value: number): string => {
  switch (field) {
    case 'final':
      return brl.format(value)
    case 'capital':
      return brl.format(value)
    case 'rate':
      return `${num2.format(value)}%`
    case 'months': {
      const rounded = Math.round(value)
      const unit = rounded === 1 ? 'mês' : 'meses'
      if (Math.abs(value - rounded) < 1e-9) return `${rounded} ${unit}`
      return `≈ ${rounded} ${unit} (valor exato: ${num2.format(value)} meses)`
    }
  }
}

const chartConfig = {
  montante: { label: 'Montante', color: '#10b981' },
} satisfies ChartConfig

export const FutureValueCalculator: React.FC = () => {
  const [form, setForm] = useState<FutureValueForm>(EMPTY_FORM)
  const [outcome, setOutcome] = useState<SolveOutcome | null>(null)

  const update = (key: FutureValueField, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCalculate = () => setOutcome(solveFutureValue(form))

  const handleClear = () => {
    setForm(EMPTY_FORM)
    setOutcome(null)
  }

  const handleExample = (ex: Example) => {
    setForm(ex.data)
    setOutcome(null)
  }

  // Valores completos (incluindo o calculado) para o gráfico de evolução
  const chartSeries = useMemo(() => {
    if (!outcome || !outcome.ok) return null
    const parse = (raw: string) => parseInput(raw) ?? NaN
    const full: Record<FutureValueField, number> = {
      months: parse(form.months),
      rate: parse(form.rate),
      capital: parse(form.capital),
      final: parse(form.final),
    }
    full[outcome.field] = outcome.value
    if (!(full.capital > 0) || !(full.months > 0) || !Number.isFinite(full.rate)) return null
    return growthSeries(full.capital, full.rate, full.months)
  }, [outcome, form])

  return (
    <div className="space-y-4">
      {/* 1. Primeiro: Parâmetros e Execução do Cálculo */}
      <Card className="p-4 sm:p-5">
        <div className="mx-auto max-w-md space-y-3">
          {(['months', 'rate', 'capital', 'final'] as FutureValueField[]).map((key) => (
            <div key={key} className="grid grid-cols-1 sm:grid-cols-5 items-center gap-2">
              <Label
                htmlFor={`fv-${key}`}
                className="sm:col-span-2 text-xs font-semibold text-slate-700"
              >
                {FUTURE_VALUE_LABELS[key]}
              </Label>
              <div className="sm:col-span-3 flex items-center gap-2">
                <Input
                  id={`fv-${key}`}
                  type="text"
                  inputMode="decimal"
                  value={form[key]}
                  onChange={(e) => update(key, e.target.value)}
                  placeholder={key === 'months' ? 'Ex.: 12' : '0,00'}
                  className="flex-1"
                />
                {key === 'rate' && <span className="text-xs font-semibold text-slate-600">%</span>}
              </div>
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={handleClear}>
              Limpar
            </Button>
            <Button
              onClick={handleCalculate}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Calcular
            </Button>
          </div>
        </div>
      </Card>

      {/* Resultados */}
      {outcome?.ok === false && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800"
        >
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <p>{outcome.message}</p>
        </div>
      )}

      {outcome?.ok === true && (
        <Card className="p-4 bg-emerald-50/70 border-emerald-100">
          <div className="flex items-center gap-2 text-emerald-700">
            <Coins className="w-4 h-4" />
            <span className="text-[11px] font-bold uppercase tracking-wider">
              {FUTURE_VALUE_LABELS[outcome.field]}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-1.5 tabular-nums">
            {resultText(outcome.field, outcome.value)}
          </p>
        </Card>
      )}

      {/* 2. Segundo: Demonstração Mês a Mês */}
      {chartSeries && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-slate-700">
            <Calculator className="w-4 h-4" />
            <h3 className="text-sm font-bold text-slate-900">Evolução do montante mês a mês</h3>
          </div>
          <ChartContainer config={chartConfig} className="mt-3 h-56 w-full sm:h-64">
            <LineChart data={chartSeries} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="mes"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval="preserveStartEnd"
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
                    formatter={(value) => (
                      <span className="font-bold tabular-nums">{brl.format(Number(value))}</span>
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
            </LineChart>
          </ChartContainer>
        </Card>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-bold text-slate-900 text-center">Exemplos de cálculo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {EXAMPLES.map((ex) => (
            <Card key={ex.id} className="p-4 flex flex-col">
              <h4 className="text-sm font-bold text-slate-900">{ex.title}</h4>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{ex.text}</p>
              <ul className="mt-2 space-y-0.5 text-xs font-semibold text-slate-800">
                {ex.summary.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => handleExample(ex)}>
                  <Info className="w-3.5 h-3.5 mr-1.5" />
                  Usar este exemplo
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* 3. Terceiro: Como o cálculo é feito */}
      <FormulaBlock
        intro={
          <span>
            Esta calculadora segue a Calculadora do Cidadão do Banco Central. Ela usa os juros
            compostos e precisa de <span className="font-semibold">três dos quatro dados</span>; o
            quarto é calculado. Capital atual é o depósito feito no início do mês.
          </span>
        }
        formulas={[
          { text: 'M = C · (1 + i)^t', desc: 'Valor obtido ao final' },
          { text: 'C = M / (1 + i)^t', desc: 'Capital atual' },
          { text: 'i = (M / C)^(1/t) − 1', desc: 'Taxa de juros mensal' },
          { text: 't = ln(M / C) / ln(1 + i)', desc: 'Número de meses' },
        ]}
        legend={[
          { symbol: 'M (Montante)', meaning: 'valor obtido ao final' },
          { symbol: 'C (Capital)', meaning: 'capital atual (depósito no início do mês)' },
          { symbol: 'i (Taxa)', meaning: 'taxa de juros mensal, em decimal (1% = 0,01)' },
          { symbol: 't (Tempo)', meaning: 'número de meses' },
        ]}
        notes={['Nada é salvo: o cálculo acontece somente no seu navegador.']}
      />
    </div>
  )
}
