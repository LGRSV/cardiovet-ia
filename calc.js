/* Atena - calculos da fauna entomonecrofaga.
   Replica as formulas da planilha de tabulacao (abas Coletas, Triagem, Fases,
   FA_FR, Constancia_Dominancia, Indices, Graficos, Sucessao, Curva) e acrescenta
   a correlacao de Spearman, que na planilha era feita no R.
   Funciona no navegador (window.AtenaCalc) e no Node (module.exports). */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AtenaCalc = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var FASES = ['Fresco', 'Gasoso', 'Decomposição ativa', 'Decomposição avançada', 'Seco', 'Restos'];
  var SIGLAS = ['F', 'G', 'DA', 'DAv', 'S', 'R'];
  var TIPOS = ['Adulto coletado', 'Emergido da criação', 'Imaturo fixado'];
  var ORIGENS = ['Shannon', 'Carcaça', 'Bandeja', 'Pitfall', 'Criação'];
  var ADULTO = 'Adulto coletado';
  var EMERGIDO = 'Emergido da criação';
  var GRUPOS = ['Calliphoridae', 'Sarcophagidae', 'Muscidae', 'Outros Diptera', 'Coleoptera', 'Formicidae', 'Outros'];

  var TAXONS_PADRAO = [
    ['Diptera', 'Calliphoridae', 'Chrysomya albiceps'], ['Diptera', 'Calliphoridae', 'Chrysomya megacephala'],
    ['Diptera', 'Calliphoridae', 'Chrysomya putoria'], ['Diptera', 'Calliphoridae', 'Cochliomyia macellaria'],
    ['Diptera', 'Calliphoridae', 'Lucilia eximia'], ['Diptera', 'Calliphoridae', 'Hemilucilia segmentaria'],
    ['Diptera', 'Calliphoridae', 'Hemilucilia semidiaphana'], ['Diptera', 'Sarcophagidae', 'Sarcophagidae spp.'],
    ['Diptera', 'Muscidae', 'Musca domestica'], ['Diptera', 'Muscidae', 'Hydrotaea spp.'],
    ['Diptera', 'Muscidae', 'Synthesiomyia nudiseta'], ['Diptera', 'Fanniidae', 'Fannia spp.'],
    ['Diptera', 'Phoridae', 'Phoridae spp.'], ['Diptera', 'Piophilidae', 'Piophilidae spp.'],
    ['Diptera', 'Stratiomyidae', 'Hermetia illucens'], ['Coleoptera', 'Dermestidae', 'Dermestes maculatus'],
    ['Coleoptera', 'Cleridae', 'Necrobia rufipes'], ['Coleoptera', 'Histeridae', 'Histeridae spp.'],
    ['Coleoptera', 'Staphylinidae', 'Staphylinidae spp.'], ['Coleoptera', 'Silphidae', 'Oxelytrum discicolle'],
    ['Coleoptera', 'Trogidae', 'Trogidae spp.'], ['Coleoptera', 'Scarabaeidae', 'Scarabaeinae spp.'],
    ['Coleoptera', 'Nitidulidae', 'Nitidulidae spp.'], ['Hymenoptera', 'Formicidae', 'Formicidae spp.'],
    ['Hymenoptera', 'Vespidae', 'Vespidae spp.'], ['Hymenoptera', 'Pteromalidae', 'Pteromalidae spp.']
  ].map(function (t) { return { ordem: t[0], familia: t[1], taxon: t[2] }; });

  function num(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return isFinite(v) ? v : null;
    var n = Number(String(v).trim().replace(',', '.'));
    return isFinite(n) ? n : null;
  }
  function chave(carcaca, data) {
    if (carcaca === '' || carcaca == null || !data) return '';
    return String(carcaca) + '|' + String(data);
  }
  /* "D2" -> 2 (coluna "Dia n." da planilha) */
  function diaNumero(dia) {
    if (dia === null || dia === undefined || dia === '') return null;
    return num(String(dia).toUpperCase().split('D').join(''));
  }
  function diasEntre(inicio, termino) {
    if (!inicio || !termino) return null;
    var a = Date.parse(inicio + 'T00:00:00Z'), b = Date.parse(termino + 'T00:00:00Z');
    if (isNaN(a) || isNaN(b)) return null;
    return Math.round((b - a) / 86400000);
  }
  function estadoVazio() {
    return { app: 'atena', versao: 1, taxons: JSON.parse(JSON.stringify(TAXONS_PADRAO)), coletas: [], triagem: [], fases: [] };
  }
  function classeConstancia(pct) { return pct > 50 ? 'Constante' : (pct >= 25 ? 'Acessória' : 'Acidental'); }
  function classeDominancia(pct) {
    return pct >= 32 ? 'Eudominante' : pct >= 10 ? 'Dominante' : pct >= 3.2 ? 'Subdominante' :
      pct >= 1 ? 'Recedente' : pct >= 0.32 ? 'Subrecedente' : 'Esporádica';
  }

  /* ---------- Spearman ---------- */
  function postos(v) {
    var idx = v.map(function (x, i) { return i; }).sort(function (a, b) { return v[a] - v[b]; });
    var r = new Array(v.length), i = 0;
    while (i < idx.length) {
      var j = i;
      while (j + 1 < idx.length && v[idx[j + 1]] === v[idx[i]]) j++;
      var m = (i + j) / 2 + 1;
      for (var k = i; k <= j; k++) r[idx[k]] = m;
      i = j + 1;
    }
    return r;
  }
  function pearson(x, y) {
    var n = x.length, mx = 0, my = 0, i;
    for (i = 0; i < n; i++) { mx += x[i]; my += y[i]; }
    mx /= n; my /= n;
    var sxy = 0, sxx = 0, syy = 0;
    for (i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) * (x[i] - mx); syy += (y[i] - my) * (y[i] - my); }
    if (sxx === 0 || syy === 0) return null;
    return sxy / Math.sqrt(sxx * syy);
  }
  function lnGama(z) {
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var x = z, y = z, tmp = x + 5.5; tmp -= (x + 0.5) * Math.log(tmp);
    var ser = 1.000000000190015;
    for (var j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }
  function betaCF(a, b, x) {
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < 1e-300) d = 1e-300; d = 1 / d; var h = d;
    for (var m = 1; m <= 300; m++) {
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300; c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300; d = 1 / d;
      var del = d * c; h *= del; if (Math.abs(del - 1) < 1e-14) break;
    }
    return h;
  }
  function betaInc(a, b, x) {
    if (x <= 0) return 0; if (x >= 1) return 1;
    var bt = Math.exp(lnGama(a + b) - lnGama(a) - lnGama(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betaCF(a, b, x) / a : 1 - bt * betaCF(b, a, 1 - x) / b;
  }
  /* p bilateral pela aproximacao t (a mesma que o R usa quando ha empates) */
  function spearman(x, y) {
    var px = [], py = [];
    for (var i = 0; i < x.length; i++) {
      var a = num(x[i]), b = num(y[i]);
      if (a !== null && b !== null) { px.push(a); py.push(b); }
    }
    var n = px.length;
    if (n < 3) return { n: n, rho: null, p: null };
    var rho = pearson(postos(px), postos(py));
    if (rho === null) return { n: n, rho: null, p: null };
    var p;
    if (Math.abs(rho) >= 1) p = 0;
    else { var t = rho * Math.sqrt((n - 2) / (1 - rho * rho)); p = betaInc((n - 2) / 2, 0.5, (n - 2) / (n - 2 + t * t)); }
    return { n: n, rho: rho, p: p };
  }

  /* ---------- calculo principal ---------- */
  function calcular(estado, opcoes) {
    opcoes = opcoes || {};
    var filtro = opcoes.carcaca && opcoes.carcaca !== 'todas' ? String(opcoes.carcaca) : null;
    var taxons = (estado.taxons || []).filter(function (t) { return t && t.taxon; });
    var infoTaxon = {};
    taxons.forEach(function (t) { if (!infoTaxon[t.taxon]) infoTaxon[t.taxon] = t; });

    var coletasBrutas = (estado.coletas || []).filter(function (c) { return !filtro || String(c.carcaca) === filtro; });
    var triagemBruta = (estado.triagem || []).filter(function (r) { return !filtro || String(r.carcaca) === filtro; });

    /* coletas em ordem cronologica por carcaca, como a planilha pede */
    var coletas = coletasBrutas.map(function (c, i) {
      var tmax = num(c.tmax), tmin = num(c.tmin), intervalo = num(c.intervalo);
      return {
        id: c.id, ordem: i, carcaca: String(c.carcaca == null ? '' : c.carcaca), data: c.data || '', dia: c.dia || '', hora: c.hora || '',
        fase: c.fase || '', tmax: tmax, tmin: tmin, t16: num(c.t16), ur: num(c.ur), chuva: num(c.chuva),
        massa: c.massa || '', intervalo: intervalo, obs: c.obs || '',
        tmed: (tmax === null || tmin === null) ? null : (tmax + tmin) / 2,
        chave: chave(c.carcaca, c.data), diaN: diaNumero(c.dia),
        calliphoridae: 0, sarcophagidae: 0, muscidae: 0, coleoptera: 0, formicidae: 0, total: 0, presentes: {}
      };
    });
    coletas.sort(function (a, b) {
      return a.carcaca < b.carcaca ? -1 : a.carcaca > b.carcaca ? 1 : a.data < b.data ? -1 : a.data > b.data ? 1 : a.ordem - b.ordem;
    });
    var porChave = {};
    coletas.forEach(function (c) { if (c.chave && !porChave[c.chave]) porChave[c.chave] = c; });

    var triagem = triagemBruta.map(function (r) {
      var k = chave(r.carcaca, r.data), c = porChave[k], t = infoTaxon[r.taxon];
      return {
        id: r.id, lote: r.lote || '', carcaca: String(r.carcaca == null ? '' : r.carcaca), data: r.data || '', origem: r.origem || '',
        tipo: r.tipo || '', taxon: r.taxon || '', n: num(r.n) || 0, obs: r.obs || '', chave: k,
        fase: k === '' ? '' : (c ? c.fase : 'coleta não lançada'),
        familia: r.taxon ? (t ? t.familia : 'táxon fora da lista') : '', ordem: r.taxon && t ? t.ordem : '',
        diaN: c ? c.diaN : null
      };
    });

    /* somas por coleta (colunas P a V da aba Coletas) */
    var somaPorChaveTaxon = {};
    triagem.forEach(function (r) {
      if (r.tipo !== ADULTO || !r.chave) return;
      var k = r.chave + '||' + r.taxon;
      somaPorChaveTaxon[k] = (somaPorChaveTaxon[k] || 0) + r.n;
    });
    coletas.forEach(function (c) {
      if (!c.chave) return;
      triagem.forEach(function (r) {
        if (r.tipo !== ADULTO || r.chave !== c.chave) return;
        c.total += r.n;
        if (r.familia === 'Calliphoridae') c.calliphoridae += r.n;
        if (r.familia === 'Sarcophagidae') c.sarcophagidae += r.n;
        if (r.familia === 'Muscidae') c.muscidae += r.n;
        if (r.ordem === 'Coleoptera') c.coleoptera += r.n;
        if (r.familia === 'Formicidae') c.formicidae += r.n;
      });
      taxons.forEach(function (t) { c.presentes[t.taxon] = (somaPorChaveTaxon[c.chave + '||' + t.taxon] || 0) > 0 ? 1 : 0; });
      c.por24 = (c.intervalo === null || c.intervalo === 0) ? null : c.total / (c.intervalo / 24);
    });
    function por24(c, campo) { return (c.intervalo === null || c.intervalo === 0 || !c.chave) ? null : c[campo] / (c.intervalo / 24); }

    /* FA e FR por fase (aba FA_FR) */
    var totalFase = FASES.map(function () { return 0; });
    var faFr = taxons.map(function (t) {
      var fa = FASES.map(function (f) {
        var s = 0;
        triagem.forEach(function (r) { if (r.taxon === t.taxon && r.fase === f && r.tipo === ADULTO) s += r.n; });
        return s;
      });
      fa.forEach(function (v, i) { totalFase[i] += v; });
      return { taxon: t.taxon, familia: t.familia, ordem: t.ordem, fa: fa, total: fa.reduce(function (a, b) { return a + b; }, 0) };
    });
    var totalGeral = totalFase.reduce(function (a, b) { return a + b; }, 0);
    faFr.forEach(function (l) {
      l.fr = l.fa.map(function (v, i) { return totalFase[i] === 0 ? null : v / totalFase[i] * 100; });
      l.frTotal = totalGeral === 0 ? null : l.total / totalGeral * 100;
    });

    /* constancia e dominancia */
    var coletasLancadas = coletas.filter(function (c) { return c.chave !== ''; });
    var nColetas = coletasLancadas.length;
    var constDom = faFr.map(function (l) {
      var com = 0;
      coletasLancadas.forEach(function (c) { com += c.presentes[l.taxon] || 0; });
      var constancia = nColetas === 0 ? null : com / nColetas * 100;
      var dominancia = totalGeral === 0 ? null : l.total / totalGeral * 100;
      return {
        taxon: l.taxon, familia: l.familia, ordem: l.ordem, coletasCom: com, constancia: constancia,
        classeConstancia: (constancia === null || com === 0) ? '' : classeConstancia(constancia),
        individuos: l.total, dominancia: dominancia,
        classeDominancia: (dominancia === null || l.total === 0) ? '' : classeDominancia(dominancia),
        criado: triagem.some(function (r) { return r.taxon === l.taxon && r.tipo === EMERGIDO; })
      };
    });

    /* indices de diversidade por fase e Jaccard */
    var indices = FASES.map(function (f, i) {
      var N = totalFase[i], S = 0, h = 0, d = 0;
      faFr.forEach(function (l) {
        var v = l.fa[i];
        if (v > 0) S++;
        if (N > 0 && v > 0) { var p = v / N; h += p * Math.log(p); d += p * p; }
      });
      var H = N === 0 ? null : -h;
      return { fase: f, sigla: SIGLAS[i], S: S, N: N, shannon: H, simpson: N === 0 ? null : 1 - d, pielou: (S < 2 || H === null) ? null : H / Math.log(S) };
    });
    var jaccard = FASES.map(function (a, i) {
      return FASES.map(function (b, j) {
        if (indices[i].S === 0 || indices[j].S === 0) return null;
        var comuns = 0;
        faFr.forEach(function (l) { if (l.fa[i] > 0 && l.fa[j] > 0) comuns++; });
        return comuns / (indices[i].S + indices[j].S - comuns);
      });
    });

    /* composicao por grupo em cada fase (tabela da aba Graficos) */
    var grupos = FASES.map(function (f, i) {
      var g = { fase: f, sigla: SIGLAS[i], Calliphoridae: 0, Sarcophagidae: 0, Muscidae: 0, Coleoptera: 0, Formicidae: 0, total: 0 }, diptera = 0;
      triagem.forEach(function (r) {
        if (r.fase !== f || r.tipo !== ADULTO) return;
        g.total += r.n;
        if (r.ordem === 'Diptera') diptera += r.n;
        if (r.ordem === 'Coleoptera') g.Coleoptera += r.n;
        if (r.familia === 'Calliphoridae' || r.familia === 'Sarcophagidae' || r.familia === 'Muscidae' || r.familia === 'Formicidae') g[r.familia] += r.n;
      });
      g['Outros Diptera'] = diptera - g.Calliphoridae - g.Sarcophagidae - g.Muscidae;
      g.Outros = g.total - diptera - g.Coleoptera - g.Formicidae;
      return g;
    });

    /* sucessao: primeiro e ultimo dia com registro (adultos coletados ou emergidos) */
    var sucessao = taxons.map(function (t) {
      var min = null, max = null;
      triagem.forEach(function (r) {
        if (r.taxon !== t.taxon || (r.tipo !== ADULTO && r.tipo !== EMERGIDO) || r.diaN === null || !(r.diaN > 0)) return;
        if (min === null || r.diaN < min) min = r.diaN;
        if (max === null || r.diaN > max) max = r.diaN;
      });
      return { taxon: t.taxon, familia: t.familia, ordem: t.ordem, primeiro: min, ultimo: max, dias: min === null ? null : max - min + 1 };
    });

    /* curva do coletor: riqueza acumulada coleta a coleta */
    var vistos = {}, acumulado = 0;
    var curva = coletasLancadas.map(function (c, i) {
      taxons.forEach(function (t) { if (c.presentes[t.taxon] && !vistos[t.taxon]) { vistos[t.taxon] = 1; acumulado++; } });
      return { n: i + 1, carcaca: c.carcaca, dia: c.dia, data: c.data, S: acumulado };
    });

    /* fases (Tabela 1): uma linha por fase em cada carcaca */
    var carcacas = [];
    coletasBrutas.concat(triagemBruta).concat((estado.fases || []).filter(function (f) { return f.inicio || f.termino; })).forEach(function (o) {
      var k = String(o.carcaca == null ? '' : o.carcaca);
      if (k !== '' && carcacas.indexOf(k) < 0 && (!filtro || k === filtro)) carcacas.push(k);
    });
    carcacas.sort();
    if (!carcacas.length) carcacas = [filtro || '1'];
    var fases = [];
    carcacas.forEach(function (cc) {
      FASES.forEach(function (f, i) {
        var reg = (estado.fases || []).filter(function (x) { return String(x.carcaca) === cc && x.fase === f; })[0] || {};
        var cs = coletas.filter(function (c) { return c.fase === f && c.carcaca === cc; });
        var tm = cs.filter(function (c) { return c.tmed !== null; }), ur = cs.filter(function (c) { return c.ur !== null; });
        var adultos = 0;
        triagem.forEach(function (r) { if (r.fase === f && r.carcaca === cc && r.tipo === ADULTO) adultos += r.n; });
        fases.push({
          carcaca: cc, fase: f, sigla: SIGLAS[i], inicio: reg.inicio || '', termino: reg.termino || '',
          duracao: diasEntre(reg.inicio, reg.termino), nColetas: cs.length,
          tmed: tm.length ? tm.reduce(function (a, c) { return a + c.tmed; }, 0) / tm.length : null,
          ur: ur.length ? ur.reduce(function (a, c) { return a + c.ur; }, 0) / ur.length : null,
          chuva: cs.length === 0 ? null : cs.reduce(function (a, c) { return a + (c.chuva || 0); }, 0),
          adultos: adultos
        });
      });
    });

    /* Spearman (Tabela 5): abundancia por 24 h x temperatura media, UR e chuva */
    var base = coletasLancadas.filter(function (c) { return !opcoes.ate15 || (c.diaN !== null && c.diaN <= 15); });
    var gruposSp = [['Calliphoridae', 'calliphoridae'], ['Sarcophagidae', 'sarcophagidae'], ['Muscidae', 'muscidae'], ['Coleoptera', 'coleoptera'], ['Formicidae', 'formicidae'], ['Total', 'total']];
    var variaveis = [['Temperatura média (°C)', 'tmed'], ['Umidade relativa (%)', 'ur'], ['Precipitação (mm)', 'chuva']];
    var spearmanTab = gruposSp.map(function (g) {
      var y = base.map(function (c) { return por24(c, g[1]); });
      return {
        grupo: g[0], campo: g[1],
        variaveis: variaveis.map(function (v) {
          var r = spearman(base.map(function (c) { return c[v[1]]; }), y);
          r.nome = v[0]; r.campo = v[1];
          return r;
        })
      };
    });

    var comRegistro = faFr.filter(function (l) { return l.total > 0; });
    var resumo = {
      nColetas: nColetas, nLotes: triagem.length, individuos: totalGeral, taxons: comRegistro.length,
      familias: Object.keys(comRegistro.reduce(function (a, l) { a[l.familia] = 1; return a; }, {})).length,
      ordens: Object.keys(comRegistro.reduce(function (a, l) { a[l.ordem] = 1; return a; }, {})).length,
      pendentes: triagem.filter(function (r) { return r.fase === 'coleta não lançada'; }).length
    };

    return {
      FASES: FASES, SIGLAS: SIGLAS, GRUPOS: GRUPOS, carcacas: carcacas, coletas: coletas, triagem: triagem, fases: fases,
      faFr: faFr, totalFase: totalFase, totalGeral: totalGeral, constDom: constDom, nColetas: nColetas, indices: indices,
      jaccard: jaccard, grupos: grupos, sucessao: sucessao, curva: curva, spearman: spearmanTab, resumo: resumo, por24: por24
    };
  }

  return {
    FASES: FASES, SIGLAS: SIGLAS, TIPOS: TIPOS, ORIGENS: ORIGENS, GRUPOS: GRUPOS, TAXONS_PADRAO: TAXONS_PADRAO,
    calcular: calcular, spearman: spearman, postos: postos, diaNumero: diaNumero, diasEntre: diasEntre,
    classeConstancia: classeConstancia, classeDominancia: classeDominancia, estadoVazio: estadoVazio, num: num, chave: chave
  };
});
