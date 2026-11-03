import React from 'react'
import { MicrolearningPill } from '@/services/microlearning'
import { Lightbulb, AlertTriangle, TrendingUp, Sparkles, X } from 'lucide-react'

interface EducationalPillCardProps {
  pill: MicrolearningPill
  onDismiss?: () => void
  className?: string
}

export const EducationalPillCard: React.FC<EducationalPillCardProps> = ({
  pill,
  onDismiss,
  className = '',
}) => {
  const getIcon = () => {
    switch (pill.trigger) {
      case 'overbudget':
        return <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
      case 'revolving_credit':
        return <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
      case 'surplus':
        return <TrendingUp className="w-5 h-5 text-emerald-600 flex-shrink-0" />
      default:
        return <Lightbulb className="w-5 h-5 text-teal-600 flex-shrink-0" />
    }
  }

  const getBadgeColor = () => {
    switch (pill.trigger) {
      case 'overbudget':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'revolving_credit':
        return 'bg-rose-100 text-rose-800 border-rose-200'
      case 'surplus':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200'
      default:
        return 'bg-teal-100 text-teal-800 border-teal-200'
    }
  }

  return (
    <div
      className={`p-4 rounded-xl border border-slate-200 bg-white shadow-xs relative transition-all hover:shadow-sm ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 mt-0.5">
            {getIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${getBadgeColor()}`}
              >
                {pill.tag}
              </span>
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-emerald-500" /> Pílula Educativa
              </span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm mt-1">{pill.title}</h4>
            <p className="text-xs font-medium text-slate-500 mt-0.5">{pill.subtitle}</p>
            <p className="text-xs text-slate-700 mt-2 leading-relaxed bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
              {pill.content}
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-100 transition-colors"
            title="Fechar dica"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
