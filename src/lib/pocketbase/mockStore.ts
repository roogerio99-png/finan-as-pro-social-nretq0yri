// In-memory and localStorage persistence mock for PocketBase
// Enables full offline and standalone execution in AI Studio

export interface MockRecord {
  id: string
  created: string
  updated: string
  [key: string]: any
}

const STORAGE_PREFIX = 'gestio_financas_pb_'

function getStored<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    if (raw) return JSON.parse(raw)
  } catch {
    // ignore
  }
  return defaultValue
}

function setStored<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    // ignore
  }
}

// Initial seed generators
function createInitialData() {
  const now = new Date()
  const nowIso = now.toISOString()
  const currentYearMonth = nowIso.slice(0, 7)

  const defaultUser: MockRecord = {
    id: 'usr_rogerio',
    email: 'roogerio99@gmail.com',
    name: 'Rogério Coimbra',
    verified: true,
    created: nowIso,
    updated: nowIso,
  }

  const defaultFamily: MockRecord = {
    id: 'fam_silva',
    name: 'Família Coimbra',
    created_by: defaultUser.id,
    members: [defaultUser.id],
    created: nowIso,
    updated: nowIso,
  }

  // Carga inicial: contas padrão zeradas prontas para uso + categorias oficiais no Plano de Contas ERP
  const seededAccounts: MockRecord[] = [
    {
      id: 'acc_corrente_padrao',
      user_id: defaultUser.id,
      name: 'Conta Corrente Principal',
      type: 'checking',
      initial_balance: 0,
      current_balance: 0,
      color: '#059669',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'acc_cartao_padrao',
      user_id: defaultUser.id,
      name: 'Cartão de Crédito',
      type: 'credit_card',
      initial_balance: 0,
      current_balance: 0,
      credit_limit: 5000,
      closing_day: 25,
      due_day: 5,
      color: '#7C3AED',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
  ]

  // Plano de Contas Oficial em 2 níveis (Grupos e Subgrupos oficiais com Descrição do Gasto completa)
  const seededCategories: MockRecord[] = [
    // === 0.0 RECEITAS ===
    {
      id: 'cat_grp_0',
      user_id: defaultUser.id,
      name: 'Receitas',
      type: 'income',
      group_level1: 'Receitas',
      group_level2: '',
      group_code: '0.0',
      code: '',
      description: 'Entradas financeiras, salários, remunerações e rendimentos.',
      color: '#059669',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_0_1',
      user_id: defaultUser.id,
      name: 'Salários e Remunerações',
      type: 'income',
      group_level1: 'Receitas',
      group_level2: 'Salários e Remunerações',
      group_code: '0.0',
      code: '0.1',
      description: 'Salários, pró-labore, adiantamentos e bonificações líquidas creditadas em conta.',
      icon: 'Briefcase',
      color: '#16A34A',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_0_2',
      user_id: defaultUser.id,
      name: 'Outras Entradas',
      type: 'income',
      group_level1: 'Receitas',
      group_level2: 'Outras Entradas',
      group_code: '0.0',
      code: '0.2',
      description: 'Rendimentos de aplicações, aluguéis recebidos, restituição de IR e vendas de bens.',
      icon: 'TrendingUp',
      color: '#059669',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },

    // === 1.0 HABITAÇÃO E MORADIA ===
    {
      id: 'cat_grp_1',
      user_id: defaultUser.id,
      name: 'Habitação e Moradia',
      type: 'expense',
      group_level1: 'Habitação e Moradia',
      group_level2: '',
      group_code: '1.0',
      code: '',
      description: 'Custos estruturais de moradia, contas de utilidades e manutenção residencial.',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_1_1',
      user_id: defaultUser.id,
      name: 'Estrutural Habitacional',
      type: 'expense',
      group_level1: 'Habitação e Moradia',
      group_level2: 'Estrutural Habitacional',
      group_code: '1.0',
      code: '1.1',
      description: 'Custos de ocupação: condomínio residencial, taxa de associação de bairro ou aluguel.',
      icon: 'Home',
      color: '#2563EB',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_1_2',
      user_id: defaultUser.id,
      name: 'Financiamento Imobiliário',
      type: 'expense',
      group_level1: 'Habitação e Moradia',
      group_level2: 'Financiamento Imobiliário',
      group_code: '1.0',
      code: '1.2',
      description: 'Parcelas de amortização, juros e seguros atrelados ao crédito do imóvel.',
      icon: 'Building',
      color: '#1D4ED8',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_1_3',
      user_id: defaultUser.id,
      name: 'Concessionárias e Utilidades',
      type: 'expense',
      group_level1: 'Habitação e Moradia',
      group_level2: 'Concessionárias e Utilidades',
      group_code: '1.0',
      code: '1.3',
      description: 'Contas de energia elétrica, abastecimento de água/esgoto e gás (canalizado ou botijão).',
      icon: 'Zap',
      color: '#3B82F6',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_1_4',
      user_id: defaultUser.id,
      name: 'Telecomunicação Residencial',
      type: 'expense',
      group_level1: 'Habitação e Moradia',
      group_level2: 'Telecomunicação Residencial',
      group_code: '1.0',
      code: '1.4',
      description: 'Conexão de internet banda larga fixa, TV por assinatura e taxas municipais de lixo.',
      icon: 'Wifi',
      color: '#06B6D4',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_1_5',
      user_id: defaultUser.id,
      name: 'Manutenção Rotineira',
      type: 'expense',
      group_level1: 'Habitação e Moradia',
      group_level2: 'Manutenção Rotineira',
      group_code: '1.0',
      code: '1.5',
      description: 'Reparos elétricos/hidráulicos pontuais, lâmpadas, dedetização, jardim e limpeza pesada.',
      icon: 'Wrench',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_1_6',
      user_id: defaultUser.id,
      name: 'Tributos e Proteção',
      type: 'expense',
      group_level1: 'Habitação e Moradia',
      group_level2: 'Tributos e Proteção',
      group_code: '1.0',
      code: '1.6',
      description: 'Imposto predial e territorial urbano (IPTU) e apólice de seguro residencial.',
      icon: 'Shield',
      color: '#0369A1',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },

    // === 2.0 ALIMENTAÇÃO E DESPENSA ===
    {
      id: 'cat_grp_2',
      user_id: defaultUser.id,
      name: 'Alimentação e Despensa',
      type: 'expense',
      group_level1: 'Alimentação e Despensa',
      group_level2: '',
      group_code: '2.0',
      code: '',
      description: 'Supermercado, perecíveis, açougue, hortifrúti e refeições em trânsito no trabalho.',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_2_1',
      user_id: defaultUser.id,
      name: 'Mercado Principal',
      type: 'expense',
      group_level1: 'Alimentação e Despensa',
      group_level2: 'Mercado Principal',
      group_code: '2.0',
      code: '2.1',
      description: 'Compras de base mensal/quinzenal: grãos, secos, higiene doméstica e descartáveis.',
      icon: 'ShoppingCart',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_2_2',
      user_id: defaultUser.id,
      name: 'Açougue, Feira e Perecíveis',
      type: 'expense',
      group_level1: 'Alimentação e Despensa',
      group_level2: 'Açougue, Feira e Perecíveis',
      group_code: '2.0',
      code: '2.2',
      description: 'Proteínas, carnes, hortifrúti, verduras, laticínios frescos e itens de padaria.',
      icon: 'Apple',
      color: '#059669',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_2_3',
      user_id: defaultUser.id,
      name: 'Refeições em Trânsito',
      type: 'expense',
      group_level1: 'Alimentação e Despensa',
      group_level2: 'Refeições em Trânsito',
      group_code: '2.0',
      code: '2.3',
      description: 'Almoços executivos da rotina de trabalho, cafés matinais e lanches de expediente.',
      icon: 'Utensils',
      color: '#F59E0B',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },

    // === 3.0 TRANSPORTE E MOBILIDADE ===
    {
      id: 'cat_grp_3',
      user_id: defaultUser.id,
      name: 'Transporte e Mobilidade',
      type: 'expense',
      group_level1: 'Transporte e Mobilidade',
      group_level2: '',
      group_code: '3.0',
      code: '',
      description: 'Deslocamentos, combustível, manutenção de veículos e aplicativos de transporte.',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_3_1',
      user_id: defaultUser.id,
      name: 'Consumo dos Veículos',
      type: 'expense',
      group_level1: 'Transporte e Mobilidade',
      group_level2: 'Consumo dos Veículos',
      group_code: '3.0',
      code: '3.1',
      description: 'Abastecimento de combustível (etanol, gasolina ou diesel), lavagens e estacionamentos.',
      icon: 'Fuel',
      color: '#B45309',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_3_2',
      user_id: defaultUser.id,
      name: 'Manutenção Automotiva',
      type: 'expense',
      group_level1: 'Transporte e Mobilidade',
      group_level2: 'Manutenção Automotiva',
      group_code: '3.0',
      code: '3.2',
      description: 'Trocas de óleo, filtros, velas, pneus, pastilhas de freio, alinhamento e balanceamento.',
      icon: 'Wrench',
      color: '#78716C',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_3_3',
      user_id: defaultUser.id,
      name: 'Obrigações e Provisões',
      type: 'expense',
      group_level1: 'Transporte e Mobilidade',
      group_level2: 'Obrigações e Provisões',
      group_code: '3.0',
      code: '3.3',
      description: 'IPVA, seguro total do automóvel, taxa de licenciamento anual e DPVAT/SPVAT.',
      icon: 'FileText',
      color: '#475569',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_3_4',
      user_id: defaultUser.id,
      name: 'Deslocamento Alternativo',
      type: 'expense',
      group_level1: 'Transporte e Mobilidade',
      group_level2: 'Deslocamento Alternativo',
      group_code: '3.0',
      code: '3.4',
      description: 'Corridas em aplicativos (Uber/99), tarifas de pedágio e transporte interurbano.',
      icon: 'Car',
      color: '#EAB308',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },

    // === 4.0 SAÚDE E PREVENÇÃO ===
    {
      id: 'cat_grp_4',
      user_id: defaultUser.id,
      name: 'Saúde e Prevenção',
      type: 'expense',
      group_level1: 'Saúde e Prevenção',
      group_level2: '',
      group_code: '4.0',
      code: '',
      description: 'Assistência médica, consultas, farmácia, exames e autocuidado físico.',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_4_1',
      user_id: defaultUser.id,
      name: 'Planos de Saúde',
      type: 'expense',
      group_level1: 'Saúde e Prevenção',
      group_level2: 'Planos de Saúde',
      group_code: '4.0',
      code: '4.1',
      description: 'Mensalidades de planos de assistência médica e odontológica para a família.',
      icon: 'HeartPulse',
      color: '#0EA5E9',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_4_2',
      user_id: defaultUser.id,
      name: 'Medicamentos e Farmácia',
      type: 'expense',
      group_level1: 'Saúde e Prevenção',
      group_level2: 'Medicamentos e Farmácia',
      group_code: '4.0',
      code: '4.2',
      description: 'Remédios de uso contínuo, receitas pontuais, analgésicos e suplementação vitamínica.',
      icon: 'Pill',
      color: '#EF4444',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_4_3',
      user_id: defaultUser.id,
      name: 'Consultas e Procedimentos',
      type: 'expense',
      group_level1: 'Saúde e Prevenção',
      group_level2: 'Consultas e Procedimentos',
      group_code: '4.0',
      code: '4.3',
      description: 'Coparticipações de plano, consultas médicas particulares, exames e psicoterapias.',
      icon: 'Stethoscope',
      color: '#8B5CF6',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_4_4',
      user_id: defaultUser.id,
      name: 'Autocuidado Físico',
      type: 'expense',
      group_level1: 'Saúde e Prevenção',
      group_level2: 'Autocuidado Físico',
      group_code: '4.0',
      code: '4.4',
      description: 'Mensalidade de academia, estúdios de pilates, natação e assessorias esportivas.',
      icon: 'Dumbbell',
      color: '#10B981',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },

    // === 5.0 EDUCAÇÃO E FILHOS ===
    {
      id: 'cat_grp_5',
      user_id: defaultUser.id,
      name: 'Educação e Filhos',
      type: 'expense',
      group_level1: 'Educação e Filhos',
      group_level2: '',
      group_code: '5.0',
      code: '',
      description: 'Escolaridade, cursos extracurriculares, materiais didáticos e logística escolar.',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_5_1',
      user_id: defaultUser.id,
      name: 'Escolaridade Básica',
      type: 'expense',
      group_level1: 'Educação e Filhos',
      group_level2: 'Escolaridade Básica',
      group_code: '5.0',
      code: '5.1',
      description: 'Mensalidades de creche, educação infantil, ensino fundamental ou médio.',
      icon: 'GraduationCap',
      color: '#3B82F6',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_5_2',
      user_id: defaultUser.id,
      name: 'Atividades Extracurriculares',
      type: 'expense',
      group_level1: 'Educação e Filhos',
      group_level2: 'Atividades Extracurriculares',
      group_code: '5.0',
      code: '5.2',
      description: 'Cursos de idiomas, reforço escolar, modalidades esportivas infantis ou artes.',
      icon: 'BookOpen',
      color: '#6366F1',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_5_3',
      user_id: defaultUser.id,
      name: 'Materiais e Uniformes',
      type: 'expense',
      group_level1: 'Educação e Filhos',
      group_level2: 'Materiais e Uniformes',
      group_code: '5.0',
      code: '5.3',
      description: 'Provisão para listas de material didático anual, mochilas, livros e peças de uniforme.',
      icon: 'Backpack',
      color: '#8B5CF6',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_5_4',
      user_id: defaultUser.id,
      name: 'Logística Escolar',
      type: 'expense',
      group_level1: 'Educação e Filhos',
      group_level2: 'Logística Escolar',
      group_code: '5.0',
      code: '5.4',
      description: 'Mensalidade de transporte escolar contratado (van) e verba de cantina/lanche.',
      icon: 'Bus',
      color: '#F59E0B',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },

    // === 6.0 GASTOS PESSOAIS ===
    {
      id: 'cat_grp_6',
      user_id: defaultUser.id,
      name: 'Gastos Pessoais',
      type: 'expense',
      group_level1: 'Gastos Pessoais',
      group_level2: '',
      group_code: '6.0',
      code: '',
      description: 'Cuidados estéticos, cosméticos, higiene, vestuário e verba livre individual.',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_6_1',
      user_id: defaultUser.id,
      name: 'Cuidados e Estética',
      type: 'expense',
      group_level1: 'Gastos Pessoais',
      group_level2: 'Cuidados e Estética',
      group_code: '6.0',
      code: '6.1',
      description: 'Cabeleireiro, barbearia, manicure, podologia e tratamentos estéticos.',
      icon: 'Scissors',
      color: '#EC4899',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_6_2',
      user_id: defaultUser.id,
      name: 'Cosméticos e Higiene',
      type: 'expense',
      group_level1: 'Gastos Pessoais',
      group_level2: 'Cosméticos e Higiene',
      group_code: '6.0',
      code: '6.2',
      description: 'Perfumaria, protetor solar, dermocosméticos e cuidados individuais diários.',
      icon: 'Sparkles',
      color: '#F43F5E',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_6_3',
      user_id: defaultUser.id,
      name: 'Vestuário e Calçados',
      type: 'expense',
      group_level1: 'Gastos Pessoais',
      group_level2: 'Vestuário e Calçados',
      group_code: '6.0',
      code: '6.3',
      description: 'Aquisição periódica de roupas, calçados e peças básicas para adultos e crianças.',
      icon: 'ShoppingBag',
      color: '#EA580C',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_6_4',
      user_id: defaultUser.id,
      name: 'Verba Livre Individual',
      type: 'expense',
      group_level1: 'Gastos Pessoais',
      group_level2: 'Verba Livre Individual',
      group_code: '6.0',
      code: '6.4',
      description: 'Cota mensal de livre disposição para cada cônjuge e dependentes (sem prestação de contas).',
      icon: 'Wallet',
      color: '#64748B',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },

    // === 7.0 LAZER E CONVIVÊNCIA ===
    {
      id: 'cat_grp_7',
      user_id: defaultUser.id,
      name: 'Lazer e Convivência',
      type: 'expense',
      group_level1: 'Lazer e Convivência',
      group_level2: '',
      group_code: '7.0',
      code: '',
      description: 'Gastronomia social, passeios, assinaturas digitais e fundo de viagens.',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_7_1',
      user_id: defaultUser.id,
      name: 'Gastronomia Social',
      type: 'expense',
      group_level1: 'Lazer e Convivência',
      group_level2: 'Gastronomia Social',
      group_code: '7.0',
      code: '7.1',
      description: 'Jantares, almoços de lazer em família, cafés especiais e pedidos de delivery (iFood).',
      icon: 'Utensils',
      color: '#E11D48',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_7_2',
      user_id: defaultUser.id,
      name: 'Assinaturas e Digitais',
      type: 'expense',
      group_level1: 'Lazer e Convivência',
      group_level2: 'Assinaturas e Digitais',
      group_code: '7.0',
      code: '7.2',
      description: 'Streaming de vídeo/música, armazenamento em nuvem, apps e telefonia celular móvel.',
      icon: 'Tv',
      color: '#D97706',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_7_3',
      user_id: defaultUser.id,
      name: 'Passeios e Cultura',
      type: 'expense',
      group_level1: 'Lazer e Convivência',
      group_level2: 'Passeios e Cultura',
      group_code: '7.0',
      code: '7.3',
      description: 'Ingressos de cinema, shows, teatro, exposições e lazer de final de semana.',
      icon: 'Ticket',
      color: '#9333EA',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_7_4',
      user_id: defaultUser.id,
      name: 'Fundo de Viagens',
      type: 'expense',
      group_level1: 'Lazer e Convivência',
      group_level2: 'Fundo de Viagens',
      group_code: '7.0',
      code: '7.4',
      description: 'Poupança mensal destinada a passagens, hospedagem e despesas em viagens de férias.',
      icon: 'Plane',
      color: '#7C3AED',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },

    // === 8.0 FINANCEIRO E FISCAL ===
    {
      id: 'cat_grp_8',
      user_id: defaultUser.id,
      name: 'Financeiro e Fiscal',
      type: 'expense',
      group_level1: 'Financeiro e Fiscal',
      group_level2: '',
      group_code: '8.0',
      code: '',
      description: 'Tarifas bancárias, encargos de cartão de crédito e serviços contábeis.',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_8_1',
      user_id: defaultUser.id,
      name: 'Encargos e Tarifas',
      type: 'expense',
      group_level1: 'Financeiro e Fiscal',
      group_level2: 'Encargos e Tarifas',
      group_code: '8.0',
      code: '8.1',
      description: 'Anuidades de cartão de crédito, tarifas de conta bancária e encargos operacionais.',
      icon: 'CreditCard',
      color: '#DC2626',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_8_2',
      user_id: defaultUser.id,
      name: 'Serviços Contábeis',
      type: 'expense',
      group_level1: 'Financeiro e Fiscal',
      group_level2: 'Serviços Contábeis',
      group_code: '8.0',
      code: '8.2',
      description: 'Honorários profissionais para elaboração de Declaração de IRPF e taxas correlatas.',
      icon: 'Calculator',
      color: '#4B5563',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },

    // === 9.0 PROJETOS E OBRAS (CAPEX) ===
    {
      id: 'cat_grp_9',
      user_id: defaultUser.id,
      name: 'Projetos e Obras (CapEx)',
      type: 'expense',
      group_level1: 'Projetos e Obras (CapEx)',
      group_level2: '',
      group_code: '9.0',
      code: '',
      description: 'Investimentos patrimoniais em construção, reformas, infraestrutura e mobiliário planejado.',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_9_1',
      user_id: defaultUser.id,
      name: 'Projetos e Alvarás',
      type: 'expense',
      group_level1: 'Projetos e Obras (CapEx)',
      group_level2: 'Projetos e Alvarás',
      group_code: '9.0',
      code: '9.1',
      description: 'Projetos de arquitetura, engenharia, cálculos estruturais, taxas de habite-se e licenças.',
      icon: 'Compass',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_9_2',
      user_id: defaultUser.id,
      name: 'Mão de Obra de Construção',
      type: 'expense',
      group_level1: 'Projetos e Obras (CapEx)',
      group_level2: 'Mão de Obra de Construção',
      group_code: '9.0',
      code: '9.2',
      description: 'Empreiteiros, pedreiros, armadores, eletricistas, encanadores e pintores da obra.',
      icon: 'HardHat',
      color: '#D97706',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_9_3',
      user_id: defaultUser.id,
      name: 'Materiais Estruturais',
      type: 'expense',
      group_level1: 'Projetos e Obras (CapEx)',
      group_level2: 'Materiais Estruturais',
      group_code: '9.0',
      code: '9.3',
      description: 'Cimento, ferro, areia, brita, blocos cerâmicos, lajes, telhas, rufos e estruturas de telhado.',
      icon: 'Boxes',
      color: '#78716C',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_9_4',
      user_id: defaultUser.id,
      name: 'Infraestrutura Elétrica/Hidráulica',
      type: 'expense',
      group_level1: 'Projetos e Obras (CapEx)',
      group_level2: 'Infraestrutura Elétrica/Hidráulica',
      group_code: '9.0',
      code: '9.4',
      description: 'Tubos e conexões pesadas, conduítes, fiação geral, quadros de distribuição e disjuntores.',
      icon: 'Zap',
      color: '#EA580C',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_9_5',
      user_id: defaultUser.id,
      name: 'Acabamento e Revestimentos',
      type: 'expense',
      group_level1: 'Projetos e Obras (CapEx)',
      group_level2: 'Acabamento e Revestimentos',
      group_code: '9.0',
      code: '9.5',
      description: 'Porcelanatos, argamassas, rejuntes, tintas, louças sanitárias, torneiras e iluminação técnica.',
      icon: 'Paintbrush',
      color: '#059669',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_9_6',
      user_id: defaultUser.id,
      name: 'Esquadrias e Fachada',
      type: 'expense',
      group_level1: 'Projetos e Obras (CapEx)',
      group_level2: 'Esquadrias e Fachada',
      group_code: '9.0',
      code: '9.6',
      description: 'Portas de madeira, janelas, blindex/vidros, portões basculantes e esquadrias de alumínio.',
      icon: 'DoorOpen',
      color: '#475569',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_9_7',
      user_id: defaultUser.id,
      name: 'Marcenaria Sob Medida',
      type: 'expense',
      group_level1: 'Projetos e Obras (CapEx)',
      group_level2: 'Marcenaria Sob Medida',
      group_code: '9.0',
      code: '9.7',
      description: 'Armários planejados para cozinha, quartos, painéis de sala, lavanderia e bancadas.',
      icon: 'Hammer',
      color: '#92400E',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_9_8',
      user_id: defaultUser.id,
      name: 'Mobília Solta e Eletros',
      type: 'expense',
      group_level1: 'Projetos e Obras (CapEx)',
      group_level2: 'Mobília Solta e Eletros',
      group_code: '9.0',
      code: '9.8',
      description: 'Sofá, mesas de jantar, camas, colchões, geladeira, ar-condicionado e eletrodomésticos.',
      icon: 'Armchair',
      color: '#6D28D9',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },

    // === 10.0 INVESTIMENTOS E PATRIMÔNIO ===
    {
      id: 'cat_grp_10',
      user_id: defaultUser.id,
      name: 'Investimentos e Patrimônio',
      type: 'expense',
      group_level1: 'Investimentos e Patrimônio',
      group_level2: '',
      group_code: '10.0',
      code: '',
      description: 'Blindagem financeira, reserva de emergência, metas patrimoniais e aposentadoria.',
      color: '#0284C7',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_10_1',
      user_id: defaultUser.id,
      name: 'Reserva de Emergência',
      type: 'expense',
      group_level1: 'Investimentos e Patrimônio',
      group_level2: 'Reserva de Emergência',
      group_code: '10.0',
      code: '10.1',
      description: 'Aporte em instrumentos de alta liquidez até atingir a blindagem do custo fixo familiar.',
      icon: 'ShieldCheck',
      color: '#8B5CF6',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_10_2',
      user_id: defaultUser.id,
      name: 'Metas de Médio Prazo',
      type: 'expense',
      group_level1: 'Investimentos e Patrimônio',
      group_level2: 'Metas de Médio Prazo',
      group_code: '10.0',
      code: '10.2',
      description: 'Poupança para troca programada de veículo, reformas futuras ou entradas de patrimônio.',
      icon: 'Target',
      color: '#6366F1',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
    {
      id: 'cat_sub_10_3',
      user_id: defaultUser.id,
      name: 'Longo Prazo / Aposentadoria',
      type: 'expense',
      group_level1: 'Investimentos e Patrimônio',
      group_level2: 'Longo Prazo / Aposentadoria',
      group_code: '10.0',
      code: '10.3',
      description: 'Aportes consistentes em previdência, títulos públicos (IPCA+) e carteira de ações/FIIs.',
      icon: 'PiggyBank',
      color: '#059669',
      status: 'active',
      created: nowIso,
      updated: nowIso,
    },
  ]

  const seededTransactions: MockRecord[] = []

  const seededBudgets: MockRecord[] = []
  const seededDebts: MockRecord[] = []
  const seededDreams: MockRecord[] = []
  const seededDeparaRules: MockRecord[] = []

  return {
    users: [defaultUser],
    families: [defaultFamily],
    accounts: seededAccounts,
    categories: seededCategories,
    transactions: seededTransactions,
    budgets: seededBudgets,
    debts: seededDebts,
    dreams: seededDreams,
    depara_rules: seededDeparaRules,
    invoices: [] as MockRecord[],
    payments: [] as MockRecord[],
  }
}

class MockAuthStore {
  isValid = true
  token = 'mock_jwt_token_gestio_financas'
  record: MockRecord | null = null
  private listeners: (() => void)[] = []

  constructor(initialUser: MockRecord | null) {
    this.record = initialUser
    this.isValid = !!initialUser
  }

  save(token: string, record: MockRecord) {
    if (record && (record.email === 'roogerio99@gmail.com' || record.name === 'Rogério Silva')) {
      record.name = 'Rogério Coimbra'
    }
    this.token = token
    this.record = record
    this.isValid = true
    this.notify()
  }

  clear() {
    this.token = ''
    this.record = null
    this.isValid = false
    this.notify()
  }

  onChange(callback: () => void) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback)
    }
  }

  private notify() {
    for (const cb of this.listeners) {
      try {
        cb()
      } catch (err) {
        console.warn('AuthStore listener error:', err)
      }
    }
  }
}

