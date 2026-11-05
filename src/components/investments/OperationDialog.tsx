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
  type ProventType,
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
  notes: string
  provent_type: ProventType
  cnpj: string
  irr: string
}

const emptyForm = (): FormState => ({
  ticker: '',
  op_type: 'buy',
  quantity: '',
  unit_price: '',
  op_date: todayISO(),
  fees: '',
  asset_class: 'stock',
  notes: '',
  provent_type: 'dividendo',
  cnpj: '',
  irr: '',
})

const selectClass =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring'

const parseNum = (v: string) => {
  const n = parseFloat(v.replace(',', '.'))
  return Number.isFinite(n) ? n : NaN
}

const CNPJ_MASK = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/

export const OperationDialog: React.FC<OperationDialogProps> = ({
  open,
  onOpenChange,
  editing,
  onSaved,
}) => {
  const { toast } = useToast()
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const isProvent = form.op_type === 'provento'

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
        notes: editing.notes ?? '',
        provent_type: editing.provent_type ?? 'dividendo',
        cnpj: editing.cnpj ?? '',
        irr: editing.irr ? String(editing.irr) : '',
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
    const irr = isProvent && form.irr.trim() ? parseNum(form.irr) : 0
    const cnpj = form.cnpj.replace(/\D/g, '')

    if (!/^[A-Z0-9]{3,12}$/.test(ticker)) return fail('Informe um ticker válido (ex.: PETR4).')
    if (!Number.isFinite(quantity) || quantity <= 0)
      return fail('A quantidade deve ser maior que zero.')
    if (!Number.isFinite(unitPrice) || unitPrice <= 0)
      return fail('O preço unitário deve ser maior que zero.')
    if (!isProvent) {
      if (!Number.isFinite(fees) || fees < 0) return fail('As taxas não podem ser negativas.')
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.op_date)) return fail('Informe a data da operação.')
    if (isProvent) {
      if (!form.provent_type) return fail('Informe o tipo de provento.')
      if (!Number.isFinite(irr) || irr < 0) return fail('O IRRF não pode ser negativo.')
      if (irr > 0 && form.provent_type !== 'jcp')
        return fail('IRRF só se aplica a JCP (retido na fonte em 15%).')
      if (cnpj && cnpj.length !== 14)
        return fail('O CNPJ deve ter 14 dígitos (ou deixe o campo em branco).')
    }

    const payload: OperationInput = {
      ticker,
      op_type: form.op_type,
      quantity,
      unit_price: unitPrice,
      op_date: form.op_date,
      fees: isProvent ? 0 : fees,
      asset_class: form.asset_class,
      // O enquadramento em day trade é calculado pelo sistema (compra e venda no mesmo
      // dia); a coluna manual segue no banco apenas por compatibilidade e é zerada aqui.
      day_trade: false,
      notes: form.notes.trim(),
      provent_type: isProvent ? form.provent_type : undefined,
      cnpj: isProvent && cnpj ? cnpj : undefined,
      irr: isProvent && irr > 0 ? irr : undefined,
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
            Registre uma compra, venda ou provento. O preço médio e o resultado são calculados a
            partir daqui.
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
              <option value="provento">Provento</option>
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

          {isProvent && (
            <>
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-xs font-semibold">Tipo de provento</Label>
                <select
                  className={selectClass}
                  value={form.provent_type}
                  onChange={(e) => set('provent_type', e.target.value as ProventType)}
                  aria-label="Tipo de provento"
                >
                  <option value="dividendo">Dividendo</option>
                  <option value="jcp">JCP (juros sobre capital próprio)</option>
                  <option value="bonificacao">Bonificação</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">CNPJ do ativo (opcional)</Label>
                <Input
                  value={form.cnpj}
                  onChange={(e) => set('cnpj', e.target.value)}
                  placeholder="00.000.000/0000-00"
                  inputMode="numeric"
                />
              </div>
              {form.provent_type === 'jcp' && (
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <Label className="text-xs font-semibold">IRRF retido (R$, 15% no JCP)</Label>
                  <Input
                    inputMode="decimal"
                    value={form.irr}
                    onChange={(e) => set('irr', e.target.value)}
                    placeholder="0,00"
                  />
                </div>
              )}
              <p className="col-span-2 text-xs text-slate-500">
                Informe o valor <span className="font-semibold">bruto</span> do provento em "Preço
                unitário" × quantidade
                {form.provent_type === 'jcp' ? ' — o líquido = bruto − IRRF.' : '.'}
              </p>
            </>
          )}

          {!isProvent && (
            <>
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
              <p className="col-span-2 sm:col-span-1 text-xs text-slate-500 self-end pb-1.5">
                O enquadramento em day trade é automático: compra e venda do mesmo ticker no mesmo
                dia.
              </p>
            </>
          )}

          {isProvent && (
            <div className="space-y-1.5 col-span-2 sm:col-span-1">
              <Label className="text-xs font-semibold">Quantidade (ações/cotas)</Label>
              <Input
                inputMode="decimal"
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                placeholder="100"
              />
            </div>
          )}

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

export { CNPJ_MASK }
