import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NodeDialogState } from './nodeDialogState'

export interface NodeDialogFormProps {
  dialog: NodeDialogState
  saving: boolean
  onChange: (patch: Partial<NodeDialogState>) => void
  onCancel: () => void
  onSubmit: () => void
  submitLabel: string
  submitTitle?: string
  codePlaceholder?: string
  /** Grupo pai (nível 2): exibido como campo somente leitura para contexto. */
  parentLabel?: string
}

export const NodeDialogForm: React.FC<NodeDialogFormProps> = ({
  dialog,
  saving,
  onChange,
  onCancel,
  onSubmit,
  submitLabel,
  submitTitle,
  codePlaceholder,
  parentLabel,
}) => (
  <>
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="space-y-4 pt-2"
    >
      {dialog.level === 2 && (
        <div className="space-y-1.5">
          <Label htmlFor="nodeParent">Grupo</Label>
          <Input
            id="nodeParent"
            value={parentLabel ?? dialog.parent ?? ''}
            readOnly
            disabled
            className="bg-slate-50 text-slate-500"
          />
        </div>
      )}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="nodeTitle">Nome</Label>
          <Input
            id="nodeTitle"
            value={dialog.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={dialog.level === 1 ? 'Ex.: Habitação e Moradia' : 'Ex.: Concessionárias'}
            autoFocus
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="nodeCode">Código</Label>
          <Input
            id="nodeCode"
            value={dialog.code}
            onChange={(e) => onChange({ code: e.target.value })}
            placeholder={codePlaceholder}
            className="w-24 font-mono"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="nodeDesc">Descrição do Gasto</Label>
        <Input
          id="nodeDesc"
          value={dialog.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="Ex.: Contas de energia elétrica, água/esgoto e gás."
        />
      </div>
      <div className="flex justify-end space-x-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        {/* Clique dispara o save diretamente: nunca depende do submit nativo do form
            (que o navegador pode cancelar em silêncio com validação HTML). */}
        <Button
          type="button"
          onClick={onSubmit}
          disabled={saving}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
          title={submitTitle}
        >
          {saving ? 'Salvando...' : submitLabel}
        </Button>
      </div>
    </form>
  </>
)
