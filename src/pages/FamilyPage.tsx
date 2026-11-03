import React, { useState, useEffect } from 'react'
import { familyService } from '@/services/family'
import { transactionsService } from '@/services/transactions'
import { accountsService } from '@/services/accounts'
import { useAuth } from '@/contexts/AuthContext'
import { FamilyRecord, TransactionRecord, AccountRecord } from '@/types/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Users,
  UserCheck,
  UserPlus,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  CreditCard,
  Building,
  Heart,
  Scale,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const FamilyPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [family, setFamily] = useState<FamilyRecord | null>(null)
  const [viewMode, setViewMode] = useState<'individual' | 'consolidated'>('consolidated')
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Convite
  const [inviteEmail, setInviteEmail] = useState<string>('')
  const [inviting, setInviting] = useState<boolean>(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const myFam = await familyService.getMyFamily()
      setFamily(myFam)

      const [txs, accs] = await Promise.all([
        transactionsService.list({ familyId: viewMode === 'consolidated' ? myFam?.id : undefined }),
        accountsService.list(viewMode === 'consolidated' ? myFam?.id : undefined),
      ])
      setTransactions(txs)
      setAccounts(accs)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [viewMode])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!family || !inviteEmail) return

    setInviting(true)
    try {
      await familyService.addMember(family.id, inviteEmail)
      toast({
        title: 'Membro adicionado à família!',
        description: `O e-mail ${inviteEmail} agora compartilha a visão consolidada.`,
      })
      setInviteEmail('')
      loadData()
    } catch (err: any) {
      toast({
        title: 'Aviso',
        description: err.message || 'Verifique se o usuário já possui conta cadastrada.',
        variant: 'destructive',
      })
    } finally {
      setInviting(false)
    }
  }

  const handleCreateFamily = async () => {
    try {
      const fam = await familyService.create(`Família ${user?.name || 'Silva'}`)
      setFamily(fam)
      toast({ title: 'Núcleo familiar criado com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao criar', description: err.message, variant: 'destructive' })
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((acc, t) => acc + t.amount, 0)

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((acc, t) => acc + t.amount, 0)

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-5 sm:space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Modo Família & Gastos Compartilhados
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Alterne entre sua visão individual e a visão consolidada da casa com total transparência
            e harmonia.
          </p>
        </div>

        {/* Alternância Individual vs Consolidada */}
        <div className="bg-slate-100 p-1 rounded-2xl flex items-center border border-slate-200 text-xs font-bold w-full sm:w-auto">
          <button
            onClick={() => setViewMode('individual')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl transition-all text-center ${
              viewMode === 'individual'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Individual ({user?.name?.split(' ')[0] || 'Eu'})
          </button>
          <button
            onClick={() => setViewMode('consolidated')}
            className={`flex-1 sm:flex-initial px-3 sm:px-4 py-2 rounded-xl transition-all text-center ${
              viewMode === 'consolidated'
                ? 'bg-white text-emerald-800 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Consolidada ({family?.name || 'Família'})
          </button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Despesas Totais ({viewMode === 'consolidated' ? 'Família' : 'Você'})
          </span>
          <div className="text-2xl font-black text-rose-600 mt-1">
            {formatCurrency(totalExpense)}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {transactions.filter((t) => t.type === 'expense').length} lançamentos de despesa
          </p>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Receitas Totais ({viewMode === 'consolidated' ? 'Família' : 'Você'})
          </span>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {formatCurrency(totalIncome)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Entradas somadas do núcleo</p>
        </Card>

        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Saldo Líquido da Casa
          </span>
          <div className="text-2xl font-black text-teal-700 mt-1">
            {formatCurrency(totalIncome - totalExpense)}
          </div>
          <p className="text-xs text-slate-500 mt-1">Superávit livre para sonhos e reserva</p>
        </Card>
      </div>

      {/* Gerenciamento do Núcleo Familiar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-6 space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-emerald-600" />
              Membros Conectados ({family?.members?.length || 1})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Cada membro possui seu próprio login seguro e contribui para o orçamento
              compartilhado.
            </CardDescription>
          </CardHeader>

          {family ? (
            <div className="space-y-3 pt-2">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    {user?.name?.[0] || 'U'}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      {user?.name} (Você)
                    </span>
                    <span className="text-[11px] text-slate-500">{user?.email}</span>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Administrador
                </span>
              </div>

              {/* Form Convite */}
              <form onSubmit={handleInvite} className="pt-2 space-y-3">
                <Label htmlFor="invMail" className="text-xs font-bold text-slate-700">
                  Convidar Cônjuge ou Familiar (por e-mail):
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="invMail"
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="familiar@email.com"
                    className="text-xs"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={inviting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-1.5 flex-shrink-0"
                  >
                    <UserPlus className="w-4 h-4" /> Convidar
                  </Button>
                </div>
              </form>
            </div>
          ) : (
            <div className="text-center py-6 space-y-3">
              <p className="text-xs text-slate-500">Você ainda não tem um núcleo familiar ativo.</p>
              <Button
                onClick={handleCreateFamily}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                Criar Minha Família
              </Button>
            </div>
          )}
        </Card>

        {/* Princípios do Modo Família Sem Conflito */}
        <Card className="border-slate-200 shadow-xs rounded-2xl bg-white p-6 space-y-4">
          <CardHeader className="p-0">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-500" />
              Pacto de Finanças em Família
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Dicas práticas para manter as contas organizadas sem desgaste no relacionamento.
            </CardDescription>
          </CardHeader>

          <div className="space-y-3 pt-1">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
              <strong className="text-emerald-800 block mb-0.5">
                1. Transparência sem fiscalização
              </strong>
              O objetivo do consolidado não é vigiar cada cafézinho, mas garantir que os custos
              fixos da casa (aluguel, mercado, luz) estejam protegidos.
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
              <strong className="text-emerald-800 block mb-0.5">
                2. Orçamento Livre Individual
              </strong>
              Reservem um valor mensal para cada pessoa gastar sem precisar dar satisfação ou
              justificar no orçamento comum.
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 leading-relaxed">
              <strong className="text-emerald-800 block mb-0.5">3. Sonhos Coletivos</strong>
              Coloquem metas que motivem ambos (como uma viagem de férias ou a compra da casa
              própria) na aba Sonhos.
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
