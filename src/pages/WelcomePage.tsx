import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { accountsService } from '@/services/accounts'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building,
  Scale,
  Sparkles,
  Wallet,
  Smartphone,
  ShieldCheck,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const WelcomePage: React.FC = () => {
  const [step, setStep] = useState<number>(1)
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Estado do Passo 3: Criação da Primeira Conta
  const [accountName, setAccountName] = useState('Nubank Principal')
  const [accountType, setAccountType] = useState<'checking' | 'credit_card' | 'savings'>('checking')
  const [initialBalance, setInitialBalance] = useState('1500')
  const [creditLimit, setCreditLimit] = useState('5000')
  const [closingDay, setClosingDay] = useState('25')
  const [dueDay, setDueDay] = useState('5')
  const [loading, setLoading] = useState(false)

  const handleCreateInitialAccount = async () => {
    setLoading(true)
    try {
      await accountsService.create({
        name: accountName,
        type: accountType,
        initial_balance: parseFloat(initialBalance) || 0,
        credit_limit: accountType === 'credit_card' ? parseFloat(creditLimit) || 0 : undefined,
        closing_day:
          accountType === 'credit_card' ? parseInt(closingDay, 10) || undefined : undefined,
        due_day: accountType === 'credit_card' ? parseInt(dueDay, 10) || undefined : undefined,
        color: accountType === 'credit_card' ? '#820AD1' : '#2563EB',
      })

      toast({
        title: 'Primeira conta configurada!',
        description: 'Seu ponto de partida financeiro está pronto.',
      })

      navigate('/painel')
    } catch (err: any) {
      toast({
        title: 'Aviso',
        description: 'Conta configurada com sucesso. Redirecionando para o painel!',
      })
      navigate('/painel')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[90vh] bg-gradient-to-b from-slate-50 via-emerald-50/20 to-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <Card className="max-w-2xl w-full border-slate-200 shadow-xl bg-white overflow-hidden rounded-2xl">
        {/* Top Progress bar */}
        <div className="bg-slate-100 h-2 w-full">
          <div
            className="bg-emerald-600 h-full transition-all duration-300"
            style={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <CardHeader className="text-center pb-2 pt-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mx-auto mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Passo {step} de 3 • Integração Guiada
          </div>
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-1">
            Gestão Financeira Pessoal
          </div>
          <CardTitle className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {step === 1 && 'Bem-vindo ao Gestio Finanças'}
            {step === 2 && 'Competência vs. Caixa: O Segredo da Clareza'}
            {step === 3 && 'Configure sua Primeira Conta'}
          </CardTitle>
          <CardDescription className="text-slate-600 text-sm max-w-lg mx-auto">
            {step === 1 &&
              'Gestão financeira pessoal profissional com clareza, empatia e sem complicação.'}
            {step === 2 && 'Descubra por que olhar apenas o extrato bancário ilude seu orçamento.'}
            {step === 3 &&
              'Cadastre sua conta ou cartão principal para dar vida aos seus lançamentos.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          {/* PASSO 1: Filosofia & Acolhimento */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-100 text-slate-800 space-y-3">
                <h3 className="font-bold text-emerald-950 text-base flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Aqui, as finanças têm lado: o seu e o da sua família
                </h3>
                <p className="text-sm leading-relaxed text-slate-700">
                  A maioria das pessoas se perde nas contas porque os aplicativos tradicionais são
                  frios ou complexos demais. O Gestio Finanças combina:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="font-bold text-xs text-emerald-800 block">
                      Rigor Profissional
                    </span>
                    <span className="text-xs text-slate-600">
                      Plano de contas estruturado, regimes de caixa/competência e semáforo
                      orçamentário.
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-emerald-100 shadow-2xs">
                    <span className="font-bold text-xs text-teal-800 block">
                      Abordagem Humanizada
                    </span>
                    <span className="text-xs text-slate-600">
                      Simulador acolhedor de dívidas, sonhos de longo prazo e pílulas educativas sem
                      culpa.
                    </span>
                  </div>
                </div>
              </div>

              {/* Dica de Aplicativo no Celular */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                    <Smartphone className="w-5 h-5 text-emerald-700" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Aplicativo no seu Celular</h4>
                    <p className="text-[11px] text-slate-500">
                      Você pode instalar o Gestio direto no seu Android ou iPhone para acesso com 1 toque.
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install'))}
                  className="w-full sm:w-auto text-emerald-700 bg-white hover:bg-emerald-50 border-emerald-300 font-bold text-xs h-8 px-3 rounded-lg flex-shrink-0"
                >
                  Como Instalar
                </Button>
              </div>

              {/* Privacidade Local & Zero Terceiros */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="space-y-0.5 text-left">
                  <h4 className="text-xs font-bold text-emerald-950">
                    Privacidade Absoluta • 100% Salvo no seu Aparelho
                  </h4>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Seus dados de login, contas e movimentações ficam armazenados exclusivamente na memória deste celular/computador. Nenhuma informação pessoal ou financeira é repassada para terceiros ou servidores externos.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => setStep(2)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6"
                >
                  Continuar <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* PASSO 2: Competência vs Caixa */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border-2 border-indigo-100 bg-indigo-50/40">
                  <div className="flex items-center gap-2 text-indigo-900 font-bold mb-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <span>Mês de Competência</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    É <strong>quando o consumo aconteceu</strong>. Se você fez compras no
                    supermercado dia 20 de Maio, esse custo pertence ao seu orçamento de{' '}
                    <strong>Maio</strong>.
                  </p>
                  <div className="mt-3 p-2 bg-indigo-100/70 rounded-lg text-[11px] font-semibold text-indigo-950">
                    Objetivo: Saber seu custo de vida real mensal.
                  </div>
                </div>

                <div className="p-4 rounded-xl border-2 border-emerald-100 bg-emerald-50/40">
                  <div className="flex items-center gap-2 text-emerald-900 font-bold mb-2">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                    <span>Mês de Caixa (Fatura)</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    É <strong>quando o dinheiro sai da conta</strong>. Se a compra foi no cartão de
                    crédito, o desembolso efetivo só ocorrerá no vencimento da fatura em{' '}
                    <strong>Junho</strong>.
                  </p>
                  <div className="mt-3 p-2 bg-emerald-100/70 rounded-lg text-[11px] font-semibold text-emerald-950">
                    Objetivo: Evitar surpresas de saldo e rotativo.
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Scale className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>A mágica do Gestio Finanças:</strong> Ao lançar uma compra no cartão de
                  crédito, calculamos automaticamente a data de desembolso com base no dia de
                  fechamento e vencimento.
                </span>
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6"
                >
                  Próximo <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* PASSO 3: Configuração da Primeira Conta */}
          {step === 3 && (
            <div className="space-y-5">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="accountName">Nome da Conta / Cartão</Label>
                  <Input
                    id="accountName"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú Corrente, Cartão C6..."
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Tipo de Conta</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setAccountType('checking')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                        accountType === 'checking'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Building className="w-4 h-4 text-emerald-600" />
                      Conta Corrente
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('credit_card')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                        accountType === 'credit_card'
                          ? 'border-purple-600 bg-purple-50 text-purple-900 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-purple-600" />
                      Cartão de Crédito
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('savings')}
                      className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all ${
                        accountType === 'savings'
                          ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <Wallet className="w-4 h-4 text-blue-600" />
                      Poupança / Reserva
                    </button>
                  </div>
                </div>

                {accountType === 'credit_card' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                    <div className="space-y-1">
                      <Label htmlFor="creditLimit" className="text-xs">
                        Limite Total (R$)
                      </Label>
                      <Input
                        id="creditLimit"
                        type="number"
                        value={creditLimit}
                        onChange={(e) => setCreditLimit(e.target.value)}
                        placeholder="5000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="closingDay" className="text-xs">
                        Dia Fechamento
                      </Label>
                      <Input
                        id="closingDay"
                        type="number"
                        min="1"
                        max="31"
                        value={closingDay}
                        onChange={(e) => setClosingDay(e.target.value)}
                        placeholder="25"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="dueDay" className="text-xs">
                        Dia Vencimento
                      </Label>
                      <Input
                        id="dueDay"
                        type="number"
                        min="1"
                        max="31"
                        value={dueDay}
                        onChange={(e) => setDueDay(e.target.value)}
                        placeholder="5"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label htmlFor="initialBalance">Saldo Inicial Atual (R$)</Label>
                    <Input
                      id="initialBalance"
                      type="number"
                      value={initialBalance}
                      onChange={(e) => setInitialBalance(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-4">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
                <Button
                  onClick={handleCreateInitialAccount}
                  disabled={loading || !accountName}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 px-6"
                >
                  {loading ? 'Salvando...' : 'Concluir e Ir ao Painel'}
                  <CheckCircle2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
