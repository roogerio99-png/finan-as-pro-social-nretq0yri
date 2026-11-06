import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MonthFlowSummary, CashFlowReportData, FlowItemContributor } from '@/services/cashFlow'
import { CashFlowTransactionsDialog } from './CashFlowTransactionsDialog'
import {
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronRight,
  HelpCircle,
} from 'lucide-react'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

export interface CashFlowMonthlyTableProps {
  report: CashFlowReportData
}

export const CashFlowMonthlyTable: React.FC<CashFlowMonthlyTableProps> = ({ report }) => {
  const [dialogState, setDialogState] = useState<{
    open: boolean
    title: string
    subtitle?: string
    totalAmount: number
    type: 'income' | 'expense' | 'net'
    items: FlowItemContributor[]
  }>({
    open: false,
    title: '',
    totalAmount: 0,
    type: 'net',
    items: [],
  })

  // Permite clicar em um mês da tabela para ver todos os lançamentos daquele mês
  const openMonthDialog = (mSummary: MonthFlowSummary, filterType?: 'income' | 'expense') => {
    // Filtrar todos os contributors daquele mês
    const allContributors: FlowItemContributor[] = []

    for (const sub of [...report.incomeSubgroups, ...report.expenseSubgroups]) {
      for (const item of sub.items) {
        const itemMonth = item.effectiveDate.slice(0, 7)
        if (itemMonth === mSummary.month) {
          if (!filterType || item.transaction.type === filterType) {
            // Evitar duplicatas caso o item já tenha entrado
            if (!allContributors.some((x) => x.transaction.id === item.transaction.id)) {
              allContributors.push(item)
            }
          }
        }
      }
    }

    const title = `${mSummary.label} ${
      filterType ? (filterType === 'income' ? '• Entradas' : '• Saídas') : '• Todos os Lançamentos'
    }`
    const total = filterType
      ? filterType === 'income'
        ? mSummary.income
        : mSummary.expense
      : mSummary.net

    setDialogState({
      open: true,
      title,
      subtitle: `Lançamentos do mês ${mSummary.label}`,
      totalAmount: total,
      type: filterType || (total >= 0 ? 'income' : 'expense'),
      items: allContributors,
    })
  }

  return (
    <>
      <Card className="p-4 sm:p-5 rounded-2xl border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Demonstrativo Mensal do Fluxo de Caixa
            </h3>
            <p className="text-xs text-slate-500">
              Evolução detalhada mês a mês com saldo inicial, entradas, saídas, resultado e saldo
              acumulado
            </p>
          </div>
          <Badge
            variant="outline"
            className="w-fit text-xs font-semibold text-slate-600 bg-slate-50"
          >
            {report.monthlySummaries.length}{' '}
            {report.monthlySummaries.length === 1 ? 'mês' : 'meses'}
          </Badge>
        </div>

        {/* Versão Desktop: Tabela completa com hover e formatação impecável */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider bg-slate-50/50">
                <th className="py-2.5 px-3 rounded-l-lg">Mês</th>
                <th className="py-2.5 px-3 text-right">Saldo Inicial</th>
                <th className="py-2.5 px-3 text-right text-emerald-700">Entradas (+)</th>
                <th className="py-2.5 px-3 text-right text-rose-700">Saídas (-)</th>
                <th className="py-2.5 px-3 text-right">Resultado do Mês</th>
                <th className="py-2.5 px-3 text-right rounded-r-lg font-extrabold text-slate-900">
                  Saldo Acumulado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {report.monthlySummaries.map((m) => (
                <tr key={m.month} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="py-3 px-3 font-bold text-slate-900 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{m.label}</span>
                  </td>

                  <td className="py-3 px-3 text-right font-medium text-slate-600">
                    {brl.format(m.openingBalance)}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => openMonthDialog(m, 'income')}
                      className="font-bold text-emerald-700 hover:underline hover:text-emerald-800 transition-colors cursor-pointer inline-flex items-center gap-0.5"
                      title="Ver entradas deste mês"
                    >
                      +{brl.format(m.income)}
                    </button>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => openMonthDialog(m, 'expense')}
                      className="font-bold text-rose-600 hover:underline hover:text-rose-700 transition-colors cursor-pointer inline-flex items-center gap-0.5"
                      title="Ver saídas deste mês"
                    >
                      -{brl.format(m.expense)}
                    </button>
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => openMonthDialog(m)}
                      className={`font-extrabold hover:underline cursor-pointer ${
                        m.net >= 0 ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                      title="Ver todos os lançamentos deste mês"
                    >
                      {m.net >= 0 ? '+' : ''}
                      {brl.format(m.net)}
                    </button>
                  </td>

                  <td className="py-3 px-3 text-right font-extrabold text-purple-900 bg-purple-50/30">
                    {brl.format(m.closingBalance)}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Linha de Totais no Rodapé */}
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-50 text-xs font-extrabold text-slate-900">
                <td className="py-3 px-3 rounded-bl-lg">TOTAL DO PERÍODO</td>
                <td className="py-3 px-3 text-right text-slate-600">
                  {brl.format(report.initialOpeningBalance)}
                  <span className="block text-[10px] font-normal text-slate-400">
                    Saldo inicial
                  </span>
                </td>
                <td className="py-3 px-3 text-right text-emerald-700">
                  +{brl.format(report.totalIncome)}
                </td>
                <td className="py-3 px-3 text-right text-rose-700">
                  -{brl.format(report.totalExpense)}
                </td>
                <td
                  className={`py-3 px-3 text-right ${
                    report.totalNet >= 0 ? 'text-emerald-700' : 'text-rose-700'
                  }`}
                >
                  {report.totalNet >= 0 ? '+' : ''}
                  {brl.format(report.totalNet)}
                </td>
                <td className="py-3 px-3 text-right rounded-br-lg text-purple-900 font-black">
                  {brl.format(report.finalClosingBalance)}
                  <span className="block text-[10px] font-normal text-slate-400">Saldo final</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Versão Mobile (< 768px): Cards empilhados claros e legíveis, sem colunas estouradas */}
        <div className="md:hidden space-y-2.5">
          {report.monthlySummaries.map((m) => (
            <div
              key={m.month}
              className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/60 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-extrabold text-slate-900 text-sm">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  <span>{m.label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => openMonthDialog(m)}
                  className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                >
                  <span>Ver detalhes</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded-lg bg-white border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-semibold block">
                    Saldo Inicial
                  </span>
                  <span className="font-bold text-slate-700">{brl.format(m.openingBalance)}</span>
                </div>

                <div className="p-2 rounded-lg bg-purple-50/60 border border-purple-100">
                  <span className="text-[10px] text-purple-700 font-semibold block">
                    Saldo Acumulado
                  </span>
                  <span className="font-extrabold text-purple-900">
                    {brl.format(m.closingBalance)}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-emerald-50/60 border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 font-semibold block">
                    Entradas (+)
                  </span>
                  <button
                    type="button"
                    onClick={() => openMonthDialog(m, 'income')}
                    className="font-extrabold text-emerald-800 text-left cursor-pointer"
                  >
                    +{brl.format(m.income)}
                  </button>
                </div>

                <div className="p-2 rounded-lg bg-rose-50/60 border border-rose-100">
                  <span className="text-[10px] text-rose-700 font-semibold block">Saídas (-)</span>
                  <button
                    type="button"
                    onClick={() => openMonthDialog(m, 'expense')}
                    className="font-extrabold text-rose-800 text-left cursor-pointer"
                  >
                    -{brl.format(m.expense)}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-slate-100/70 text-xs">
                <span className="text-slate-600 font-semibold">Resultado do Mês</span>
                <span className={`font-black ${m.net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {m.net >= 0 ? '+' : ''}
                  {brl.format(m.net)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Modal de lançamentos */}
      <CashFlowTransactionsDialog
        open={dialogState.open}
        onOpenChange={(open) => setDialogState((s) => ({ ...s, open }))}
        title={dialogState.title}
        subtitle={dialogState.subtitle}
        totalAmount={dialogState.totalAmount}
        type={dialogState.type}
        items={dialogState.items}
      />
    </>
  )
}
