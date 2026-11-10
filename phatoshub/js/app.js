// ==========================================================
// PhatosHub – Painel de demonstração
// CRM · Gestão · Financeiro de comissões · Assistente IA
// Tudo roda no navegador; os dados ficam no localStorage.
// ==========================================================
(function () {
  'use strict';

  const STORAGE_KEY = 'phatoshub_demo_v1';

  const ETAPAS = [
    { id: 'novo', nome: 'Novo lead' },
    { id: 'qualificado', nome: 'Qualificado' },
    { id: 'cotacao', nome: 'Cotação' },
    { id: 'proposta', nome: 'Proposta enviada' },
    { id: 'implantado', nome: 'Implantado' },
    { id: 'perdido', nome: 'Perdido' },
  ];

  // Fator de preço ilustrativo por operadora (usado nas sugestões de plano da IA)
  const OPERADORAS = {
    'Amil': { fator: 1.0, rede: 'Nacional', cor: '#2f6fed' },
    'Bradesco Saúde': { fator: 1.18, rede: 'Nacional premium', cor: '#d64545' },
    'SulAmérica': { fator: 1.12, rede: 'Nacional', cor: '#c77700' },
    'Unimed': { fator: 0.95, rede: 'Regional/Nacional', cor: '#11a36c' },
    'Hapvida': { fator: 0.72, rede: 'Rede própria', cor: '#6d5dfc' },
    'Porto Saúde': { fator: 1.05, rede: 'Nacional', cor: '#0e7c86' },
  };

  // ---------- Utilitários ----------
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const brl = (v) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const num = (v) => (v || 0).toLocaleString('pt-BR');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const uid = () => Math.random().toString(36).slice(2, 10);

  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const addMonths = (key, n) => {
    const [y, m] = key.split('-').map(Number);
    return monthKey(new Date(y, m - 1 + n, 1));
  };
  const monthDiff = (a, b) => {
    const [ya, ma] = a.split('-').map(Number);
    const [yb, mb] = b.split('-').map(Number);
    return (yb - ya) * 12 + (mb - ma);
  };
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const monthLabel = (key, long) => {
    const [y, m] = key.split('-').map(Number);
    return long ? `${MESES[m - 1]}/${y}` : MESES[m - 1];
  };
  const CUR = monthKey(new Date());
  const daysAgo = (iso) => Math.floor((Date.now() - new Date(iso).getTime()) / 864e5);

  // RNG determinístico para dados de exemplo
  function rng(seed) {
    return () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }

  // ---------- Dados de exemplo ----------
  function seed() {
    const r = rng(42);
    const pick = (arr) => arr[Math.floor(r() * arr.length)];

    const corretores = [
      { id: 'c1', nome: 'Ana Ribeiro', repasse: 60, metaVidas: 40 },
      { id: 'c2', nome: 'Bruno Carvalho', repasse: 55, metaVidas: 35 },
      { id: 'c3', nome: 'Carla Mendes', repasse: 60, metaVidas: 30 },
      { id: 'c4', nome: 'Diego Santos', repasse: 50, metaVidas: 25 },
      { id: 'c5', nome: 'Elisa Prado', repasse: 50, metaVidas: 20 },
    ];

    const grade = {
      'Amil': { agenc: 200, parcelas: 3, vital: 2, estorno: 3 },
      'Bradesco Saúde': { agenc: 250, parcelas: 3, vital: 2, estorno: 6 },
      'SulAmérica': { agenc: 200, parcelas: 2, vital: 2.5, estorno: 3 },
      'Unimed': { agenc: 150, parcelas: 3, vital: 3, estorno: 3 },
      'Hapvida': { agenc: 100, parcelas: 1, vital: 2, estorno: 2 },
      'Porto Saúde': { agenc: 200, parcelas: 3, vital: 2, estorno: 3 },
    };

    const empresas = ['Construtora Alfa', 'Clínica Sorriso', 'Padaria Estrela', 'TechNova Sistemas', 'Escritório Lima Advogados', 'Mercado Bom Preço', 'Studio Fit Academia', 'Auto Peças Rocha', 'Colégio Horizonte', 'Agência Pixel', 'Transportadora Via Sul', 'Restaurante Sabor', 'Contabilidade Exata', 'Farmácia Vida', 'Loja Moda Bela', 'Grupo Atlas Logística'];
    const pessoas = ['Mariana Costa', 'Rafael Oliveira', 'Juliana Alves', 'Pedro Henrique', 'Fernanda Rocha', 'Lucas Martins', 'Patrícia Gomes', 'Thiago Souza', 'Camila Ferreira', 'Gustavo Lima', 'Beatriz Nunes', 'Rodrigo Teixeira', 'Larissa Moura', 'Felipe Araújo'];
    const cidades = ['São Paulo', 'Campinas', 'Santo André', 'Guarulhos', 'Osasco', 'Rio de Janeiro', 'Belo Horizonte'];
    const origens = ['WhatsApp', 'Instagram', 'Site', 'Indicação', 'Google'];
    const ops = Object.keys(grade);

    const mkLead = (i, etapa) => {
      const pme = r() < 0.5;
      const tipo = pme ? pick(['PME', 'PME', 'Empresarial']) : pick(['PF', 'PF', 'Adesão']);
      const vidas = pme ? 3 + Math.floor(r() * (tipo === 'Empresarial' ? 80 : 30)) : 1 + Math.floor(r() * 4);
      const porVida = 350 + Math.floor(r() * 500);
      const criado = new Date(Date.now() - Math.floor(r() * 40) * 864e5);
      return {
        id: 'l' + i,
        nome: pme ? empresas[i % empresas.length] : pessoas[i % pessoas.length],
        telefone: `(11) 9${Math.floor(1000 + r() * 8999)}-${Math.floor(1000 + r() * 8999)}`,
        tipo,
        vidas,
        valor: Math.round((vidas * porVida) / 10) * 10,
        origem: pick(origens),
        cidade: pick(cidades),
        corretor: pick(corretores).id,
        operadora: pick(ops),
        etapa,
        criadoEm: criado.toISOString(),
        ultimoContato: new Date(criado.getTime() + Math.floor(r() * Math.max(1, daysAgo(criado.toISOString()))) * 864e5).toISOString(),
      };
    };

    const dist = ['novo', 'novo', 'novo', 'novo', 'qualificado', 'qualificado', 'qualificado', 'cotacao', 'cotacao', 'cotacao', 'proposta', 'proposta', 'proposta', 'implantado', 'implantado', 'perdido', 'perdido', 'novo', 'cotacao', 'qualificado'];
    const leads = dist.map((e, i) => mkLead(i, e));

    // Contratos: carteira dos últimos 24 meses
    const contratos = [];
    for (let i = 0; i < 46; i++) {
      const pme = r() < 0.55;
      const tipo = pme ? pick(['PME', 'PME', 'Empresarial']) : pick(['PF', 'Adesão']);
      const vidas = pme ? 3 + Math.floor(r() * 40) : 1 + Math.floor(r() * 4);
      const inicio = addMonths(CUR, -Math.floor(Math.pow(r(), 1.6) * 24));
      const c = {
        id: 'k' + i,
        cliente: pme ? `${pick(empresas)} ${i}` : pick(pessoas),
        tipo,
        operadora: pick(ops),
        vidas,
        mensalidade: Math.round((vidas * (380 + r() * 480)) / 10) * 10,
        inicio,
        corretor: pick(corretores).id,
        status: 'ativo',
      };
      if (r() < 0.12 && monthDiff(inicio, CUR) > 1) {
        c.status = 'cancelado';
        c.cancelEm = addMonths(inicio, 1 + Math.floor(r() * Math.min(monthDiff(inicio, CUR), 8)));
      }
      contratos.push(c);
    }
    // Contratos dos leads já implantados
    leads.filter((l) => l.etapa === 'implantado').forEach((l) => contratos.push(contractFromLead(l)));

    // Competências anteriores já pagas
    const pagamentos = {};
    for (let m = 1; m <= 5; m++) corretores.forEach((c) => (pagamentos[`${addMonths(CUR, -m)}|${c.id}`] = new Date().toISOString()));

    return { corretores, grade, leads, contratos, pagamentos };
  }

  function contractFromLead(l) {
    return {
      id: 'k-' + l.id,
      leadId: l.id,
      cliente: l.nome,
      tipo: l.tipo,
      operadora: l.operadora || 'Amil',
      vidas: Number(l.vidas),
      mensalidade: Number(l.valor),
      inicio: CUR,
      corretor: l.corretor,
      status: 'ativo',
    };
  }

  // ---------- Estado ----------
  let state;
  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      state = raw ? JSON.parse(raw) : seed();
    } catch (_) {
      state = seed();
    }
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* sem armazenamento */ }
  }
  const corretor = (id) => state.corretores.find((c) => c.id === id) || { nome: '—', repasse: 0 };
  const iniciais = (nome) => nome.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  // ---------- Regras de negócio ----------

  // Lead scoring (0–100): chance estimada de fechamento
  function score(l) {
    let s = 20;
    s += { PF: 0, 'Adesão': 4, PME: 12, Empresarial: 15 }[l.tipo] || 0;
    s += Math.min(18, Math.log2(Number(l.vidas) + 1) * 4);
    s += { novo: 0, qualificado: 10, cotacao: 18, proposta: 28, implantado: 40, perdido: -40 }[l.etapa] || 0;
    s += { 'Indicação': 14, WhatsApp: 8, Site: 6, Google: 5, Instagram: 3 }[l.origem] || 0;
    const parado = daysAgo(l.ultimoContato || l.criadoEm);
    s -= Math.min(20, Math.max(0, parado - 2) * 2);
    return Math.max(1, Math.min(99, Math.round(s)));
  }
  const scoreClass = (s) => (s >= 65 ? 'hot' : s >= 40 ? 'warm' : 'cold');
  const scoreLabel = (s) => (s >= 65 ? 'Quente' : s >= 40 ? 'Morno' : 'Frio');

  // Lançamentos de comissão de uma competência
  function lancamentos(comp) {
    const out = [];
    state.contratos.forEach((c) => {
      const g = state.grade[c.operadora];
      if (!g) return;
      const idx = monthDiff(c.inicio, comp);
      if (idx < 0) return;
      const parcela = (c.mensalidade * g.agenc) / 100 / g.parcelas;

      if (c.status === 'cancelado' && c.cancelEm) {
        const cIdx = monthDiff(c.inicio, c.cancelEm);
        if (idx > cIdx) return;
        if (idx === cIdx) {
          if (cIdx < g.estorno) {
            const pagas = Math.min(cIdx, g.parcelas);
            if (pagas > 0) out.push({ c, tipo: `Estorno (cancelado no ${cIdx + 1}º mês)`, valor: -parcela * pagas, estorno: true });
          }
          return;
        }
      }
      if (idx < g.parcelas) out.push({ c, tipo: `Agenciamento ${idx + 1}/${g.parcelas}`, valor: parcela });
      else out.push({ c, tipo: 'Vitalício', valor: (c.mensalidade * g.vital) / 100 });
    });
    out.forEach((l) => (l.repasse = (l.valor * corretor(l.c.corretor).repasse) / 100));
    return out;
  }

  function resumoComp(comp) {
    const ls = lancamentos(comp);
    const bruto = ls.reduce((a, l) => a + l.valor, 0);
    const repasse = ls.reduce((a, l) => a + l.repasse, 0);
    return { ls, bruto, repasse, margem: bruto - repasse };
  }

  const ativos = () => state.contratos.filter((c) => c.status === 'ativo');
  const vidasNoMes = (comp, cid) => state.contratos.filter((c) => c.inicio === comp && (!cid || c.corretor === cid)).reduce((a, c) => a + c.vidas, 0);

  // Sugestão de planos (estimativa ilustrativa)
  function sugerirPlanos(vidas, tipo, cidade) {
    const base = tipo === 'PF' || tipo === 'Adesão' ? 620 : 470; // valor médio por vida
    const reg = /rio|belo/.test(norm(cidade)) ? 0.95 : 1;
    return Object.entries(OPERADORAS)
      .map(([nome, o]) => ({ nome, rede: o.rede, valor: Math.round((base * o.fator * reg * vidas) / 10) * 10 }))
      .sort((a, b) => a.valor - b.valor);
  }

  function proximaAcao(l) {
    const parado = daysAgo(l.ultimoContato || l.criadoEm);
    switch (l.etapa) {
      case 'novo': return parado > 0 ? `Lead sem retorno há ${parado} dia(s). Envie uma mensagem de boas-vindas e pergunte idade dos beneficiários e cidade.` : 'Faça o primeiro contato ainda hoje: leads respondidos em até 5 minutos convertem muito mais.';
      case 'qualificado': return `Monte a cotação multioperadora para ${l.vidas} vida(s). Para ${l.tipo}, compare pelo menos 3 operadoras.`;
      case 'cotacao': return 'Envie o comparativo com o plano recomendado em destaque e agende uma ligação para tirar dúvidas.';
      case 'proposta': return parado > 3 ? `Proposta parada há ${parado} dias. Faça follow-up e confira se faltam documentos ou declaração de saúde.` : 'Confirme o recebimento da proposta e a lista de documentos pendentes.';
      case 'implantado': return 'Cliente ativo. Agende o contato de pós-venda em 30 dias e registre o aniversário do contrato.';
      default: return 'Lead perdido. Programe uma nova tentativa em 90 dias ou antes do próximo reajuste do plano atual.';
    }
  }

  // ---------- Navegação ----------
  const TITLES = { dashboard: 'Dashboard', funil: 'Funil de vendas', clientes: 'Clientes e contratos', equipe: 'Equipe e metas', financeiro: 'Financeiro e comissões', ia: 'Assistente IA' };
  let currentView = 'dashboard';

  function go(view) {
    currentView = view;
    $$('.menu__item').forEach((b) => b.classList.toggle('is-active', b.dataset.view === view));
    $$('.view').forEach((v) => v.classList.toggle('is-active', v.id === 'view-' + view));
    $('#viewTitle').textContent = TITLES[view];
    $('#sidebar').classList.remove('is-open');
    render();
  }

  function render() {
    ({ dashboard: renderDashboard, funil: renderKanban, clientes: renderClientes, equipe: renderEquipe, financeiro: renderFinanceiro, ia: renderIASide })[currentView]();
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const abertos = state.leads.filter((l) => !['implantado', 'perdido'].includes(l.etapa));
    const ganhos = state.leads.filter((l) => l.etapa === 'implantado').length;
    const perdidos = state.leads.filter((l) => l.etapa === 'perdido').length;
    const conv = ganhos + perdidos ? (ganhos / (ganhos + perdidos)) * 100 : 0;
    const vidasMes = vidasNoMes(CUR);
    const vidasAnt = vidasNoMes(addMonths(CUR, -1));
    const delta = vidasAnt ? Math.round(((vidasMes - vidasAnt) / vidasAnt) * 100) : 0;
    const carteira = ativos().reduce((a, c) => a + c.mensalidade, 0);
    const fin = resumoComp(CUR);

    $('#kpis').innerHTML = [
      kpi('Leads em aberto', num(abertos.length), `${abertos.filter((l) => score(l) >= 65).length} quentes`),
      kpi('Vidas implantadas no mês', num(vidasMes), `${delta >= 0 ? '+' : ''}${delta}% vs mês anterior`, delta >= 0 ? 'up' : 'down'),
      kpi('Taxa de conversão', conv.toFixed(1).replace('.', ',') + '%', `${ganhos} ganhos · ${perdidos} perdidos`),
      kpi('Comissão a receber no mês', brl(fin.bruto), `carteira ativa: ${brl(carteira)}/mês`),
    ].join('');

    // Colunas: vidas por mês (série única)
    const meses = Array.from({ length: 6 }, (_, i) => addMonths(CUR, i - 5));
    const vals = meses.map((m) => vidasNoMes(m));
    const max = Math.max(...vals, 1);
    $('#chartVidas').innerHTML = meses.map((m, i) => `
      <div class="chart__col" tabindex="0" aria-label="${monthLabel(m, true)}: ${vals[i]} vidas">
        <span class="tip">${monthLabel(m, true)} · ${vals[i]} vidas</span>
        <span class="chart__val">${vals[i]}</span>
        <div class="chart__bar" style="height:${(vals[i] / max) * 78}%"></div>
        <span class="chart__lbl">${monthLabel(m)}</span>
      </div>`).join('');
    $('#chartVidas').parentElement.classList.add('chart-wrap');

    // Funil
    const counts = ETAPAS.map((e) => state.leads.filter((l) => l.etapa === e.id).length);
    const fmax = Math.max(...counts, 1);
    $('#funnelChart').innerHTML = ETAPAS.map((e, i) => `
      <div class="hbar" title="${e.nome}: ${counts[i]} leads">
        <span>${e.nome}</span>
        <div class="hbar__track"><div class="hbar__fill" style="width:${(counts[i] / fmax) * 100}%"></div></div>
        <b>${counts[i]}</b>
      </div>`).join('');

    // Ranking
    const rank = state.corretores
      .map((c) => ({ c, vidas: vidasNoMes(CUR, c.id), leads: state.leads.filter((l) => l.corretor === c.id && !['implantado', 'perdido'].includes(l.etapa)).length }))
      .sort((a, b) => b.vidas - a.vidas || b.leads - a.leads);
    $('#ranking').innerHTML = rank.map((r, i) => `
      <li><span class="pos">${i + 1}º</span><span class="avatar">${iniciais(r.c.nome)}</span>
      <span class="name"><b>${esc(r.c.nome)}</b><small>${r.leads} lead(s) em aberto</small></span>
      <span class="value">${r.vidas} vidas</span></li>`).join('');

    $('#insights').innerHTML = gerarInsights().map((t) => `<li><span>${t}</span></li>`).join('');
  }

  const kpi = (label, value, foot, cls = '') => `<div class="kpi"><small>${label}</small><b>${value}</b><em class="${cls}">${foot}</em></div>`;

  function gerarInsights() {
    const out = [];
    const quentesParados = state.leads.filter((l) => !['implantado', 'perdido'].includes(l.etapa) && score(l) >= 55 && daysAgo(l.ultimoContato) >= 2);
    if (quentesParados.length) out.push(`<b>${quentesParados.length} leads com boa chance</b> estão sem contato há 2 dias ou mais. Comece por <b>${esc(quentesParados[0].nome)}</b>.`);
    const propostas = state.leads.filter((l) => l.etapa === 'proposta');
    if (propostas.length) out.push(`<b>${propostas.length} propostas</b> aguardando retorno, somando ${brl(propostas.reduce((a, l) => a + Number(l.valor), 0))}/mês em potencial.`);
    const aniv = aniversarios(2);
    if (aniv.length) out.push(`<b>${aniv.length} contratos</b> fazem aniversário nos próximos 2 meses. Prepare a comunicação do reajuste para evitar cancelamentos.`);
    const origem = {};
    state.contratos.filter((c) => c.leadId).forEach((c) => {
      const l = state.leads.find((x) => x.id === c.leadId);
      if (l) origem[l.origem] = (origem[l.origem] || 0) + c.vidas;
    });
    const top = Object.entries(origem).sort((a, b) => b[1] - a[1])[0];
    if (top) out.push(`O canal <b>${esc(top[0])}</b> é o que mais trouxe vidas implantadas pelo funil. Vale reforçar o investimento nele.`);
    const est = lancamentos(CUR).filter((l) => l.estorno);
    if (est.length) out.push(`Atenção: <b>${est.length} estorno(s)</b> de comissão nesta competência por cancelamento precoce.`);
    return out.length ? out : ['Tudo em dia por aqui. Continue alimentando o funil!'];
  }

  function aniversarios(janela) {
    return ativos().filter((c) => {
      const idade = monthDiff(c.inicio, CUR);
      if (idade < 10) return false;
      const proximo = 12 - (idade % 12);
      return proximo <= janela && proximo > 0;
    });
  }

  // ---------- Kanban ----------
  function fillCorretorSelect(sel, withAll) {
    sel.innerHTML = (withAll ? '<option value="">Todos os corretores</option>' : '') +
      state.corretores.map((c) => `<option value="${c.id}">${esc(c.nome)}</option>`).join('');
  }

  function renderKanban() {
    const fc = $('#filterCorretor').value;
    const ft = $('#filterTipo').value;
    const q = norm($('#globalSearch').value);
    const leads = state.leads.filter((l) => (!fc || l.corretor === fc) && (!ft || l.tipo === ft) && (!q || norm(l.nome).includes(q)));

    $('#kanban').innerHTML = ETAPAS.map((e) => {
      const items = leads.filter((l) => l.etapa === e.id).sort((a, b) => score(b) - score(a));
      const total = items.reduce((a, l) => a + Number(l.valor), 0);
      return `<div class="kcol" data-etapa="${e.id}">
        <div class="kcol__head"><span>${e.nome} <span class="kcol__count">${items.length}</span></span><small>${brl(total)}</small></div>
        ${items.map(cardHTML).join('')}
      </div>`;
    }).join('');

    $$('.lcard').forEach((card) => {
      card.addEventListener('dragstart', (ev) => {
        ev.dataTransfer.setData('text/plain', card.dataset.id);
        card.classList.add('is-dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('is-dragging'));
      card.addEventListener('click', () => openLead(card.dataset.id));
      card.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') openLead(card.dataset.id); });
    });
    $$('.kcol').forEach((col) => {
      col.addEventListener('dragover', (ev) => { ev.preventDefault(); col.classList.add('is-over'); });
      col.addEventListener('dragleave', () => col.classList.remove('is-over'));
      col.addEventListener('drop', (ev) => {
        ev.preventDefault();
        col.classList.remove('is-over');
        moveLead(ev.dataTransfer.getData('text/plain'), col.dataset.etapa);
      });
    });
  }

  function cardHTML(l) {
    const s = score(l);
    const cor = OPERADORAS[l.operadora]?.cor || 'var(--primary)';
    return `<article class="lcard" draggable="true" tabindex="0" data-id="${l.id}" style="border-left-color:${cor}">
      <h4>${esc(l.nome)}</h4>
      <div class="lcard__meta"><span class="tag">${esc(l.tipo)}</span><span>${l.vidas} vida(s)</span><span>${brl(Number(l.valor))}/mês</span></div>
      <div class="lcard__meta"><span>${esc(l.origem)}</span><span>${esc(l.operadora || '')}</span></div>
      <div class="lcard__foot"><span class="avatar" style="width:24px;height:24px;font-size:10px" title="${esc(corretor(l.corretor).nome)}">${iniciais(corretor(l.corretor).nome)}</span>
      <span class="score score--${scoreClass(s)}" title="Lead scoring da IA">${scoreLabel(s)} · ${s}</span></div>
    </article>`;
  }

  function moveLead(id, etapa) {
    const l = state.leads.find((x) => x.id === id);
    if (!l || l.etapa === etapa) return;
    const antes = l.etapa;
    l.etapa = etapa;
    l.ultimoContato = new Date().toISOString();
    if (etapa === 'implantado' && !state.contratos.some((c) => c.leadId === l.id)) {
      state.contratos.push(contractFromLead(l));
      toast(`🎉 ${l.nome} implantado! Contrato criado e comissões programadas.`);
    } else if (antes === 'implantado') {
      state.contratos = state.contratos.filter((c) => c.leadId !== l.id);
      toast(`${l.nome} voltou para "${ETAPAS.find((e) => e.id === etapa).nome}". Contrato removido.`);
    } else {
      toast(`${l.nome} movido para "${ETAPAS.find((e) => e.id === etapa).nome}".`);
    }
    save();
    render();
  }

  function openLead(id) {
    const l = state.leads.find((x) => x.id === id);
    if (!l) return;
    const s = score(l);
    const planos = sugerirPlanos(Number(l.vidas), l.tipo, l.cidade).slice(0, 3);
    const idx = ETAPAS.findIndex((e) => e.id === l.etapa);
    const prox = ETAPAS[idx + 1] && ETAPAS[idx + 1].id !== 'perdido' ? ETAPAS[idx + 1] : null;
    const fone = l.telefone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Olá, ${l.nome.split(' ')[0]}! Aqui é ${corretor(l.corretor).nome.split(' ')[0]}. Preparei uma cotação de plano de saúde para você. Podemos conversar?`);

    $('#detailBody').innerHTML = `
      <h2>${esc(l.nome)}</h2>
      <div class="detail-grid">
        <div><small>Etapa</small><b>${ETAPAS[idx].nome}</b></div>
        <div><small>Lead scoring</small><span class="score score--${scoreClass(s)}">${scoreLabel(s)} · ${s}/100</span></div>
        <div><small>Tipo / vidas</small><b>${esc(l.tipo)} · ${l.vidas} vida(s)</b></div>
        <div><small>Mensalidade estimada</small><b>${brl(Number(l.valor))}</b></div>
        <div><small>Telefone</small><b>${esc(l.telefone)}</b></div>
        <div><small>Cidade / origem</small><b>${esc(l.cidade)} · ${esc(l.origem)}</b></div>
        <div><small>Corretor</small><b>${esc(corretor(l.corretor).nome)}</b></div>
        <div><small>Operadora</small>
          <select id="detOperadora">${Object.keys(state.grade).map((o) => `<option ${o === l.operadora ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>
        </div>
      </div>
      <div class="ai-box">
        <h3>✦ Próxima ação sugerida pela IA</h3>
        <p>${proximaAcao(l)}</p>
        <p style="margin-top:8px"><b>Planos mais em conta para o perfil (estimativa):</b> ${planos.map((p) => `${esc(p.nome)} ${brl(p.valor)}`).join(' · ')}</p>
      </div>
      <div class="modal__actions">
        <button class="btn btn--ghost" data-act="excluir" style="margin-right:auto;color:var(--bad)">Excluir</button>
        <a class="btn btn--ghost" href="https://wa.me/55${fone}?text=${msg}" target="_blank" rel="noopener">WhatsApp</a>
        ${l.etapa !== 'perdido' && l.etapa !== 'implantado' ? '<button class="btn btn--ghost" data-act="perdido">Marcar perdido</button>' : ''}
        ${prox ? `<button class="btn btn--primary" data-act="avancar">Avançar para ${prox.nome}</button>` : ''}
        <button class="btn btn--ghost" data-act="fechar">Fechar</button>
      </div>`;

    const dlg = $('#detailModal');
    $('#detOperadora').addEventListener('change', (ev) => {
      l.operadora = ev.target.value;
      const k = state.contratos.find((c) => c.leadId === l.id);
      if (k) k.operadora = l.operadora;
      save();
      render();
    });
    $$('[data-act]', dlg).forEach((b) => b.addEventListener('click', () => {
      const act = b.dataset.act;
      dlg.close();
      if (act === 'avancar') moveLead(l.id, prox.id);
      if (act === 'perdido') moveLead(l.id, 'perdido');
      if (act === 'excluir' && confirm(`Excluir o lead ${l.nome}?`)) {
        state.leads = state.leads.filter((x) => x.id !== l.id);
        state.contratos = state.contratos.filter((c) => c.leadId !== l.id);
        save();
        render();
        toast('Lead excluído.');
      }
    }));
    dlg.showModal();
  }

  // ---------- Clientes ----------
  function renderClientes() {
    const fs = $('#filterStatus').value;
    const fo = $('#filterOperadora').value;
    const q = norm($('#globalSearch').value);
    const rows = state.contratos
      .filter((c) => (!fs || c.status === fs) && (!fo || c.operadora === fo) && (!q || norm(c.cliente).includes(q)))
      .sort((a, b) => b.inicio.localeCompare(a.inicio));
    const anivIds = new Set(aniversarios(2).map((c) => c.id));

    $('#contratosTable tbody').innerHTML = rows.map((c) => `
      <tr>
        <td><b>${esc(c.cliente)}</b>${anivIds.has(c.id) ? ' <span class="status status--pend" title="Aniversário do contrato nos próximos 2 meses">⚠ reajuste</span>' : ''}</td>
        <td>${esc(c.tipo)}</td>
        <td>${esc(c.operadora)}</td>
        <td class="num">${c.vidas}</td>
        <td class="num">${brl(c.mensalidade)}</td>
        <td>${monthLabel(c.inicio, true)}</td>
        <td>${esc(corretor(c.corretor).nome)}</td>
        <td>${c.status === 'ativo' ? '<span class="status status--ok">● Ativo</span>' : `<span class="status status--bad">✕ Cancelado ${monthLabel(c.cancelEm, true)}</span>`}</td>
        <td>${c.status === 'ativo' ? `<button class="btn btn--ghost btn--sm" data-cancel="${c.id}">Cancelar</button>` : ''}</td>
      </tr>`).join('') || '<tr><td colspan="9">Nenhum contrato encontrado.</td></tr>';

    $$('[data-cancel]').forEach((b) => b.addEventListener('click', () => {
      const c = state.contratos.find((x) => x.id === b.dataset.cancel);
      if (!confirm(`Registrar o cancelamento do contrato de ${c.cliente}? Se estiver dentro do prazo de estorno da operadora, a comissão será estornada automaticamente.`)) return;
      c.status = 'cancelado';
      c.cancelEm = CUR;
      save();
      renderClientes();
      const est = lancamentos(CUR).find((l) => l.c.id === c.id && l.estorno);
      toast(est ? `Contrato cancelado. Estorno de ${brl(-est.valor)} lançado no financeiro.` : 'Contrato cancelado. Fora do prazo de estorno.');
    }));
  }

  // ---------- Equipe ----------
  function renderEquipe() {
    $('#team').innerHTML = state.corretores.map((c) => {
      const vidas = vidasNoMes(CUR, c.id);
      const pct = Math.min(100, Math.round((vidas / c.metaVidas) * 100));
      const abertos = state.leads.filter((l) => l.corretor === c.id && !['implantado', 'perdido'].includes(l.etapa)).length;
      const carteira = ativos().filter((k) => k.corretor === c.id).reduce((a, k) => a + k.vidas, 0);
      const comissao = lancamentos(CUR).filter((l) => l.c.corretor === c.id).reduce((a, l) => a + l.repasse, 0);
      return `<div class="member">
        <div class="member__top"><span class="avatar">${iniciais(c.nome)}</span><div><b>${esc(c.nome)}</b><small>Corretor(a) · repasse ${c.repasse}%</small></div></div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px"><span>Meta do mês: ${vidas}/${c.metaVidas} vidas</span><b>${pct}%</b></div>
          <div class="progress ${pct >= 100 ? 'progress--done' : ''}"><div style="width:${pct}%"></div></div>
        </div>
        <div class="member__nums">
          <div><b>${abertos}</b><small>leads abertos</small></div>
          <div><b>${carteira}</b><small>vidas na carteira</small></div>
          <div><b>${brl(comissao).replace(',00', '')}</b><small>comissão no mês</small></div>
        </div>
        <label>Meta de vidas <input type="number" min="1" value="${c.metaVidas}" data-meta="${c.id}"></label>
        <label>Repasse (%) <input type="number" min="0" max="100" value="${c.repasse}" data-repasse="${c.id}"></label>
      </div>`;
    }).join('');

    $$('[data-meta]').forEach((i) => i.addEventListener('change', () => {
      corretor(i.dataset.meta).metaVidas = Math.max(1, Number(i.value) || 1);
      save(); renderEquipe();
    }));
    $$('[data-repasse]').forEach((i) => i.addEventListener('change', () => {
      corretor(i.dataset.repasse).repasse = Math.min(100, Math.max(0, Number(i.value) || 0));
      save(); renderEquipe();
    }));
  }

  // ---------- Financeiro ----------
  function renderFinanceiro() {
    const comp = $('#competencia').value || CUR;
    const fin = resumoComp(comp);
    const estornos = fin.ls.filter((l) => l.estorno).reduce((a, l) => a + l.valor, 0);
    const pagos = state.corretores.filter((c) => state.pagamentos[`${comp}|${c.id}`]).length;

    $('#finKpis').innerHTML = [
      kpi('Recebido das operadoras', brl(fin.bruto), `${fin.ls.length} lançamentos`),
      kpi('Repasse aos corretores', brl(fin.repasse), `${pagos}/${state.corretores.length} corretores pagos`),
      kpi('Margem da corretora', brl(fin.margem), fin.bruto ? `${((fin.margem / fin.bruto) * 100).toFixed(1).replace('.', ',')}% do recebido` : '—'),
      kpi('Estornos', brl(estornos), estornos < 0 ? 'cancelamentos no prazo de estorno' : 'nenhum estorno', estornos < 0 ? 'down' : ''),
    ].join('');

    $('#repasseTable tbody').innerHTML = state.corretores.map((c) => {
      const ls = fin.ls.filter((l) => l.c.corretor === c.id);
      const bruto = ls.filter((l) => !l.estorno).reduce((a, l) => a + l.repasse, 0);
      const est = ls.filter((l) => l.estorno).reduce((a, l) => a + l.repasse, 0);
      const total = bruto + est;
      const pago = state.pagamentos[`${comp}|${c.id}`];
      return `<tr>
        <td><b>${esc(c.nome)}</b></td>
        <td>${c.repasse}%</td>
        <td class="num">${ls.length}</td>
        <td class="num">${brl(bruto)}</td>
        <td class="num ${est < 0 ? 'neg' : ''}">${brl(est)}</td>
        <td class="num"><b>${brl(total)}</b></td>
        <td>${pago ? `<span class="status status--ok">✓ Pago ${new Date(pago).toLocaleDateString('pt-BR')}</span>` : '<span class="status status--pend">● Pendente</span>'}</td>
        <td>${pago ? `<button class="btn btn--ghost btn--sm" data-unpay="${c.id}">Desfazer</button>` : `<button class="btn btn--primary btn--sm" data-pay="${c.id}" ${total <= 0 ? 'disabled' : ''}>Pagar</button>`}</td>
      </tr>`;
    }).join('');

    $$('[data-pay]').forEach((b) => b.addEventListener('click', () => {
      state.pagamentos[`${comp}|${b.dataset.pay}`] = new Date().toISOString();
      save(); renderFinanceiro();
      toast(`Repasse de ${corretor(b.dataset.pay).nome} registrado como pago.`);
    }));
    $$('[data-unpay]').forEach((b) => b.addEventListener('click', () => {
      delete state.pagamentos[`${comp}|${b.dataset.unpay}`];
      save(); renderFinanceiro();
    }));

    $('#lancTable tbody').innerHTML = fin.ls
      .sort((a, b) => b.valor - a.valor)
      .map((l) => `<tr>
        <td>${esc(l.c.cliente)}</td>
        <td>${esc(l.c.operadora)}</td>
        <td>${l.estorno ? `<span class="status status--bad">${l.tipo}</span>` : esc(l.tipo)}</td>
        <td class="num ${l.valor < 0 ? 'neg' : ''}">${brl(l.valor)}</td>
        <td>${esc(corretor(l.c.corretor).nome)}</td>
        <td class="num ${l.repasse < 0 ? 'neg' : ''}">${brl(l.repasse)}</td>
      </tr>`).join('') || '<tr><td colspan="6">Sem lançamentos nesta competência.</td></tr>';

    $('#gradeTable tbody').innerHTML = Object.entries(state.grade).map(([op, g]) => `
      <tr>
        <td><b>${esc(op)}</b></td>
        <td><input type="number" min="0" step="10" value="${g.agenc}" data-g="${esc(op)}" data-k="agenc"> %</td>
        <td><input type="number" min="1" step="1" value="${g.parcelas}" data-g="${esc(op)}" data-k="parcelas"></td>
        <td><input type="number" min="0" step="0.5" value="${g.vital}" data-g="${esc(op)}" data-k="vital"> %</td>
        <td><input type="number" min="0" step="1" value="${g.estorno}" data-g="${esc(op)}" data-k="estorno"></td>
      </tr>`).join('');
    $$('[data-g]').forEach((i) => i.addEventListener('change', () => {
      const v = Math.max(i.dataset.k === 'parcelas' ? 1 : 0, Number(i.value) || 0);
      state.grade[i.dataset.g][i.dataset.k] = v;
      save(); renderFinanceiro();
      toast('Grade atualizada. Comissões recalculadas.');
    }));
  }

  function fillCompetencias() {
    const sel = $('#competencia');
    sel.innerHTML = Array.from({ length: 12 }, (_, i) => addMonths(CUR, -i))
      .map((m) => `<option value="${m}">${monthLabel(m, true)}${m === CUR ? ' (atual)' : ''}</option>`).join('');
  }

  function exportCsv() {
    const comp = $('#competencia').value || CUR;
    const linhas = [['Competência', 'Contrato', 'Operadora', 'Tipo', 'Recebido', 'Corretor', 'Repasse']];
    lancamentos(comp).forEach((l) => linhas.push([comp, l.c.cliente, l.c.operadora, l.tipo, l.valor.toFixed(2), corretor(l.c.corretor).nome, l.repasse.toFixed(2)]));
    const csv = linhas.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `comissoes-${comp}.csv` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ---------- Assistente IA (simulada, baseada em regras) ----------
  function renderIASide() {
    const lista = state.leads.filter((l) => !['implantado', 'perdido'].includes(l.etapa))
      .map((l) => ({ l, s: score(l) })).sort((a, b) => b.s - a.s).slice(0, 8);
    $('#scoreList').innerHTML = lista.map(({ l, s }) => `
      <li data-lead="${l.id}"><span><b>${esc(l.nome)}</b><br><small style="color:var(--muted)">${esc(l.tipo)} · ${l.vidas} vida(s) · ${ETAPAS.find((e) => e.id === l.etapa).nome}</small></span>
      <span class="score score--${scoreClass(s)}">${s}</span></li>`).join('');
    $$('#scoreList li').forEach((li) => li.addEventListener('click', () => openLead(li.dataset.lead)));
    if (!$('#aiMessages').children.length) {
      botSay('Olá! Sou a assistente do PhatosHub ✦\nPosso priorizar seus leads, resumir os números do mês, calcular comissões, sugerir planos para um perfil e avisar sobre reajustes. Como posso ajudar?');
    }
  }

  function addMsg(html, who) {
    const div = document.createElement('div');
    div.className = `msg msg--${who}`;
    div.innerHTML = html;
    $('#aiMessages').appendChild(div);
    $('#aiMessages').scrollTop = $('#aiMessages').scrollHeight;
    return div;
  }
  const botSay = (html) => addMsg(html, 'bot');

  function responder(pergunta) {
    const q = norm(pergunta);
    const abertos = state.leads.filter((l) => !['implantado', 'perdido'].includes(l.etapa));

    if (/prioriz|ligar|quente|foco|hoje/.test(q)) {
      const top = abertos.map((l) => ({ l, s: score(l) })).sort((a, b) => b.s - a.s).slice(0, 5);
      return '<b>Leads para priorizar agora:</b>\n' + top.map(({ l, s }, i) => `${i + 1}. <b>${esc(l.nome)}</b> (${s}/100): ${esc(l.tipo)}, ${l.vidas} vida(s), ${brl(Number(l.valor))}/mês. ${proximaAcao(l)}`).join('\n');
    }
    if (/comiss|repasse|pagar|pagamento/.test(q)) {
      const fin = resumoComp(CUR);
      const nome = state.corretores.find((c) => q.includes(norm(c.nome.split(' ')[0])));
      if (nome) {
        const v = fin.ls.filter((l) => l.c.corretor === nome.id).reduce((a, l) => a + l.repasse, 0);
        return `O repasse de <b>${esc(nome.nome)}</b> em ${monthLabel(CUR, true)} é de <b>${brl(v)}</b> (${nome.repasse}% sobre as comissões recebidas dos contratos dela/dele).`;
      }
      const por = state.corretores.map((c) => `• ${esc(c.nome)}: ${brl(fin.ls.filter((l) => l.c.corretor === c.id).reduce((a, l) => a + l.repasse, 0))}`).join('\n');
      return `Em <b>${monthLabel(CUR, true)}</b> a corretora recebe <b>${brl(fin.bruto)}</b> das operadoras e repassa <b>${brl(fin.repasse)}</b> aos corretores, ficando com margem de <b>${brl(fin.margem)}</b>.\n\n${por}`;
    }
    if (/plano|cotac|cotar|famil|sugir|sugest/.test(q)) {
      const m = q.match(/(\d+)\s*(pessoas|vidas|funcionarios|colaboradores|beneficiarios)?/);
      const vidas = m ? Math.max(1, Number(m[1])) : 1;
      const tipo = /empresa|funcionario|colaborador|pme|cnpj/.test(q) ? 'PME' : 'PF';
      const cidade = /rio/.test(q) ? 'Rio de Janeiro' : /belo|bh/.test(q) ? 'Belo Horizonte' : 'São Paulo';
      const planos = sugerirPlanos(vidas, tipo, cidade);
      return `Para <b>${vidas} vida(s)</b>, modalidade <b>${tipo}</b>, em <b>${cidade}</b>, as estimativas ficam assim:\n` +
        planos.map((p, i) => `${i + 1}. ${esc(p.nome)} (${p.rede}): ~${brl(p.valor)}/mês`).join('\n') +
        `\n\n💡 Melhor custo-benefício: <b>${esc(planos[1].nome)}</b>, com rede ampla e preço intermediário.${tipo === 'PF' ? ' Se o cliente tiver CNPJ ou MEI, um plano PME costuma sair bem mais barato.' : ''}\n<small>Valores ilustrativos. Use a cotação oficial das operadoras.</small>`;
    }
    if (/aniversar|reajust|renova/.test(q)) {
      const a = aniversarios(2);
      if (!a.length) return 'Nenhum contrato faz aniversário nos próximos 2 meses.';
      return `<b>${a.length} contratos</b> fazem aniversário nos próximos 2 meses:\n` + a.slice(0, 8).map((c) => `• ${esc(c.cliente)}, ${esc(c.operadora)}, ${c.vidas} vida(s), vigente desde ${monthLabel(c.inicio, true)}`).join('\n') + '\n\nSugestão: envie um comunicado antes do reajuste e já leve uma alternativa de plano para quem tiver risco de cancelar.';
    }
    if (/previs|projec|futuro|faturamento|forecast/.test(q)) {
      const prox = [1, 2, 3].map((i) => ({ m: addMonths(CUR, i), v: resumoComp(addMonths(CUR, i)).bruto }));
      const pipeline = abertos.reduce((a, l) => a + Number(l.valor) * (score(l) / 100), 0);
      return '<b>Previsão de comissões (carteira atual):</b>\n' + prox.map((p) => `• ${monthLabel(p.m, true)}: ${brl(p.v)}`).join('\n') +
        `\n\nO funil em aberto soma <b>${brl(pipeline)}/mês</b> em mensalidades ponderadas pela chance de fechamento. Com a grade média, isso representaria cerca de <b>${brl(pipeline * 2)}</b> extras em agenciamento.`;
    }
    if (/resumo|mes|numeros|desempenho|relatorio|como estamos/.test(q)) {
      const fin = resumoComp(CUR);
      const ganhos = state.leads.filter((l) => l.etapa === 'implantado').length;
      return `<b>Resumo de ${monthLabel(CUR, true)}:</b>\n• ${vidasNoMes(CUR)} vidas implantadas\n• ${abertos.length} leads em aberto (${abertos.filter((l) => score(l) >= 65).length} quentes)\n• ${ganhos} negócios ganhos no funil\n• Comissões a receber: ${brl(fin.bruto)}\n• Carteira ativa: ${ativos().length} contratos, ${ativos().reduce((a, c) => a + c.vidas, 0)} vidas\n\n${gerarInsights()[0]}`;
    }
    if (/oi|ola|bom dia|boa tarde|boa noite|ajuda/.test(q)) {
      return 'Olá! Você pode me perguntar, por exemplo:\n• "Quais leads devo priorizar hoje?"\n• "Quanto vou pagar de comissão para a Ana?"\n• "Sugira um plano para empresa com 12 funcionários"\n• "Quais contratos fazem aniversário em breve?"';
    }
    return 'Ainda não sei responder isso nesta demonstração. Tente perguntar sobre <b>leads para priorizar</b>, <b>comissões</b>, <b>sugestão de planos</b>, <b>reajustes</b>, <b>previsão</b> ou um <b>resumo do mês</b>.';
  }

  function perguntar(texto) {
    if (!texto.trim()) return;
    addMsg(esc(texto), 'user');
    const typing = addMsg('digitando…', 'bot');
    typing.classList.add('msg--typing');
    setTimeout(() => {
      typing.classList.remove('msg--typing');
      typing.innerHTML = responder(texto);
      $('#aiMessages').scrollTop = $('#aiMessages').scrollHeight;
    }, 550);
  }

  // ---------- Toast ----------
  let toastT;
  function toast(text) {
    const t = $('#toast');
    t.textContent = text;
    t.classList.add('is-show');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('is-show'), 3200);
  }

  // ---------- Inicialização ----------
  function init() {
    load();
    fillCorretorSelect($('#filterCorretor'), true);
    fillCorretorSelect($('#leadCorretor'), false);
    $('#filterOperadora').innerHTML = '<option value="">Todas as operadoras</option>' + Object.keys(state.grade).map((o) => `<option>${esc(o)}</option>`).join('');
    fillCompetencias();

    $$('.menu__item').forEach((b) => b.addEventListener('click', () => go(b.dataset.view)));
    $('#menuBtn').addEventListener('click', () => $('#sidebar').classList.toggle('is-open'));
    document.addEventListener('click', (e) => {
      const sb = $('#sidebar');
      if (sb.classList.contains('is-open') && !sb.contains(e.target) && e.target !== $('#menuBtn')) sb.classList.remove('is-open');
    });

    ['#filterCorretor', '#filterTipo'].forEach((s) => $(s).addEventListener('change', renderKanban));
    ['#filterStatus', '#filterOperadora'].forEach((s) => $(s).addEventListener('change', renderClientes));
    $('#competencia').addEventListener('change', renderFinanceiro);
    $('#exportCsv').addEventListener('click', exportCsv);

    $('#globalSearch').addEventListener('input', () => {
      if (currentView !== 'funil' && currentView !== 'clientes') go('funil');
      else render();
    });

    // Novo lead
    const leadDlg = $('#leadModal');
    $('#newLeadBtn').addEventListener('click', () => { $('#leadFormModal').reset(); leadDlg.showModal(); });
    leadDlg.addEventListener('close', () => {
      if (leadDlg.returnValue !== 'ok') return;
      const d = Object.fromEntries(new FormData($('#leadFormModal')));
      const now = new Date().toISOString();
      state.leads.push({
        id: 'l' + uid(), nome: d.nome.trim(), telefone: d.telefone.trim(), tipo: d.tipo,
        vidas: Math.max(1, Number(d.vidas) || 1), valor: Math.max(0, Number(d.valor) || 0),
        origem: d.origem, cidade: d.cidade.trim() || '—', corretor: d.corretor,
        operadora: sugerirPlanos(Number(d.vidas) || 1, d.tipo, d.cidade)[1].nome,
        etapa: 'novo', criadoEm: now, ultimoContato: now,
      });
      save();
      toast(`Lead ${d.nome} criado e atribuído a ${corretor(d.corretor).nome}.`);
      go('funil');
    });
    $('#leadFormModal').addEventListener('submit', (e) => {
      if (e.submitter && e.submitter.value === 'ok' && !e.target.checkValidity()) { e.preventDefault(); e.target.reportValidity(); }
    });

    // IA
    $('#aiForm').addEventListener('submit', (e) => {
      e.preventDefault();
      const i = $('#aiInput');
      perguntar(i.value);
      i.value = '';
    });
    $$('#aiChips button').forEach((b) => b.addEventListener('click', () => perguntar(b.textContent)));

    $('#resetDemo').addEventListener('click', () => {
      if (!confirm('Restaurar os dados de exemplo? Suas alterações nesta demonstração serão perdidas.')) return;
      state = seed();
      save();
      $('#aiMessages').innerHTML = '';
      render();
      toast('Dados de exemplo restaurados.');
    });

    const hash = location.hash.replace('#', '');
    go(TITLES[hash] ? hash : 'dashboard');
  }

  init();
})();
