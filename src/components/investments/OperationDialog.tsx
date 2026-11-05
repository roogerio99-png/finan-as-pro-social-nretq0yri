import React, { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  investmentsService,
  type AssetClass,
  type InvestmentOperation,
  type OperationInput,
  type OpType,
} from '@/services/investments'
import { ASSET_CLASS_LABELS, todayISO } from '@/services/investmentsCalc'

interface OperationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: InvestmentOperation | null
  onSaved: () => void
}

interface FormState {
  ticker: string
  op_type: OpType
  quantity: string
  unit_price: string
  op_date: string
  fees: string
  asset_class: AssetClass
  day_trade: boolean
  notes: string
}

const emptyForm = (): FormState => ({
  ticker: '',
  op_type: 'buy',
  quantity: '',
  unit_price: '',
  op_date: todayISO(),
  fees: '',
  asset_class: 'stock',
  day_trade: false,
  notes: '',
})

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const parseNum = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

export const OperationDialog: React.FC<OperationDialogProps> = ({
  open,
  onOpenChange,
  editing,
  onSaved,
}) => {
  const { toast } = useToast()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (editing) {
      setForm({
        ticker: editing.ticker,
        op_type: editing.op_type,
        quantity: String(editing.quantity),
        unit_price: String(editing.unit_price),
        op_date: editing.op_date,
        fees: editing.fees ? String(editing.fees) : '',
        asset_class: editing.asset_class,
        day_trade: !!editing.day_trade,
        notes: editing.notes ?? '',
      })
    } else {
      setForm(emptyForm())
    }
  }, [open, editing])

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const fail = (description: string) =>
    toast({ title: 'Verifique os dados', description, variant: 'destructive' })

  const handleSave = async () => {
    const ticker = form.ticker.trim().toUpperCase()
    const quantity = parseNum(form.quantity)
    const unitPrice = parseNum(form.unit_price)
    const fees = form.fees.trim() ? parseNum(form.fees) : 0

    if (!/^[A-Z0-9]{3,12}$/.test(ticker)) return fail('Informe um ticker válido (ex.: PETR4).')
    if (!Number.isFinite(quantity) || quantity <= 0)
      return fail('A quantidade deve ser maior que zero.')
    if (!Number.isFinite(unitPrice) || unitPrice <= 0)
      return fail('O preço unitário deve ser maior que zero.')
    if (!Number.isFinite(fees) || fees < 0) return fail('As taxas não podem ser negativas.')
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.op_date)) return fail('Informe a data da operação.')

    const payload: OperationInput = {
      ticker,
      op_type: form.op_type,
      quantity,
      unit_price: unitPrice,
      op_date: form.op_date,
      fees,
      asset_class: form.asset_class,
      day_trade: form.day_trade,
      notes: form.notes.trim(),
    }

    setSaving(true)
    try {
      if (editing) await investmentsService.updateOperation(editing.id, payload)
      else await investmentsService.createOperation(payload)
      toast({ title: editing ? 'Operação atualizada' : 'Operação registrada' })
      onOpenChange(false)
      onSaved()
    } catch (err) {
      toast({
        title: 'Não foi possível salvar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Editar operação' : 'Nova operação'}</DialogTitle>
          <DialogDescription>
            Registre uma compra ou venda. O preço médio e o resultado são calculados a partir daqui.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tipo</Label>
            <select
              className={selectClass}
              value={form.op_type}
              onChange={(e) => set('op_type', e.target.value as OpType)}
              aria-label="Tipo da operação"
            >
              <option value="buy">Compra</option>
              <option value="sell">Venda</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Data</Label>
            <Input
              type="date"
              value={form.op_date}
              onChange={(e) => set('op_date', e.target.value)}
            />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label className="text-xs font-semibold">Ticker</Label>
            <Input
              value={form.ticker}
              onChange={(e) => set('ticker', e.target.value.toUpperCase())}
              placeholder="PETR4"
              className="uppercase"
              autoCapitalize="characters"
              maxLength={12}
            />
          </div>
          <div className="space-y-1.5 col-span-2 sm:col-span-1">
            <Label className="text-xs font-semibold">Classe do ativo</Label>
            <select
              className={selectClass}
              value={form.asset_class}
              onChange={(e) => set('asset_class', e.target.value as AssetClass)}
              aria-label="Classe do ativo"
            >
              {(Object.keys(ASSET_CLASS_LABELS) as AssetClass[]).map((c) => (
                <option key={c} value={c}>
                  {ASSET_CLASS_LABELS[c]}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Quantidade</Label>
            <Input
              inputMode="decimal"
              value={form.quantity}
              onChange={(e) => set('quantity', e.target.value)}
              placeholder="100"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Preço unitário (R$)</Label>
            <Input
              inputMode="decimal"
              value={form.unit_price}
              onChange={(e) => set('unit_price', e.target.value)}
              placeholder="10,00"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Taxas (R$, opcional)</Label>
            <Input
              inputMode="decimal"
              value={form.fees}
              onChange={(e) => set('fees', e.target.value)}
              placeholder="0,00"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Day trade</Label>
            <select
              className={selectClass}
              value={form.day_trade ? 'sim' : 'nao'}
              onChange={(e) => set('day_trade', e.target.value === 'sim')}
              aria-label="Day trade"
            >
              <option value="nao">Não</option>
              <option value="sim">Sim</option>
            </select>
          </div>
          <div className="space-y-1.5 col-span-2">
            <Label className="text-xs font-semibold">Observação (opcional)</Label>
            <Input value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Registrar operação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
