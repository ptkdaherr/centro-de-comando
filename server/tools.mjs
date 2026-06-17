// =============================================================
// Centro de Comando — ferramentas (function calling) do Gemini
// Cada tool corresponde a criar/editar/excluir uma das 5 entidades.
// O backend NUNCA executa essas ações — só as declara pro modelo
// e, quando o modelo pede uma, monta um resumo em português pro
// usuário confirmar no chat. Quem executa de fato é o frontend
// (aiApplyAction em Centro de Comando.dc.html), reaproveitando a
// mesma lógica de submitDrawer/editX/deleteX já existente.
// =============================================================

const DEMANDA_TYPES = ['video', 'megaphone', 'layers', 'image', 'type'];

function entityTool(action, entity, properties, required) {
  return {
    name: `${action}_${entity}`,
    description: `${action === 'create' ? 'Cria uma nova' : action === 'edit' ? 'Edita uma' : 'Exclui uma'} ${entity} existente no Centro de Comando.`,
    parameters: { type: 'object', properties, required },
  };
}

export const TOOLS = [
  entityTool('create', 'demanda', {
    title: { type: 'string', description: 'Título da demanda' },
    clientId: { type: 'integer', description: 'id de um cliente já existente; omitir para demanda pessoal (sem cliente)' },
    type: { type: 'string', enum: DEMANDA_TYPES, description: 'Tipo de entrega' },
    priority: { type: 'string', enum: ['alta', 'media'], description: 'Prioridade' },
  }, ['title']),
  entityTool('edit', 'demanda', {
    id: { type: 'integer', description: 'id da demanda a editar' },
    title: { type: 'string' },
    clientId: { type: 'integer' },
    type: { type: 'string', enum: DEMANDA_TYPES },
    priority: { type: 'string', enum: ['alta', 'media'] },
  }, ['id']),
  entityTool('delete', 'demanda', {
    id: { type: 'integer', description: 'id da demanda a excluir' },
  }, ['id']),

  entityTool('create', 'cliente', {
    nome: { type: 'string' },
    tipo: { type: 'string', enum: ['fixo', 'freela'] },
    valor: { type: 'number', description: 'valor mensal (fixo) ou do job (freela), em reais' },
    pagDia: { type: 'integer', description: 'dia do mês do pagamento (só faz sentido pra cliente fixo)' },
    servico: { type: 'string', description: 'o que foi contratado' },
  }, ['nome']),
  entityTool('edit', 'cliente', {
    id: { type: 'integer', description: 'id do cliente a editar' },
    nome: { type: 'string' },
    tipo: { type: 'string', enum: ['fixo', 'freela'] },
    valor: { type: 'number' },
    pagDia: { type: 'integer' },
    servico: { type: 'string' },
  }, ['id']),
  entityTool('delete', 'cliente', {
    id: { type: 'integer', description: 'id do cliente a excluir' },
  }, ['id']),

  entityTool('create', 'prospecto', {
    nome: { type: 'string' },
    segmento: { type: 'string', description: 'ramo de atuação do prospecto' },
    obs: { type: 'string' },
  }, ['nome']),
  entityTool('edit', 'prospecto', {
    id: { type: 'integer', description: 'id do prospecto a editar' },
    nome: { type: 'string' },
    segmento: { type: 'string' },
    obs: { type: 'string' },
  }, ['id']),
  entityTool('delete', 'prospecto', {
    id: { type: 'integer', description: 'id do prospecto a excluir' },
  }, ['id']),

  entityTool('create', 'lancamento', {
    desc: { type: 'string', description: 'descrição do lançamento' },
    tipo: { type: 'string', enum: ['receita', 'despesa'] },
    valor: { type: 'number' },
    data: { type: 'string', description: 'data no formato AAAA-MM-DD; omitir para hoje' },
  }, ['desc', 'tipo', 'valor']),
  entityTool('edit', 'lancamento', {
    id: { type: 'integer', description: 'id do lançamento a editar' },
    desc: { type: 'string' },
    tipo: { type: 'string', enum: ['receita', 'despesa'] },
    valor: { type: 'number' },
    data: { type: 'string' },
  }, ['id']),
  entityTool('delete', 'lancamento', {
    id: { type: 'integer', description: 'id do lançamento a excluir' },
  }, ['id']),

  entityTool('create', 'ideia', {
    titulo: { type: 'string' },
    categoria: { type: 'string', enum: ['Pessoal', 'Produto', 'Conteúdo', 'Cliente'] },
    obs: { type: 'string' },
  }, ['titulo']),
  entityTool('edit', 'ideia', {
    id: { type: 'integer', description: 'id da ideia a editar' },
    titulo: { type: 'string' },
    categoria: { type: 'string', enum: ['Pessoal', 'Produto', 'Conteúdo', 'Cliente'] },
    obs: { type: 'string' },
  }, ['id']),
  entityTool('delete', 'ideia', {
    id: { type: 'integer', description: 'id da ideia a excluir' },
  }, ['id']),
];

