import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Pencil, Trash2 } from 'lucide-react'
import type { InvestmentOperation } from '@/services/investments'
import { ASSET_CLASS_LABELS, brl, formatDayBR } from '@/services/investmentsCalc'

interface OperationsListProps {
  operations: InvestmentOperation[]
  onEdit: (op: InvestmentOperation) => void
  onDelete: (op: InvestmentOperation) => void
}

// Lista em ordem cronológica (data e criação), empilhada em cards para caber no celular.
export const OperationsList: React.FC<OperationsListProps> = ({ operations, onEdit, onDelete }) => {
  if (operations.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-8">
        Nenhuma operação registrada. Use “Nova operação” para começar.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {operations.map((op) => {
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
                  {op.day_trade && <Badge variant="outline">Day trade</Badge>}
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
    </div>
  )
}
