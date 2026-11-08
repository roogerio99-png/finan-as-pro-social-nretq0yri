// Repositório Local Durável baseado em IndexedDB com execução 100% autônoma (PWA Offline-First)
// Dados sensíveis residem exclusivamente em compartimentos IndexedDB isolados por perfil no dispositivo do usuário.

import { indexedDbStore, STORES } from '@/lib/storage/indexedDbStore'
import { roundMoney, subtractMoney, sumMoney } from '@/lib/money'

export interface MockRecord {
  id: string
  created: string
  updated: string
  [key: string]: any
}

const STORAGE_PREFIX = 'gestio_financas_pb_'

// Gera estrutura inicial (contas vazias e plano de contas ERP) estritamente vinculada ao perfil autenticado
function createInitialData(ownerId: string = 'usr_unassigned') {
  const now = new Date()
  const nowIso = now.toISOString()

  const defaultUser: MockRecord = {
    id: ownerId,
    email: ownerId === 'usr_convidado_demo' ? 'visitante@gestio.app' : '',
    name: ownerId === 'usr_convidado_demo' ? 'Convidado (Demonstração)' : '',
    verified: true,
    created: nowIso,
    updated: nowIso,
  }

  const defaultFamily: MockRecord = {
    id: 'fam_local',
    name: 'Meu Cofre Financeiro',
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

const AUTH_STORE_STORAGE_KEY = 'gestio_verified_google_session_v2'
const LEGACY_AUTH_KEYS = ['gestio_financas_auth_session', 'pocketbase_auth']
const VAULT_LOCKED_KEY = 'gestio_vault_locked'

class MockAuthStore {
  isValid = false
  token = ''
  record: MockRecord | null = null
  private listeners: (() => void)[] = []

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        for (const k of LEGACY_AUTH_KEYS) {
          localStorage.removeItem(k)
        }
      } catch {
        // ignore
      }

      const isLocked = localStorage.getItem(VAULT_LOCKED_KEY) === 'true'
      if (isLocked) {
        this.record = null
        this.token = ''
        this.isValid = false
        return
      }

      try {
        const stored = localStorage.getItem(AUTH_STORE_STORAGE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          if (
            parsed &&
            parsed.record &&
            typeof parsed.record.id === 'string' &&
            (parsed.record.id.startsWith('usr_v_') || parsed.record.id === 'usr_convidado_demo') &&
            parsed.record.email &&
            parsed.record.verified_session === true &&
            parsed.token
          ) {
            this.record = parsed.record
            this.token = parsed.token
            this.isValid = true
            return
          } else {
            localStorage.removeItem(AUTH_STORE_STORAGE_KEY)
          }
        }
      } catch {
        // Ignora erro de JSON
      }
    }

    // Em instalação ou perfil novo: inicia sem usuário e sem registros pessoais
    this.record = null
    this.token = ''
    this.isValid = false
  }

  save(token: string, record: MockRecord) {
    const enrichedRecord: MockRecord = {
      ...record,
      verified_session: true,
    }
    this.token = token
    this.record = enrichedRecord
    this.isValid = true

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(VAULT_LOCKED_KEY)
        localStorage.setItem(
          AUTH_STORE_STORAGE_KEY,
          JSON.stringify({ token: this.token, record: this.record }),
        )
      } catch {
        // Ignora erro de storage
      }
    }

    this.notify()
  }

  clear() {
    this.token = ''
    this.record = null
    this.isValid = false

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(VAULT_LOCKED_KEY, 'true')
        localStorage.removeItem(AUTH_STORE_STORAGE_KEY)
      } catch {
        // Ignora erro de storage
      }
    }

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

function createEmptyCollections(): Record<string, MockRecord[]> {
  return {
    users: [],
    families: [],
    accounts: [],
    categories: [],
    transactions: [],
    budgets: [],
    debts: [],
    dreams: [],
    depara_rules: [],
    invoices: [],
    payments: [],
    invoice_adjustments: [],
    investment_operations: [],
    investment_quotes: [],
  }
}

