export type RuleFilter = {
  slug: string;
  label: string;
  hint: string;
  sortOrder?: number;
  active?: boolean;
};

export type ActionSpec = {
  policiaisMin: string;
  criminososMin: string;
  criminososMax: string;
  refensMax: string;
  cooldown: string;
  nivel: string;
  negociacao: string;
  fuga?: string;
};

export type RuleSection = {
  id: string;
  slug: string;
  category: string;
  number: string;
  title: string;
  intro?: string;
  items: string[];
  spec?: ActionSpec | null;
  sortOrder?: number;
  active?: boolean;
};

export const RULE_FILTERS: RuleFilter[] = [
  { slug: "todas", label: "Todas", hint: "Regulamento completo" },
  { slug: "geral", label: "Regra geral", hint: "Aplicação e responsabilidade" },
  { slug: "convivencia", label: "Convivência", hint: "OOC, respeito e staff" },
  { slug: "prisao", label: "Prisões", hint: "BO, combat logging" },
  { slug: "roleplay", label: "Roleplay", hint: "Assassinato e impacto" },
  { slug: "refens", label: "Reféns", hint: "Negociação e prioridade" },
  { slug: "ilegais", label: "Ilegais e fuga", hint: "Veículos, casas e perseguição" },
  { slug: "policial", label: "Policial", hint: "Códigos, hierarquia e conduta" },
  { slug: "denuncia", label: "Denúncias", hint: "Provas e ticket" },
  { slug: "acao", label: "Ações", hint: "Galinheiro, loja, Fleeca..." },
  { slug: "loja", label: "Loja e doações", hint: "Sem reembolso" },
];