export class MockPocketBase {
  baseUrl = ''
  authStore: MockAuthStore
  private collections: Record<string, MockRecord[]> = {}
  private subscriptions: Record<string, ((event: any) => void)[]> = {}

  constructor() {
    const initial = createInitialData()
    for (const [col, defaultRecords] of Object.entries(initial)) {
      this.collections[col] = getStored(col, defaultRecords)
    }

    // Auto-recuperação: se contas ou categorias estiverem vazias no localStorage deste navegador, restaura as contas e categorias padrão imediatamente
    if (!this.collections.accounts || this.collections.accounts.length === 0) {
      this.collections.accounts = [...initial.accounts]
      this.persist('accounts')
    }
    if (!this.collections.categories || this.collections.categories.length === 0) {
      this.collections.categories = [...initial.categories]
      this.persist('categories')
    }

    // Auto-migração para sincronizar o nome correto de Rogério Coimbra
    if (this.collections.users) {
      let usersMigrated = false
      for (const u of this.collections.users) {
        if (u.email === 'roogerio99@gmail.com' || u.name === 'Rogério Silva') {
          u.name = 'Rogério Coimbra'
          usersMigrated = true
        }
      }
      if (usersMigrated) {
        this.persist('users')
      }
    }

    if (this.collections.families) {
      let famMigrated = false
      for (const f of this.collections.families) {
        if (f.name === 'Família Silva') {
          f.name = 'Família Coimbra'
          famMigrated = true
        }
      }
      if (famMigrated) {
        this.persist('families')
      }
    }

    const defaultUser = this.collections.users?.[0] || null
    if (
      defaultUser &&
      (defaultUser.email === 'roogerio99@gmail.com' || defaultUser.name === 'Rogério Silva')
    ) {
      defaultUser.name = 'Rogério Coimbra'
    }
    this.authStore = new MockAuthStore(defaultUser)

    // Auto-migração definitiva para sincronizar as Categorias e Subgrupos da Planilha Oficial
    const CATEGORIES_MIGRATION_KEY = 'gestio_financas_categories_planilha_oficial_v6'
    if (typeof window !== 'undefined' && !localStorage.getItem(CATEGORIES_MIGRATION_KEY)) {
      this.migrateLegacyCategoriesToErpPlan(initial.categories)
      localStorage.setItem(CATEGORIES_MIGRATION_KEY, 'true')
    }

    // Limpeza da base de lançamentos de teste para permitir ingresso com dados reais
    const PURGE_TX_KEY = 'pocketbase_mock_transactions_cleared_for_real_data_v2'
    if (typeof window !== 'undefined' && !localStorage.getItem(PURGE_TX_KEY)) {
      this.clearAllTransactions()
      localStorage.setItem(PURGE_TX_KEY, 'true')
    }
  }

