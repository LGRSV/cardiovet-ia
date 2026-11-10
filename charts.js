/* Atena - graficos em SVG proprio (sem biblioteca). Cada funcao desenha na largura real do elemento. */
(function () {
  'use strict';
  var COR = { s1: 'var(--s1)', s2: 'var(--s2)', s3: 'var(--s3)', s4: 'var(--s4)', s5: 'var(--s5)', s6: 'var(--s6)', s7: 'var(--s7)' };
  var CORES_GRUPO = [COR.s1, COR.s2, COR.s3, COR.s4, COR.s5, COR.s6, COR.s7];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function fmt(v, d) { return v === null || v === undefined || isNaN(v) ? '–' : Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); }
  function ticks(min, max, n) {
    if (min === max) { max = min + 1; }
    var passo = Math.pow(10, Math.floor(Math.log10((max - min) / n))), err = (max - min) / n / passo;
    passo *= err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1;
    var t = [], a = Math.floor(min / passo) * passo, b = Math.ceil(max / passo) * passo;
    for (var v = a; v <= b + passo / 2; v += passo) t.push(Math.round(v * 1e6) / 1e6);
    return t;
  }
  function vazio(el, msg) { el.innerHTML = '<p class="vazio">' + esc(msg || 'Sem dados ainda. Lance coletas e triagens para ver este gráfico.') + '</p>'; }
  function legenda(itens) {
    return '<div class="legenda">' + itens.map(function (i) {
      return '<span><i style="background:' + i.cor + '"></i>' + esc(i.nome) + '</span>';
    }).join('') + '</div>';
  }
  /* moldura: devolve funcoes de escala e o svg dos eixos */
  function moldura(el, o) {
    var W = Math.max(280, el.clientWidth || 340), H = o.altura || 240;
    var m = { e: o.margemEsq || 40, d: o.margemDir || 14, t: o.margemTopo || 16, b: o.margemBase || 34 };
    var pw = W - m.e - m.d, ph = H - m.t - m.b;
    var ty = ticks(o.ymin, o.ymax, 4), y0 = ty[0], y1 = ty[ty.length - 1];
    var X = function (v) { return m.e + (o.xmax === o.xmin ? pw / 2 : (v - o.xmin) / (o.xmax - o.xmin) * pw); };
    var Y = function (v) { return m.t + ph - (v - y0) / (y1 - y0) * ph; };
    var s = '';
    ty.forEach(function (t) {
      s += '<line class="grade" x1="' + m.e + '" x2="' + (W - m.d) + '" y1="' + Y(t) + '" y2="' + Y(t) + '"/>' +
        '<text class="eixo" x="' + (m.e - 6) + '" y="' + (Y(t) + 3.5) + '" text-anchor="end">' + fmt(t, o.decY || 0) + '</text>';
    });
    s += '<line class="base" x1="' + m.e + '" x2="' + (W - m.d) + '" y1="' + Y(y0) + '" y2="' + Y(y0) + '"/>';
    if (o.rotY) s += '<text class="rotulo" transform="translate(11,' + (m.t + ph / 2) + ') rotate(-90)" text-anchor="middle">' + esc(o.rotY) + '</text>';
    if (o.rotX) s += '<text class="rotulo" x="' + (m.e + pw / 2) + '" y="' + (H - 4) + '" text-anchor="middle">' + esc(o.rotX) + '</text>';
    return { W: W, H: H, m: m, pw: pw, ph: ph, X: X, Y: Y, y0: y0, y1: y1, eixos: s };
  }
  function rotulosX(f, valores, texto) {
    var passo = Math.max(1, Math.ceil(valores.length / Math.max(4, Math.floor(f.pw / 34)))), s = '';
    valores.forEach(function (v, i) {
      if (i % passo) return;
      s += '<text class="eixo" x="' + f.X(v) + '" y="' + (f.H - f.m.b + 14) + '" text-anchor="middle">' + esc(texto ? texto(v, i) : v) + '</text>';
    });
    return s;
  }
  /* faixas das fases de decomposicao ao fundo: [{sigla, ini, fim}] em unidades do eixo x */
  function faixas(f, lista, meio) {
    var s = '';
    lista.forEach(function (b, i) {
      var x1 = Math.max(f.m.e, f.X(b.ini - meio)), x2 = Math.min(f.W - f.m.d, f.X(b.fim + meio));
      if (x2 <= x1) return;
      s += '<rect class="faixa' + (i % 2 ? ' alt' : '') + '" x="' + x1 + '" y="' + f.m.t + '" width="' + (x2 - x1) + '" height="' + f.ph + '"/>' +
        '<text class="sigla" x="' + ((x1 + x2) / 2) + '" y="' + (f.m.t - 4) + '" text-anchor="middle">' + esc(b.sigla) + '</text>';
    });
    return s;
  }
  function faixasDeColetas(coletas, SIGLAS, FASES) {
    var lista = [];
    coletas.forEach(function (c) {
      if (c.diaN === null || !c.fase) return;
      var u = lista[lista.length - 1];
      if (u && u.fase === c.fase) u.fim = c.diaN;
      else lista.push({ fase: c.fase, sigla: SIGLAS[FASES.indexOf(c.fase)] || '', ini: c.diaN, fim: c.diaN });
    });
    for (var i = 0; i < lista.length - 1; i++) { var meio = (lista[i].fim + lista[i + 1].ini) / 2; lista[i].fim = meio; lista[i + 1].ini = meio; }
    return lista;
  }
  function svg(f, corpo, titulo) {
    return '<svg role="img" aria-label="' + esc(titulo) + '" width="' + f.W + '" height="' + f.H + '" viewBox="0 0 ' + f.W + ' ' + f.H + '">' + corpo + '</svg>';
  }
  function caminho(f, pts) {
    return pts.map(function (p, i) { return (i ? 'L' : 'M') + f.X(p[0]).toFixed(1) + ' ' + f.Y(p[1]).toFixed(1); }).join(' ');
  }

  /* Figura 2: temperatura maxima e minima por dia de exposicao, com as fases em faixas; chuva em painel proprio */
  function temperatura(el, r, coletas) {
    var cs = coletas.filter(function (c) { return c.diaN !== null && (c.tmax !== null || c.tmin !== null); });
    if (!cs.length) return vazio(el);
    var xs = cs.map(function (c) { return c.diaN; }), todos = [];
    cs.forEach(function (c) { if (c.tmax !== null) todos.push(c.tmax); if (c.tmin !== null) todos.push(c.tmin); });
    var f = moldura(el, { xmin: Math.min.apply(0, xs) - 0.5, xmax: Math.max.apply(0, xs) + 0.5, ymin: Math.min.apply(0, todos), ymax: Math.max.apply(0, todos), rotY: 'Temperatura (°C)', rotX: 'Dia de exposição', margemEsq: 44, margemDir: 34 });
    var corpo = faixas(f, faixasDeColetas(cs, r.SIGLAS, r.FASES), 0) + f.eixos + rotulosX(f, xs, function (v) { return 'D' + v; });
    [['tmax', COR.s2, 'máx.'], ['tmin', COR.s1, 'mín.']].forEach(function (sr) {
      var pts = cs.filter(function (c) { return c[sr[0]] !== null; }).map(function (c) { return [c.diaN, c[sr[0]]]; });
      if (!pts.length) return;
      corpo += '<path class="linha" stroke="' + sr[1] + '" d="' + caminho(f, pts) + '"/>';
      var u = pts[pts.length - 1];
      corpo += '<text class="direto" x="' + (f.X(u[0]) + 5) + '" y="' + (f.Y(u[1]) + 4) + '">' + sr[2] + '</text>';
    });
    cs.forEach(function (c) {
      var dica = 'D' + c.diaN + ' · ' + c.fase + ' · máx. ' + fmt(c.tmax, 1) + ' °C · mín. ' + fmt(c.tmin, 1) + ' °C';
      if (c.tmax !== null) corpo += '<circle class="ponto" r="3.5" fill="' + COR.s2 + '" cx="' + f.X(c.diaN) + '" cy="' + f.Y(c.tmax) + '"/>';
      if (c.tmin !== null) corpo += '<circle class="ponto" r="3.5" fill="' + COR.s1 + '" cx="' + f.X(c.diaN) + '" cy="' + f.Y(c.tmin) + '"/>';
      corpo += '<rect class="alvo" data-dica="' + esc(dica) + '" x="' + (f.X(c.diaN) - 9) + '" y="' + f.m.t + '" width="18" height="' + f.ph + '"/>';
    });
    var html = legenda([{ nome: 'Tmáx do intervalo', cor: COR.s2 }, { nome: 'Tmín do intervalo', cor: COR.s1 }]) + svg(f, corpo, 'Temperaturas ao longo do experimento');
    var chuva = cs.filter(function (c) { return c.chuva !== null; });
    if (chuva.length && chuva.some(function (c) { return c.chuva > 0; })) {
      var g = moldura(el, { altura: 130, xmin: Math.min.apply(0, xs) - 0.5, xmax: Math.max.apply(0, xs) + 0.5, ymin: 0, ymax: Math.max.apply(0, chuva.map(function (c) { return c.chuva; })), rotY: 'Chuva (mm)', margemEsq: 44, margemDir: 34, margemTopo: 8, margemBase: 22 });
      var lb = Math.max(3, Math.min(16, g.pw / (xs.length * 1.6))), cp = g.eixos + rotulosX(g, xs, function (v) { return 'D' + v; });
      chuva.forEach(function (c) {
        var y = g.Y(c.chuva), h = g.Y(0) - y;
        cp += '<rect class="barra" fill="' + COR.s1 + '" data-dica="D' + c.diaN + ' · chuva ' + fmt(c.chuva, 1) + ' mm" x="' + (g.X(c.diaN) - lb / 2) + '" y="' + y + '" width="' + lb + '" height="' + Math.max(0, h) + '" rx="2"/>';
      });
      html += svg(g, cp, 'Chuva por intervalo de coleta');
    }
    el.innerHTML = html;
  }

  /* Figura 3: diagrama de sucessao */
  function sucessao(el, r, coletasFaixa) {
    var linhas = r.sucessao.filter(function (s) { return s.primeiro !== null; });
    if (!linhas.length) return vazio(el);
    var ordens = [], cores = {};
    linhas.forEach(function (l) { if (ordens.indexOf(l.ordem) < 0) ordens.push(l.ordem); });
    ordens.forEach(function (o, i) { cores[o] = CORES_GRUPO[Math.min(i, 6)]; });
    var W = Math.max(280, el.clientWidth || 340), rotW = Math.min(150, W * 0.42), alt = 20;
    var max = Math.max.apply(0, linhas.map(function (l) { return l.ultimo; })), min = Math.min.apply(0, linhas.map(function (l) { return l.primeiro; }));
    var f = { W: W, H: linhas.length * alt + 46, m: { e: rotW, d: 12, t: 18, b: 28 } };
    f.pw = W - f.m.e - f.m.d; f.ph = linhas.length * alt;
    f.X = function (v) { return f.m.e + (v - (min - 0.5)) / (max - min + 1) * f.pw; };
    var dias = []; for (var d = min; d <= max; d++) dias.push(d);
    var corpo = (coletasFaixa ? faixas(f, faixasDeColetas(coletasFaixa, r.SIGLAS, r.FASES), 0) : '') + rotulosX(f, dias, function (v) { return 'D' + v; });
    corpo += '<text class="rotulo" x="' + (f.m.e + f.pw / 2) + '" y="' + (f.H - 2) + '" text-anchor="middle">Dia de exposição</text>';
    linhas.forEach(function (l, i) {
      var y = f.m.t + i * alt, x1 = f.X(l.primeiro - 0.5), x2 = f.X(l.ultimo + 0.5);
      var nome = l.taxon.length > 24 && rotW < 150 ? l.taxon.slice(0, 22) + '…' : l.taxon;
      corpo += '<text class="taxon" x="' + (rotW - 6) + '" y="' + (y + alt / 2 + 4) + '" text-anchor="end">' + esc(nome) + '</text>' +
        '<rect class="barra" fill="' + cores[l.ordem] + '" data-dica="' + esc(l.taxon + ' · D' + l.primeiro + ' a D' + l.ultimo + ' · ' + l.dias + ' dia(s) de extensão') + '" x="' + x1 + '" y="' + (y + 4) + '" width="' + Math.max(3, x2 - x1) + '" height="' + (alt - 8) + '" rx="3"/>';
    });
    el.innerHTML = legenda(ordens.map(function (o) { return { nome: o || 'Sem ordem', cor: cores[o] }; })) + svg(f, corpo, 'Diagrama de sucessão');
  }

  /* Figura 4: composicao por fase (barras empilhadas de 100%) */
  function composicao(el, r) {
    var fases = r.grupos.filter(function (g) { return g.total > 0; });
    if (!fases.length) return vazio(el);
    var f = moldura(el, { xmin: 0, xmax: r.grupos.length, ymin: 0, ymax: 100, rotY: 'Frequência relativa (%)', rotX: 'Fase de decomposição', margemEsq: 44 });
    var lb = Math.min(46, f.pw / r.grupos.length * 0.62), corpo = f.eixos;
    r.grupos.forEach(function (g, i) {
      var cx = f.X(i + 0.5), acum = 0;
      corpo += '<text class="eixo" x="' + cx + '" y="' + (f.H - f.m.b + 14) + '" text-anchor="middle">' + g.sigla + '</text>';
      if (!g.total) return;
      r.GRUPOS.forEach(function (nome, k) {
        var v = g[nome]; if (!(v > 0)) return;
        var pct = v / g.total * 100, y2 = f.Y(acum), y1 = f.Y(acum + pct); acum += pct;
        corpo += '<rect class="barra" fill="' + CORES_GRUPO[k] + '" data-dica="' + esc(g.fase + ' · ' + nome + ': ' + fmt(pct, 1) + '% (' + v + ' ind.)') + '" x="' + (cx - lb / 2) + '" y="' + (y1 + 1) + '" width="' + lb + '" height="' + Math.max(0.5, y2 - y1 - 2) + '" rx="2"/>';
      });
    });
    el.innerHTML = legenda(r.GRUPOS.map(function (n, k) { return { nome: n, cor: CORES_GRUPO[k] }; })) + svg(f, corpo, 'Composição da fauna por fase');
  }

  /* Figura 5: abundancia por 24 h e temperatura. Dois paineis com o mesmo eixo x (unidades diferentes nao dividem um eixo). */
  function abundancia(el, r, coletas) {
    var cs = coletas.filter(function (c) { return c.diaN !== null && c.por24 !== null && c.por24 !== undefined; });
    if (!cs.length) return vazio(el);
    var xs = cs.map(function (c) { return c.diaN; }), xmin = Math.min.apply(0, xs) - 0.5, xmax = Math.max.apply(0, xs) + 0.5;
    var f = moldura(el, { altura: 200, xmin: xmin, xmax: xmax, ymin: 0, ymax: Math.max.apply(0, cs.map(function (c) { return c.por24; })), rotY: 'Indivíduos por 24 h', margemEsq: 48, margemDir: 34, margemBase: 22 });
    var lb = Math.max(3, Math.min(18, f.pw / (xs.length * 1.5)));
    var corpo = faixas(f, faixasDeColetas(cs, r.SIGLAS, r.FASES), 0) + f.eixos + rotulosX(f, xs, function (v) { return 'D' + v; });
    cs.forEach(function (c) {
      var y = f.Y(c.por24);
      corpo += '<rect class="barra" fill="' + COR.s1 + '" data-dica="' + esc('D' + c.diaN + ' · ' + fmt(c.por24, 1) + ' ind./24 h (' + c.total + ' em ' + fmt(c.intervalo) + ' h)') + '" x="' + (f.X(c.diaN) - lb / 2) + '" y="' + y + '" width="' + lb + '" height="' + Math.max(0, f.Y(0) - y) + '" rx="2"/>';
    });
    var ct = cs.filter(function (c) { return c.tmax !== null || c.tmin !== null; }), html = svg(f, corpo, 'Abundância por 24 horas');
    if (ct.length) {
      var todos = []; ct.forEach(function (c) { if (c.tmax !== null) todos.push(c.tmax); if (c.tmin !== null) todos.push(c.tmin); });
      var g = moldura(el, { altura: 170, xmin: xmin, xmax: xmax, ymin: Math.min.apply(0, todos), ymax: Math.max.apply(0, todos), rotY: 'Temperatura (°C)', rotX: 'Dia de exposição', margemEsq: 48, margemDir: 34, margemTopo: 8 });
      var cp = g.eixos + rotulosX(g, xs, function (v) { return 'D' + v; });
      [['tmax', COR.s2, 'máx.'], ['tmin', COR.s4, 'mín.']].forEach(function (sr) {
        var pts = ct.filter(function (c) { return c[sr[0]] !== null; }).map(function (c) { return [c.diaN, c[sr[0]]]; });
        if (!pts.length) return;
        cp += '<path class="linha" stroke="' + sr[1] + '" d="' + caminho(g, pts) + '"/>';
        cp += '<text class="direto" x="' + (g.X(pts[pts.length - 1][0]) + 5) + '" y="' + (g.Y(pts[pts.length - 1][1]) + 4) + '">' + sr[2] + '</text>';
      });
      ct.forEach(function (c) {
        cp += '<rect class="alvo" data-dica="' + esc('D' + c.diaN + ' · máx. ' + fmt(c.tmax, 1) + ' °C · mín. ' + fmt(c.tmin, 1) + ' °C') + '" x="' + (g.X(c.diaN) - 9) + '" y="' + g.m.t + '" width="18" height="' + g.ph + '"/>';
      });
      html += svg(g, cp, 'Temperatura máxima e mínima');
    }
    el.innerHTML = legenda([{ nome: 'Adultos por 24 h', cor: COR.s1 }, { nome: 'Tmáx', cor: COR.s2 }, { nome: 'Tmín', cor: COR.s4 }]) + html;
  }

  /* Figura 6: curva do coletor */
  function curva(el, r) {
    if (!r.curva.length) return vazio(el);
    var f = moldura(el, { xmin: 0.5, xmax: r.curva.length + 0.5, ymin: 0, ymax: Math.max(1, r.curva[r.curva.length - 1].S), rotY: 'Riqueza acumulada (S)', rotX: 'Nº de coletas', margemEsq: 44 });
    var pts = r.curva.map(function (c) { return [c.n, c.S]; });
    var corpo = f.eixos + rotulosX(f, r.curva.map(function (c) { return c.n; })) + '<path class="linha" stroke="' + COR.s1 + '" d="' + caminho(f, pts) + '"/>';
    r.curva.forEach(function (c) {
      corpo += '<circle class="ponto" r="3.5" fill="' + COR.s1 + '" cx="' + f.X(c.n) + '" cy="' + f.Y(c.S) + '"/>' +
        '<rect class="alvo" data-dica="' + esc('Coleta ' + c.n + ' (carcaça ' + c.carcaca + ', ' + c.dia + ') · S acumulada = ' + c.S) + '" x="' + (f.X(c.n) - 9) + '" y="' + f.m.t + '" width="18" height="' + f.ph + '"/>';
    });
    el.innerHTML = svg(f, corpo, 'Curva do coletor');
  }

  /* dispersao para a correlacao escolhida */
  function dispersao(el, pares, rotX, rotY) {
    if (pares.length < 3) return vazio(el, 'São necessárias pelo menos 3 coletas com os dois valores preenchidos.');
    var xs = pares.map(function (p) { return p.x; }), ys = pares.map(function (p) { return p.y; });
    var tx = ticks(Math.min.apply(0, xs), Math.max.apply(0, xs), 4);
    var f = moldura(el, { xmin: tx[0], xmax: tx[tx.length - 1], ymin: Math.min.apply(0, ys.concat([0])), ymax: Math.max.apply(0, ys), rotY: rotY, rotX: rotX, margemEsq: 48 });
    var corpo = f.eixos;
    tx.forEach(function (t) { corpo += '<text class="eixo" x="' + f.X(t) + '" y="' + (f.H - f.m.b + 14) + '" text-anchor="middle">' + fmt(t, 1) + '</text>'; });
    pares.forEach(function (p) {
      corpo += '<circle class="ponto anel" r="4.5" fill="' + COR.s1 + '" data-dica="' + esc(p.rotulo + ' · x = ' + fmt(p.x, 1) + ' · y = ' + fmt(p.y, 1)) + '" cx="' + f.X(p.x) + '" cy="' + f.Y(p.y) + '"/>';
    });
    el.innerHTML = svg(f, corpo, 'Dispersão');
  }

  /* dica (tooltip) unica, por toque ou mouse */
  function ligarDicas() {
    var dica = document.getElementById('dica');
    function mostrar(e) {
      var alvo = e.target.closest ? e.target.closest('[data-dica]') : null;
      if (!alvo) { dica.hidden = true; return; }
      dica.textContent = alvo.getAttribute('data-dica'); dica.hidden = false;
      var p = e.touches ? e.touches[0] : e, larg = dica.offsetWidth;
      dica.style.left = Math.max(8, Math.min(window.innerWidth - larg - 8, p.clientX - larg / 2)) + 'px';
      dica.style.top = Math.max(8, p.clientY - dica.offsetHeight - 14) + 'px';
    }
    document.addEventListener('mousemove', mostrar);
    document.addEventListener('click', mostrar);
    document.addEventListener('scroll', function () { dica.hidden = true; }, true);
  }

  window.AtenaGraficos = { temperatura: temperatura, sucessao: sucessao, composicao: composicao, abundancia: abundancia, curva: curva, dispersao: dispersao, ligarDicas: ligarDicas, fmt: fmt, esc: esc };
})();