export class MockPocketBase {
  baseUrl = ''
  authStore: MockAuthStore
  private collections: Record<string, MockRecord[]> = createEmptyCollections()
  // Compartimentos isolados em memória por usuário para garantir isolamento imediato mesmo em testes síncronos/Node
  private memoryCompartments: Map<string, Record<string, MockRecord[]>> = new Map()
  private subscriptions: Record<string, ((event: any) => void)[]> = {}

  constructor() {
    this.authStore = new MockAuthStore()

    // Purga dados financeiros legados que possam existir em localStorage
    if (typeof window !== 'undefined') {
      try {
        const sensitiveKeys = [
          'transactions',
          'accounts',
          'debts',
          'dreams',
          'budgets',
          'depara_rules',
          'categories',
          'users',
          'families',
          'invoices',
          'payments',
        ]
        for (const key of sensitiveKeys) {
          localStorage.removeItem(STORAGE_PREFIX + key)
        }
      } catch {
        // ignore
      }
    }

    // Se já houver uma sessão previamente autenticada neste mesmo perfil, carrega apenas o cofre correspondente
    if (this.authStore.record?.id) {
      this.activateUserCompartmentSync(this.authStore.record)
      this.initFromIndexedDb(this.authStore.record.id)
    }

    // Reage automaticamente a mudanças de autenticação (login, troca de conta ou bloqueio)
    this.authStore.onChange(() => {
      const currentUser = this.authStore.record
      if (!currentUser || !currentUser.id) {
        this.lockCompartment()
      } else {
        this.activateUserCompartmentSync(currentUser)
        this.initFromIndexedDb(currentUser.id)
      }
    })

    // Coordenação entre abas abertas via BroadcastChannel e evento storage
    indexedDbStore.onSyncMessage((msg) => {
      if (msg.type === 'VAULT_LOCKED') {
        if (this.authStore.record) {
          this.authStore.clear()
        }
      } else if (
        msg.type === 'DATA_UPDATED' &&
        msg.profileId &&
        msg.profileId === this.authStore.record?.id
      ) {
        this.initFromIndexedDb(msg.profileId)
      }
    })
  }

  /**
   * Bloqueia o cofre atual: limpa dados em memória, encerra assinaturas e fecha conexão do IndexedDB preservando a base.
   */
  public lockCompartment() {
    this.collections = createEmptyCollections()
    this.subscriptions = {}
    indexedDbStore.setActiveProfile(null).catch(() => {})
  }

  /**
   * Ativa sincronicamente o compartimento em memória exclusivo do perfil autenticado
   */
  public activateUserCompartmentSync(userRecord: MockRecord) {
    const uid = userRecord.id
    if (!uid) return

    let comp = this.memoryCompartments.get(uid)
    if (!comp) {
      const initial = createInitialData(uid)
      initial.users = [{ ...userRecord }]
      comp = {
        ...createEmptyCollections(),
        ...initial,
      }
      this.memoryCompartments.set(uid, comp)
    } else {
      const existingUserIdx = comp.users.findIndex((u) => u.id === uid)
      if (existingUserIdx >= 0) {
        comp.users[existingUserIdx] = { ...comp.users[existingUserIdx], ...userRecord }
      } else {
        comp.users.push({ ...userRecord })
      }
    }

    this.collections = comp
  }

  /**
   * Carrega e sincroniza de forma durável o compartimento IndexedDB exclusivo do usuário ativo
   */
  public async initFromIndexedDb(userId: string) {
    if (!userId) return
    await indexedDbStore.setActiveProfile(userId)

    if (typeof window === 'undefined') return

    try {
      const initial = createInitialData(userId)
      for (const col of STORES) {
        if (col === 'vault_meta') continue
        const records = await indexedDbStore.getAll(col)
        if (records && records.length > 0) {
          this.collections[col] = records
        } else if (initial[col as keyof typeof initial] && initial[col as keyof typeof initial].length > 0) {
          const seedItems = initial[col as keyof typeof initial].map((item: MockRecord) => ({
            ...item,
            user_id: userId,
          }))
          this.collections[col] = seedItems
          for (const item of seedItems) {
            await indexedDbStore.put(col, item).catch(() => {})
          }
        } else {
          this.collections[col] = []
        }
      }
      this.memoryCompartments.set(userId, this.collections)
    } catch (err) {
      console.warn('[LocalStore] Inicialização IndexedDB fallback:', err)
    }
  }

