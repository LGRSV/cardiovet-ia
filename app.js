/* Atena - interface. Os dados ficam so neste aparelho (localStorage). */
(function () {
  'use strict';
  var C = window.AtenaCalc, G = window.AtenaGraficos, fmt = G.fmt, esc = G.esc;
  var CHAVE = 'atena.v2', CHAVE_V1 = 'atena.v1', CHAVE_META = 'atena.meta';
  var NOMES = { piloto: 'Piloto', oficial: 'Oficial' };
  var cont = 0;
  var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
  var tela = document.getElementById('tela'), dialogo = document.getElementById('dialogo'), formulario = document.getElementById('formulario');
  var meta = lerMeta(), banco = carregarBanco(), estado = banco.conjuntos[banco.ativo], aba = 'inicio';
  var visao = { carcaca: 'todas', ate15: false, spGrupo: 'total', spVar: 'tmed', filtroTriagem: '' };

  /* ---------- armazenamento ---------- */
  function carregarBanco() {
    var b = null;
    try { var t = localStorage.getItem(CHAVE); if (t) b = JSON.parse(t); } catch (e) { /* sem armazenamento */ }
    if (!b || !b.conjuntos) {
      b = { app: 'atena', versao: 2, ativo: 'piloto', conjuntos: {} };
      /* migracao da V1: o que ja estava gravado vira o conjunto Piloto; a chave antiga continua guardada como copia */
      try { var v1 = localStorage.getItem(CHAVE_V1); if (v1) { b.conjuntos.piloto = JSON.parse(v1); b.migradoDaV1 = new Date().toISOString(); } } catch (e2) { /* ignora */ }
    }
    ['piloto', 'oficial'].forEach(function (k) { b.conjuntos[k] = normalizar(b.conjuntos[k]); });
    if (!NOMES[b.ativo]) b.ativo = 'piloto';
    return b;
  }
  function lerMeta() { try { return JSON.parse(localStorage.getItem(CHAVE_META)) || {}; } catch (e) { return {}; } }
  function normalizar(e) {
    var v = C.estadoVazio();
    if (!e || typeof e !== 'object') return v;
    ['coletas', 'triagem', 'fases'].forEach(function (k) { if (Array.isArray(e[k])) v[k] = e[k]; });
    if (Array.isArray(e.taxons) && e.taxons.length) v.taxons = e.taxons.filter(function (t) { return t && t.taxon; });
    v.exemplo = !!e.exemplo;
    v.config = C.lerConfig(e);
    v.coletas.concat(v.triagem).forEach(function (o) { if (!o.id) o.id = novoId(); o.carcaca = String(o.carcaca == null ? '' : o.carcaca); });
    return v;
  }
  function salvar(silencioso) {
    banco.conjuntos[banco.ativo] = estado;
    try { localStorage.setItem(CHAVE, JSON.stringify(banco)); }
    catch (e) { avisar('Não foi possível gravar neste aparelho. Exporte um backup agora.'); }
    if (!silencioso) desenhar();
  }
  function salvarMeta() { try { localStorage.setItem(CHAVE_META, JSON.stringify(meta)); } catch (e) { /* ignora */ } }
  function novoId() { return 'r' + Date.now().toString(36) + (cont++).toString(36) + Math.floor(Math.random() * 1296).toString(36); }

  /* ---------- utilidades ---------- */
  function dataBR(iso) { if (!iso) return ''; var p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
  function hojeISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function somaDias(iso, n) { var d = new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000); return d.toISOString().slice(0, 10); }
  function avisar(msg) {
    var el = document.getElementById('aviso'); el.textContent = msg; el.hidden = false;
    clearTimeout(avisar.t); avisar.t = setTimeout(function () { el.hidden = true; }, 3800);
  }
  function opcoes(lista, atual, vazio) {
    return (vazio !== undefined ? '<option value="">' + esc(vazio) + '</option>' : '') + lista.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, r = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (String(v) === String(atual == null ? '' : atual) ? ' selected' : '') + '>' + esc(r) + '</option>';
    }).join('');
  }
  function calc() { return C.calcular(estado, { carcaca: visao.carcaca, ate15: visao.ate15 }); }
  function nd(v, d) { return v === null || v === undefined ? '–' : fmt(v, d); }
  function itx(nome) { return /spp\.$/.test(nome) ? '<i class="tx">' + esc(nome.replace(/ spp\.$/, '')) + '</i> spp.' : '<i class="tx">' + esc(nome) + '</i>'; }

  /* ---------- telas ---------- */
  function desenhar() {
    document.getElementById('selo-exemplo').hidden = !estado.exemplo;
    Array.prototype.forEach.call(document.querySelectorAll('[data-conjunto]'), function (b) {
      var on = b.dataset.conjunto === banco.ativo; b.classList.toggle('ativo', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('.abas button'), function (b) { b.classList.toggle('ativa', b.dataset.aba === aba); });
    ({ inicio: telaInicio, coletas: telaColetas, triagem: telaTriagem, resultados: telaResultados, mais: telaMais })[aba]();
  }

  function telaInicio() {
    var r = C.calcular(estado), s = r.resumo, h = '<h1>Resumo – ' + NOMES[banco.ativo] + '</h1>';
    if (estado.exemplo) h += '<div class="alerta">Você está vendo <b>dados de exemplo fictícios</b>, só para conhecer o app. Em <b>Mais</b>, toque em “Apagar tudo e começar” antes de lançar as coletas de verdade.</div>';
    h += '<div class="grade-res">' + [[s.nColetas, 'coletas'], [s.nLotes, 'lotes triados'], [s.individuos, 'adultos coletados'], [s.taxons, 'táxons'], [s.familias, 'famílias'], [s.ordens, 'ordens']]
      .map(function (x) { return '<div class="num"><b>' + fmt(x[0]) + '</b><span>' + x[1] + '</span></div>'; }).join('') + '</div>';
    if (s.pendentes) h += '<div class="alerta">' + s.pendentes + ' lote(s) da triagem estão com data ou carcaça sem coleta lançada e ficam fora dos cálculos. Veja na aba Triagem.</div>';
    var semInt = r.coletas.filter(function (c) { return c.intervalo === null; }).length;
    if (semInt) h += '<div class="alerta">' + semInt + ' coleta(s) sem intervalo em horas: o “total por 24 h” delas não é calculado.</div>';
    if (s.naoTriadas) h += '<div class="alerta">' + s.naoTriadas + ' coleta(s) ainda sem nenhum lote na triagem. ' + (s.foraDoSpearman ? s.foraDoSpearman + ' fica(m) de fora do Spearman e da Figura 5.' : 'Elas contam como zero adultos; para deixá-las de fora do Spearman e da Figura 5, veja Mais → Opções de cálculo.') + '</div>';
    if (!s.nColetas) h += '<div class="cartao"><h3>Por onde começar</h3><ol><li>Em <b>Coletas</b>, lance cada visita das 16h com os dados da ficha de campo.</li><li>Em <b>Triagem</b>, lance cada lote identificado no laboratório (um táxon por linha).</li><li>Em <b>Mais → Fases</b>, anote o início e o término de cada fase.</li><li>Em <b>Resultados</b>, as tabelas e as figuras do artigo se atualizam sozinhas.</li></ol><div class="linha-botoes"><button data-acao="exemplo">Ver com dados de exemplo</button></div></div>';
    h += '<div class="linha-botoes"><button class="primario" data-acao="nova-coleta">+ Nova coleta</button><button data-acao="novo-lote">+ Novo lote</button></div>';
    var ult = r.coletas[r.coletas.length - 1];
    if (ult) h += '<div class="cartao"><h3>Última coleta lançada</h3><p>Carcaça ' + esc(ult.carcaca) + ' · ' + esc(ult.dia) + ' · ' + dataBR(ult.data) + ' · ' + esc(ult.fase || 'fase não informada') + '</p><p class="sub">' + ult.total + ' adultos (' + nd(ult.por24, 1) + ' por 24 h) · Tméd ' + nd(ult.tmed, 1) + ' °C</p></div>';
    h += '<div class="cartao"><h3>Backup</h3><p class="sub">Os dados ficam só neste aparelho. ' + (meta.ultimoBackup ? 'Último backup exportado em ' + dataBR(meta.ultimoBackup) + '.' : 'Nenhum backup exportado ainda.') + '</p><div class="linha-botoes"><button data-acao="exp-json">Exportar backup (JSON)</button></div></div>';
    tela.innerHTML = h;
  }

  function telaColetas() {
    var r = C.calcular(estado), h = '<h1>Coletas</h1><p class="sub">Uma linha por visita, com os dados da ficha diária. Umidade e chuva do INMET podem ser preenchidas depois.</p><div class="linha-botoes"><button class="primario" data-acao="nova-coleta">+ Nova coleta</button></div>';
    if (!r.coletas.length) h += '<p class="vazio">Nenhuma coleta lançada.</p>';
    r.coletas.slice().reverse().forEach(function (c) {
      h += '<button class="item" data-acao="editar-coleta" data-id="' + esc(c.id) + '"><span class="tit"><span>' + esc(c.dia || 'sem dia') + ' · ' + dataBR(c.data) + ' · carcaça ' + esc(c.carcaca) + '</span><span class="etq">' + esc(c.fase || 'sem fase') + '</span></span>' +
        '<span class="det">Tmáx ' + nd(c.tmax, 1) + ' · Tmín ' + nd(c.tmin, 1) + ' · Tméd ' + nd(c.tmed, 1) + ' °C · UR ' + nd(c.ur) + '% · chuva ' + nd(c.chuva, 1) + ' mm</span>' +
        '<span class="det">' + c.total + ' adultos · ' + nd(c.por24, 1) + ' por 24 h · intervalo ' + nd(c.intervalo) + ' h' + (c.massa === 'Sim' ? ' · massa larval' : '') + (c.triada ? '' : ' · ainda sem triagem') + (c.entra ? '' : ' · fora do Spearman e da Figura 5') + '</span></button>';
    });
    tela.innerHTML = h;
  }

  function telaTriagem() {
    var r = C.calcular(estado), chaves = [];
    r.triagem.forEach(function (t) { if (t.chave && chaves.indexOf(t.chave) < 0) chaves.push(t.chave); });
    chaves.sort().reverse();
    var h = '<h1>Triagem</h1><p class="sub">Uma linha por lote e táxon. Um lote com duas espécies ocupa duas linhas.</p><div class="linha-botoes"><button class="primario" data-acao="novo-lote">+ Novo lote</button></div>';
    if (chaves.length > 1) h += '<div class="filtros"><label>Coleta <select data-visao="filtroTriagem">' + opcoes(chaves.map(function (k) { var p = k.split('|'); return [k, 'Carcaça ' + p[0] + ' · ' + dataBR(p[1])]; }), visao.filtroTriagem, 'Todas') + '</select></label></div>';
    var linhas = r.triagem.filter(function (t) { return !visao.filtroTriagem || t.chave === visao.filtroTriagem; });
    if (!linhas.length) h += '<p class="vazio">Nenhum lote lançado.</p>';
    linhas.slice().reverse().slice(0, 400).forEach(function (t) {
      var pend = t.fase === 'coleta não lançada';
      h += '<button class="item" data-acao="editar-lote" data-id="' + esc(t.id) + '"><span class="tit"><span>' + itx(t.taxon || 'sem táxon') + ' · ' + t.n + '</span><span class="etq' + (pend ? ' atencao' : '') + '">' + esc(pend ? 'coleta não lançada' : (t.fase || '')) + '</span></span>' +
        '<span class="det">Lote ' + esc(t.lote || '–') + ' · carcaça ' + esc(t.carcaca) + ' · ' + dataBR(t.data) + ' · ' + esc(t.origem) + ' · ' + esc(t.tipo) + (t.obs ? ' · ' + esc(t.obs) : '') + '</span></button>';
    });
    if (linhas.length > 400) h += '<p class="sub">Mostrando os 400 lotes mais recentes; filtre por coleta para ver os demais.</p>';
    tela.innerHTML = h;
  }

  var NOTA_FORMICIDAE = '<details><summary>Formicidae (formigas) entra na Tabela 5?</summary><p><b>O que é.</b> Formicidae é a família das formigas. Em carcaças elas aparecem do começo ao fim: comem tecidos e líquidos, predam ovos e larvas de moscas e podem atrasar a decomposição e deixar marcas na pele. São parte da fauna e ficam na lista, na composição por fase, na constância e na dominância.</p><p><b>Por que fica desligada na correlação, por padrão.</b> Formiga é inseto social: quando uma operária acha a carcaça, recruta o ninho inteiro. O número que cai no pitfall depende muito de haver um ninho por perto e do recrutamento, e pouco do clima daquele dia; as contagens vêm em blocos e não são independentes. A armadilha Shannon, que pega os voadores, quase não captura formigas. Por isso a correlação da abundância de formigas com temperatura, umidade e chuva é difícil de interpretar. O guia de resultados também não lista Formicidae na Tabela 5.</p><p><b>O que o app faz.</b> A linha Formicidae só aparece se você marcar “Incluir Formicidae”. A tabela mostra sempre duas linhas de total: “Total” (todos os adultos, igual à planilha) e “Total sem Formicidae”, para ver se as formigas mudam a conclusão. Qual das duas vai para o artigo é decisão para confirmar com o orientador. As fontes e o que foi conferido estão no arquivo Notas do especialista.</p></details>';

  /* ---------- resultados ---------- */
  function tabela(cab, linhas, legenda) {
    return '<div class="rolagem"><table><thead><tr>' + cab.map(function (c, i) { return '<th' + (i === 0 ? ' class="esq"' : '') + '>' + c + '</th>'; }).join('') + '</tr></thead><tbody>' + linhas.join('') + '</tbody></table></div>' + (legenda ? '<p class="legenda-tab">' + legenda + '</p>' : '');
  }
  function tr(cels, classe) { return '<tr' + (classe ? ' class="' + classe + '"' : '') + '>' + cels.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }

  function telaResultados() {
    var r = calc(), duas = C.calcular(estado).carcacas.length > 1;
    var h = '<h1>Resultados</h1><div class="filtros"><label>Carcaça <select data-visao="carcaca">' + opcoes([['todas', 'Todas juntas'], ['1', 'Carcaça 1'], ['2', 'Carcaça 2']], visao.carcaca) + '</select></label></div>';
    h += '<p class="sub">Frequências, índices e correlação usam só <b>adultos coletados</b> (Shannon e pitfall). Emergidos da criação entram só como presença, na sucessão e marcados com †.</p>';

    /* Tabela 1 */
    h += '<h2>Tabela 1 – Duração das fases e condições abióticas</h2>';
    var l1 = [];
    r.carcacas.forEach(function (cc) {
      if (r.carcacas.length > 1) l1.push('<tr class="grupo"><td colspan="8">Carcaça ' + esc(cc) + '</td></tr>');
      r.fases.filter(function (f) { return f.carcaca === cc; }).forEach(function (f) {
        l1.push(tr([esc(f.fase), f.inicio ? dataBR(f.inicio) + ' a ' + dataBR(f.termino) : '–', nd(f.duracao, f.duracao % 1 ? 1 : 0) + (f.duracaoOrigem === 'manual' ? ' <span class="sub">(manual)</span>' : ''), f.nColetas, nd(f.tmed, 1), nd(f.ur, 1), nd(f.chuva, 1), f.adultos]));
      });
    });
    h += tabela(['Fase', 'Período', 'Duração (dias)', 'Coletas', 'T média (°C)', 'UR média (%)', 'Chuva (mm)', 'Adultos'], l1, 'Regra da duração: ' + esc(r.regraDuracao) + '. “(manual)” = duração digitada em Mais → Fases. Temperatura e UR = média das coletas da fase; chuva = soma.');

    /* Tabela 2 */
    h += '<h2>Tabela 2 – Lista sistemática e frequência por fase</h2>';
    var l2 = [], ordemAtual = null, cd = {};
    r.constDom.forEach(function (x) { cd[x.taxon] = x; });
    r.faFr.forEach(function (l) {
      var x = cd[l.taxon];
      if (l.total === 0 && !x.criado) return;
      if (l.ordem !== ordemAtual) { ordemAtual = l.ordem; l2.push('<tr class="grupo"><td colspan="11">' + esc(l.ordem || 'Sem ordem') + '</td></tr>'); }
      l2.push(tr([esc(l.familia) + ' – ' + itx(l.taxon) + (x.criado ? ' †' : '')].concat(l.fa.map(function (v, i) { return v ? v + ' <span class="sub">(' + fmt(l.fr[i], 1) + ')</span>' : '–'; }), [l.total, nd(l.frTotal, 1), x.classeConstancia ? esc(x.classeConstancia) + ' <span class="sub">(' + fmt(x.constancia, 1) + '%)</span>' : '–', x.classeDominancia ? esc(x.classeDominancia) : '–'])));
    });
    l2.push(tr(['Total'].concat(r.totalFase, [r.totalGeral, r.totalGeral ? '100' : '–', '', '']), 'total'));
    h += r.totalGeral || l2.length > 1 ? tabela(['Ordem / Família – Táxon'].concat(r.SIGLAS, ['Total', 'FR (%)', 'Constância', 'Dominância']), l2, 'FA por fase, com a FR (%) da fase entre parênteses. † táxon criado a partir de imaturos. Constância: Bodenheimer (1955); dominância: Engelmann (1978). ' + r.nColetas + ' coletas lançadas.') : '<p class="vazio">Sem lotes de adultos coletados.</p>';

    /* Tabela 3 */
    h += '<h2>Tabela 3 – Diversidade por fase</h2>';
    h += tabela(['Fase', 'Riqueza (S)', 'Indivíduos (N)', 'Shannon-Wiener (H′)', 'Simpson (1 − D)', 'Pielou (J′)'], r.indices.map(function (i) {
      return tr([esc(i.fase), i.S, i.N, nd(i.shannon, 3), nd(i.simpson, 3), nd(i.pielou, 3)]);
    }), 'H′ e J′ com logaritmo natural (base e). Simpson na forma 1 − D, com D = Σ p² (Gini-Simpson); a forma sem viés, 1 − Σ n(n−1) ÷ [N(N−1)], sai no Excel com fórmulas.');

    /* Tabela 4 */
    h += '<h2>Tabela 4 – Similaridade entre fases (Jaccard)</h2>';
    h += tabela([''].concat(r.SIGLAS.slice(0, 5)), r.SIGLAS.slice(1).map(function (s, li) {
      var i = li + 1;
      return tr([s].concat(r.SIGLAS.slice(0, 5).map(function (_, j) { return j < i ? nd(r.jaccard[i][j], 2) : ''; })));
    }), '0 = nenhum táxon em comum; 1 = mesma composição. Só a metade de baixo da matriz.');

    /* Tabela 5 */
    h += '<h2>Tabela 5 – Correlação de Spearman</h2><div class="filtros"><label><input type="checkbox" data-visao="ate15"' + (visao.ate15 ? ' checked' : '') + '> Só os 15 primeiros dias</label><label><input type="checkbox" data-config="formicidaeTab5"' + (r.config.formicidaeTab5 ? ' checked' : '') + '> Incluir Formicidae</label></div>';
    h += tabela(['Grupo'].concat(r.spearman[0].variaveis.map(function (v) { return esc(v.nome) + ' (ρ; p; n)'; })), r.spearman.filter(function (g) { return g.grupo !== 'Formicidae' || r.config.formicidaeTab5; }).map(function (g) {
      return tr([esc(g.grupo)].concat(g.variaveis.map(function (v) { return v.rho === null ? '–; –; ' + v.n : fmt(v.rho, 3) + '; ' + (v.p < 0.001 ? '&lt; 0,001' : fmt(v.p, 3)) + (v.p < 0.05 ? ' *' : '') + '; ' + v.n; })));
    }), 'Abundância de adultos padronizada por 24 h × variáveis do intervalo da coleta. Entraram ' + r.resumo.nSpearman + ' de ' + r.nColetas + ' coletas' + (r.resumo.foraDoSpearman ? ' (' + r.resumo.foraDoSpearman + ' de fora por ainda não estarem triadas)' : '') + '; o n de cada célula conta só as coletas com os dois valores preenchidos.' + (r.resumo.nSpearman < 10 ? ' Atenção: com menos de 10 coletas o valor de p é só uma aproximação grosseira.' : '') + ' * p &lt; 0,05. Valor de p pela aproximação t (a mesma do R quando há empates; sem empates e com poucas coletas, o p exato do R pode diferir um pouco). Confirme no R antes de publicar.' + (visao.carcaca === 'todas' && duas ? ' Com duas carcaças juntas, as coletas das duas entram na mesma correlação.' : ''));

    h += NOTA_FORMICIDAE;

    /* Figuras */
    var porCarcaca = r.carcacas.length > 1 ? r.carcacas : [null];
    h += '<h2>Figura 2 – Temperatura ao longo do experimento</h2>';
    porCarcaca.forEach(function (cc, i) { h += (cc ? '<p class="sub">Carcaça ' + esc(cc) + '</p>' : '') + '<div class="figura" id="fig2-' + i + '"></div>'; });
    h += '<p class="legenda-tab">Máxima e mínima do ar no intervalo entre coletas, por dia de exposição; faixas = fases. A chuva vai em painel próprio, com a mesma escala de dias.</p>';
    h += '<h2>Figura 3 – Diagrama de sucessão</h2><div class="figura" id="fig3"></div><p class="legenda-tab">Cada barra vai do primeiro ao último dia em que o táxon foi registrado (adultos coletados ou emergidos).' + (r.carcacas.length > 1 ? ' Com duas carcaças juntas não há faixas de fase; escolha uma carcaça no filtro.' : '') + '</p>';
    h += '<h2>Figura 4 – Composição por fase</h2><div class="figura" id="fig4"></div><p class="legenda-tab">Frequência relativa de cada grupo em cada fase (barras de 100%).</p>';
    h += '<h2>Figura 5 – Abundância e temperatura</h2>';
    porCarcaca.forEach(function (cc, i) { h += (cc ? '<p class="sub">Carcaça ' + esc(cc) + '</p>' : '') + '<div class="figura" id="fig5-' + i + '"></div>'; });
    h += '<p class="legenda-tab">Adultos por 24 h (barras) e temperatura máxima e mínima (linhas), em dois painéis com o mesmo eixo de dias, porque as unidades são diferentes. Coletas no gráfico: ' + r.coletas.filter(function (c) { return c.entra; }).length + ' de ' + r.coletas.length + '.</p>';
    h += '<h2>Figura 6 – Curva do coletor</h2><div class="figura" id="fig6"></div><p class="legenda-tab">Riqueza acumulada ao longo das coletas. Se a curva estabiliza, o esforço de coleta foi suficiente. n = ' + r.curva.length + ' coletas, na ordem em que foram feitas.</p>';
    h += '<h2>Dispersão da correlação</h2><div class="filtros"><label>Grupo <select data-visao="spGrupo">' + opcoes(r.spearman.map(function (g) { return [g.campo, g.grupo]; }), visao.spGrupo) + '</select></label><label>Variável <select data-visao="spVar">' + opcoes(r.spearman[0].variaveis.map(function (v) { return [v.campo, v.nome]; }), visao.spVar) + '</select></label></div><div class="figura" id="figsp"></div><p class="legenda-tab" id="legsp"></p>';

    /* frases */
    h += '<h2>Frases com os seus números</h2><div class="cartao"><ul class="frases">' + frases(r).map(function (f) { return '<li>' + f + '</li>'; }).join('') + '</ul><p class="sub">Modelos do guia de resultados, preenchidos com os dados lançados. Revise antes de usar.</p></div>';
    h += '<div class="linha-botoes"><button data-acao="exp-resultados">Exportar tabelas (CSV)</button><button data-acao="exp-xlsx">Exportar tudo (XLSX)</button><button data-acao="exp-formulas">Excel com fórmulas (XLSX)</button></div>';
    tela.innerHTML = h;

    porCarcaca.forEach(function (cc, i) {
      var cs = r.coletas.filter(function (c) { return !cc || c.carcaca === cc; });
      G.temperatura(document.getElementById('fig2-' + i), r, cs);
      G.abundancia(document.getElementById('fig5-' + i), r, cs.filter(function (c) { return c.entra; }));
    });
    G.sucessao(document.getElementById('fig3'), r, r.carcacas.length === 1 ? r.coletas : null);
    G.composicao(document.getElementById('fig4'), r);
    G.curva(document.getElementById('fig6'), r);
    var grupo = r.spearman.filter(function (g) { return g.campo === visao.spGrupo; })[0] || r.spearman[5];
    var variavel = grupo.variaveis.filter(function (v) { return v.campo === visao.spVar; })[0] || grupo.variaveis[0];
    var pares = [];
    r.coletas.forEach(function (c) {
      if (visao.ate15 && !(c.diaN !== null && c.diaN <= 15)) return;
      if (!c.entra) return;
      var y = r.por24(c, grupo.campo), x = c[variavel.campo];
      if (y !== null && x !== null && c.chave) pares.push({ x: x, y: y, rotulo: 'Carcaça ' + c.carcaca + ' ' + c.dia });
    });
    G.dispersao(document.getElementById('figsp'), pares, variavel.nome, grupo.grupo + ' por 24 h');
    document.getElementById('legsp').innerHTML = variavel.rho === null ? 'Correlação não calculada (poucos dados ou valores todos iguais).' : 'ρ = ' + fmt(variavel.rho, 3) + '; p = ' + (variavel.p < 0.001 ? '&lt; 0,001' : fmt(variavel.p, 3)) + '; n = ' + variavel.n + '. Use no artigo só para a correlação que der significativa.';
  }

  function frases(r) {
    var f = [], s = r.resumo;
    if (!s.individuos) return ['Lance coletas e triagens para gerar as frases.'];
    f.push('Foram coletados ' + fmt(s.individuos) + ' indivíduos, pertencentes a ' + s.familias + ' famílias e ' + s.taxons + ' táxons, distribuídos em ' + s.ordens + ' ordens (Tabela 2).');
    var top = r.constDom.slice().sort(function (a, b) { return b.individuos - a.individuos; })[0];
    if (top && top.individuos) f.push(itx(top.taxon) + ' foi o táxon mais abundante (FR = ' + fmt(top.dominancia, 1) + '%), classificado como ' + top.classeDominancia.toLowerCase() + ' e ' + top.classeConstancia.toLowerCase() + '.');
    var rica = r.indices.slice().sort(function (a, b) { return b.S - a.S; })[0];
    if (rica && rica.S) f.push('A maior riqueza ocorreu na fase ' + rica.fase.toLowerCase() + ' (S = ' + rica.S + '; H′ = ' + nd(rica.shannon, 2) + ') (Tabela 3).');
    r.carcacas.forEach(function (cc) {
      var fs = r.fases.filter(function (x) { return x.carcaca === cc && x.duracao !== null; });
      if (fs.length < 2) return;
      var tot = fs.reduce(function (a, x) { return a + x.duracao; }, 0), ord = fs.slice().sort(function (a, b) { return a.duracao - b.duracao; });
      f.push((r.carcacas.length > 1 ? 'Carcaça ' + cc + ': a' : 'A') + ' decomposição durou ' + tot + ' dias nas fases com datas lançadas. A fase mais curta foi ' + ord[0].fase.toLowerCase() + ' (' + ord[0].duracao + ' dias) e a mais longa, ' + ord[ord.length - 1].fase.toLowerCase() + ' (' + ord[ord.length - 1].duracao + ' dias) (Tabela 1).');
    });
    r.spearman.forEach(function (g) {
      if (g.grupo === 'Formicidae' && !r.config.formicidaeTab5) return;
      g.variaveis.forEach(function (v) {
        if (v.rho !== null && v.p < 0.05) f.push('A abundância de ' + (g.grupo === 'Total' ? 'adultos (total)' : g.grupo) + ' apresentou correlação ' + (v.rho > 0 ? 'positiva' : 'negativa') + ' com ' + v.nome.replace(/ \(.*/, '').toLowerCase() + ' (ρ = ' + fmt(v.rho, 2) + '; p = ' + (v.p < 0.001 ? '< 0,001' : fmt(v.p, 3)) + ') (Tabela 5).');
      });
    });
    return f;
  }

  /* ---------- Mais: fases, taxons, dados, instalacao ---------- */
  function telaMais() {
    var rf = C.calcular(estado), nome = NOMES[banco.ativo];
    var h = '<h1>Mais – ' + nome + '</h1><h2>Fases de decomposição (Payne, 1965)</h2><p class="sub">Datas de início e término de cada fase, do Apêndice B. Regra da duração em vigor: <b>' + esc(rf.regraDuracao) + '</b>. Se você digitar a duração manual de uma fase, ela vale no lugar da regra.</p>';
    ['1', '2'].forEach(function (cc) {
      var temDados = estado.fases.some(function (x) { return String(x.carcaca) === cc && (x.inicio || x.termino || x.duracaoManual !== undefined && x.duracaoManual !== ''); });
      h += '<details' + (cc === '1' || temDados ? ' open' : '') + '><summary>Carcaça ' + cc + '</summary>';
      C.FASES.forEach(function (f) {
        var reg = estado.fases.filter(function (x) { return String(x.carcaca) === cc && x.fase === f; })[0] || {};
        var calc = rf.fases.filter(function (x) { return x.carcaca === cc && x.fase === f; })[0];
        var attr = ' data-fase="' + esc(f) + '" data-carcaca="' + cc + '"';
        h += '<div class="fase-linha"><div class="fase-tit"><b>' + esc(f) + '</b><span class="sub">' + (calc && calc.duracao !== null ? 'duração: ' + fmt(calc.duracao, calc.duracao % 1 ? 1 : 0) + ' dia(s) · ' + esc(calc.duracaoOrigem === 'manual' ? 'manual' : rf.regraDuracao) : 'duração: –') + '</span></div>' +
          '<div class="fase-campos"><label>Início<input type="date"' + attr + ' data-campo="inicio" value="' + esc(reg.inicio || '') + '"></label><label>Término<input type="date"' + attr + ' data-campo="termino" value="' + esc(reg.termino || '') + '"></label><label>Manual (dias)<input inputmode="decimal"' + attr + ' data-campo="duracaoManual" value="' + esc(reg.duracaoManual === undefined || reg.duracaoManual === null ? '' : reg.duracaoManual) + '"></label></div></div>';
      });
      h += '</details>';
    });
    h += '<h2>Opções de cálculo</h2><div class="cartao"><div class="campos">' +
      '<label class="inteiro">Regra da duração da fase<select data-config="duracaoRegra">' + opcoes(Object.keys(C.REGRAS_DURACAO).map(function (k) { return [k, C.REGRAS_DURACAO[k] + (k === 'termino-inicio' ? ' (padrão, igual à planilha)' : '')]; }), rf.config.duracaoRegra) + '</select></label>' +
      '<label class="inteiro">Coletas ainda sem triagem<select data-config="naoTriadas">' + opcoes([['zero', 'Contam como zero adultos (padrão, igual à planilha)'], ['fora', 'Ficam de fora do Spearman e da Figura 5 até serem triadas']], rf.config.naoTriadas) + '</select></label>' +
      '<label class="inteiro"><input type="checkbox" data-config="formicidaeTab5"' + (rf.config.formicidaeTab5 ? ' checked' : '') + '> Incluir Formicidae na Tabela 5 (correlação)</label></div>' +
      '<p class="sub">Coleta “sem triagem” = coleta sem nenhum lote lançado. Também dá para marcar uma coleta específica como “de fora” ao editá-la. Hoje: ' + rf.resumo.naoTriadas + ' sem triagem; ' + rf.resumo.nSpearman + ' de ' + rf.nColetas + ' entram no Spearman e na Figura 5. Frequências, constância e índices não mudam com esta opção.</p></div>';
    h += '<h2>Piloto e Oficial</h2><div class="cartao"><p class="sub">São dois conjuntos de dados separados: cada um tem suas coletas, triagem, fases, táxons, opções, tabelas e figuras. Troque no seletor do topo. Você está no <b>' + nome + '</b>.</p>' +
      '<div class="linha-botoes"><button data-acao="copiar-config">Copiar configuração do Piloto para o Oficial</button></div><p class="sub">Copia a lista de táxons e as opções de cálculo. Não copia coletas, triagem nem datas das fases. As carcaças (1 e 2) e as seis fases são as mesmas nos dois conjuntos.</p></div>';
    h += '<h2>Táxons</h2><details><summary>Lista de táxons (' + estado.taxons.length + ')</summary><p class="sub">Lista do Apêndice C. Acrescente os táxons novos; eles entram nas listas e nos cálculos.</p><div class="rolagem"><table><thead><tr><th class="esq">Táxon</th><th class="esq">Família</th><th class="esq">Ordem</th><th></th></tr></thead><tbody>' +
      estado.taxons.map(function (t, i) { return '<tr><td>' + itx(t.taxon) + '</td><td class="esq">' + esc(t.familia) + '</td><td class="esq">' + esc(t.ordem) + '</td><td><button class="mini" data-acao="editar-taxon" data-i="' + i + '">Editar</button></td></tr>'; }).join('') +
      '</tbody></table></div><div class="linha-botoes"><button data-acao="novo-taxon">+ Novo táxon</button></div></details>';
    h += '<h2>Dados e backup – ' + nome + '</h2><div class="cartao"><p class="sub">Exportar e importar valem para o conjunto aberto (' + nome + '). Tudo fica gravado só neste aparelho, sem login e sem servidor. Exporte um backup depois de cada dia de lançamento e guarde no iCloud/Drive ou mande para você mesma.</p>' +
      '<div class="linha-botoes"><button class="primario" data-acao="exp-json">Backup do ' + nome + ' (JSON)</button><button data-acao="exp-xlsx">Planilha de valores (XLSX)</button><button data-acao="exp-formulas">Excel com fórmulas (XLSX)</button><button data-acao="exp-coletas">Coletas (CSV)</button><button data-acao="exp-triagem">Triagem (CSV)</button><button data-acao="exp-resultados">Tabelas (CSV)</button></div>' +
      '<div class="linha-botoes"><button data-acao="importar">Importar arquivo (JSON, CSV ou XLSX)</button></div><p class="sub">Importar aceita o backup do app, os CSV exportados aqui e a planilha de tabulação em Excel (abas Coletas, Triagem, Táxons e Fases). O CSV das coletas abre direto no R com read.csv2.</p>' +
      '<div class="linha-botoes"><button data-acao="exemplo">Carregar dados de exemplo</button><button class="perigo" data-acao="apagar">Apagar tudo e começar</button></div></div>';
    h += '<h2>Instalar no iPhone</h2><div class="cartao"><ol><li>Abra este endereço no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> (quadrado com seta).</li><li>Escolha <b>Adicionar à Tela de Início</b> e confirme.</li><li>Abra o Atena pelo ícone: ele funciona sem internet depois da primeira abertura.</li></ol><p class="sub">Os dados do ícone da Tela de Início são separados dos do Safari. Lance sempre pelo ícone.</p></div>';
    h += '<h2>Como o app calcula</h2><details><summary>Fórmulas</summary><ul><li>Temperatura média = (máx. + mín.) ÷ 2. Total por 24 h = total ÷ (intervalo ÷ 24).</li><li>FA = indivíduos do táxon na fase. FR (%) = FA ÷ total da fase × 100.</li><li>Constância (%) = coletas com o táxon ÷ total de coletas × 100. Constante &gt; 50%; acessória 25–50%; acidental &lt; 25%.</li><li>Dominância (%) = indivíduos do táxon ÷ total × 100. Eudominante ≥ 32; dominante ≥ 10; subdominante ≥ 3,2; recedente ≥ 1; subrecedente ≥ 0,32; esporádica abaixo disso.</li><li>H′ = −Σ p·ln(p), com logaritmo natural. Simpson = 1 − Σ p² (forma 1 − D). J′ = H′ ÷ ln(S). Jaccard = comuns ÷ (S₁ + S₂ − comuns).</li><li>Spearman: correlação dos postos (empates com posto médio), p bilateral pela distribuição t com n − 2 graus de liberdade.</li></ul><p class="sub">São as mesmas fórmulas da planilha de tabulação; a correlação, que na planilha era feita no R, aqui já sai calculada.</p></details>';
    tela.innerHTML = h;
  }

  /* ---------- formularios ---------- */
  function abrir(html) { formulario.innerHTML = html; if (dialogo.showModal) dialogo.showModal(); else dialogo.setAttribute('open', ''); }
  function fechar() { if (dialogo.close) dialogo.close(); else dialogo.removeAttribute('open'); }
  function campos() {
    var o = {};
    Array.prototype.forEach.call(formulario.querySelectorAll('[name]'), function (el) { o[el.name] = el.value.trim(); });
    return o;
  }
  function numOuVazio(v) { var n = C.num(v); return n === null ? '' : n; }

  function formColeta(id) {
    var c = estado.coletas.filter(function (x) { return x.id === id; })[0];
    if (!c) {
      var r = C.calcular(estado), ult = r.coletas[r.coletas.length - 1];
      c = { carcaca: ult ? ult.carcaca : '1', data: hojeISO(), dia: '', hora: '16:00', fase: ult ? ult.fase : 'Fresco', massa: 'Não', intervalo: 24 };
      if (ult && ult.diaN !== null) { var passo = ult.diaN >= 15 ? 2 : 1; c.dia = 'D' + (ult.diaN + passo); c.intervalo = passo * 24; if (ult.data) c.data = somaDias(ult.data, passo); }
      else if (!ult) c.dia = 'D1';
    }
    abrir('<h2 style="margin-top:0">' + (id ? 'Editar coleta' : 'Nova coleta') + '</h2><div class="campos">' +
      '<label>Carcaça<select name="carcaca">' + opcoes(['1', '2'], c.carcaca) + '</select></label>' +
      '<label>Data<input type="date" name="data" value="' + esc(c.data || '') + '" required></label>' +
      '<label>Dia de exposição<input name="dia" value="' + esc(c.dia || '') + '" placeholder="D1" autocapitalize="characters"></label>' +
      '<label>Hora real<input type="time" name="hora" value="' + esc(c.hora || '') + '"></label>' +
      '<label class="inteiro">Fase (Payne)<select name="fase">' + opcoes(C.FASES, c.fase, 'Escolha') + '</select></label>' +
      '<label>Tmáx do intervalo (°C)<input name="tmax" inputmode="decimal" value="' + esc(c.tmax == null ? '' : String(c.tmax).replace('.', ',')) + '"></label>' +
      '<label>Tmín do intervalo (°C)<input name="tmin" inputmode="decimal" value="' + esc(c.tmin == null ? '' : String(c.tmin).replace('.', ',')) + '"></label>' +
      '<label>T do ar às 16h (°C)<input name="t16" inputmode="decimal" value="' + esc(c.t16 == null ? '' : String(c.t16).replace('.', ',')) + '"></label>' +
      '<label>Intervalo desde a anterior (h)<input name="intervalo" inputmode="decimal" value="' + esc(c.intervalo == null ? '' : c.intervalo) + '"></label>' +
      '<label>UR média INMET (%)<input name="ur" inputmode="decimal" value="' + esc(c.ur == null ? '' : String(c.ur).replace('.', ',')) + '"></label>' +
      '<label>Chuva INMET (mm)<input name="chuva" inputmode="decimal" value="' + esc(c.chuva == null ? '' : String(c.chuva).replace('.', ',')) + '"></label>' +
      '<label>Massa larval presente?<select name="massa">' + opcoes(['Não', 'Sim'], c.massa || 'Não') + '</select></label>' +
      '<label>Observação<input name="obs" value="' + esc(c.obs || '') + '"></label>' +
      '<label class="inteiro">Coleta ainda não triada?<select name="fora">' + opcoes([['', 'Seguir a regra geral (Mais → Opções de cálculo)'], ['1', 'Deixar esta coleta de fora do Spearman e da Figura 5']], c.fora ? '1' : '') + '</select></label>' +
      '<div class="calculado" id="previa"></div></div>' +
      '<div class="acoes">' + (id ? '<button type="button" class="perigo" data-acao="excluir-coleta" data-id="' + esc(id) + '">Excluir</button>' : '') + '<button type="button" data-acao="fechar">Cancelar</button><button type="button" class="primario" data-acao="salvar-coleta" data-id="' + esc(id || '') + '">Salvar</button></div>');
    previaColeta();
  }
  function previaColeta() {
    var el = document.getElementById('previa'); if (!el) return;
    var v = campos(), a = C.num(v.tmax), b = C.num(v.tmin);
    el.textContent = 'Temperatura média do intervalo: ' + (a === null || b === null ? '–' : fmt((a + b) / 2, 1) + ' °C') + ' · UR e chuva: das 20 UTC do dia da coleta anterior às 19 UTC do dia desta coleta.';
  }
  function salvarColeta(id) {
    var v = campos();
    if (!v.data) return avisar('Informe a data da coleta.');
    if (v.dia && C.diaNumero(v.dia) === null) return avisar('Dia de exposição: escreva como na ficha, por exemplo D2.');
    var dup = estado.coletas.filter(function (x) { return x.id !== id && String(x.carcaca) === v.carcaca && x.data === v.data; })[0];
    if (dup) return avisar('Já existe uma coleta desta carcaça nesta data.');
    var a = C.num(v.tmax), b = C.num(v.tmin);
    if (a !== null && b !== null && b > a) return avisar('A mínima está maior que a máxima. Confira os valores.');
    var c = estado.coletas.filter(function (x) { return x.id === id; })[0], antes = c ? { carcaca: c.carcaca, data: c.data } : null;
    if (!c) { c = { id: novoId() }; estado.coletas.push(c); }
    c.carcaca = v.carcaca; c.data = v.data; c.dia = v.dia.toUpperCase(); c.hora = v.hora; c.fase = v.fase; c.massa = v.massa; c.obs = v.obs; c.fora = v.fora === '1';
    ['tmax', 'tmin', 't16', 'ur', 'chuva', 'intervalo'].forEach(function (k) { c[k] = numOuVazio(v[k]); });
    if (antes && (antes.carcaca !== c.carcaca || antes.data !== c.data)) {
      var n = 0;
      estado.triagem.forEach(function (t) { if (String(t.carcaca) === antes.carcaca && t.data === antes.data) { t.carcaca = c.carcaca; t.data = c.data; n++; } });
      if (n) avisar(n + ' lote(s) da triagem acompanharam a nova data.');
    }
    fechar(); salvar();
  }

  var ultimoLote = null;
  function formLote(id) {
    var t = estado.triagem.filter(function (x) { return x.id === id; })[0];
    var r = C.calcular(estado);
    if (!t) {
      var ult = r.coletas[r.coletas.length - 1];
      t = ultimoLote ? { lote: proximoLote(ultimoLote.lote), carcaca: ultimoLote.carcaca, data: ultimoLote.data, origem: ultimoLote.origem, tipo: ultimoLote.tipo }
        : { carcaca: ult ? ult.carcaca : '1', data: ult ? ult.data : hojeISO(), origem: 'Shannon', tipo: 'Adulto coletado' };
    }
    var datas = r.coletas.map(function (c) { return [c.carcaca + '|' + c.data, 'Carcaça ' + c.carcaca + ' · ' + (c.dia || '') + ' · ' + dataBR(c.data)]; }).reverse();
    var atual = t.carcaca + '|' + t.data;
    if (!datas.some(function (d) { return d[0] === atual; })) datas.unshift([atual, 'Carcaça ' + t.carcaca + ' · ' + dataBR(t.data) + ' (coleta não lançada)']);
    abrir('<h2 style="margin-top:0">' + (id ? 'Editar lote' : 'Novo lote') + '</h2><div class="campos">' +
      '<label>Nº do lote (etiqueta)<input name="lote" value="' + esc(t.lote || '') + '" inputmode="numeric"></label>' +
      '<label>Nº de indivíduos<input name="n" inputmode="numeric" value="' + esc(t.n == null ? '' : t.n) + '"></label>' +
      '<label class="inteiro">Coleta (carcaça e data)<select name="coleta">' + opcoes(datas, atual) + '</select></label>' +
      '<label class="inteiro">Táxon<select name="taxon">' + opcoes(estado.taxons.map(function (x) { return [x.taxon, x.taxon + ' (' + x.familia + ')']; }), t.taxon, 'Escolha') + '</select></label>' +
      '<label>Tipo<select name="tipo">' + opcoes(C.TIPOS, t.tipo) + '</select></label>' +
      '<label>Origem<select name="origem">' + opcoes(C.ORIGENS, t.origem) + '</select></label>' +
      '<label class="inteiro">Observação<input name="obs" value="' + esc(t.obs || '') + '"></label>' +
      '<div class="calculado">Só “Adulto coletado” entra em frequências, índices e correlação. “Emergido da criação” entra como presença (sucessão e †). “Imaturo fixado” fica só registrado.</div></div>' +
      '<div class="acoes">' + (id ? '<button type="button" class="perigo" data-acao="excluir-lote" data-id="' + esc(id) + '">Excluir</button>' : '') + '<button type="button" data-acao="fechar">Cancelar</button>' + (id ? '' : '<button type="button" data-acao="salvar-lote-outro">Salvar e lançar outro</button>') + '<button type="button" class="primario" data-acao="salvar-lote" data-id="' + esc(id || '') + '">Salvar</button></div>');
  }
  function proximoLote(l) { var m = /^(.*?)(\d+)$/.exec(l || ''); return m ? m[1] + String(Number(m[2]) + 1).padStart(m[2].length, '0') : ''; }
  function salvarLote(id, outro) {
    var v = campos(), n = C.num(v.n);
    if (!v.taxon) return avisar('Escolha o táxon.');
    if (n === null || n < 0 || Math.floor(n) !== n) return avisar('Informe o número de indivíduos (inteiro).');
    var p = v.coleta.split('|');
    var t = estado.triagem.filter(function (x) { return x.id === id; })[0];
    if (!t) { t = { id: novoId() }; estado.triagem.push(t); }
    t.lote = v.lote; t.carcaca = p[0]; t.data = p[1]; t.origem = v.origem; t.tipo = v.tipo; t.taxon = v.taxon; t.n = n; t.obs = v.obs;
    ultimoLote = t; fechar(); salvar();
    if (outro) { formLote(null); avisar('Lote salvo.'); }
  }

  function formTaxon(i) {
    var t = i === null ? { ordem: 'Diptera', familia: '', taxon: '' } : estado.taxons[i];
    var usado = i !== null && estado.triagem.some(function (x) { return x.taxon === t.taxon; });
    abrir('<h2 style="margin-top:0">' + (i === null ? 'Novo táxon' : 'Editar táxon') + '</h2><div class="campos">' +
      '<label class="inteiro">Táxon<input name="taxon" value="' + esc(t.taxon) + '" placeholder="Gênero espécie ou Família spp."></label>' +
      '<label>Família<input name="familia" value="' + esc(t.familia) + '"></label><label>Ordem<input name="ordem" value="' + esc(t.ordem) + '"></label>' +
      (usado ? '<div class="calculado">Este táxon já tem lotes na triagem: ao mudar o nome, os lotes acompanham. Não pode ser excluído.</div>' : '') + '</div>' +
      '<div class="acoes">' + (i !== null && !usado ? '<button type="button" class="perigo" data-acao="excluir-taxon" data-i="' + i + '">Excluir</button>' : '') + '<button type="button" data-acao="fechar">Cancelar</button><button type="button" class="primario" data-acao="salvar-taxon" data-i="' + (i === null ? '' : i) + '">Salvar</button></div>');
  }
  function salvarTaxon(i) {
    var v = campos();
    if (!v.taxon || !v.familia || !v.ordem) return avisar('Preencha táxon, família e ordem.');
    if (estado.taxons.some(function (t, k) { return k !== i && t.taxon.toLowerCase() === v.taxon.toLowerCase(); })) return avisar('Este táxon já está na lista.');
    if (i === null) estado.taxons.push(v);
    else { var antigo = estado.taxons[i].taxon; estado.taxons[i] = v; estado.triagem.forEach(function (t) { if (t.taxon === antigo) t.taxon = v.taxon; }); }
    fechar(); salvar();
  }

  /* ---------- exportar ---------- */
  var CAB_COLETAS = ['Carcaça', 'Data', 'Dia de exposição', 'Hora real', 'Fase (Payne)', 'Tmáx ar do intervalo (°C)', 'Tmín ar do intervalo (°C)', 'Temp. média ar (°C)', 'T ar 16h (°C)', 'UR média INMET desde a coleta anterior (%)', 'Chuva INMET desde a coleta anterior (mm)', 'Massa larval presente? (Sim/Não)', 'Intervalo desde a coleta anterior (h)', 'Dia nº', 'Calliphoridae (adultos)', 'Sarcophagidae (adultos)', 'Muscidae (adultos)', 'Coleoptera (adultos)', 'Formicidae (adultos)', 'Total de adultos coletados', 'Total por 24 h', 'Observação', 'Fora do Spearman e da Figura 5 (Sim/Não)'];
  var CAB_TRIAGEM = ['Nº do lote', 'Carcaça', 'Data da coleta', 'Origem', 'Tipo', 'Táxon', 'Nº de indivíduos', 'Observação', 'Fase (da aba Coletas)', 'Família', 'Ordem', 'Dia nº'];
  function linhasColetas(r) {
    return r.coletas.map(function (c) { return [c.carcaca, { data: c.data }, c.dia, c.hora, c.fase, c.tmax, c.tmin, c.tmed, c.t16, c.ur, c.chuva, c.massa, c.intervalo, c.diaN, c.calliphoridae, c.sarcophagidae, c.muscidae, c.coleoptera, c.formicidae, c.total, c.por24, c.obs, c.fora ? 'Sim' : 'Não']; });
  }
  function linhasTriagem(r) {
    return r.triagem.map(function (t) { return [t.lote, t.carcaca, { data: t.data }, t.origem, t.tipo, t.taxon, t.n, t.obs, t.fase, t.familia, t.ordem, t.diaN]; });
  }
  function tabelasResultado(r) {
    var cd = {}; r.constDom.forEach(function (x) { cd[x.taxon] = x; });
    return {
      'Fases': [['Carcaça', 'Fase (Payne, 1965)', 'Início (data)', 'Término (data)', 'Duração (dias)', 'Nº de coletas', 'Temp. média ar (°C)', 'UR média (%)', 'Chuva total (mm)', 'Adultos coletados']].concat(r.fases.map(function (f) { return [f.carcaca, f.fase, { data: f.inicio }, { data: f.termino }, f.duracao, f.nColetas, f.tmed, f.ur, f.chuva, f.adultos]; })),
      'FA_FR': [['Táxon', 'Família', 'Ordem'].concat(r.SIGLAS.map(function (s) { return 'FA ' + s; }), r.SIGLAS.map(function (s) { return 'FR ' + s + ' (%)'; }), ['Total', 'FR total (%)'])].concat(r.faFr.map(function (l) { return [l.taxon, l.familia, l.ordem].concat(l.fa, l.fr, [l.total, l.frTotal]); }), [['Total da fase', '', ''].concat(r.totalFase, r.totalFase.map(function (v) { return v ? 100 : null; }), [r.totalGeral, r.totalGeral ? 100 : null])]),
      'Constância_Dominância': [['Táxon', 'Família', 'Coletas com o táxon', 'Constância (%)', 'Classe de constância', 'Indivíduos', 'Dominância (%)', 'Classe de dominância', 'Criado a partir de imaturos']].concat(r.constDom.map(function (x) { return [x.taxon, x.familia, x.coletasCom, x.constancia, x.classeConstancia, x.individuos, x.dominancia, x.classeDominancia, x.criado ? 'Sim' : 'Não']; })),
      'Índices': [['Fase', 'Riqueza (S)', 'Nº de indivíduos (N)', "Shannon-Wiener (H')", 'Simpson (1 − D)', "Pielou (J')"]].concat(r.indices.map(function (i) { return [i.fase, i.S, i.N, i.shannon, i.simpson, i.pielou]; })),
      'Jaccard': [[''].concat(r.FASES)].concat(r.FASES.map(function (f, i) { return [f].concat(r.jaccard[i]); })),
      'Spearman': [['Grupo', 'Variável', 'n', 'rho', 'p']].concat([].concat.apply([], r.spearman.map(function (g) { return g.variaveis.map(function (v) { return [g.grupo, v.nome, v.n, v.rho, v.p]; }); }))),
      'Sucessão': [['Táxon', 'Primeiro dia', 'Último dia', 'Dias de presença (extensão)']].concat(r.sucessao.map(function (s) { return [s.taxon, s.primeiro, s.ultimo, s.dias]; })),
      'Curva': [['Coleta nº', 'Riqueza acumulada (S)']].concat(r.curva.map(function (c) { return [c.n, c.S]; })),
      'Composição': [['Fase'].concat(r.GRUPOS, ['Total'])].concat(r.grupos.map(function (g) { return [g.sigla].concat(r.GRUPOS.map(function (n) { return g[n]; }), [g.total]); }))
    };
  }
  function celCSV(v) {
    if (v === null || v === undefined) return '';
    if (typeof v === 'object') return dataBR(v.data);
    if (typeof v === 'number') return String(Math.round(v * 1e6) / 1e6).replace('.', ',');
    var s = String(v);
    return /[";\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function paraCSV(linhas) { return '﻿' + linhas.map(function (l) { return l.map(celCSV).join(';'); }).join('\r\n') + '\r\n'; }
  function baixar(nome, conteudo, tipo) {
    var blob = conteudo instanceof Blob ? conteudo : new Blob([conteudo], { type: tipo });
    var iOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    try {
      var arq = new File([blob], nome, { type: tipo });
      if (iOS && navigator.canShare && navigator.canShare({ files: [arq] })) { navigator.share({ files: [arq], title: nome }).catch(function () { /* cancelado */ }); return; }
    } catch (e) { /* segue para o download comum */ }
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nome; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
  }
  function carimbo() { return hojeISO(); }
  function exportarJSON() {
    var copia = JSON.parse(JSON.stringify(estado)); copia.exportadoEm = new Date().toISOString(); copia.conjunto = banco.ativo;
    baixar('atena-' + banco.ativo + '-backup-' + carimbo() + '.json', JSON.stringify(copia, null, 1), 'application/json');
    meta.ultimoBackup = hojeISO(); salvarMeta();
  }
  function exportarResultadosCSV() {
    var t = tabelasResultado(calc()), linhas = [];
    Object.keys(t).forEach(function (nome) { linhas.push([nome]); t[nome].forEach(function (l) { linhas.push(l); }); linhas.push([]); });
    baixar('atena-' + banco.ativo + '-tabelas-' + carimbo() + '.csv', paraCSV(linhas), 'text/csv');
  }
  function carregarXLSX() {
    return new Promise(function (ok, erro) {
      if (window.XLSX) return ok(window.XLSX);
      var s = document.createElement('script'); s.src = XLSX_URL; s.crossOrigin = 'anonymous';
      s.onload = function () { ok(window.XLSX); }; s.onerror = function () { erro(new Error('sem rede')); };
      document.head.appendChild(s);
    });
  }
  /* Excel com as formulas vivas de todas as tabelas (para o orientador conferir) */
  function exportarFormulas() {
    carregarXLSX().then(function (X) {
      var wb = X.utils.book_new();
      window.AtenaPlanilha.montar(estado).forEach(function (f) {
        var ws = {}, maxL = 0, maxC = 0;
        Object.keys(f.cel).forEach(function (ref) {
          var c = f.cel[ref], d = X.utils.decode_cell(ref), o = typeof c.v === 'number' ? { t: 'n', v: c.v } : { t: 's', v: String(c.v) };
          if (c.f) o.f = c.f;
          if (c.z) o.z = c.z;
          ws[ref] = o; maxL = Math.max(maxL, d.r); maxC = Math.max(maxC, d.c);
        });
        ws['!ref'] = X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: maxL, c: maxC } });
        ws['!cols'] = f.larguras.map(function (w) { return { wch: w }; });
        X.utils.book_append_sheet(wb, ws, f.nome);
      });
      var dados = X.write(wb, { bookType: 'xlsx', type: 'array' }), tipo = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      baixar('atena-' + banco.ativo + '-formulas-' + carimbo() + '.xlsx', new Blob([dados], { type: tipo }), tipo);
    }).catch(function () { avisar('Para gerar o XLSX é preciso internet na primeira vez.'); });
  }
  function serial(iso) { return Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 86400000); }
  function exportarXLSX() {
    carregarXLSX().then(function (X) {
      var r = calc(), wb = X.utils.book_new();
      function folha(nome, linhas) {
        var ws = X.utils.aoa_to_sheet(linhas.map(function (l) {
          return l.map(function (v) {
            if (v && typeof v === 'object') return v.data ? { t: 'n', v: serial(v.data), z: 'dd/mm/yyyy' } : null;
            return v === undefined ? null : v;
          });
        }));
        ws['!cols'] = linhas[0].map(function (c) { return { wch: Math.max(10, Math.min(34, String(c).length + 2)) }; });
        X.utils.book_append_sheet(wb, ws, nome);
      }
      folha('Coletas', [CAB_COLETAS].concat(linhasColetas(r)));
      folha('Triagem', [CAB_TRIAGEM].concat(linhasTriagem(r)));
      folha('Táxons', [['Ordem', 'Família', 'Táxon']].concat(estado.taxons.map(function (t) { return [t.ordem, t.familia, t.taxon]; })));
      var t = tabelasResultado(r); Object.keys(t).forEach(function (n) { folha(n, t[n]); });
      var dados = X.write(wb, { bookType: 'xlsx', type: 'array' });
      baixar('atena-' + banco.ativo + '-' + carimbo() + '.xlsx', new Blob([dados], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    }).catch(function () { avisar('Para gerar o XLSX é preciso internet na primeira vez. Use o CSV ou o JSON.'); });
  }

  /* ---------- importar ---------- */
  /* NFKD tambem troca "º" por "o" (cabecalhos "Nº do lote", "Nº de indivíduos") */
  function semAcento(s) { return String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/°/g, 'o').toLowerCase().trim(); }
  function paraISO(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') return new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 86400000).toISOString().slice(0, 10);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    var s = String(v).trim(), m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
    if (m) return m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0');
    m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    return m ? m[1] + '-' + m[2] + '-' + m[3] : '';
  }
  function paraHora(v) {
    if (typeof v === 'number') { var min = Math.round((v % 1) * 1440); return String(Math.floor(min / 60)).padStart(2, '0') + ':' + String(min % 60).padStart(2, '0'); }
    return v == null ? '' : String(v).trim().slice(0, 5);
  }
  function lerCSV(texto) {
    texto = texto.replace(/^﻿/, '');
    var sep = (texto.split('\n')[0].match(/;/g) || []).length >= (texto.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
    var linhas = [], linha = [], cel = '', aspas = false;
    for (var i = 0; i < texto.length; i++) {
      var ch = texto[i];
      if (aspas) { if (ch === '"') { if (texto[i + 1] === '"') { cel += '"'; i++; } else aspas = false; } else cel += ch; }
      else if (ch === '"') aspas = true;
      else if (ch === sep) { linha.push(cel); cel = ''; }
      else if (ch === '\n') { linha.push(cel); linhas.push(linha); linha = []; cel = ''; }
      else if (ch !== '\r') cel += ch;
    }
    if (cel !== '' || linha.length) { linha.push(cel); linhas.push(linha); }
    return linhas.filter(function (l) { return l.some(function (c) { return c !== ''; }); });
  }
  /* converte uma matriz (cabecalho + linhas) em registros do app */
  function col(cab, prefixo) { for (var i = 0; i < cab.length; i++) if (semAcento(cab[i]).indexOf(prefixo) === 0) return i; return -1; }
  function matrizColetas(m) {
    var cab = m[0], ix = { carcaca: col(cab, 'carcaca'), data: col(cab, 'data'), dia: col(cab, 'dia de exp'), hora: col(cab, 'hora'), fase: col(cab, 'fase'), tmax: col(cab, 'tmax'), tmin: col(cab, 'tmin'), t16: col(cab, 't ar 16'), ur: col(cab, 'ur media'), chuva: col(cab, 'chuva'), massa: col(cab, 'massa'), intervalo: col(cab, 'intervalo'), obs: col(cab, 'observacao'), fora: col(cab, 'fora do spearman') };
    return m.slice(1).map(function (l) {
      var g = function (k) { return ix[k] < 0 ? '' : l[ix[k]]; };
      return { id: novoId(), carcaca: String(g('carcaca') == null ? '' : g('carcaca')).trim(), data: paraISO(g('data')), dia: String(g('dia') || '').trim().toUpperCase(), hora: paraHora(g('hora')), fase: String(g('fase') || '').trim(), tmax: numOuVazio(g('tmax')), tmin: numOuVazio(g('tmin')), t16: numOuVazio(g('t16')), ur: numOuVazio(g('ur')), chuva: numOuVazio(g('chuva')), massa: String(g('massa') || '').trim(), intervalo: numOuVazio(g('intervalo')), obs: String(g('obs') || '').trim(), fora: semAcento(g('fora')) === 'sim' };
    }).filter(function (c) { return c.carcaca !== '' && c.data; });
  }
  function matrizTriagem(m) {
    var cab = m[0], ix = { lote: col(cab, 'no do lote'), carcaca: col(cab, 'carcaca'), data: col(cab, 'data'), origem: col(cab, 'origem'), tipo: col(cab, 'tipo'), taxon: col(cab, 'taxon'), n: col(cab, 'no de individuos'), obs: col(cab, 'observacao') };
    if (ix.lote < 0) ix.lote = col(cab, 'n° do lote'); if (ix.lote < 0) ix.lote = col(cab, 'lote');
    if (ix.n < 0) ix.n = col(cab, 'n° de individuos'); if (ix.n < 0) ix.n = col(cab, 'individuos');
    return m.slice(1).map(function (l) {
      var g = function (k) { return ix[k] < 0 ? '' : l[ix[k]]; };
      return { id: novoId(), lote: String(g('lote') == null ? '' : g('lote')).trim(), carcaca: String(g('carcaca') == null ? '' : g('carcaca')).trim(), data: paraISO(g('data')), origem: String(g('origem') || '').trim(), tipo: String(g('tipo') || '').trim(), taxon: String(g('taxon') || '').trim(), n: C.num(g('n')) || 0, obs: String(g('obs') || '').trim() };
    }).filter(function (t) { return t.taxon && t.data; });
  }
  function aplicarImportacao(novo, origem) {
    var partes = [];
    if (novo.coletas) partes.push(novo.coletas.length + ' coletas');
    if (novo.triagem) partes.push(novo.triagem.length + ' lotes');
    if (novo.taxons) partes.push(novo.taxons.length + ' táxons');
    if (novo.fases) partes.push(novo.fases.length + ' fases');
    if (!partes.length) return avisar('Não encontrei coletas nem triagem neste arquivo.');
    if (!confirm('Importar de ' + origem + ' para o conjunto ' + NOMES[banco.ativo].toUpperCase() + ': ' + partes.join(', ') + '.' + (novo.conjunto && NOMES[novo.conjunto] && novo.conjunto !== banco.ativo ? '\n\nAtenção: este arquivo foi exportado do conjunto ' + NOMES[novo.conjunto] + '.' : '') + '\n\nIsto SUBSTITUI o que está lançado nessas partes do ' + NOMES[banco.ativo] + '. Continuar?')) return;
    ['coletas', 'triagem', 'taxons', 'fases', 'config'].forEach(function (k) { if (novo[k]) estado[k] = novo[k]; });
    estado.exemplo = !!novo.exemplo;
    /* taxons da triagem que nao estao na lista entram como "a classificar" */
    estado.triagem.forEach(function (t) { if (t.taxon && !estado.taxons.some(function (x) { return x.taxon === t.taxon; })) estado.taxons.push({ ordem: 'A classificar', familia: 'A classificar', taxon: t.taxon }); });
    estado = normalizar(estado); salvar(); avisar('Importação concluída: ' + partes.join(', ') + '.');
  }
  function importarArquivo(arq) {
    var nome = arq.name.toLowerCase();
    if (/\.xlsx$/.test(nome)) {
      carregarXLSX().then(function (X) { return arq.arrayBuffer().then(function (buf) {
        var wb = X.read(buf, { type: 'array' }), novo = {};
        function matriz(prefixo) {
          var n = wb.SheetNames.filter(function (s) { return semAcento(s).indexOf(prefixo) === 0; })[0];
          return n ? X.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: '' }) : null;
        }
        var m = matriz('coletas'); if (m && m.length) novo.coletas = matrizColetas(m);
        m = matriz('triagem'); if (m && m.length) novo.triagem = matrizTriagem(m);
        m = matriz('taxons'); if (m && m.length > 1) novo.taxons = m.slice(1).filter(function (l) { return l[2] && l.length >= 3 && String(l[0]).length < 40; }).map(function (l) { return { ordem: String(l[0]).trim(), familia: String(l[1]).trim(), taxon: String(l[2]).trim() }; });
        m = matriz('fases'); if (m && m.length > 1) novo.fases = m.slice(1).filter(function (l) { return C.FASES.indexOf(String(l[1]).trim()) >= 0 && (l[2] || l[3]); }).map(function (l) { return { carcaca: String(l[0]).trim(), fase: String(l[1]).trim(), inicio: paraISO(l[2]), termino: paraISO(l[3]) }; });
        if (novo.taxons && !novo.taxons.length) delete novo.taxons;
        aplicarImportacao(novo, 'planilha Excel');
      }); }).catch(function () { avisar('Não consegui ler o XLSX (é preciso internet na primeira vez).'); });
      return;
    }
    arq.text().then(function (texto) {
      if (/\.json$/.test(nome) || /^\s*\{/.test(texto)) {
        var o = JSON.parse(texto);
        if (!o || !Array.isArray(o.coletas) || !Array.isArray(o.triagem)) return avisar('Este JSON não é um backup do Atena.');
        return aplicarImportacao({ coletas: o.coletas, triagem: o.triagem, taxons: o.taxons, fases: o.fases || [], config: o.config, conjunto: o.conjunto, exemplo: o.exemplo }, 'backup JSON');
      }
      var m = lerCSV(texto);
      if (!m.length) return avisar('Arquivo vazio.');
      var cab = m[0].map(semAcento).join('|');
      if (cab.indexOf('taxon') >= 0 && cab.indexOf('tipo') >= 0) return aplicarImportacao({ triagem: matrizTriagem(m) }, 'CSV de triagem');
      if (cab.indexOf('dia de exp') >= 0) return aplicarImportacao({ coletas: matrizColetas(m) }, 'CSV de coletas');
      avisar('Não reconheci as colunas deste CSV. Use os CSV de Coletas ou de Triagem exportados pelo app.');
    }).catch(function () { avisar('Não consegui ler este arquivo.'); });
  }

  /* ---------- eventos ---------- */
  var acoes = {
    'nova-coleta': function () { formColeta(null); },
    'editar-coleta': function (d) { formColeta(d.id); },
    'salvar-coleta': function (d) { salvarColeta(d.id || null); },
    'excluir-coleta': function (d) {
      var c = estado.coletas.filter(function (x) { return x.id === d.id; })[0];
      var n = estado.triagem.filter(function (t) { return String(t.carcaca) === String(c.carcaca) && t.data === c.data; }).length;
      if (!confirm('Excluir esta coleta?' + (n ? ' Os ' + n + ' lote(s) da triagem desta data continuam lançados, mas saem dos cálculos.' : ''))) return;
      estado.coletas = estado.coletas.filter(function (x) { return x.id !== d.id; }); fechar(); salvar();
    },
    'novo-lote': function () { formLote(null); },
    'editar-lote': function (d) { formLote(d.id); },
    'salvar-lote': function (d) { salvarLote(d.id || null, false); },
    'salvar-lote-outro': function () { salvarLote(null, true); },
    'excluir-lote': function (d) { if (!confirm('Excluir este lote?')) return; estado.triagem = estado.triagem.filter(function (x) { return x.id !== d.id; }); fechar(); salvar(); },
    'novo-taxon': function () { formTaxon(null); },
    'editar-taxon': function (d) { formTaxon(Number(d.i)); },
    'salvar-taxon': function (d) { salvarTaxon(d.i === '' ? null : Number(d.i)); },
    'excluir-taxon': function (d) { estado.taxons.splice(Number(d.i), 1); fechar(); salvar(); },
    'fechar': fechar,
    'exp-json': exportarJSON,
    'exp-xlsx': exportarXLSX,
    'exp-formulas': exportarFormulas,
    'copiar-config': function () {
      var de = banco.conjuntos.piloto, para = banco.conjuntos.oficial;
      if (!confirm('Copiar do Piloto para o Oficial a lista de táxons (' + de.taxons.length + ') e as opções de cálculo?\n\nNão copia coletas, triagem nem datas das fases. A lista de táxons do Oficial será substituída' + (para.triagem.length ? '; táxons já usados na triagem do Oficial são mantidos.' : '.'))) return;
      var novos = JSON.parse(JSON.stringify(de.taxons));
      para.triagem.forEach(function (t) { if (t.taxon && !novos.some(function (x) { return x.taxon === t.taxon; })) { var antigo = para.taxons.filter(function (x) { return x.taxon === t.taxon; })[0]; novos.push(antigo || { ordem: 'A classificar', familia: 'A classificar', taxon: t.taxon }); } });
      para.taxons = novos; para.config = JSON.parse(JSON.stringify(C.lerConfig(de)));
      estado = banco.conjuntos[banco.ativo]; salvar(); avisar('Configuração do Piloto copiada para o Oficial.');
    },
    'exp-coletas': function () { baixar('atena-' + banco.ativo + '-coletas-' + carimbo() + '.csv', paraCSV([CAB_COLETAS].concat(linhasColetas(C.calcular(estado)))), 'text/csv'); },
    'exp-triagem': function () { baixar('atena-' + banco.ativo + '-triagem-' + carimbo() + '.csv', paraCSV([CAB_TRIAGEM].concat(linhasTriagem(C.calcular(estado)))), 'text/csv'); },
    'exp-resultados': exportarResultadosCSV,
    'importar': function () { var i = document.getElementById('arquivo'); i.value = ''; i.click(); },
    'exemplo': function () {
      if ((estado.coletas.length || estado.triagem.length) && !estado.exemplo && !confirm('Carregar o exemplo SUBSTITUI os dados lançados. Exporte um backup antes. Continuar?')) return;
      estado = normalizar(JSON.parse(JSON.stringify(window.ATENA_EXEMPLO))); salvar(); avisar('Exemplo fictício carregado.');
    },
    'apagar': function () {
      if (!confirm('Apagar todas as coletas, triagens e fases deste aparelho? A lista de táxons volta ao padrão.')) return;
      if (!estado.exemplo && (estado.coletas.length || estado.triagem.length) && !confirm('Tem certeza? Sem backup exportado, não há como recuperar.')) return;
      estado = C.estadoVazio(); salvar(); avisar('Tudo limpo. Pode começar.');
    }
  };
  document.addEventListener('click', function (e) {
    var cj = e.target.closest('[data-conjunto]');
    if (cj) {
      if (cj.dataset.conjunto !== banco.ativo) {
        banco.conjuntos[banco.ativo] = estado; banco.ativo = cj.dataset.conjunto; estado = banco.conjuntos[banco.ativo];
        visao.filtroTriagem = ''; visao.carcaca = 'todas'; ultimoLote = null; salvar(); avisar('Conjunto aberto: ' + NOMES[banco.ativo] + '.');
      }
      return;
    }
    var b = e.target.closest('[data-aba]');
    if (b) { aba = b.dataset.aba; desenhar(); window.scrollTo(0, 0); return; }
    b = e.target.closest('[data-acao]');
    if (b && acoes[b.dataset.acao]) { e.preventDefault(); acoes[b.dataset.acao](b.dataset); }
  });
  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.id === 'arquivo') { if (el.files[0]) importarArquivo(el.files[0]); return; }
    if (el.dataset.config) {
      estado.config = C.lerConfig(estado); estado.config[el.dataset.config] = el.type === 'checkbox' ? el.checked : el.value; salvar(); return;
    }
    if (el.dataset.visao) { visao[el.dataset.visao] = el.type === 'checkbox' ? el.checked : el.value; desenhar(); return; }
    if (el.dataset.fase) {
      var reg = estado.fases.filter(function (x) { return String(x.carcaca) === el.dataset.carcaca && x.fase === el.dataset.fase; })[0];
      if (!reg) { reg = { carcaca: el.dataset.carcaca, fase: el.dataset.fase, inicio: '', termino: '' }; estado.fases.push(reg); }
      reg[el.dataset.campo] = el.dataset.campo === 'duracaoManual' ? numOuVazio(el.value) : el.value;
      if (reg.inicio && reg.termino && reg.termino < reg.inicio) avisar('O término está antes do início. Confira as datas.');
      salvar();
    }
  });
  formulario.addEventListener('input', previaColeta);
  formulario.addEventListener('submit', function (e) { e.preventDefault(); });
  var tRedim; window.addEventListener('resize', function () { clearTimeout(tRedim); tRedim = setTimeout(function () { if (aba === 'resultados' && !dialogo.open) desenhar(); }, 250); });

  G.ligarDicas();
  desenhar();
  salvar(true);
  if (banco.migradoDaV1 && !meta.avisouMigracao) { meta.avisouMigracao = true; salvarMeta(); avisar('Atualização: seus dados anteriores agora estão no conjunto Piloto.'); }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () { /* ignora */ });
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(function () { /* sem offline */ });
  window.AtenaApp = { estado: function () { return estado; }, banco: function () { return banco; }, importarArquivo: importarArquivo };
})();
