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
  FIXED_DEPOSIT_FIELDS,
  FIXED_DEPOSIT_LABELS,
  depositSeries,
  parseInput,
  solveFixedDeposit,
  type FixedDepositField,
  type FixedDepositForm,
  type FixedDepositOutcome,
} from '@/components/simulations/fixedDepositSolver'

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const num2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const num4 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
const compact = new Intl.NumberFormat('pt-BR', { notation: 'compact', maximumFractionDigits: 1 })

const EMPTY_FORM: FixedDepositForm = { months: '', rate: '', deposit: '', final: '' }

type Example = {
  id: string
  title: string
  text: string
  data: FixedDepositForm
  summary: string[]
}

// Exemplos clássicos da Calculadora do Cidadão (BCB) — aplicação com depósitos regulares
const EXAMPLES: Example[] = [
  {
    id: 'meses',
    title: 'Cálculo do nº de meses',
    text: 'Um cidadão planeja comprar um bem no valor de R$ 364,50. Para isto irá depositar mensalmente R$ 50,00 em aplicação financeira que está rendendo 1% ao mês. Em quanto tempo terá dinheiro suficiente para comprar o bem?',
    data: { months: '', rate: '1', deposit: '50', final: '364,50' },
    summary: [
      'Taxa de juros mensal = 1%',
      'Valor do depósito regular = 50',
      'Valor obtido ao final = 364,50',
    ],
  },
  {
    id: 'taxa',
    title: 'Cálculo da taxa de juros mensal',
    text: 'Nos últimos 9 meses, um cidadão depositou mensalmente a quantia R$ 100,00 em caderneta de poupança. Ao final deste período, observou que o saldo da poupança está em R$ 946,30. Qual foi o rendimento médio da poupança nesse período?',
    data: { months: '9', rate: '', deposit: '100', final: '946,30' },
    summary: [
      'Nº de meses = 9',
      'Valor do depósito regular = 100',
      'Valor obtido ao final = 946,30',
    ],
  },
  {
    id: 'deposito',
    title: 'Cálculo do depósito regular',
    text: 'Um cidadão adquiriu um bem no valor de R$ 8500,00, a ser pago após 6 meses. Quanto terá que depositar mensalmente, considerando que obterá rendimento de 0,85% ao mês?',
    data: { months: '6', rate: '0,85', deposit: '', final: '8500' },
    summary: ['Nº de meses = 6', 'Taxa de juros mensal = 0,85', 'Valor obtido ao final = 8500'],
  },
  {
    id: 'final',
    title: 'Cálculo do valor obtido ao final',
    text: 'Durante 8 meses, um cidadão deposita mensalmente a quantia de R$ 150,00. Quanto terá ao final da aplicação, sabendo que o rendimento médio dessa aplicação é de 1,2% ao mês?',
    data: { months: '8', rate: '1,2', deposit: '150', final: '' },
    summary: ['Nº de meses = 8', 'Taxa de juros mensal = 1,2', 'Valor do depósito regular = 150'],
  },
]

const resultText = (field: FixedDepositField, value: number): string => {
  switch (field) {
    case 'final':
      return brl.format(value)
    case 'deposit':
      return brl.format(value)
    case 'rate':
      return `${num4.format(value)}% a.m.`
    case 'months': {
      const rounded = Math.round(value)
      const unit = rounded === 1 ? 'mês' : 'meses'
      if (Math.abs(value - rounded) < 1e-9) return `${rounded} ${unit}`
      return `≈ ${rounded} ${unit} (valor exato: ${num2.format(value)} meses)`
    }
  }
}

const chartConfig = {
  montante: { label: 'Saldo', color: '#10b981' },
  investido: { label: 'Total depositado', color: '#94a3b8' },
} satisfies ChartConfig

