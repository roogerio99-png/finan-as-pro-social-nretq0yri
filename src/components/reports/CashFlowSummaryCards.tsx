import React from 'react'
import { Card } from '@/components/ui/card'
import { CashFlowReportData } from '@/services/cashFlow'
import { ArrowUpRight, ArrowDownRight, Wallet, Coins, TrendingUp, TrendingDown } from 'lucide-react'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export interface CashFlowSummaryCardsProps {
  report: CashFlowReportData
}

export const CashFlowSummaryCards: React.FC<CashFlowSummaryCardsProps> = ({ report }) => {
  const isNetPositive = report.totalNet >= 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {/* 1. Saldo Inicial Anterior */}
      <Card className="p-3.5 sm:p-4 rounded-2xl border-slate-200 shadow-xs flex flex-col justify-between space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">
            Saldo Inicial
          </span>
          <div className="p-1.5 sm:p-2 rounded-xl bg-slate-100 text-slate-600">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="text-base sm:text-xl font-extrabold text-slate-900 block truncate">
            {brl.format(report.initialOpeningBalance)}
          </span>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 line-clamp-1">
            Caixa antes de {report.startMonth}
          </p>
        </div>
      </Card>

      {/* 2. Total de Entradas */}
      <Card className="p-3.5 sm:p-4 rounded-2xl border-slate-200 shadow-xs flex flex-col justify-between space-y-2 bg-gradient-to-br from-white to-emerald-50/30">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-emerald-800 uppercase tracking-wider">
            Entradas
          </span>
          <div className="p-1.5 sm:p-2 rounded-xl bg-emerald-100 text-emerald-700">
            <ArrowUpRight className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="text-base sm:text-xl font-extrabold text-emerald-800 block truncate">
            +{brl.format(report.totalIncome)}
          </span>
          <p className="text-[10px] sm:text-[11px] text-emerald-600 mt-0.5 line-clamp-1">
            Receitas do período
          </p>
        </div>
      </Card>

      {/* 3. Total de Saídas */}
      <Card className="p-3.5 sm:p-4 rounded-2xl border-slate-200 shadow-xs flex flex-col justify-between space-y-2 bg-gradient-to-br from-white to-rose-50/30">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-rose-800 uppercase tracking-wider">
            Saídas
          </span>
          <div className="p-1.5 sm:p-2 rounded-xl bg-rose-100 text-rose-700">
            <ArrowDownRight className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="text-base sm:text-xl font-extrabold text-rose-800 block truncate">
            -{brl.format(report.totalExpense)}
          </span>
          <p className="text-[10px] sm:text-[11px] text-rose-600 mt-0.5 line-clamp-1">
            Despesas do período
          </p>
        </div>
      </Card>

      {/* 4. Saldo Acumulado Final */}
      <Card className="p-3.5 sm:p-4 rounded-2xl border-slate-200 shadow-xs flex flex-col justify-between space-y-2 bg-gradient-to-br from-white to-purple-50/30">
        <div className="flex items-center justify-between">
          <span className="text-[11px] sm:text-xs font-bold text-purple-900 uppercase tracking-wider">
            Saldo Acumulado
          </span>
          <div className="p-1.5 sm:p-2 rounded-xl bg-purple-100 text-purple-800">
            <Wallet className="w-4 h-4" />
          </div>
        </div>
        <div>
          <span className="text-base sm:text-xl font-extrabold text-purple-900 block truncate">
            {brl.format(report.finalClosingBalance)}
          </span>
          <p className="text-[10px] sm:text-[11px] text-purple-700 mt-0.5 flex items-center gap-1">
            <span>Resultado:</span>
            <span className={`font-bold ${isNetPositive ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isNetPositive ? '+' : ''}
              {brl.format(report.totalNet)}
            </span>
          </p>
        </div>
      </Card>
    </div>
  )
}