function findById(list, id) {
  return (list || []).find((x) => x.id === id);
}

export function summarizeAction(tool, args, currentState) {
  const clientName = (id) => {
    const c = findById(currentState.clients, id);
    return c ? c.nome : `cliente #${id}`;
  };

  switch (tool) {
    case 'create_demanda':
      return `Criar demanda "${args.title}"${args.clientId ? ` para ${clientName(args.clientId)}` : ' (pessoal)'}`;
    case 'edit_demanda': {
      const d = findById(currentState.demands, args.id);
      return `Editar demanda "${d ? d.title : '#' + args.id}"${args.title ? ` → título "${args.title}"` : ''}`;
    }
    case 'delete_demanda': {
      const d = findById(currentState.demands, args.id);
      return `Excluir demanda "${d ? d.title : '#' + args.id}"`;
    }
    case 'create_cliente':
      return `Criar cliente "${args.nome}"${args.valor ? ` (R$ ${args.valor})` : ''}`;
    case 'edit_cliente': {
      const c = findById(currentState.clients, args.id);
      return `Editar cliente "${c ? c.nome : '#' + args.id}"${args.nome ? ` → "${args.nome}"` : ''}`;
    }
    case 'delete_cliente':
      return `Excluir cliente "${clientName(args.id)}"`;
    case 'create_prospecto':
      return `Criar prospecto "${args.nome}"`;
    case 'edit_prospecto': {
      const p = findById(currentState.prospectos, args.id);
      return `Editar prospecto "${p ? p.nome : '#' + args.id}"${args.nome ? ` → "${args.nome}"` : ''}`;
    }
    case 'delete_prospecto': {
      const p = findById(currentState.prospectos, args.id);
      return `Excluir prospecto "${p ? p.nome : '#' + args.id}"`;
    }
    case 'create_lancamento':
      return `Criar lançamento "${args.desc}" (${args.tipo}, R$ ${args.valor})`;
    case 'edit_lancamento': {
      const t = findById(currentState.lancamentos, args.id);
      return `Editar lançamento "${t ? t.label : '#' + args.id}"${args.valor !== undefined ? ` → R$ ${args.valor}` : ''}`;
    }
    case 'delete_lancamento': {
      const t = findById(currentState.lancamentos, args.id);
      return `Excluir lançamento "${t ? t.label : '#' + args.id}"`;
    }
    case 'create_ideia':
      return `Criar ideia "${args.titulo}"`;
    case 'edit_ideia': {
      const i = findById(currentState.ideias, args.id);
      return `Editar ideia "${i ? i.title : '#' + args.id}"${args.titulo ? ` → "${args.titulo}"` : ''}`;
    }
    case 'delete_ideia': {
      const i = findById(currentState.ideias, args.id);
      return `Excluir ideia "${i ? i.title : '#' + args.id}"`;
    }
    default:
      return `Executar ${tool}`;
  }
}