export const FixedDepositCalculator: React.FC = () => {
  const [form, setForm] = useState<FixedDepositForm>(EMPTY_FORM)
  const [outcome, setOutcome] = useState<FixedDepositOutcome | null>(null)

  const update = (key: FixedDepositField, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleCalculate = () => setOutcome(solveFixedDeposit(form))

  const handleClear = () => {
    setForm(EMPTY_FORM)
    setOutcome(null)
  }

  const handleExample = (ex: Example) => {
    setForm(ex.data)
    setOutcome(null)
  }

  // Série do gráfico: só quando D, i e t são conhecidos (exemplo do "valor obtido ao final")
  const chartSeries = useMemo(() => {
    if (!outcome || !outcome.ok) return null
    const parse = (raw: string) => parseInput(raw) ?? NaN
    const full: Record<FixedDepositField, number> = {
      months: parse(form.months),
      rate: parse(form.rate),
      deposit: parse(form.deposit),
      final: parse(form.final),
    }
    full[outcome.field] = outcome.value
    if (!(full.deposit > 0) || !(full.months > 0) || !Number.isFinite(full.rate)) return null
    return depositSeries(full.deposit, full.rate, full.months)
  }, [outcome, form])

  return (
    <div className="space-y-4">
      <FormulaBlock
        intro={
          <span>
            Esta calculadora segue a Calculadora do Cidadão do Banco Central. Cada depósito é feito{' '}
            <span className="font-semibold">no início do mês</span> e rende desde já — por isso o
            saldo cresce mês a mês como saldo = (saldo + depósito) × (1 + i). Ela precisa de{' '}
            <span className="font-semibold">três dos quatro dados</span>; o quarto é calculado.
          </span>
        }
        formulas={[
          { text: 'M = D · [((1 + i)^t − 1) / i] · (1 + i)', desc: 'Valor obtido ao final' },
          { text: 'D = M · i / [(1 + i) · ((1 + i)^t − 1)]', desc: 'Valor do depósito regular' },
          {
            text: 'i = taxa que faz M bater com os dados (busca numérica)',
            desc: 'Taxa de juros mensal',
          },
          {
            text: 't = ln(M · i / (D · (1 + i)) + 1) / ln(1 + i)',
            desc: 'Número de meses (i = 0: t = M / D)',
          },
        ]}
        legend={[
          { symbol: 'M (Montante)', meaning: 'valor obtido ao final' },
          { symbol: 'D (Depósito)', meaning: 'valor do depósito regular (início do mês)' },
          { symbol: 'i (Taxa)', meaning: 'taxa de juros mensal, em decimal (1% = 0,01)' },
          { symbol: 't (Tempo)', meaning: 'número de meses' },
        ]}
        notes={[
          'Ex.: 1% a.m. = 0,01. O tempo deve estar na mesma unidade da taxa (se a taxa é ao mês, o tempo em meses).',
          'Como o depósito é feito no início do mês, o resultado é maior que o da série comum (depósito no fim do mês): M = D · [((1 + i)^t − 1) / i] · (1 + i).',
          'Nada é salvo: o cálculo acontece somente no seu navegador.',
        ]}
      />

      <Card className="p-4 sm:p-5">
        <div className="mx-auto max-w-md space-y-3">
          {FIXED_DEPOSIT_FIELDS.map((key) => (
            <div key={key} className="grid grid-cols-1 sm:grid-cols-5 items-center gap-2">
              <Label
                htmlFor={`fd-${key}`}
                className="sm:col-span-2 text-xs font-semibold text-slate-700"
              >
                {FIXED_DEPOSIT_LABELS[key]}
                {key === 'deposit' && (
                  <span className="block text-[10px] font-normal text-slate-500">
                    (depósito realizado no início do mês)
                  </span>
                )}
              </Label>
              <div className="sm:col-span-3 flex items-center gap-2">
                <Input
                  id={`fd-${key}`}
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
              {FIXED_DEPOSIT_LABELS[outcome.field]}
            </span>
          </div>
          <p className="text-xl sm:text-2xl font-extrabold text-emerald-800 mt-1.5 tabular-nums">
            {resultText(outcome.field, outcome.value)}
          </p>
        </Card>
      )}

      {chartSeries && (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-slate-700">
            <Calculator className="w-4 h-4" />
            <h3 className="text-sm font-bold text-slate-900">Evolução do saldo mês a mês</h3>
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
    </div>
  )
}