  private migrateLegacyCategoriesToErpPlan(officialCategories: MockRecord[]) {
    // Sincroniza integralmente com a árvore oficial da planilha
    const cats = this.collections.categories || []
    const hasOfficialPlan = cats.some((c) => c.name === 'Estrutural Habitacional' || c.code === '1.1')

    if (!hasOfficialPlan) {
      // Preserva categorias customizadas criadas pelo usuário (não pertencentes a seeds antigos)
      const officialIds = new Set(officialCategories.map((c) => c.id))
      const oldLegacyPrefixes = ['cat_salario', 'cat_dividendos', 'cat_freela', 'cat_aluguel', 'cat_energia', 'cat_mercado', 'cat_saude', 'cat_telecom', 'cat_restaurantes', 'cat_streaming', 'cat_transporte', 'cat_vestuario', 'cat_reserva_sonho', 'cat_viagem_sonho', 'cat_divida_parcela', 'cat_grp_']

      const userCustomCategories = cats.filter(
        (c) =>
          !officialIds.has(c.id) &&
          !oldLegacyPrefixes.some((p) => c.id.startsWith(p)) &&
          c.group_level1 !== 'Custos Fixos' &&
          c.group_level1 !== 'Estilo de Vida',
      )

      this.collections.categories = [...officialCategories, ...userCustomCategories]
      this.persist('categories')
    }
  }

