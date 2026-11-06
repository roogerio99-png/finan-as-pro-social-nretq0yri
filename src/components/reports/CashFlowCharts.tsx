import React from 'react'
import { Card } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { MonthFlowSummary } from '@/services/cashFlow'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const compactBrl = new Intl.NumberFormat('pt-BR', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const chartConfig = {
  income: { label: 'Entradas', color: '#10b981' },
  expense: { label: 'Saídas', color: '#f43f5e' },
  net: { label: 'Saldo do Mês', color: '#3b82f6' },
  closingBalance: { label: 'Saldo Acumulado', color: '#8b5cf6' },
} satisfies ChartConfig

export interface CashFlowChartsProps {
  summaries: MonthFlowSummary[]
}

export const CashFlowCharts: React.FC<CashFlowChartsProps> = ({ summaries }) => {
  if (summaries.length === 0) return null

  // Dados formatados para o Recharts
  const chartData = summaries.map((s) => ({
    month: s.label,
    rawMonth: s.month,
    income: s.income,
    expense: s.expense,
    net: s.net,
    closingBalance: s.closingBalance,
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Gráfico 1: Entradas vs Saídas */}
      <Card className="p-4 sm:p-5 rounded-2xl border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Entradas vs. Saídas Mensais</h3>
            <p className="text-xs text-slate-500">Comparativo de fluxo mês a mês no período</p>
          </div>
        </div>

        <div className="h-[220px] sm:h-[260px] w-full pt-2">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(val) => compactBrl.format(val)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex items-center justify-between gap-2 w-full text-xs">
                          <span className="text-slate-600">
                            {name === 'income' ? 'Entradas' : 'Saídas'}:
                          </span>
                          <span className="font-bold text-slate-900">
                            {brl.format(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                  formatter={(value) => (value === 'income' ? 'Entradas' : 'Saídas')}
                />
                <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={36} />
                <Bar dataKey="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </Card>

      {/* Gráfico 2: Evolução do Saldo Acumulado */}
      <Card className="p-4 sm:p-5 rounded-2xl border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Evolução do Saldo Acumulado</h3>
            <p className="text-xs text-slate-500">
              Trajetória do caixa encadeando saldos anteriores
            </p>
          </div>
        </div>

        <div className="h-[220px] sm:h-[260px] w-full pt-2">
          <ChartContainer config={chartConfig} className="h-full w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis
                  tickLine={false}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(val) => compactBrl.format(val)}
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex items-center justify-between gap-2 w-full text-xs">
                          <span className="text-slate-600">
                            {name === 'closingBalance' ? 'Saldo Acumulado' : 'Saldo do Mês'}:
                          </span>
                          <span className="font-bold text-slate-900">
                            {brl.format(Number(value))}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 8 }}
                  formatter={(value) =>
                    value === 'closingBalance' ? 'Saldo Acumulado' : 'Líquido do Mês'
                  }
                />
                <Line
                  type="monotone"
                  dataKey="closingBalance"
                  stroke="#8b5cf6"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: '#8b5cf6' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="net"
                  stroke="#3b82f6"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#3b82f6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </div>
      </Card>
    </div>
  )
}
