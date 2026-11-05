import React from 'react'
import { Card } from '@/components/ui/card'
import { Info } from 'lucide-react'

type FormulaLine = { text: string; desc?: string }
type LegendEntry = { symbol: string; meaning: string }

interface FormulaBlockProps {
  intro: React.ReactNode
  formulas: FormulaLine[]
  legend: LegendEntry[]
  notes: string[]
}

// Bloco explicativo "Como o cálculo é feito": fórmulas + legenda das variáveis.
export const FormulaBlock: React.FC<FormulaBlockProps> = ({ intro, formulas, legend, notes }) => (
  <Card className="p-4 sm:p-5 bg-slate-50/80 border-slate-200">
    <div className="flex items-center gap-2">
      <Info className="w-4 h-4 text-emerald-600 flex-shrink-0" />
      <h3 className="text-sm font-bold text-slate-900">Como o cálculo é feito</h3>
    </div>
    <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{intro}</p>
    <div className="mt-3 space-y-2">
      {formulas.map((f) => (
        <div key={f.text} className="rounded-lg bg-white border border-slate-200 px-3 py-2">
          <p className="font-mono text-sm font-bold text-emerald-800">{f.text}</p>
          {f.desc && <p className="text-xs text-slate-500 mt-0.5">{f.desc}</p>}
        </div>
      ))}
    </div>
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
      {legend.map((l) => (
        <p key={l.symbol} className="text-xs text-slate-600">
          <span className="font-bold text-slate-900">{l.symbol}</span> — {l.meaning}
        </p>
      ))}
    </div>
    <ul className="mt-3 space-y-1">
      {notes.map((n) => (
        <li key={n} className="text-xs text-slate-500 flex gap-1.5">
          <span aria-hidden="true">•</span>
          <span className="leading-relaxed">{n}</span>
        </li>
      ))}
    </ul>
  </Card>
)
