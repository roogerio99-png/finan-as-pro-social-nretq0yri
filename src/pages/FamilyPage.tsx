import React, { useState, useEffect } from 'react'
import { familyService } from '@/services/family'
import { transactionsService } from '@/services/transactions'
import { accountsService } from '@/services/accounts'
import { useAuth } from '@/contexts/AuthContext'
import { FamilyRecord, TransactionRecord, AccountRecord, UserRecord } from '@/types/finance'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
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
import { Users, UserCheck, UserPlus, ShieldCheck, Heart, Pencil, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export const FamilyPage: React.FC = () => {
  const { user } = useAuth()
  const { toast } = useToast()

  const [family, setFamily] = useState<FamilyRecord | null>(null)
  const [members, setMembers] = useState<UserRecord[]>([])
  const [viewMode, setViewMode] = useState<'individual' | 'consolidated'>('consolidated')
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [accounts, setAccounts] = useState<AccountRecord[]>([])
  const [loading, setLoading] = useState<boolean>(true)

  // Convite
  const [inviteEmail, setInviteEmail] = useState<string>('')
  const [inviting, setInviting] = useState<boolean>(false)

  // Modal Alterar Membro
  const [editingMember, setEditingMember] = useState<UserRecord | null>(null)
  const [editMemberRole, setEditMemberRole] = useState<string>('membro')
  const [editMemberName, setEditMemberName] = useState<string>('')
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState<boolean>(false)
  const [savingMember, setSavingMember] = useState<boolean>(false)

  // Modal Excluir / Remover Membro
  const [deletingMember, setDeletingMember] = useState<UserRecord | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState<boolean>(false)
  const [isDeletingMember, setIsDeletingMember] = useState<boolean>(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const myFam = await familyService.getMyFamily()
      setFamily(myFam)

      let memList: UserRecord[] = []
      if (myFam) {
        memList = await familyService.listMembers(myFam.id)
      }
      setMembers(memList)

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
      const fam = await familyService.create(
        `Família ${user?.name ? user.name.split(' ')[0] : 'Coimbra'}`,
      )
      setFamily(fam)
      toast({ title: 'Núcleo familiar criado com sucesso!' })
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao criar', description: err.message, variant: 'destructive' })
    }
  }

  const openEditMember = (m: UserRecord) => {
    setEditingMember(m)
    setEditMemberName(m.name || '')
    setEditMemberRole(m.family_role || 'membro')
    setEditMemberDialogOpen(true)
  }

  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return
    setSavingMember(true)
    try {
      await familyService.updateMember(editingMember.id, {
        name: editMemberName,
        family_role: editMemberRole,
      })
      toast({ title: 'Membro atualizado com sucesso!' })
      setEditMemberDialogOpen(false)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' })
    } finally {
      setSavingMember(false)
    }
  }

  const openDeleteMember = (m: UserRecord) => {
    setDeletingMember(m)
    setDeleteConfirmOpen(true)
  }

  const handleConfirmDeleteMember = async () => {
    if (!family || !deletingMember) return
    setIsDeletingMember(true)
    try {
      await familyService.removeMember(family.id, deletingMember.id)
      toast({
        title: 'Membro removido',
        description: `${deletingMember.name} foi desvinculado do núcleo familiar.`,
      })
      setDeleteConfirmOpen(false)
      setDeletingMember(null)
      loadData()
    } catch (err: any) {
      toast({ title: 'Erro ao remover membro', description: err.message, variant: 'destructive' })
    } finally {
      setIsDeletingMember(false)
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

  // Garantir que o usuário atual sempre apareça se ainda não listado no expand
  const allDisplayMembers = [...members]
  if (user && !allDisplayMembers.some((m) => m.id === user.id)) {
    allDisplayMembers.unshift({
      id: user.id,
      name: user.name,
      email: user.email,
      family_role: 'Administrador',
      created: '',
      updated: '',
    })
  }

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
            <CardTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Membros Conectados ({allDisplayMembers.length})
              </span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Cada membro possui seu próprio login seguro e contribui para o orçamento
              compartilhado.
            </CardDescription>
          </CardHeader>

          {family ? (
            <div className="space-y-3 pt-2">
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {allDisplayMembers.map((m) => {
                  const isCurrentUser = m.id === user?.id
                  return (
                    <div
                      key={m.id}
                      className="p-3 bg-white flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {m.name?.[0] || 'U'}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {m.name} {isCurrentUser ? '(Você)' : ''}
                          </span>
                          <span className="text-[11px] text-slate-500 truncate block">
                            {m.email}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full capitalize">
                          {isCurrentUser ? 'Administrador' : m.family_role || 'Membro'}
                        </span>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditMember(m)}
                          className="h-7 w-7 text-slate-400 hover:text-slate-800"
                          title="Alterar membro"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        {!isCurrentUser && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openDeleteMember(m)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                            title="Remover membro da família"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
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

      {/* Modal de Alteração de Membro */}
      <Dialog open={editMemberDialogOpen} onOpenChange={setEditMemberDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-emerald-600" />
              Alterar Membro da Família
            </DialogTitle>
            <DialogDescription>
              Modifique o nome de exibição ou o papel familiar deste membro.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMember} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="mName">Nome de Exibição</Label>
              <Input
                id="mName"
                value={editMemberName}
                onChange={(e) => setEditMemberName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mRole">Papel Familiar</Label>
              <select
                id="mRole"
                value={editMemberRole}
                onChange={(e) => setEditMemberRole(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
              >
                <option value="administrador">Administrador</option>
                <option value="cônjuge">Cônjuge</option>
                <option value="membro">Membro</option>
                <option value="dependente">Dependente</option>
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditMemberDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={savingMember}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {savingMember ? 'Salvando...' : 'Salvar Alteração'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação para Remover Membro */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
              <Trash2 className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Remover "{deletingMember?.name}" da família?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600">
              Esta pessoa não terá mais acesso à visualização consolidada dos gastos e contas
              familiares.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isDeletingMember}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteMember}
              disabled={isDeletingMember}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeletingMember ? 'Removendo...' : 'Sim, Remover Membro'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