  clearAllTransactions() {
    this.collections.transactions = []
    this.collections.invoices = []
    this.collections.payments = []
    this.persist('transactions')
    this.persist('invoices')
    this.persist('payments')
    if (this.collections.accounts) {
      for (const a of this.collections.accounts) {
        a.current_balance = a.initial_balance ?? 0
      }
      this.persist('accounts')
    }
    this.emit('transactions', 'delete', { id: '*', created: '', updated: '' })
  }

  autoCancellation(_flag: boolean) {
    // no-op
  }

  private persist(col: string) {
    setStored(col, this.collections[col] || [])
  }

  private emit(col: string, action: 'create' | 'update' | 'delete', record: MockRecord) {
    const subs = this.subscriptions[col] || []
    const wildSubs = this.subscriptions['*'] || []
    const event = { action, record }
    for (const fn of [...subs, ...wildSubs]) {
      try {
        fn(event)
      } catch (e) {
        console.warn('Realtime event error:', e)
      }
    }
  }

  collection<T = MockRecord>(name: string) {
    if (!this.collections[name]) {
      this.collections[name] = getStored(name, [])
    }

    return {
      getFullList: async <R = T>(options?: {
        filter?: string
        sort?: string
        expand?: string
      }): Promise<R[]> => {
        let items = [...(this.collections[name] || [])]
        items = this.applyFilter(name, items, options?.filter)
        items = this.applySort(items, options?.sort)
        if (options?.expand) {
          items = items.map((item) => this.expandRecord(name, item, options.expand!))
        }
        return items as unknown as R[]
      },

      getList: async <R = T>(
        page: number = 1,
        perPage: number = 30,
        options?: {
          filter?: string
          sort?: string
          expand?: string
        },
      ): Promise<{
        items: R[]
        page: number
        perPage: number
        totalItems: number
        totalPages: number
      }> => {
        let items = [...(this.collections[name] || [])]
        items = this.applyFilter(name, items, options?.filter)
        items = this.applySort(items, options?.sort)
        const totalItems = items.length
        const totalPages = Math.max(1, Math.ceil(totalItems / perPage))
        const start = (page - 1) * perPage
        const paginated = items.slice(start, start + perPage)
        const expanded = options?.expand
          ? paginated.map((item) => this.expandRecord(name, item, options.expand!))
          : paginated

        return {
          items: expanded as unknown as R[],
          page,
          perPage,
          totalItems,
          totalPages,
        }
      },

      getOne: async <R = T>(id: string, options?: { expand?: string }): Promise<R> => {
        const found = this.collections[name]?.find((r) => r.id === id)
        if (!found) {
          throw new Error(`Record with id '${id}' not found in collection '${name}'.`)
        }
        const item = options?.expand ? this.expandRecord(name, found, options.expand) : found
        return item as unknown as R
      },

      getFirstListItem: async <R = T>(
        filter: string,
        options?: { expand?: string },
      ): Promise<R> => {
        let items = [...(this.collections[name] || [])]
        items = this.applyFilter(name, items, filter)
        if (items.length === 0) {
          throw new Error(`No record found matching filter '${filter}' in collection '${name}'.`)
        }
        const found = items[0]
        const item = options?.expand ? this.expandRecord(name, found, options.expand) : found
        return item as unknown as R
      },

      create: async <R = T>(data: any, options?: { expand?: string }): Promise<R> => {
        const id = data.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const nowIso = new Date().toISOString()
        const newRecord: MockRecord = {
          ...data,
          id,
          created: nowIso,
          updated: nowIso,
        }
        this.collections[name].unshift(newRecord)
        this.persist(name)
        this.emit(name, 'create', newRecord)
        const item = options?.expand
          ? this.expandRecord(name, newRecord, options.expand)
          : newRecord
        return item as unknown as R
      },

      update: async <R = T>(id: string, data: any, options?: { expand?: string }): Promise<R> => {
        const index = this.collections[name].findIndex((r) => r.id === id)
        if (index === -1) {
          throw new Error(`Record '${id}' not found to update in '${name}'.`)
        }
        const updated = {
          ...this.collections[name][index],
          ...data,
          id,
          updated: new Date().toISOString(),
        }
        this.collections[name][index] = updated
        this.persist(name)
        this.emit(name, 'update', updated)
        const item = options?.expand ? this.expandRecord(name, updated, options.expand) : updated
        return item as unknown as R
      },

      delete: async (id: string): Promise<boolean> => {
        const rec = this.collections[name].find((r) => r.id === id)
        this.collections[name] = this.collections[name].filter((r) => r.id !== id)
        this.persist(name)
        if (rec) this.emit(name, 'delete', rec)
        return true
      },

      authWithPassword: async (email: string, _password: string) => {
        let user = this.collections.users?.find((u) => u.email === email)
        if (!user) {
          user = {
            id: 'usr_' + Date.now(),
            email,
            name: email === 'roogerio99@gmail.com' ? 'Rogério Coimbra' : email.split('@')[0],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          }
          this.collections.users.push(user)
          this.persist('users')
        } else if (user.email === 'roogerio99@gmail.com' || user.name === 'Rogério Silva') {
          user.name = 'Rogério Coimbra'
          this.persist('users')
        }
        this.authStore.save('mock_jwt_' + user.id, user)
        return { token: this.authStore.token, record: user }
      },

      requestPasswordReset: async (_email: string) => {
        return true
      },

      subscribe: async (topic: string, callback: (event: any) => void) => {
        const key = topic === '*' ? name : `${name}/${topic}`
        if (!this.subscriptions[key]) {
          this.subscriptions[key] = []
        }
        this.subscriptions[key].push(callback)
        return async () => {
          this.subscriptions[key] = this.subscriptions[key].filter((fn) => fn !== callback)
        }
      },

      unsubscribe: async (topic?: string) => {
        const key = !topic || topic === '*' ? name : `${name}/${topic}`
        delete this.subscriptions[key]
      },
    }
  }

