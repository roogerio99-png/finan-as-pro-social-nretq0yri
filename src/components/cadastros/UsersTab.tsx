import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
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
import { UserPlus, Pencil, Users, ShieldCheck, User } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { familyService } from '@/services/family'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { UserRecord, FamilyRecord } from '@/types/finance'
import { FamilyRole, familyRoleLabels } from '@/types/cadastros'

const FAMILY_ROLES: FamilyRole[] = ['admin', 'member']

interface MemberForm {
  id?: string
  name: string
  email: string
  role: FamilyRole
}

const emptyForm = (): MemberForm => ({ name: '', email: '', role: 'member' })

export const UsersTab: React.FC = () => {
  const { toast } = useToast()
  const [family, setFamily] = useState<FamilyRecord | null>(null)
  const [members, setMembers] = useState<UserRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<MemberForm>(emptyForm())
  const [emailError, setEmailError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const fam = await familyService.getOrCreateCurrentFamily()
      setFamily(fam)
      const list = await familyService.listMembers(fam.id)
      setMembers(list)
    } catch (err) {
      toast({
        title: 'Erro ao carregar usuários',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setForm(emptyForm())
    setEmailError(null)
    setDialogOpen(true)
  }

  const openEdit = (m: UserRecord) => {
    setForm({
      id: m.id,
      name: m.name,
      email: m.email,
      role: (m.family_role as FamilyRole) || 'member',
    })
    setEmailError(null)
    setDialogOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) return
    setSaving(true)
    setEmailError(null)
    try {
      if (form.id) {
        await familyService.updateMember(form.id, {
          name: form.name.trim(),
          email: form.email.trim(),
          family_role: form.role,
        })
        toast({
          title: 'Usuário atualizado!',
          description: `${form.name} foi atualizado com sucesso.`,
        })
      } else {
        await familyService.createMember({
          name: form.name.trim(),
          email: form.email.trim(),
          family_role: form.role,
        })
        toast({
          title: 'Usuário cadastrado!',
          description: `${form.name} entrou no seu núcleo familiar.`,
        })
      }
      setDialogOpen(false)
      load()
    } catch (err) {
      const message = getErrorMessage(err)
      if (message.toLowerCase().includes('email')) {
        setEmailError(message)
      } else {
        toast({ title: 'Erro ao salvar usuário', description: message, variant: 'destructive' })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {family ? (
            <>
              Núcleo <span className="font-bold text-slate-800">{family.name}</span> ·{' '}
              {members.length} {members.length === 1 ? 'pessoa' : 'pessoas'}
            </>
          ) : (
            'Carregando núcleo familiar...'
          )}
        </p>
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 rounded-xl"
        >
          <UserPlus className="w-4 h-4" /> Novo Usuário
        </Button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-slate-200 rounded-2xl bg-white animate-pulse">
              <CardContent className="p-5 h-28" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((m) => {
            const isAdmin = m.family_role === 'admin'
            return (
              <Card
                key={m.id}
                className="border-slate-200 shadow-xs rounded-2xl bg-white p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isAdmin ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-slate-900 text-sm truncate">{m.name}</h3>
                      <p className="text-xs text-slate-500 truncate">{m.email}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(m)}
                    className="h-8 w-8 text-slate-500 hover:text-slate-900 flex-shrink-0"
                    aria-label={`Editar ${m.name}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>

                <span
                  className={`inline-block text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isAdmin
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {familyRoleLabels[isAdmin ? 'admin' : 'member']}
                </span>
              </Card>
            )
          })}

          {members.length === 0 && (
            <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
              <Users className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">Nenhum usuário cadastrado</h3>
              <p className="text-xs max-w-md mx-auto">
                Cadastre os membros do seu lar para dividir lançamentos, orçamentos e sonhos.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modal de Usuário */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {form.id ? 'Editar Usuário' : 'Novo Usuário do Lar'}
            </DialogTitle>
            <DialogDescription>
              {form.id
                ? 'Atualize o nome, o e-mail ou o papel na família.'
                : 'Cadastre um membro do seu núcleo familiar.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="usrName">Nome</Label>
              <Input
                id="usrName"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex.: Maria Silva"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="usrEmail">E-mail</Label>
              <Input
                id="usrEmail"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="maria@email.com"
                required
              />
              {emailError && <p className="text-xs font-semibold text-rose-600">{emailError}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="usrRole">Papel na família</Label>
              <select
                id="usrRole"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value as FamilyRole })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm font-medium text-slate-800"
              >
                {FAMILY_ROLES.map((r) => (
                  <option key={r} value={r}>
                    {familyRoleLabels[r]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? 'Salvando...' : form.id ? 'Salvar Alterações' : 'Cadastrar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