export const RULE_SECTIONS: RuleSection[] = [
  {
    id: "loja",
    slug: "loja",
    category: "loja",
    number: "00",
    title: "Loja oficial e doações",
    intro:
      "Toda compra feita neste site é uma doação voluntária para manutenção da Nova Garoa RP. Não é venda de produto físico nem de direito de reembolso.",
    items: [
      "Valores pagos na loja (VIP, itens, cargos e demais benefícios digitais) são doações espontâneas à cidade.",
      "Não existe reembolso, estorno, cancelamento ou conversão do valor após o pagamento, inclusive em caso de banimento, expulsão, troca de personagem ou desistência.",
      "O benefício digital é liberado conforme as regras da cidade e o status da conta no servidor. Doar não garante imunidade, cargo permanente ou tratamento especial da Staff.",
      "O doador declara ter lido as Leis Gerais e aceita que o pagamento não cria relação de consumo com direito a arrependimento sobre o valor doado.",
      "Dúvidas sobre entrega do benefício (VIP, cargo ou item) devem ser abertas em ticket no Discord, com o número do pedido.",
    ],
  },
  {
    id: "prisao",
    slug: "prisao",
    category: "prisao",
    number: "01",
    title: "Prisões e procedimentos",
    items: [
      "Toda prisão deverá ser precedida de Roleplay adequado.",
      "Prisões fora do contexto RP, incluindo Combat Logging, são proibidas.",
      "Após cada prisão, o policial deverá preencher um BO detalhado, com o motivo da detenção e as evidências coletadas.",
    ],
  },
  {
    id: "roleplay",
    slug: "roleplay",
    category: "roleplay",
    number: "02",
    title: "Roleplay específico",
    items: [
      "RP de assassinato sem história prévia autorizada pela Prefeitura é totalmente proibido.",
      "Ações de grande impacto devem respeitar o contexto da cidade, o fair play e as regras específicas de cada ação.",
    ],
  },
  {
    id: "convivencia",
    slug: "convivencia",
    category: "convivencia",
    number: "03",
    title: "Conflitos e condutas OOC",
    items: [
      "Discussões ou conflitos fora do personagem (OOC) deverão ser resolvidos de forma madura e, se necessário, com mediação da Administração, sempre fora do jogo.",
      "Ofensas pessoais, xenofobia, racismo ou comportamentos tóxicos OOC serão tratados com rigor.",
    ],
  },
  {
    id: "refens",
    slug: "refens",
    category: "refens",
    number: "04",
    title: "Situações de reféns e negociações",
    items: [
      "Em casos de reféns, é obrigatório tentar negociação antes de qualquer abordagem tática, exceto se houver risco iminente à vida.",
      "Ordem de prioridade de negociação em sequestros: GATE → GER → Unidades Especializadas da Polícia Militar e Civil → Demais Unidades.",
    ],
  },
  {
    id: "ilegais",
    slug: "ilegais",
    category: "ilegais",
    number: "05",
    title: "Regras de ações ilegais",
    items: [
      "É proibido atirar de dentro de qualquer veículo blindado.",
      "É permitido andar apenas uma pessoa por porta do veículo.",
    ],
  },
  {
    id: "fuga",
    slug: "fuga",
    category: "ilegais",
    number: "05.2",
    title: "Regras de fuga",
    items: [
      "Fuga para dentro de casas é permitida, mas a polícia poderá continuar a ação dentro do local.",
      "Após voz de parada da polícia, os criminosos poderão tentar escapar até serem capturados ou conseguirem despistar os policiais.",
      "Fugas a pé: a polícia poderá perseguir o fugitivo até que ele seja imobilizado com a cabeçada ou SHIFT+E.",
      "É considerado Power Gaming o uso de socos à distância para alcançar e imobilizar o fugitivo.",
    ],
  },
  {
    id: "codigos",
    slug: "codigos",
    category: "policial",
    number: "06",
    title: "Códigos de intervenção policial",
    items: [
      "Código 3: quando o fugitivo atentar contra a vida de outros cidadãos, colidir propositalmente com veículos ou cometer Power Gaming.",
      "Código 5: uso permitido apenas como último recurso, quando o fugitivo representar risco iminente à polícia ou à população.",
      "Exemplo de Código 5: suspeito armado e pronto para atirar.",
      "Caso o suspeito se renda, ele não poderá ser neutralizado propositalmente. Isso será considerado RDM.",
    ],
  },
  {
    id: "denuncia",
    slug: "denuncia",
    category: "denuncia",
    number: "07",
    title: "Processo de denúncia",
    items: [
      "Denúncias não serão aceitas sem provas. Toda denúncia deverá ser acompanhada de evidências.",
      "Todas as provas deverão ser enviadas no ticket aberto pelo denunciante no Discord.",
      "Se, durante uma denúncia, o denunciante também violar alguma regra e isso estiver registrado em vídeo, ele também poderá ser punido.",
      "Caso ambos tenham cometido infrações, poderão receber punição verbal, conforme análise da situação.",
    ],
  },
  {
    id: "staff",
    slug: "staff",
    category: "convivencia",
    number: "08",
    title: "Conduta da Staff",
    items: [
      "Durante atendimentos, seja por call ou ticket, a Staff deverá manter respeito com todas as partes envolvidas.",
      "Farpas, xingamentos ou comportamentos agressivos são proibidos.",
      "O atendimento deverá ser formal, educado e respeitoso em todos os momentos.",
      "Cidadãos poderão reportar qualquer desrespeito diretamente a um superior da Staff.",
    ],
  },
  {
    id: "sigilo",
    slug: "sigilo",
    category: "convivencia",
    number: "09",
    title: "Sigilo e exclusividade",
    items: [
      "É proibido vazar informações internas da Prefeitura ou do servidor.",
      "Membros da Staff não poderão atuar em outra cidade, comunidade, loja ou projeto semelhante simultaneamente, salvo autorização expressa da Administração.",
    ],
  },
  {
    id: "policial",
    slug: "policial",
    category: "policial",
    number: "10",
    title: "Regras policiais",
    items: [
      "O Secretário de Segurança é considerado o chefe do Estado, e sua palavra será sempre a última dentro da hierarquia.",
      "Todas as ordens deverão ser obedecidas sem questionamento, respeitando a cadeia de comando e as normas internas.",
      "As hierarquias dentro das corporações deverão ser rigorosamente respeitadas.",
      "Cada policial tem a obrigação de seguir as ordens de seus superiores.",
      "Desrespeitar a hierarquia ou ignorar ordens diretas poderá resultar em sanções internas.",
      "Em crimes que se iniciem na cidade e sigam para territórios externos, como o Paraguai, a polícia possui autoridade para prosseguir e agir dentro das regras e limites do RP.",
    ],
  },
  {
    id: "acompanhamentos",
    slug: "acompanhamentos",
    category: "policial",
    number: "11",
    title: "Conduta em acompanhamentos",
    items: [
      "Durante perseguições, é proibido colidir propositalmente com veículos (motos, carros ou outros), sob risco de caracterizar VDM.",
      "É proibido fugir para áreas inacessíveis ou abusar de mecânicas irreais. Essas atitudes serão consideradas Anti-RP.",
      "É permitido um limite de 4 viaturas por veículo em acompanhamento.",
      "Helicópteros não entram na contagem das viaturas.",
      "2 motos equivalem a 1 veículo para fins de contagem durante perseguições.",
    ],
  },
  {
    id: "integridade",
    slug: "integridade",
    category: "policial",
    number: "12",
    title: "Integridade e conduta policial",
    items: [
      "Qualquer tipo de corrupção de informações ou itens é proibido.",
      "Policiais deverão manter conduta exemplar durante abordagens, respeitando todos os cidadãos e evitando palavras de baixo calão ou termos pejorativos.",
      "É essencial manter neutralidade, sem favorecer amigos, facções ou criminosos.",
      "Qualquer indício de parcialidade será devidamente investigado.",
      "O policial não poderá agir de forma irrealista, ignorando ferimentos graves ou continuando combates sem um RP adequado de dor, ferimento ou incapacitação.",
    ],
  },
  {
    id: "acoes-gerais",
    slug: "acoes-gerais",
    category: "acao",
    number: "13.1",
    title: "Regras gerais das ações",
    items: [
      "Art. 1º — Toda ação deverá possuir a quantidade mínima de policiais em serviço estabelecida neste regulamento para que possa ser iniciada.",
      "Art. 2º — É obrigatório respeitar o limite máximo de participantes estabelecido para cada ação.",
      "Art. 3º — É proibido utilizar jogadores que não estejam envolvidos na ação para fornecer informações, apoio ou qualquer tipo de interferência externa.",
      "Art. 4º — É proibido iniciar uma nova ação de grande porte enquanto outra ação de grande porte estiver em andamento.",
      "Art. 5º — Após participar de uma ação, o jogador deverá respeitar o Cooldown (CD) determinado para aquela ação.",
    ],
  },
  {
    id: "galinheiro",
    slug: "galinheiro",
    category: "acao",
    number: "13.2",
    title: "Ação Galinheiro",
    spec: {
      policiaisMin: "2",
      criminososMin: "2",
      criminososMax: "4",
      refensMax: "2",
      cooldown: "30 minutos",
      nivel: "Baixo",
      negociacao: "Permitida",
    },
    items: ["Respeite o mínimo de policiais e o cooldown antes de iniciar."],
  },
  {
    id: "acao-loja",
    slug: "acao-loja",
    category: "acao",
    number: "13.3",
    title: "Ação Loja",
    spec: {
      policiaisMin: "2",
      criminososMin: "2",
      criminososMax: "4",
      refensMax: "1",
      cooldown: "45 minutos",
      nivel: "Baixo",
      negociacao: "Permitida",
    },
    items: ["Respeite o mínimo de policiais e o cooldown antes de iniciar."],
  },
  {
    id: "ammu",
    slug: "ammu-nation",
    category: "acao",
    number: "13.4",
    title: "Ação Ammunation",
    spec: {
      policiaisMin: "2",
      criminososMin: "2",
      criminososMax: "4",
      refensMax: "1",
      cooldown: "45 minutos",
      nivel: "Baixo",
      negociacao: "Permitida",
    },
    items: ["Respeite o mínimo de policiais e o cooldown antes de iniciar."],
  },
  {
    id: "caixinha",
    slug: "caixinha",
    category: "acao",
    number: "13.5",
    title: "Ação Caixinha",
    spec: {
      policiaisMin: "2",
      criminososMin: "2",
      criminososMax: "4",
      refensMax: "0",
      cooldown: "30 minutos",
      nivel: "Baixo",
      negociacao: "Não permitida",
    },
    items: ["Negociação não é permitida nesta ação."],
  },
  {
    id: "material",
    slug: "material-ilicito",
    category: "acao",
    number: "13.6",
    title: "Venda de material ilícito",
    spec: {
      policiaisMin: "2",
      criminososMin: "2",
      criminososMax: "4",
      refensMax: "0",
      cooldown: "1 hora",
      nivel: "Médio",
      negociacao: "Não permitida",
      fuga: "Permitida",
    },
    items: ["A fuga é permitida, desde que respeite as regras gerais de fuga."],
  },
  {
    id: "caixa",
    slug: "caixa-eletronico",
    category: "acao",
    number: "13.7",
    title: "Fuga do caixa eletrônico",
    spec: {
      policiaisMin: "2",
      criminososMin: "2",
      criminososMax: "4",
      refensMax: "0",
      cooldown: "45 minutos",
      nivel: "Médio",
      negociacao: "Não permitida",
      fuga: "Permitida",
    },
    items: ["A fuga é permitida, desde que respeite as regras gerais de fuga."],
  },
  {
    id: "fleeca",
    slug: "fleeca",
    category: "acao",
    number: "13.8",
    title: "Ação Fleeca",
    spec: {
      policiaisMin: "4",
      criminososMin: "3",
      criminososMax: "6",
      refensMax: "2",
      cooldown: "1 hora",
      nivel: "Médio",
      negociacao: "Permitida",
    },
    items: ["Exige mais policiais e criminosos do que as ações de nível baixo."],
  },
  {
    id: "acoes-final",
    slug: "disposicoes-acoes",
    category: "acao",
    number: "13.9",
    title: "Disposições sobre as ações",
    items: [
      "Todas as ações deverão seguir rigorosamente os limites de policiais, criminosos, reféns, participantes e cooldown.",
      "A negociação deverá ser realizada somente nas ações em que estiver expressamente indicada como permitida.",
      "Nas ações em que a fuga estiver indicada como permitida, os envolvidos poderão fugir respeitando as demais regras das Leis Gerais.",
      "O descumprimento das regras específicas de uma ação poderá resultar em punição administrativa, conforme a gravidade.",
      "É responsabilidade de todos os participantes conhecer e respeitar as regras da ação antes de iniciá-la.",
    ],
  },
  {
    id: "final",
    slug: "geral",
    category: "geral",
    number: "14",
    title: "Disposições finais",
    items: [
      "O desconhecimento das Leis Gerais da Nova Garoa RP não isenta nenhum jogador da responsabilidade pelo cumprimento das regras.",
      "A Administração poderá analisar situações não previstas neste documento com base no Roleplay, bom senso, fair play e equilíbrio da cidade.",
      "As regras poderão ser atualizadas ou modificadas sempre que necessário pela Administração.",
      "É responsabilidade dos jogadores manter-se informados sobre eventuais alterações no regulamento.",
    ],
  },
];

export function withTodasFilter(filters: RuleFilter[]): RuleFilter[] {
  if (filters.some((f) => f.slug === "todas")) return filters;
  return [{ slug: "todas", label: "Todas", hint: "Regulamento completo" }, ...filters];
}

export function isKnownRuleFilter(slug: string | undefined, filters: RuleFilter[], sections: RuleSection[]) {
  if (!slug || slug === "todas") return true;
  if (filters.some((f) => f.slug === slug)) return true;
  return sections.some((s) => s.slug === slug);
}

export function sectionsForFilter(slug: string | undefined, sections: RuleSection[]) {
  if (!slug || slug === "todas") return sections;
  const byCategory = sections.filter((s) => s.category === slug);
  if (byCategory.length) return byCategory;
  return sections.filter((s) => s.slug === slug);
}

export function actionFiltersFrom(sections: RuleSection[]) {
  return sections
    .filter((s) => s.category === "acao" && s.spec)
    .map((s) => ({
      slug: s.slug,
      label: s.title.replace(/^Ação\s+/i, "").replace(/^Venda de\s+/i, "").replace(/^Fuga do\s+/i, ""),
    }));
}

export const ACTION_FILTERS = actionFiltersFrom(RULE_SECTIONS);
