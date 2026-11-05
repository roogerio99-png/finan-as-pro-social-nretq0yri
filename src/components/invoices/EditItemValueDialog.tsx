import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { InvoiceItemEntry } from '@/types/finance'

interface EditItemValueDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  item: InvoiceItemEntry | null
  onSave: (value: number, notes?: string) => Promise<void>
  formatCurrency: (val: number) => string
}

export const EditItemValueDialog: React.FC<EditItemValueDialogProps> = ({
  open,
  onOpenChange,
  item,
  onSave,
  formatCurrency,
}) => {
  const [value, setValue] = useState<string>('')
  const [notes, setNotes] = useState<string>('')
  const [saving, setSaving] = useState<boolean>(false)

  // Quando o item abrir, inicializa com o valor atual
  React.useEffect(() => {
    if (item) {
      setValue(item.value ? item.value.toFixed(2) : '')
      setNotes('')
    }
  }, [item, open])

  if (!item) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(value.replace(',', '.'))
    if (!(num > 0)) return

    setSaving(true)
    try {
      await onSave(num, notes || undefined)
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const isInstallment = (item.installments_total && item.installments_total > 1) || item.index > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            Alterar Valor do Título
          </DialogTitle>
          <DialogDescription>
            {item.description}
            {item.index > 0 &&
              ` • Parcela ${item.index}${item.installments_total ? `/${item.installments_total}` : ''}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 text-xs text-purple-900 space-y-1">
            <p>
              Valor atual na fatura: <strong>{formatCurrency(item.value)}</strong>
            </p>
            {isInstallment && (
              <p className="text-[11px] text-purple-700">
                Ao alterar o valor, o novo valor será aplicado nesta fatura e as parcelas futuras
                desta compra também serão recalculadas automaticamente.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="itemVal">Novo Valor (R$)</Label>
            <Input
              id="itemVal"
              type="number"
              step="0.01"
              min="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0.00"
              required
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="itemNotes">Motivo do Ajuste (Opcional - Auditoria)</Label>
            <Textarea
              id="itemNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Diferença de anuidade, taxa banco, arredondamento..."
              className="resize-none text-xs"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving || !(parseFloat(value.replace(',', '.')) > 0)}
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
            >
              {saving ? 'Salvando...' : 'Confirmar Alteração'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
