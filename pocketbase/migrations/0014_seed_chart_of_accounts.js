// Semeia o plano de contas profissional estilo ERP (TABELA CANÔNICA) em todas as
// famílias existentes. Idempotente: um grupo/subgrupo só é criado quando não
// existe ainda registro ATIVO na família com o mesmo código. Registros antigos
// são preservados (nunca removidos), para que lançamentos, metas e regras De-Para
// continuem apontando para categorias válidas.
//
// Estrutura: 0.0 Receitas (income) e 1.0–10.0 (expense), cada grupo com seus
// subgrupos, todos com group_code, code e description exatos da tabela canônica.

const PLAN = [
  {
    group_code: '0.0',
    group_name: 'Receitas',
    type: 'income',
    description: 'Entradas de recursos da família.',
    subs: [
      {
        code: '0.1',
        name: 'Salários e Remunerações',
        description:
          'Salários, pró-labore, adiantamentos e bonificações líquidas creditadas em conta.',
      },
      {
        code: '0.2',
        name: 'Outras Entradas',
        description:
          'Rendimentos de aplicações, aluguéis recebidos, restituição de IR e vendas de bens.',
      },
    ],
  },
  {
    group_code: '1.0',
    group_name: 'Habitação e Moradia',
    type: 'expense',
    description: 'Custos de manter o teto da família.',
    subs: [
      {
        code: '1.1',
        name: 'Estrutural Habitacional',
        description:
          'Custos de ocupação: condomínio residencial, taxa de associação de bairro ou aluguel.',
      },
      {
        code: '1.2',
        name: 'Financiamento Imobiliário',
        description: 'Parcelas de amortização, juros e seguros atrelados ao crédito do imóvel.',
      },
      {
        code: '1.3',
        name: 'Concessionárias e Utilidades',
        description:
          'Contas de energia elétrica, abastecimento de água/esgoto e gás (canalizado ou botijão).',
      },
      {
        code: '1.4',
        name: 'Telecomunicação Residencial',
        description:
          'Conexão de internet banda larga fixa, TV por assinatura e taxas municipais de lixo.',
      },
      {
        code: '1.5',
        name: 'Manutenção Rotineira',
        description:
          'Reparos elétricos/hidráulicos pontuais, lâmpadas, dedetização, jardim e limpeza pesada.',
      },
      {
        code: '1.6',
        name: 'Tributos e Proteção',
        description: 'Imposto predial e territorial urbano (IPTU) e apólice de seguro residencial.',
      },
    ],
  },
  {
    group_code: '2.0',
    group_name: 'Alimentação e Despensa',
    type: 'expense',
    description: 'Alimentação da família em casa e fora dela.',
    subs: [
      {
        code: '2.1',
        name: 'Mercado Principal',
        description:
          'Compras de base mensal/quinzenal: grãos, secos, higiene doméstica e descartáveis.',
      },
      {
        code: '2.2',
        name: 'Açougue, Feira e Perecíveis',
        description:
          'Proteínas, carnes, hortifrúti, verduras, laticínios frescos e itens de padaria.',
      },
      {
        code: '2.3',
        name: 'Refeições em Trânsito',
        description:
          'Almoços executivos da rotina de trabalho, cafés matinais e lanches de expediente.',
      },
    ],
  },
  {
    group_code: '3.0',
    group_name: 'Transporte e Mobilidade',
    type: 'expense',
    description: 'Despesas de veículos e deslocamentos.',
    subs: [
      {
        code: '3.1',
        name: 'Consumo dos Veículos',
        description:
          'Abastecimento de combustível (etanol, gasolina ou diesel), lavagens e estacionamentos.',
      },
      {
        code: '3.2',
        name: 'Manutenção Automotiva',
        description:
          'Trocas de óleo, filtros, velas, pneus, pastilhas de freio, alinhamento e balanceamento.',
      },
      {
        code: '3.3',
        name: 'Obrigações e Provisões',
        description: 'IPVA, seguro total do automóvel, taxa de licenciamento anual e DPVAT/SPVAT.',
      },
      {
        code: '3.4',
        name: 'Deslocamento Alternativo',
        description:
          'Corridas em aplicativos (Uber/99), tarifas de pedágio e transporte interurbano.',
      },
    ],
  },
  {
    group_code: '4.0',
    group_name: 'Saúde e Prevenção',
    type: 'expense',
    description: 'Proteção e cuidados com a saúde da família.',
    subs: [
      {
        code: '4.1',
        name: 'Planos de Saúde',
        description: 'Mensalidades de planos de assistência médica e odontológica para a família.',
      },
      {
        code: '4.2',
        name: 'Medicamentos e Farmácia',
        description:
          'Remédios de uso contínuo, receitas pontuais, analgésicos e suplementação vitamínica.',
      },
      {
        code: '4.3',
        name: 'Consultas e Procedimentos',
        description:
          'Coparticipações de plano, consultas médicas particulares, exames e psicoterapias.',
      },
      {
        code: '4.4',
        name: 'Autocuidado Físico',
        description:
          'Mensalidade de academia, estúdios de pilates, natação e assessorias esportivas.',
      },
    ],
  },
  {
    group_code: '5.0',
    group_name: 'Educação e Filhos',
    type: 'expense',
    description: 'Educação da família e despesas com os filhos.',
    subs: [
      {
        code: '5.1',
        name: 'Escolaridade Básica',
        description: 'Mensalidades de creche, educação infantil, ensino fundamental ou médio.',
      },
      {
        code: '5.2',
        name: 'Atividades Extracurriculares',
        description:
          'Cursos de idiomas, reforço escolar, modalidades esportivas infantis ou artes.',
      },
      {
        code: '5.3',
        name: 'Materiais e Uniformes',
        description:
          'Provisão para listas de material didático anual, mochilas, livros e peças de uniforme.',
      },
      {
        code: '5.4',
        name: 'Logística Escolar',
        description:
          'Mensalidade de transporte escolar contratado (van) e verba de cantina/lanche.',
      },
    ],
  },
  {
    group_code: '6.0',
    group_name: 'Gastos Pessoais',
    type: 'expense',
    description: 'Cuidados e consumo individual dos membros.',
    subs: [
      {
        code: '6.1',
        name: 'Cuidados e Estética',
        description: 'Cabeleireiro, barbearia, manicure, podologia e tratamentos estéticos.',
      },
      {
        code: '6.2',
        name: 'Cosméticos e Higiene',
        description: 'Perfumaria, protetor solar, dermocosméticos e cuidados individuais diários.',
      },
      {
        code: '6.3',
        name: 'Vestuário e Calçados',
        description:
          'Aquisição periódica de roupas, calçados e peças básicas para adultos e crianças.',
      },
      {
        code: '6.4',
        name: 'Verba Livre Individual',
        description:
          'Cota mensal de livre disposição para cada cônjuge e dependentes (sem prestação de contas).',
      },
    ],
  },
  {
    group_code: '7.0',
    group_name: 'Lazer e Convivência',
    type: 'expense',
    description: 'Diversão, cultura e convivência social.',
    subs: [
      {
        code: '7.1',
        name: 'Gastronomia Social',
        description:
          'Jantares, almoços de lazer em família, cafés especiais e pedidos de delivery (iFood).',
      },
      {
        code: '7.2',
        name: 'Assinaturas e Digitais',
        description:
          'Streaming de vídeo/música, armazenamento em nuvem, apps e telefonia celular móvel.',
      },
      {
        code: '7.3',
        name: 'Passeios e Cultura',
        description: 'Ingressos de cinema, shows, teatro, exposições e lazer de final de semana.',
      },
      {
        code: '7.4',
        name: 'Fundo de Viagens',
        description:
          'Poupança mensal destinada a passagens, hospedagem e despesas em viagens de férias.',
      },
    ],
  },
  {
    group_code: '8.0',
    group_name: 'Financeiro e Fiscal',
    type: 'expense',
    description: 'Custos do sistema financeiro e obrigações fiscais.',
    subs: [
      {
        code: '8.1',
        name: 'Encargos e Tarifas',
        description:
          'Anuidades de cartão de crédito, tarifas de conta bancária e encargos operacionais.',
      },
      {
        code: '8.2',
        name: 'Serviços Contábeis',
        description:
          'Honorários profissionais para elaboração de Declaração de IRPF e taxas correlatas.',
      },
    ],
  },
  {
    group_code: '9.0',
    group_name: 'Projetos e Obras (CapEx)',
    type: 'expense',
    description: 'Investimentos de capital em obras e benfeitorias.',
    subs: [
      {
        code: '9.1',
        name: 'Projetos e Alvarás',
        description:
          'Projetos de arquitetura, engenharia, cálculos estruturais, taxas de habite-se e licenças.',
      },
      {
        code: '9.2',
        name: 'Mão de Obra de Construção',
        description:
          'Empreiteiros, pedreiros, armadores, eletricistas, encanadores e pintores da obra.',
      },
      {
        code: '9.3',
        name: 'Materiais Estruturais',
        description:
          'Cimento, ferro, areia, brita, blocos cerâmicos, lajes, telhas, rufos e estruturas de telhado.',
      },
      {
        code: '9.4',
        name: 'Infraestrutura Elétrica/Hidráulica',
        description:
          'Tubos e conexões pesadas, conduítes, fiação geral, quadros de distribuição e disjuntores.',
      },
      {
        code: '9.5',
        name: 'Acabamento e Revestimentos',
        description:
          'Porcelanatos, argamassas, rejuntes, tintas, louças sanitárias, torneiras e iluminação técnica.',
      },
      {
        code: '9.6',
        name: 'Esquadrias e Fachada',
        description:
          'Portas de madeira, janelas, blindex/vidros, portões basculantes e esquadrias de alumínio.',
      },
      {
        code: '9.7',
        name: 'Marcenaria Sob Medida',
        description:
          'Armários planejados para cozinha, quartos, painéis de sala, lavanderia e bancadas.',
      },
      {
        code: '9.8',
        name: 'Mobília Solta e Eletros',
        description:
          'Sofá, mesas de jantar, camas, colchões, geladeira, ar-condicionado e eletrodomésticos.',
      },
    ],
  },
  {
    group_code: '10.0',
    group_name: 'Investimentos e Patrimônio',
    type: 'expense',
    description: 'Poupança, reservas e construção de patrimônio.',
    subs: [
      {
        code: '10.1',
        name: 'Reserva de Emergência',
        description:
          'Aporte em instrumentos de alta liquidez até atingir a blindagem do custo fixo familiar.',
      },
      {
        code: '10.2',
        name: 'Metas de Médio Prazo',
        description:
          'Poupança para troca programada de veículo, reformas futuras ou entradas de patrimônio.',
      },
      {
        code: '10.3',
        name: 'Longo Prazo / Aposentadoria',
        description:
          'Aportes consistentes em previdência, títulos públicos (IPCA+) e carteira de ações/FIIs.',
      },
    ],
  },
]

