import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ResponsiveTabsList } from '@/components/ui/responsive-tabs'
import { Tabs, TabsContent, TabsTrigger } from '@/components/ui/tabs'
import {
  CashFlowReportData,
  SubgroupBreakdownItem,
  AccountBreakdownItem,
  FlowItemContributor,
} from '@/services/cashFlow'
import { CashFlowTransactionsDialog } from './CashFlowTransactionsDialog'
import {
  Tag,
  CreditCard,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

interface DetailDialogState {
  open: boolean
  title: string
  subtitle?: string
  totalAmount: number
  type: 'income' | 'expense' | 'net'
  items: FlowItemContributor[]
}

export interface CashFlowBreakdownTabsProps {
  report: CashFlowReportData
}

export const CashFlowBreakdownTabs: React.FC<CashFlowBreakdownTabsProps> = ({ report }) => {
  const [activeTab, setActiveTab] = useState<'subgroups' | 'accounts'>('subgroups')
  const [dialogState, setDialogState] = useState<DetailDialogState>({
    open: false,
    title: '',
    totalAmount: 0,
    type: 'expense',
    items: [],
  })

  const openSubgroupDialog = (item: SubgroupBreakdownItem) => {
    setDialogState({
      open: true,
      title: item.displayLabel,
      subtitle: `${item.groupName} • ${item.type === 'income' ? 'Receita' : 'Despesa'}`,
      totalAmount: item.total,
      type: item.type,
      items: item.items,
    })
  }

  const openAccountDialog = (acc: AccountBreakdownItem, filterType?: 'income' | 'expense') => {
    const filteredItems = filterType
      ? acc.items.filter((i) => i.transaction.type === filterType)
      : acc.items

    const total = filterType ? (filterType === 'income' ? acc.income : acc.expense) : acc.net

    setDialogState({
      open: true,
      title: `${acc.accountName} ${
        filterType ? (filterType === 'income' ? '(Entradas)' : '(Saídas)') : '(Líquido)'
      }`,
      subtitle: `Movimentações da conta no período`,
      totalAmount: total,
      type: filterType || (total >= 0 ? 'income' : 'expense'),
      items: filteredItems,
    })
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900">
              Detalhamento de Fluxo do Período
            </h3>
            <p className="text-xs text-slate-500">
              Clique em qualquer item ou valor para auditar os lançamentos que o compõem
            </p>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'subgroups' | 'accounts')}
            className="w-full sm:w-auto"
          >
            <ResponsiveTabsList className="bg-slate-100 border-slate-200">
              <TabsTrigger
                value="subgroups"
                className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800"
              >
                <Tag className="w-3.5 h-3.5" />
                <span>Plano de Contas (Subgrupos)</span>
              </TabsTrigger>
              <TabsTrigger
                value="accounts"
                className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-emerald-800"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Contas &amp; Cartões</span>
              </TabsTrigger>
            </ResponsiveTabsList>
          </Tabs>
        </div>

        {/* Conteúdo da Aba Subgrupos */}
        {activeTab === 'subgroups' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Saídas por Subgrupo */}
            <Card className="p-4 sm:p-5 rounded-2xl border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Saídas por Subgrupo
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {report.expenseSubgroups.length} subgrupos com desembolso
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-rose-700 border-rose-200 bg-rose-50 font-bold text-xs"
                >
                  {brl.format(report.totalExpense)}
                </Badge>
              </div>

              {report.expenseSubgroups.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma saída registrada no período selecionado.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {report.expenseSubgroups.map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => openSubgroupDialog(sub)}
                      className="w-full p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-900">
                            {sub.displayLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="truncate">{sub.groupName}</span>
                          <span>•</span>
                          <span>
                            {sub.items.length} {sub.items.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2 flex-shrink-0">
                        <div>
                          <p className="text-xs font-extrabold text-slate-900">
                            {brl.format(sub.total)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-semibold">
                            {sub.percentage}%
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Entradas por Subgrupo */}
            <Card className="p-4 sm:p-5 rounded-2xl border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                      Entradas por Subgrupo
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {report.incomeSubgroups.length} fontes de receita
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="text-emerald-700 border-emerald-200 bg-emerald-50 font-bold text-xs"
                >
                  {brl.format(report.totalIncome)}
                </Badge>
              </div>

              {report.incomeSubgroups.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Nenhuma entrada registrada no período selecionado.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
                  {report.incomeSubgroups.map((sub) => (
                    <button
                      key={sub.key}
                      type="button"
                      onClick={() => openSubgroupDialog(sub)}
                      className="w-full p-2.5 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all text-left flex items-center justify-between gap-3 group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-900">
                            {sub.displayLabel}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <span className="truncate">{sub.groupName}</span>
                          <span>•</span>
                          <span>
                            {sub.items.length} {sub.items.length === 1 ? 'item' : 'itens'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex items-center gap-2 flex-shrink-0">
                        <div>
                          <p className="text-xs font-extrabold text-emerald-700">
                            +{brl.format(sub.total)}
                          </p>
                          <p className="text-[10px] text-slate-500 font-semibold">
                            {sub.percentage}%
                          </p>
                        </div>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-600 transition-colors" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Conteúdo da Aba Contas */}
        {activeTab === 'accounts' && (
          <Card className="p-4 sm:p-5 rounded-2xl border-slate-200 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div>
                <h4 className="text-xs sm:text-sm font-extrabold text-slate-900">
                  Fluxo Consolidado por Conta Bancária e Cartão
                </h4>
                <p className="text-[11px] text-slate-500">
                  Total de créditos e débitos que transitaram em cada instrumento
                </p>
              </div>
            </div>

            {report.accountBreakdowns.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum movimento em contas bancárias no período.
              </div>
            ) : (
              <div className="space-y-2">
                {report.accountBreakdowns.map((acc) => {
                  const isCard = acc.accountType === 'credit_card'
                  return (
                    <div
                      key={acc.accountId}
                      className="p-3 sm:p-4 rounded-xl border border-slate-100 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {acc.accountName}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                            {isCard ? 'Cartão' : 'Conta'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {acc.items.length} {acc.items.length === 1 ? 'lançamento' : 'lançamentos'}{' '}
                          no período
                        </p>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-between sm:justify-end">
                        {/* Botão Entradas da Conta */}
                        {acc.income > 0 && (
                          <button
                            type="button"
                            onClick={() => openAccountDialog(acc, 'income')}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-left transition-colors cursor-pointer"
                            title="Ver entradas desta conta"
                          >
                            <span className="text-[10px] text-emerald-700 font-semibold block">
                              Entradas
                            </span>
                            <span className="text-xs font-extrabold flex items-center gap-0.5">
                              <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                              {brl.format(acc.income)}
                            </span>
                          </button>
                        )}

                        {/* Botão Saídas da Conta */}
                        {acc.expense > 0 && (
                          <button
                            type="button"
                            onClick={() => openAccountDialog(acc, 'expense')}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-left transition-colors cursor-pointer"
                            title="Ver saídas desta conta"
                          >
                            <span className="text-[10px] text-rose-700 font-semibold block">
                              Saídas
                            </span>
                            <span className="text-xs font-extrabold flex items-center gap-0.5">
                              <ArrowDownRight className="w-3 h-3 text-rose-600" />
                              {brl.format(acc.expense)}
                            </span>
                          </button>
                        )}

                        {/* Botão Líquido Geral */}
                        <button
                          type="button"
                          onClick={() => openAccountDialog(acc)}
                          className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 text-left transition-colors cursor-pointer"
                          title="Ver todas as movimentações desta conta"
                        >
                          <span className="text-[10px] text-slate-500 font-semibold block">
                            Líquido
                          </span>
                          <span
                            className={`text-xs font-extrabold ${
                              acc.net >= 0 ? 'text-emerald-700' : 'text-slate-900'
                            }`}
                          >
                            {brl.format(acc.net)}
                          </span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        )}
      </div>

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
