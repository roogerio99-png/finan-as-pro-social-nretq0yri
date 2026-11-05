import React, { useState } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { InvoiceItemEntry } from '@/types/finance'

interface ExcludeItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InvoiceItemEntry | null
  currentMonth: string
  onConfirm: (notes?: string) => Promise<void>
  formatCurrency: (val: number) => string
}

export const ExcludeItemDialog: React.FC<ExcludeItemDialogProps> = ({
  open,
  onOpenChange,
  item,
  currentMonth,
  onConfirm,
  formatCurrency,
}) => {
  const [notes, setNotes] = useState<string>('')
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Próximo mês
  const getNextMonth = (m: string) => {
    if (!/^\d{4}-\d{2}$/.test(m)) return ''
    const [y, mon] = m.split('-').map(Number)
    const t = y * 12 + (mon - 1) + 1
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`
  }

  const nextMonth = getNextMonth(currentMonth)

  React.useEffect(() => {
    if (open) setNotes('')
  }, [open])

  if (!item) return null

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      await onConfirm(notes || undefined)
      onOpenChange(false)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-bold text-slate-900">
            Excluir Título da Fatura?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2 text-xs text-slate-600">
            <p>
              O título <strong className="text-slate-900">{item.description}</strong>{' '}
              {item.index > 0 && `(Parcela ${item.index}) `}no valor de{' '}
              <strong className="text-slate-900">{formatCurrency(item.value)}</strong> sairá da
              fatura de <strong>{currentMonth}</strong>.
            </p>
            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 font-medium">
              💡 <strong>Regra de Auditoria:</strong> A compra não será apagada do aplicativo. Ela
              será automaticamente transferida para a fatura do mês seguinte (
              <strong>{nextMonth}</strong>).
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-1.5 py-2">
          <Label htmlFor="excNotes" className="text-xs">
            Motivo da Exclusão / Auditoria (Opcional)
          </Label>
          <Textarea
            id="excNotes"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Compra caiu na fatura seguinte do banco; divergência no fechamento..."
            className="resize-none text-xs"
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault()
              handleConfirm()
            }}
            disabled={submitting}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
          >
            {submitting ? 'Excluindo e Adiantando...' : 'Confirmar Exclusão'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