  async send<T = any>(path: string, options?: { method?: string; body?: any }): Promise<T> {
    const method = (options?.method || 'GET').toUpperCase()
    const body = options?.body || {}

    // POST /backend/v1/transfers
    if (path === '/backend/v1/transfers' && method === 'POST') {
      const { source_account_id, target_account_id, amount, date, description, notes } = body
      const accounts = this.collections.accounts || []
      const srcAcc = accounts.find((a) => a.id === source_account_id)
      const tgtAcc = accounts.find((a) => a.id === target_account_id)

      if (srcAcc) {
        srcAcc.current_balance = (srcAcc.current_balance ?? srcAcc.initial_balance ?? 0) - amount
      }
      if (tgtAcc) {
        tgtAcc.current_balance = (tgtAcc.current_balance ?? tgtAcc.initial_balance ?? 0) + amount
      }
      this.persist('accounts')

      const txRecord = await this.collection('transactions').create({
        user_id: this.authStore.record?.id,
        account_id: source_account_id,
        transfer_account_id: target_account_id,
        amount,
        type: 'transfer',
        date: date || new Date().toISOString().slice(0, 10),
        competence_month: (date || new Date().toISOString()).slice(0, 7),
        cash_month: (date || new Date().toISOString()).slice(0, 7),
        description: description || 'Transferência entre contas',
        notes,
      })

      return { id: txRecord.id, amount } as unknown as T
    }

    // POST /backend/v1/invoices
    if (path === '/backend/v1/invoices' && method === 'POST') {
      const { card_account_id, reference_month } = body
      const card = this.collections.accounts?.find((a) => a.id === card_account_id)
      const transactions = this.collections.transactions || []
      const cardTxs = transactions.filter(
        (t) =>
          t.account_id === card_account_id &&
          t.type === 'expense' &&
          t.cash_month === reference_month,
      )
      const totalAmount = cardTxs.reduce((sum, t) => sum + (t.amount || 0), 0)

      let existing = this.collections.invoices?.find(
        (inv) => inv.card_account_id === card_account_id && inv.reference_month === reference_month,
      )

      if (existing) {
        existing.total_amount = totalAmount
        existing.items_count = cardTxs.length
        existing.updated = new Date().toISOString()
        this.persist('invoices')
        return this.expandRecord(
          'invoices',
          existing,
          'card_account_id,payment_account_id',
        ) as unknown as T
      } else {
        const created = await this.collection('invoices').create({
          user_id: this.authStore.record?.id,
          card_account_id,
          reference_month,
          total_amount: totalAmount,
          items_count: cardTxs.length,
          status: 'open',
          due_date: `${reference_month}-${String(card?.due_day || 10).padStart(2, '0')}`,
        })
        return this.expandRecord(
          'invoices',
          created,
          'card_account_id,payment_account_id',
        ) as unknown as T
      }
    }

    // POST /backend/v1/invoice-movements
    if (path === '/backend/v1/invoice-movements' && method === 'POST') {
      const { invoice_id, payment_account_id, paid_date, amount, notes } = body
      const invoice = this.collections.invoices?.find((i) => i.id === invoice_id)
      const paymentAcc = this.collections.accounts?.find((a) => a.id === payment_account_id)

      const payAmount = amount || invoice?.total_amount || 0

      if (paymentAcc) {
        paymentAcc.current_balance =
          (paymentAcc.current_balance ?? paymentAcc.initial_balance ?? 0) - payAmount
        this.persist('accounts')
      }

      if (invoice) {
        invoice.status = 'paid'
        invoice.paid_date = paid_date
        invoice.payment_account_id = payment_account_id
        this.persist('invoices')
      }

      const txRecord = await this.collection('transactions').create({
        user_id: this.authStore.record?.id,
        account_id: payment_account_id,
        invoice_id,
        amount: payAmount,
        type: 'invoice_payment',
        date: paid_date,
        competence_month: paid_date.slice(0, 7),
        cash_month: paid_date.slice(0, 7),
        description: `Pagamento Fatura ${invoice?.reference_month || ''}`,
        notes,
      })

      return {
        movement_id: txRecord.id,
        invoice_id,
        amount: payAmount,
      } as unknown as T
    }

    // DELETE /backend/v1/invoice-movements/:movementId
    if (path.startsWith('/backend/v1/invoice-movements/') && method === 'DELETE') {
      const movementId = path.split('/').pop()
      const tx = this.collections.transactions?.find((t) => t.id === movementId)
      if (tx) {
        if (tx.invoice_id) {
          const inv = this.collections.invoices?.find((i) => i.id === tx.invoice_id)
          if (inv) {
            inv.status = 'open'
            delete inv.paid_date
            delete inv.payment_account_id
            this.persist('invoices')
          }
        }
        if (tx.account_id) {
          const acc = this.collections.accounts?.find((a) => a.id === tx.account_id)
          if (acc) {
            acc.current_balance = (acc.current_balance ?? acc.initial_balance ?? 0) + tx.amount
            this.persist('accounts')
          }
        }
        await this.collection('transactions').delete(tx.id)
      }
      return { ok: true } as unknown as T
    }

    // POST /backend/v1/invoice-payments
    if (path === '/backend/v1/invoice-payments' && method === 'POST') {
      const {
        source_transaction_id,
        installment_index,
        amount,
        cash_month,
        paid_date,
        payment_account_id,
        card_account_id,
        notes,
      } = body

      const payAcc = this.collections.accounts?.find((a) => a.id === payment_account_id)
      if (payAcc) {
        payAcc.current_balance = (payAcc.current_balance ?? payAcc.initial_balance ?? 0) - amount
        this.persist('accounts')
      }

      const tx = this.collections.transactions?.find((t) => t.id === source_transaction_id)
      if (tx) {
        tx.installments_paid = (tx.installments_paid || 0) + 1
        this.persist('transactions')
      }

      const payment = await this.collection('payments').create({
        user_id: this.authStore.record?.id,
        source_transaction_id,
        installment_index,
        amount,
        cash_month,
        paid_date,
        payment_account_id,
        card_account_id,
        notes,
      })

      return payment as unknown as T
    }

    // DELETE /backend/v1/invoice-payments/:id
    if (path.startsWith('/backend/v1/invoice-payments/') && method === 'DELETE') {
      const paymentId = path.split('/').pop()
      const pmt = this.collections.payments?.find((p) => p.id === paymentId)
      if (pmt) {
        if (pmt.payment_account_id) {
          const acc = this.collections.accounts?.find((a) => a.id === pmt.payment_account_id)
          if (acc) {
            acc.current_balance = (acc.current_balance ?? acc.initial_balance ?? 0) + pmt.amount
            this.persist('accounts')
          }
        }
        if (pmt.source_transaction_id) {
          const tx = this.collections.transactions?.find((t) => t.id === pmt.source_transaction_id)
          if (tx && (tx.installments_paid || 0) > 0) {
            tx.installments_paid = Math.max(0, (tx.installments_paid || 1) - 1)
            this.persist('transactions')
          }
        }
        await this.collection('payments').delete(paymentId!)
      }
      return { ok: true } as unknown as T
    }

    // POST /backend/v1/invoice-item-exclude
    if (path === '/backend/v1/invoice-item-exclude' && method === 'POST') {
      const { invoice_id, transaction_id, installment_index, notes } = body
      const invoice = this.collections.invoices?.find((i) => i.id === invoice_id)
      const tx = this.collections.transactions?.find((t) => t.id === transaction_id)
      const refMonth = invoice?.reference_month || ''
      const [yy, mm] = (refMonth || '2026-11').split('-').map(Number)
      const t = yy * 12 + (mm - 1) + 1
      const deferMonth = `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`

      if (!this.collections.invoice_adjustments) {
        this.collections.invoice_adjustments = []
      }
      const adj = {
        id: 'adj_' + Date.now(),
        user_id: this.authStore.record?.id,
        family_id: invoice?.family_id,
        transaction_id,
        installment_index: installment_index || 0,
        action: 'exclude',
        amount: tx?.amount || 0,
        invoice_month: refMonth,
        defer_month: deferMonth,
        invoice_id,
        notes,
        resolved: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      this.collections.invoice_adjustments.push(adj)
      this.persist('invoice_adjustments')

      return {
        invoice_id,
        reference_month: refMonth,
        total_amount: invoice?.total_amount || 0,
        items_count: 0,
        items: [],
        deferred_month: deferMonth,
      } as unknown as T
    }

    // POST /backend/v1/invoice-item-value
    if (path === '/backend/v1/invoice-item-value' && method === 'POST') {
      const { invoice_id, transaction_id, installment_index, value, notes } = body
      const invoice = this.collections.invoices?.find((i) => i.id === invoice_id)
      const refMonth = invoice?.reference_month || ''

      if (!this.collections.invoice_adjustments) {
        this.collections.invoice_adjustments = []
      }
      const adj = {
        id: 'adj_' + Date.now(),
        user_id: this.authStore.record?.id,
        family_id: invoice?.family_id,
        transaction_id,
        installment_index: installment_index || 0,
        action: 'set_value',
        amount: Number(value) || 0,
        invoice_month: refMonth,
        invoice_id,
        notes,
        resolved: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      this.collections.invoice_adjustments.push(adj)
      this.persist('invoice_adjustments')

      if (invoice) {
        invoice.total_amount = Number(value) || 0
        this.persist('invoices')
      }

      return {
        invoice_id,
        reference_month: refMonth,
        total_amount: Number(value) || 0,
        items_count: 1,
        items: [],
      } as unknown as T
    }

    // GET /backend/v1/invoice-adjustments?invoice_id=...
    if (path.startsWith('/backend/v1/invoice-adjustments')) {
      return (this.collections.invoice_adjustments || []) as unknown as T
    }

    // Skip connectors API
    if (path.startsWith('/api/skip/connectors')) {
      return [] as unknown as T
    }

    return {} as unknown as T
  }

  private applyFilter(col: string, items: MockRecord[], filterStr?: string): MockRecord[] {
    if (!filterStr || !filterStr.trim()) return items

    // Parse simple filter expressions like "field = 'value'", "a = '1' && b = '2'", "a = '1' || b = '2'"
    return items.filter((record) => {
      return this.evaluateExpression(record, filterStr.trim())
    })
  }

  private evaluateExpression(record: MockRecord, expr: string): boolean {
    // Strip wrapping parentheses
    if (expr.startsWith('(') && expr.endsWith(')')) {
      expr = expr.slice(1, -1).trim()
    }

    // Handle OR expressions
    if (expr.includes(' || ')) {
      const parts = expr.split(' || ')
      return parts.some((p) => this.evaluateExpression(record, p.trim()))
    }

    // Handle AND expressions
    if (expr.includes(' && ')) {
      const parts = expr.split(' && ')
      return parts.every((p) => this.evaluateExpression(record, p.trim()))
    }

    // Simple comparison: key = 'val' or key != 'val'
    const equalMatch = expr.match(/^([\w.]+)\s*=\s*['"]?([^'"]*)['"]?$/)
    if (equalMatch) {
      const [, key, val] = equalMatch
      return String(record[key] ?? '') === val
    }

    const notEqualMatch = expr.match(/^([\w.]+)\s*!=\s*['"]?([^'"]*)['"]?$/)
    if (notEqualMatch) {
      const [, key, val] = notEqualMatch
      return String(record[key] ?? '') !== val
    }

    return true
  }

  private applySort(items: MockRecord[], sortStr?: string): MockRecord[] {
    if (!sortStr || !sortStr.trim()) return items
    const criteria = sortStr.split(',').map((s) => s.trim())

    return [...items].sort((a, b) => {
      for (const crit of criteria) {
        const desc = crit.startsWith('-')
        const field = desc ? crit.slice(1) : crit
        const valA = a[field] ?? ''
        const valB = b[field] ?? ''
        if (valA < valB) return desc ? 1 : -1
        if (valA > valB) return desc ? -1 : 1
      }
      return 0
    })
  }

  private expandRecord(col: string, record: MockRecord, expandStr: string): MockRecord {
    const expanded = { ...record, expand: { ...(record.expand || {}) } }
    const relations = expandStr.split(',').map((s) => s.trim())

    for (const rel of relations) {
      if (rel === 'category_id' && record.category_id) {
        expanded.expand.category_id = this.collections.categories?.find(
          (c) => c.id === record.category_id,
        )
      } else if (rel === 'account_id' && record.account_id) {
        expanded.expand.account_id = this.collections.accounts?.find(
          (a) => a.id === record.account_id,
        )
      } else if (rel === 'card_account_id' && record.card_account_id) {
        expanded.expand.card_account_id = this.collections.accounts?.find(
          (a) => a.id === record.card_account_id,
        )
      } else if (rel === 'payment_account_id' && record.payment_account_id) {
        expanded.expand.payment_account_id = this.collections.accounts?.find(
          (a) => a.id === record.payment_account_id,
        )
      } else if (rel === 'source_transaction_id' && record.source_transaction_id) {
        expanded.expand.source_transaction_id = this.collections.transactions?.find(
          (t) => t.id === record.source_transaction_id,
        )
      }
    }

    return expanded
  }
}