  clearAllTransactions() {
    if (!this.authStore.record?.id) return
    this.collections.transactions = []
    this.collections.invoices = []
    this.collections.payments = []
    indexedDbStore.clear('transactions').catch(() => {})
    indexedDbStore.clear('invoices').catch(() => {})
    indexedDbStore.clear('payments').catch(() => {})
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
    if (!this.authStore.record?.id) return
    const records = this.collections[col] || []
    for (const r of records) {
      if (r && r.id) {
        indexedDbStore.put(col as any, r).catch(() => {})
      }
    }
  }

  private async persistRecord(col: string, record: MockRecord) {
    if (!this.authStore.record?.id) return
    if ((STORES as readonly string[]).includes(col)) {
      await indexedDbStore.put(col as any, record)
    }
  }

  private async deleteRecord(col: string, id: string) {
    if (!this.authStore.record?.id) return
    if ((STORES as readonly string[]).includes(col)) {
      await indexedDbStore.delete(col as any, id)
    }
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

  getCollectionRecords(name: string): MockRecord[] {
    if (!this.authStore.record?.id) return []
    return this.collections[name] || []
  }

  collection<T = MockRecord>(name: string) {
    if (!this.collections[name]) {
      this.collections[name] = []
    }

    return {
      getFullList: async <R = T>(options?: {
        filter?: string
        sort?: string
        expand?: string
        limit?: number
        $autoCancel?: boolean
        requestKey?: string | null
      }): Promise<R[]> => {
        const activeUserId = this.authStore.record?.id
        if (!activeUserId && name !== 'users') {
          return []
        }

        let items = [...(this.collections[name] || [])]
        // Garante isolamento por user_id mesmo se o chamador omitir filtro
        if (activeUserId && name !== 'users' && name !== 'families') {
          items = items.filter((item) => !item.user_id || item.user_id === activeUserId)
        }
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
        const activeUserId = this.authStore.record?.id
        if (!activeUserId && name !== 'users') {
          return { items: [], page, perPage, totalItems: 0, totalPages: 1 }
        }

        let items = [...(this.collections[name] || [])]
        if (activeUserId && name !== 'users' && name !== 'families') {
          items = items.filter((item) => !item.user_id || item.user_id === activeUserId)
        }
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
        const activeUserId = this.authStore.record?.id
        const found = this.collections[name]?.find(
          (r) => r.id === id && (!activeUserId || name === 'users' || !r.user_id || r.user_id === activeUserId),
        )
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
        const activeUserId = this.authStore.record?.id
        let items = [...(this.collections[name] || [])]
        if (activeUserId && name !== 'users' && name !== 'families') {
          items = items.filter((item) => !item.user_id || item.user_id === activeUserId)
        }
        items = this.applyFilter(name, items, filter)
        if (items.length === 0) {
          throw new Error(`No record found matching filter '${filter}' in collection '${name}'.`)
        }
        const found = items[0]
        const item = options?.expand ? this.expandRecord(name, found, options.expand) : found
        return item as unknown as R
      },

      create: async <R = T>(data: any, options?: { expand?: string }): Promise<R> => {
        const activeUserId = this.authStore.record?.id
        if (!activeUserId && name !== 'users') {
          throw new Error('Sessão não autenticada. Faça login para gravar registros.')
        }

        const id = data.id || `rec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
        const nowIso = new Date().toISOString()
        const newRecord: MockRecord = {
          ...data,
          ...(name !== 'users' && name !== 'families' ? { user_id: activeUserId } : {}),
          ...(typeof data.amount === 'number' ? { amount: roundMoney(data.amount) } : {}),
          id,
          created: nowIso,
          updated: nowIso,
        }

        if (!this.collections[name]) {
          this.collections[name] = []
        }

        await this.persistRecord(name, newRecord)
        this.collections[name].unshift(newRecord)
        this.emit(name, 'create', newRecord)
        const item = options?.expand
          ? this.expandRecord(name, newRecord, options.expand)
          : newRecord
        return item as unknown as R
      },

      update: async <R = T>(id: string, data: any, options?: { expand?: string }): Promise<R> => {
        const activeUserId = this.authStore.record?.id
        const index = this.collections[name].findIndex(
          (r) => r.id === id && (!activeUserId || name === 'users' || !r.user_id || r.user_id === activeUserId),
        )
        if (index === -1) {
          throw new Error(`Record '${id}' not found to update in '${name}'.`)
        }
        const updated: MockRecord = {
          ...this.collections[name][index],
          ...data,
          ...(typeof data.amount === 'number' ? { amount: roundMoney(data.amount) } : {}),
          id,
          updated: new Date().toISOString(),
        }
        await this.persistRecord(name, updated)
        this.collections[name][index] = updated
        this.emit(name, 'update', updated)
        const item = options?.expand ? this.expandRecord(name, updated, options.expand) : updated
        return item as unknown as R
      },

      delete: async (id: string): Promise<boolean> => {
        const activeUserId = this.authStore.record?.id
        const rec = this.collections[name].find(
          (r) => r.id === id && (!activeUserId || name === 'users' || !r.user_id || r.user_id === activeUserId),
        )
        if (!rec) return false
        await this.deleteRecord(name, id)
        this.collections[name] = this.collections[name].filter((r) => r.id !== id)
        this.emit(name, 'delete', rec)
        return true
      },

      authWithPassword: async (email: string, _password: string) => {
        const normEmail = email.trim().toLowerCase()
        if (!normEmail || !normEmail.includes('@')) {
          throw new Error('Identificação de conta inválida.')
        }
        const isDemo = normEmail === 'visitante@gestio.app' || normEmail === 'demo@gestio.app'
        const deterministicEmailId = `usr_g_${Math.abs(
          normEmail.split('').reduce((a, b) => ((a << 5) - a + b.charCodeAt(0)) | 0, 0),
        )}`
        const effectiveId = isDemo ? 'usr_convidado_demo' : deterministicEmailId

        let user = this.collections.users?.find((u) => u.email === normEmail)
        if (!user) {
          user = {
            id: effectiveId,
            email: normEmail,
            name: isDemo ? 'Convidado (Demonstração)' : normEmail.split('@')[0],
            verified: true,
            verified_session: true,
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
          }
        } else {
          user.id = effectiveId
          user.verified_session = true
        }

        this.authStore.save('local_session_' + effectiveId, user)
        await this.initFromIndexedDb(effectiveId)
        return { token: this.authStore.token, record: user }
      },

      requestPasswordReset: async (_email: string) => {
        return true
      },

      subscribe: async <R = T>(
        topic: string,
        callback: (event: { action: string; record: R }) => void,
      ) => {
        const key = topic === '*' ? name : `${name}/${topic}`
        if (!this.subscriptions[key]) {
          this.subscriptions[key] = []
        }
        this.subscriptions[key].push(callback as any)
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
      const cleanAmt = roundMoney(Number(amount) || 0)
      const accounts = this.collections.accounts || []
      const srcAcc = accounts.find((a) => a.id === source_account_id)
      const tgtAcc = accounts.find((a) => a.id === target_account_id)

      if (srcAcc) {
        srcAcc.current_balance = subtractMoney(
          srcAcc.current_balance ?? srcAcc.initial_balance ?? 0,
          cleanAmt,
        )
        await this.persistRecord('accounts', srcAcc)
      }
      if (tgtAcc) {
        tgtAcc.current_balance = sumMoney(
          tgtAcc.current_balance ?? tgtAcc.initial_balance ?? 0,
          cleanAmt,
        )
        await this.persistRecord('accounts', tgtAcc)
      }

      const txRecord = await this.collection('transactions').create({
        user_id: this.authStore.record?.id,
        account_id: source_account_id,
        transfer_account_id: target_account_id,
        amount: cleanAmt,
        type: 'transfer',
        date: date || new Date().toISOString().slice(0, 10),
        competence_month: (date || new Date().toISOString()).slice(0, 7),
        cash_month: (date || new Date().toISOString()).slice(0, 7),
        description: description || 'Transferência entre contas',
        notes,
      })

      return { id: txRecord.id, amount: cleanAmt } as unknown as T
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
      const totalAmount = sumMoney(...cardTxs.map((t) => t.amount || 0))

      let existing = this.collections.invoices?.find(
        (inv) => inv.card_account_id === card_account_id && inv.reference_month === reference_month,
      )

      if (existing) {
        existing.total_amount = totalAmount
        existing.items_count = cardTxs.length
        existing.updated = new Date().toISOString()
        await this.persistRecord('invoices', existing)
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

      const payAmount = roundMoney(Number(amount || invoice?.total_amount || 0))

      if (paymentAcc) {
        paymentAcc.current_balance = subtractMoney(
          paymentAcc.current_balance ?? paymentAcc.initial_balance ?? 0,
          payAmount,
        )
        await this.persistRecord('accounts', paymentAcc)
      }

      if (invoice) {
        invoice.status = 'paid'
        invoice.paid_date = paid_date
        invoice.payment_account_id = payment_account_id
        await this.persistRecord('invoices', invoice)
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
            await this.persistRecord('invoices', inv)
          }
        }
        if (tx.account_id) {
          const acc = this.collections.accounts?.find((a) => a.id === tx.account_id)
          if (acc) {
            acc.current_balance = sumMoney(
              acc.current_balance ?? acc.initial_balance ?? 0,
              tx.amount,
            )
            await this.persistRecord('accounts', acc)
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

      const cleanAmt = roundMoney(Number(amount) || 0)
      const payAcc = this.collections.accounts?.find((a) => a.id === payment_account_id)
      if (payAcc) {
        payAcc.current_balance = subtractMoney(
          payAcc.current_balance ?? payAcc.initial_balance ?? 0,
          cleanAmt,
        )
        await this.persistRecord('accounts', payAcc)
      }

      const tx = this.collections.transactions?.find((t) => t.id === source_transaction_id)
      if (tx) {
        tx.installments_paid = (tx.installments_paid || 0) + 1
        await this.persistRecord('transactions', tx)
      }

      const payment = await this.collection('payments').create({
        user_id: this.authStore.record?.id,
        source_transaction_id,
        installment_index,
        amount: cleanAmt,
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
            acc.current_balance = sumMoney(
              acc.current_balance ?? acc.initial_balance ?? 0,
              pmt.amount,
            )
            await this.persistRecord('accounts', acc)
          }
        }
        if (pmt.source_transaction_id) {
          const tx = this.collections.transactions?.find((t) => t.id === pmt.source_transaction_id)
          if (tx && (tx.installments_paid || 0) > 0) {
            tx.installments_paid = Math.max(0, (tx.installments_paid || 1) - 1)
            await this.persistRecord('transactions', tx)
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
        amount: roundMoney(Number(tx?.amount || 0)),
        invoice_month: refMonth,
        defer_month: deferMonth,
        invoice_id,
        notes,
        resolved: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      this.collections.invoice_adjustments.push(adj)

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
      const cleanVal = roundMoney(Number(value) || 0)

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
        amount: cleanVal,
        invoice_month: refMonth,
        invoice_id,
        notes,
        resolved: false,
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
      }
      this.collections.invoice_adjustments.push(adj)

      if (invoice) {
        invoice.total_amount = cleanVal
        await this.persistRecord('invoices', invoice)
      }

      return {
        invoice_id,
        reference_month: refMonth,
        total_amount: cleanVal,
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
