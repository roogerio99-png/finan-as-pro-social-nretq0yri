export interface MicrolearningPill {
  id: string
  trigger: 'overbudget' | 'revolving_credit' | 'surplus' | 'general'
  title: string
  subtitle: string
  content: string
  actionLabel?: string
  tag: string
}

export const microlearningPills: MicrolearningPill[] = [
  {
    id: 'pill-1',
    trigger: 'overbudget',
    tag: 'Estouro de Orçamento',
    title: 'A Regra do Teto e os Ajustes Sem Culpa',
    subtitle: 'Quando uma categoria estoura, não desanime: rebalanceie.',
    content:
      'O orçamento não é uma prisão, é um mapa de escolhas. Se você gastou mais em Alimentação ou Lazer este mês, olhe para as outras linhas e compense reduzindo itens flexíveis. O importante é o saldo global fechar no positivo.',
  },
  {
    id: 'pill-2',
    trigger: 'revolving_credit',
    tag: 'Rotativo do Cartão',
    title: 'O Perigo Invisível do Pagamento Mínimo',
    subtitle: 'Os juros do rotativo podem passar de 12% ao mês (mais de 300% ao ano).',
    content:
      'Pagar apenas o mínimo do cartão ativa uma bola de neve invertida: a cada mês o saldo devedor multiplica. Se o dinheiro faltar, prefira contratar um empréstimo pessoal ou consignado com juros menores (ex: 2% a 4% ao mês) para quitar a fatura integralmente à vista.',
  },
  {
    id: 'pill-3',
    trigger: 'surplus',
    tag: 'Sobra Positiva',
    title: 'Sobrou dinheiro este mês? Pague-se primeiro!',
    subtitle: 'Destine imediatamente uma parte para sua Reserva ou Sonho.',
    content:
      'Quando o caixa fecha com superávit, o impulso comum é gastar em itens supérfluos no mês seguinte. Em vez disso, faça a transferência imediatamente para a conta de reserva ou meta. Esse hábito constrói patrimônio real.',
  },
  {
    id: 'pill-4',
    trigger: 'general',
    tag: 'Competência vs Caixa',
    title: 'A diferença entre Quando Gastou e Quando Desembolsou',
    subtitle: 'Por que o extrato bancário sozinho mente para você.',
    content:
      'No regime de competência, o gasto pertence ao mês em que você comprou (ex: jantar no cartão dia 28/05 pertence a maio). No regime de caixa, o dinheiro só sai no dia do pagamento da fatura (dia 05/06). Controlar ambos evita a surpresa da fatura alta!',
  },
]

export interface GlossaryTerm {
  term: string
  meaning: string
  example: string
}

export const financeGlossary: GlossaryTerm[] = [
  {
    term: 'Regime de Competência',
    meaning:
      'Registro da receita ou despesa na data do acontecimento/consumo, independentemente de quando o dinheiro efetivamente sai da conta.',
    example:
      'Uma compra no cartão de crédito em 15/05 tem competência em Maio, mesmo vencendo em Junho.',
  },
  {
    term: 'Regime de Caixa',
    meaning:
      'Registro do fluxo financeiro no momento exato em que o dinheiro sai ou entra na conta bancária.',
    example: 'O pagamento da fatura do cartão feito em 05/06 tem impacto de caixa em Junho.',
  },
  {
    term: 'Acurácia Orçamentária',
    meaning:
      'O percentual de proximidade entre o que você planejou gastar e o que efetivamente gastou no mês.',
    example: 'Se orçou R$ 1.000 e gastou R$ 980, sua acurácia foi de 98%.',
  },
  {
    term: 'Método Avalanche',
    meaning:
      'Estratégia de quitação de dívidas que prioriza abater a dívida com a maior taxa de juros primeiro.',
    example:
      'Quitar primeiro o rotativo do cartão (12% a.m.) antes do empréstimo pessoal (4% a.m.).',
  },
  {
    term: 'Método Bola de Neve',
    meaning:
      'Estratégia que prioriza quitar primeiro a dívida de menor valor absoluto para gerar vitórias psicológicas rápidas.',
    example:
      'Eliminar a dívida de R$ 500 no cheque especial para liberar fluxo mensal e ganhar motivação.',
  },
  {
    term: 'Reserva de Emergência',
    meaning:
      'Montante equivalente a 3 a 6 meses de custos fixos guardado em aplicação com liquidez diária e baixo risco (ex: Tesouro Selic).',
    example:
      'Se seus custos fixos mensais são R$ 3.000, sua reserva ideal é de R$ 9.000 a R$ 18.000.',
  },
]