// Cores por número de grupo (paleta consistente entre grupos).
const GROUP_COLORS = {
  '0.0': '#059669',
  '1.0': '#0284C7',
  '2.0': '#F59E0B',
  '3.0': '#2563EB',
  '4.0': '#DC2626',
  '5.0': '#7C3AED',
  '6.0': '#DB2777',
  '7.0': '#06B6D4',
  '8.0': '#B45309',
  '9.0': '#64748B',
  '10.0': '#16A34A',
}

function findActiveByCode(app, colName, field, code, familyId) {
  const filter = `${field} = '${code}' && status = 'active' && family_id = '${familyId}'`
  const found = app.findRecordsByFilter(colName, filter, '', 1, 0)
  return found.length > 0 ? found[0] : null
}

migrate(
  (app) => {
    const families = app.findRecordsByFilter('families', '', '', 0, 0)
    const users = app.findRecordsByFilter('users', '', '', 0, 0)
    const userById = {}
    for (const u of users) userById[u.id] = u

    const col = app.findCollectionByNameOrId('categories')

    for (const family of families) {
      const familyId = family.id
      // owner = criador da família (fallback: primeiro membro)
      let ownerId = family.getString('created_by')
      if (!ownerId) {
        const members = family.getStringSlice('members') || []
        ownerId = members.length > 0 ? members[0] : ''
      }
      if (!ownerId || !userById[ownerId]) continue

      for (const g of PLAN) {
        // Grupo (nível 1): registro canônico do grupo, sem subgrupo.
        let groupRec = findActiveByCode(app, 'categories', 'group_code', g.group_code, familyId)
        if (!groupRec) {
          groupRec = new Record(col)
          groupRec.set('user_id', ownerId)
          groupRec.set('family_id', familyId)
          groupRec.set('name', g.group_name)
          groupRec.set('type', g.type)
          groupRec.set('group_level1', g.group_name)
          groupRec.set('group_level2', '')
          groupRec.set('group_code', g.group_code)
          groupRec.set('code', '')
          groupRec.set('description', g.description)
          groupRec.set('color', GROUP_COLORS[g.group_code] || '#0284C7')
          groupRec.set('status', 'active')
          groupRec.set('is_seed', true)
          app.save(groupRec)
        }

        for (const s of g.subs) {
          const existing = findActiveByCode(app, 'categories', 'code', s.code, familyId)
          if (existing) continue
          const rec = new Record(col)
          rec.set('user_id', ownerId)
          rec.set('family_id', familyId)
          rec.set('name', s.name)
          rec.set('type', g.type)
          rec.set('group_level1', g.group_name)
          rec.set('group_level2', s.name)
          rec.set('group_code', g.group_code)
          rec.set('code', s.code)
          rec.set('description', s.description)
          rec.set('color', GROUP_COLORS[g.group_code] || '#0284C7')
          rec.set('status', 'active')
          rec.set('is_seed', true)
          app.save(rec)
        }
      }
    }
  },
  // down: remove apenas os registros semeados por ESTA migração — os criados
  // pela tela (marcados como "custom") e os legados permanecem intactos.
  (app) => {
    app.db().newQuery(`DELETE FROM categories WHERE is_seed = 1`).execute()
  },
)
