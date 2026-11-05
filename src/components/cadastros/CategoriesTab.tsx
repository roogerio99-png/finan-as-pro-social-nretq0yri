import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
import {
  FolderTree,
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  ChevronRight,
  ChevronDown,
  Tags,
  Trash2,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { categoriesService } from '@/services/categories'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { CategoryRecord } from '@/types/finance'
import { expenseGroupSuggestions } from '@/types/cadastros'
import { Label } from '@/components/ui/label'
import { buildGroups, nextGroupCode, nextSubCode, subLabel, CategoryType } from './categoriesTree'
import { NodeDialogState, emptyNode } from './nodeDialogState'
import { NodeDialogForm } from './NodeDialogForm'
import { CATEGORY_COLUMNS, CategoryCodeBadge, CategoryGridHeader } from './CategoryTablePieces'
import { Input } from '@/components/ui/input'

type CatType = 'expense' | 'income'

export const CategoriesTab: React.FC = () => {
  const { toast } = useToast()
  const [all, setAll] = useState<CategoryRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [type, setType] = useState<CatType>('expense')
  const [showInactive, setShowInactive] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [nodeDialog, setNodeDialog] = useState<NodeDialogState | null>(null)
  const [renameDialog, setRenameDialog] = useState<NodeDialogState | null>(null)
  const [saving, setSaving] = useState(false)
  const [deletingNode, setDeletingNode] = useState<{
    name: string
    ids: string[]
    level: 1 | 2
  } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAll(await categoriesService.list({ includeInactive: true }))
    } catch (err) {
      toast({
        title: 'Erro ao carregar categorias',
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

  // === Agrupamento plano de contas ========================================
  const groups = useMemo(() => buildGroups(all, type as CategoryType), [all, type])
  const visibleGroups = useMemo(
    () => (showInactive ? groups : groups.filter((g) => g.status === 'active')),
    [groups, showInactive],
  )

  // Seções existentes apenas como sugestão ao criar novos nós
  const existingGroupNames = useMemo(
    () => Array.from(new Set(all.filter((c) => c.type === type).map((c) => c.group_level1))),
    [all, type],
  )

  const toggleGroup = (g: string) => setExpanded((prev) => ({ ...prev, [g]: !prev[g] }))

  // === Ações ==============================================================

  const openCreateGroup = () =>
    setNodeDialog({
      ...emptyNode(),
      level: 1,
      code: nextGroupCode(all, type),
    })
  const openCreateSub = (parent: string) =>
    setNodeDialog({
      ...emptyNode(),
      level: 2,
      parent,
      code: nextSubCode(all, parent),
    })
  const openRename = (level: 1 | 2, name: string, parent?: string) =>
    setRenameDialog({ level, name, original: name, parent, code: '', description: '' })

  const saveNode = async () => {
    if (saving) return
    if (!nodeDialog) {
      // Nunca falhar em silêncio: se o clique não puder criar, o usuário precisa saber o motivo.
      toast({
        title: 'Não foi possível criar',
        description: 'O formulário foi fechado antes de salvar. Abra novamente e tente de novo.',
        variant: 'destructive',
      })
      return
    }
    const name = nodeDialog.name.trim()
    if (!name) {
      toast({
        title: 'Digite um nome',
        description:
          nodeDialog.level === 1
            ? 'Informe o nome do novo grupo para poder criá-lo.'
            : `Informe o nome do novo subgrupo em "${nodeDialog.parent || '—'}" para poder criá-lo.`,
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      if (nodeDialog.level === 1) {
        // Grupo novo: semeia uma categoria canônica de mesmo nome.
        await categoriesService.createNode({
          name,
          type,
          group_level1: name,
          group_level2: '',
          group_code: nodeDialog.code.trim() || undefined,
          code: '',
          description: nodeDialog.description.trim() || undefined,
          status: 'active',
          color: type === 'income' ? '#059669' : '#0284C7',
        })
        toast({
          title: 'Grupo criado!',
          description: `"${name}" já está disponível nos lançamentos.`,
        })
      } else {
        // Subgrupo novo sob o grupo pai.
        const parentRec = all.find((c) => c.group_level1 === nodeDialog.parent && !c.group_level2)
        await categoriesService.createNode({
          name,
          type,
          group_level1: nodeDialog.parent || '',
          group_level2: name,
          group_code: parentRec?.group_code || undefined,
          code: nodeDialog.code.trim() || undefined,
          description: nodeDialog.description.trim() || undefined,
          status: 'active',
          color: parentRec?.color || (type === 'income' ? '#10B981' : '#06B6D4'),
        })
        toast({
          title: 'Subgrupo criado!',
          description: `"${name}" já está disponível nos lançamentos.`,
        })
      }
      setNodeDialog(null)
      load()
    } catch (err) {
      toast({ title: 'Erro ao criar', description: getErrorMessage(err), variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const saveRename = async () => {
    if (saving) return
    if (!renameDialog) {
      toast({
        title: 'Não foi possível renomear',
        description: 'O formulário foi fechado antes de salvar. Abra novamente e tente de novo.',
        variant: 'destructive',
      })
      return
    }
    if (!renameDialog.name.trim()) {
      toast({
        title: 'Digite um nome',
        description: 'O novo nome não pode ficar vazio.',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      // Para subgrupos, o campo editável é o nome do subgrupo (renameDialog.name);
      // o grupo pai (parent) serve apenas para desambiguação no service.
      const field = renameDialog.level === 1 ? 'group_level1' : 'group_level2'
      const oldValue = renameDialog.original ?? renameDialog.name
      const changed = await categoriesService.renameLabel(
        field,
        oldValue,
        renameDialog.name.trim(),
        renameDialog.level === 1 ? undefined : renameDialog.parent,
      )
      if (changed === 0) {
        toast({
          title: 'Nada foi renomeado',
          description:
            'Nenhum registro com esse nome foi encontrado. Recarregue a página e tente novamente.',
          variant: 'destructive',
        })
        return
      }
      toast({
        title: 'Renomeado!',
        description:
          changed === 1
            ? '1 ocorrência foi atualizada.'
            : `Todas as ${changed} ocorrências foram atualizadas.`,
      })
      setRenameDialog(null)
      load()
    } catch (err) {
      toast({
        title: 'Erro ao renomear',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const nodeIds = (items: CategoryRecord[]): string[] => items.map((i) => i.id)

  const toggleGroupStatus = async (grp: { name: string; items: CategoryRecord[] }) => {
    const anyActive = grp.items.some((i) => (i.status ?? 'active') === 'active')
    const next = anyActive ? 'inactive' : 'active'
    try {
      await categoriesService.setActive(nodeIds(grp.items), next)
      toast({
        title: next === 'inactive' ? 'Grupo inativado' : 'Grupo reativado',
        description:
          next === 'inactive'
            ? `"${grp.name}" saiu das listas de lançamento e orçamento, mas o histórico foi preservado.`
            : `"${grp.name}" voltou para as listas.`,
      })
      load()
    } catch (err) {
      toast({
        title: 'Erro ao atualizar grupo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const toggleSubStatus = async (grp: string, sub: { name: string; items: CategoryRecord[] }) => {
    const anyActive = sub.items.some((i) => (i.status ?? 'active') === 'active')
    const next = anyActive ? 'inactive' : 'active'
    try {
      await categoriesService.setActive(nodeIds(sub.items), next)
      toast({
        title: next === 'inactive' ? 'Subgrupo inativado' : 'Subgrupo reativado',
        description:
          next === 'inactive'
            ? `"${sub.name}" saiu das listas de lançamento e orçamento, mas o histórico foi preservado.`
            : `"${sub.name}" voltou para as listas.`,
      })
      load()
    } catch (err) {
      toast({
        title: 'Erro ao atualizar subgrupo',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const openDeleteGroup = (grp: { name: string; items: CategoryRecord[] }) => {
    setDeletingNode({ name: grp.name, ids: nodeIds(grp.items), level: 1 })
    setDeleteDialogOpen(true)
  }

  const openDeleteSub = (sName: string, items: CategoryRecord[]) => {
    setDeletingNode({ name: sName, ids: nodeIds(items), level: 2 })
    setDeleteDialogOpen(true)
  }

  const handleConfirmDeleteNode = async () => {
    if (!deletingNode) return
    setIsDeleting(true)
    try {
      await categoriesService.deleteNodes(deletingNode.ids)
      toast({
        title: `${deletingNode.level === 1 ? 'Grupo' : 'Subgrupo'} excluído!`,
        description: `"${deletingNode.name}" foi removido do plano de contas.`,
      })
      setDeleteDialogOpen(false)
      setDeletingNode(null)
      load()
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const typeBadge =
    type === 'income'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : 'bg-rose-100 text-rose-800 border-rose-200'

  return (
    <div className="space-y-4">
      {/* Barra superior */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant={type === 'expense' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setType('expense')}
            className="text-xs font-bold rounded-xl"
          >
            Despesas
          </Button>
          <Button
            variant={type === 'income' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setType('income')}
            className="text-xs font-bold rounded-xl"
          >
            Receitas
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInactive((v) => !v)}
            className="text-xs font-bold rounded-xl border-slate-200"
          >
            {showInactive ? 'Ocultar inativos' : 'Inativos'}
          </Button>
        </div>
        <Button
          onClick={openCreateGroup}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold gap-2 rounded-xl"
        >
          <Plus className="w-4 h-4" /> Novo Grupo
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-slate-200 rounded-2xl bg-white animate-pulse">
              <CardContent className="p-5 h-16" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="hidden md:grid px-1">
            <CategoryGridHeader />
          </div>
          {visibleGroups.map((g) => {
            const isInactive = g.status === 'inactive'
            const visibleSubs = showInactive
              ? g.subgroups
              : g.subgroups.filter((s) => s.status === 'active')
            const open = expanded[g.key] ?? false

            return (
              <Card
                key={g.key}
                className={`border shadow-xs rounded-2xl bg-white ${
                  isInactive && !showInactive ? 'border-slate-200 opacity-70' : 'border-slate-200'
                }`}
              >
                <CardContent className="p-3 space-y-2">
                  {/* Cabeçalho do grupo */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleGroup(g.key)}
                      className="flex items-center gap-2 text-left min-w-0 flex-1"
                    >
                      {open ? (
                        <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      )}
                      <CategoryCodeBadge
                        code={g.groupCode}
                        className="bg-slate-800 text-white border-slate-800"
                      />
                      <div className="min-w-0">
                        <h3
                          className={`font-bold text-slate-900 text-sm truncate ${
                            isInactive ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {g.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 truncate">
                          {g.description ||
                            `${g.items.length} registros · ${g.subgroups.length} subgrupos`}
                        </p>
                      </div>
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openRename(1, g.name)}
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                        aria-label={`Renomear grupo ${g.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleGroupStatus(g)}
                        className="h-8 w-8 text-slate-500 hover:text-slate-900"
                        aria-label={
                          isInactive ? `Reativar grupo ${g.name}` : `Inativar grupo ${g.name}`
                        }
                      >
                        {isInactive ? (
                          <ArchiveRestore className="w-4 h-4" />
                        ) : (
                          <Archive className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteGroup(g)}
                        className="h-8 w-8 text-slate-400 hover:text-rose-600"
                        aria-label={`Excluir grupo ${g.name}`}
                        title="Excluir grupo definitivamente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {open && (
                    <div className="pl-4 space-y-1.5">
                      <div className="md:hidden">
                        <CategoryGridHeader className="px-2" />
                      </div>
                      {visibleSubs.map((s) => {
                        const subInactive = s.status === 'inactive'
                        return (
                          <div
                            key={s.key}
                            className={`${CATEGORY_COLUMNS} px-2.5 py-2 rounded-xl border ${
                              subInactive
                                ? 'bg-slate-50 border-slate-100'
                                : 'bg-slate-50/60 border-slate-100'
                            }`}
                          >
                            <CategoryCodeBadge code={s.record?.code} />
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Tags className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                              <span
                                className={`text-xs font-bold text-slate-800 truncate ${
                                  subInactive ? 'line-through opacity-60' : ''
                                }`}
                              >
                                {subLabel(s)}
                              </span>
                            </div>
                            <span
                              className={`text-[11px] text-slate-500 truncate hidden md:block ${
                                subInactive ? 'line-through opacity-60' : ''
                              }`}
                            >
                              {s.record?.description || '—'}
                            </span>
                            <span
                              className={`text-[11px] text-slate-500 truncate md:hidden ${
                                subInactive ? 'line-through opacity-60' : ''
                              }`}
                            >
                              {s.record?.description || '—'}
                            </span>
                            <div className="flex items-center gap-1 flex-shrink-0 justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openRename(2, s.name, g.name)}
                                className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                aria-label={`Renomear subgrupo ${s.name}`}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleSubStatus(g.name, s)}
                                className="h-7 w-7 text-slate-500 hover:text-slate-900"
                                aria-label={
                                  subInactive ? `Reativar ${s.name}` : `Inativar ${s.name}`
                                }
                              >
                                {subInactive ? (
                                  <ArchiveRestore className="w-3.5 h-3.5" />
                                ) : (
                                  <Archive className="w-3.5 h-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDeleteSub(s.name, s.items)}
                                className="h-7 w-7 text-slate-400 hover:text-rose-600"
                                aria-label={`Excluir subgrupo ${s.name}`}
                                title="Excluir subgrupo definitivamente"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        )
                      })}

                      {/* Novo subgrupo */}
                      <button
                        type="button"
                        onClick={() => openCreateSub(g.name)}
                        className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 hover:text-emerald-800 px-2.5 py-1.5 rounded-lg hover:bg-emerald-50"
                      >
                        <Plus className="w-3.5 h-3.5" /> Novo subgrupo em "{g.name}"
                      </button>
                    </div>
                  )}

                  {isInactive && (
                    <Badge className="bg-slate-200 text-slate-600 hover:bg-slate-200">
                      Inativo
                    </Badge>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {visibleGroups.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-3">
              <FolderTree className="w-10 h-10 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-slate-900">
                Nenhum grupo de {type === 'income' ? 'receitas' : 'despesas'}
              </h3>
              <p className="text-xs max-w-md mx-auto">
                Crie grupos como Habitação e Moradia, Alimentação e Despensa, Transporte e
                Mobilidade, Saúde e Prevenção.
              </p>
              <div className="flex flex-wrap justify-center gap-1.5 pt-1">
                {expenseGroupSuggestions.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="text-[10px] font-bold border-slate-200 text-slate-500"
                  >
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal criar grupo/subgrupo */}
      <Dialog open={!!nodeDialog} onOpenChange={(open) => !open && setNodeDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              {nodeDialog?.level === 1
                ? `Novo Grupo de ${type === 'income' ? 'Receitas' : 'Despesas'}`
                : `Novo Subgrupo em "${nodeDialog?.parent}"`}
            </DialogTitle>
            <DialogDescription>
              {nodeDialog?.level === 1
                ? 'O código é sugerido automaticamente como o próximo número livre (ex.: 11.0).'
                : `O código é sugerido como o próximo número livre dentro de "${nodeDialog?.parent}".`}
            </DialogDescription>
          </DialogHeader>

          {nodeDialog && (
            <NodeDialogForm
              dialog={nodeDialog}
              saving={saving}
              onChange={(patch) => setNodeDialog((n) => (n ? { ...n, ...patch } : n))}
              onCancel={() => setNodeDialog(null)}
              onSubmit={saveNode}
              submitLabel="Criar"
              codePlaceholder={nodeDialog.level === 1 ? '11.0' : '1.7'}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal renomear */}
      <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-900">
              Renomear {renameDialog?.level === 1 ? 'grupo' : 'subgrupo'}
            </DialogTitle>
            <DialogDescription>
              O novo nome vale para todos os registros que usam "{renameDialog?.name}".
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              saveRename()
            }}
            className="space-y-4 pt-2"
          >
            <div className="space-y-1.5">
              <Label htmlFor="renameValue">Novo nome</Label>
              <Input
                id="renameValue"
                value={renameDialog?.name ?? ''}
                onChange={(e) => setRenameDialog((n) => (n ? { ...n, name: e.target.value } : n))}
                required
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setRenameDialog(null)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {saving ? 'Salvando...' : 'Renomear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação para Excluir Grupo / Subgrupo */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600 mb-2">
              <Trash2 className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-lg font-bold text-slate-900">
              Excluir {deletingNode?.level === 1 ? 'Grupo' : 'Subgrupo'} "{deletingNode?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-slate-600 space-y-2">
              <p>
                Tem certeza que deseja excluir este{' '}
                {deletingNode?.level === 1 ? 'grupo' : 'subgrupo'}?
                {deletingNode?.level === 1
                  ? ' Todos os subgrupos e categorias vinculadas serão removidos.'
                  : ' O subgrupo será removido do plano de contas.'}
              </p>
              <p className="text-xs text-slate-500">
                Dica: caso tenha lançamentos antigos nessa categoria e queira apenas ocultá-la dos
                novos lançamentos, prefira a opção de inativar.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDeleteNode}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
