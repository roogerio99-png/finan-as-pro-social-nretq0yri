import React, { useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil, Trash2 } from 'lucide-react'
import type { InvestmentOperation } from '@/services/investments'
import { ASSET_CLASS_LABELS, brl, detectDayTradeOps, formatDayBR } from '@/services/investmentsCalc'

interface ProventTypeLabels {
  [key: string]: string
}

const proventTypeLabel = (t?: string) =>
  t === 'jcp' ? 'JCP' : t === 'bonificacao' ? 'Bonificação' : 'Dividendo'

interface OperationsListProps {
  operations: InvestmentOperation[]
  onEdit: (op: InvestmentOperation) => void
  onDelete: (op: InvestmentOperation) => void
}

// Lista em ordem cronológica (data e criação), empilhada em cards para caber no celular.
export const OperationsList: React.FC<OperationsListProps> = ({ operations, onEdit, onDelete }) => {
  // Quantidade casada como day trade pela detecção automática (compra e venda no mesmo
  // dia) — o enquadramento é sempre calculado pelo sistema, nunca marcado na operação.
  const detected = useMemo(() => detectDayTradeOps(operations), [operations])
  const [showProvents, setShowProvents] = useState(true)

  const buysSells = operations.filter((op) => op.op_type !== 'provento')
  const provents = operations.filter((op) => op.op_type === 'provento')

  if (operations.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Nenhuma operação registrada. Use “Nova operação” para começar.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {buysSells.map((op) => {
        const isBuy = op.op_type === 'buy'
        const total = op.quantity * op.unit_price
        return (
          <Card key={op.id} className="min-w-0">
            <CardContent className="p-3 sm:p-4 flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-slate-500">{formatDayBR(op.op_date)}</span>
                  <Badge className={isBuy ? 'bg-emerald-600' : 'bg-rose-600'}>
                    {isBuy ? 'Compra' : 'Venda'}
                  </Badge>
                  <span className="font-bold text-slate-900">{op.ticker}</span>
                  <Badge variant="outline">{ASSET_CLASS_LABELS[op.asset_class]}</Badge>
                  {(detected.get(op.id)?.qty ?? 0) > 1e-9 && (
                    <Badge variant="outline" className="border-amber-400 text-amber-700">
                      Day trade (detectado)
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-slate-700">
                  {op.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })} ×{' '}
                  {brl.format(op.unit_price)} ={' '}
                  <span className="font-semibold">{brl.format(total)}</span>
                </p>
                {op.fees > 0 && (
                  <p className="text-xs text-slate-500">Taxas: {brl.format(op.fees)}</p>
                )}
                {op.notes && <p className="text-xs text-slate-500 break-words">{op.notes}</p>}
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Editar operação"
                  onClick={() => onEdit(op)}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Excluir operação"
                  onClick={() => onDelete(op)}
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {provents.length > 0 && (
        <Card className="min-w-0">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">Proventos ({provents.length})</p>
              <Button variant="ghost" size="sm" onClick={() => setShowProvents((s) => !s)}>
                {showProvents ? 'Ocultar' : 'Mostrar'}
              </Button>
            </div>
            {showProvents && (
              <div className="mt-2 space-y-2">
                {provents.map((op) => {
                  const gross = op.quantity * op.unit_price
                  const irr = op.irr || 0
                  return (
                    <div
                      key={op.id}
                      className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-500">{formatDayBR(op.op_date)}</span>
                          <Badge className="bg-sky-600">{proventTypeLabel(op.provent_type)}</Badge>
                          <span className="font-bold text-slate-900">{op.ticker}</span>
                          {op.cnpj && (
                            <Badge variant="outline" className="text-xs">
                              {op.cnpj}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-700">
                          {op.quantity.toLocaleString('pt-BR', { maximumFractionDigits: 8 })} ×{' '}
                          {brl.format(op.unit_price)} ={' '}
                          <span className="font-semibold">{brl.format(gross)}</span>
                          {irr > 0 && (
                            <span className="text-xs text-slate-500">
                              {' '}
                              (IRRF {brl.format(irr)} · líquido {brl.format(gross - irr)})
                            </span>
                          )}
                        </p>
                        {op.notes && (
                          <p className="text-xs text-slate-500 break-words">{op.notes}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Editar provento"
                          onClick={() => onEdit(op)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Excluir provento"
                          onClick={() => onDelete(op)}
                        >
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export { proventTypeLabel }
export type { ProventTypeLabels }
