import { categoriesService } from '@/services/categories.ts';
import { accountsService } from '@/services/accounts.ts';
import { buildGroups } from '@/components/cadastros/categoriesTree.ts';
import pb from '@/lib/pocketbase/client.ts';

async function test() {
  console.log('--- TESTANDO CATEGORIAS E CONTAS ---');
  const cats = await categoriesService.getAll();
  console.log('Total de categorias carregadas:', cats.length);
  const groups = buildGroups(cats, 'expense');
  console.log('Total de grupos de despesa:', groups.length);
  for (const g of groups) {
    console.log(`Grupo: "${g.name}" | groupCode: "${g.groupCode}" | subgroups: ${g.subgroups.length} | recordId:`, g.record?.id);
    for (const s of g.subgroups) {
      console.log(`   -> Sub: "${s.name}" | recordId:`, s.record?.id);
    }
  }

  const accs = await accountsService.getAll();
  console.log('Total de contas:', accs.length);
  for (const a of accs) {
    console.log(`Conta: "${a.name}" | tipo: ${a.type} | id: ${a.id}`);
  }
}

test().catch(console.error);
