/* Atena - monta a planilha com FORMULAS vivas (para o orientador conferir).
   Devolve um modelo simples: [{nome, cel: {A1: {v, f, z}}, larguras}]. Cada celula com formula leva tambem o valor
   calculado pelo app (v), de modo que da para recalcular fora do app e comparar. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./calc.js'));
  else root.AtenaPlanilha = factory(root.AtenaCalc);
})(typeof self !== 'undefined' ? self : this, function (C) {
  'use strict';
  var ADULTO = '"Adulto coletado"', EMERGIDO = '"Emergido da criação"';

  function L(i) { var s = ''; i++; while (i > 0) { s = String.fromCharCode(65 + (i - 1) % 26) + s; i = Math.floor((i - 1) / 26); } return s; }
  function serial(iso) { return iso ? Math.round((Date.parse(iso + 'T00:00:00Z') - Date.UTC(1899, 11, 30)) / 86400000) : null; }
  function carc(v) { return /^\d+$/.test(String(v)) ? Number(v) : String(v == null ? '' : v); }
  function vz(v) { return v === null || v === undefined ? '' : v; }

  function montar(estado) {
    var r = C.calcular(estado, { carcaca: 'todas' });
    var taxons = (estado.taxons || []).filter(function (t) { return t && t.taxon; });
    var nC = r.coletas.length, nT = r.triagem.length, nX = taxons.length;
    var cE = Math.max(2, nC + 1), tE = Math.max(2, nT + 1), xE = Math.max(2, nX + 1), TOT = xE + 1;
    var folhas = [];
    function folha(nome, larguras) { var f = { nome: nome, cel: {}, larguras: larguras || [] }; folhas.push(f); return f; }
    function V(f, ref, v, z) { if (v === null || v === undefined) return; f.cel[ref] = z ? { v: v, z: z } : { v: v }; }
    function F(f, ref, formula, v) { f.cel[ref] = { f: formula, v: vz(v) }; }
    function cab(f, lista) { lista.forEach(function (c, i) { V(f, L(i) + '1', c); }); }
    var TG = 'Triagem!$G$2:$G$' + tE, TI = 'Triagem!$I$2:$I$' + tE, TE = 'Triagem!$E$2:$E$' + tE, TK = 'Triagem!$K$2:$K$' + tE,
      TL = 'Triagem!$L$2:$L$' + tE, TF = 'Triagem!$F$2:$F$' + tE, TJ = 'Triagem!$J$2:$J$' + tE, TB = 'Triagem!$B$2:$B$' + tE, TN = 'Triagem!$N$2:$N$' + tE;
    function CO(c) { return 'Coletas!$' + c + '$2:$' + c + '$' + cE; }
    function TX(c) { return 'Táxons!$' + c + '$2:$' + c + '$' + xE; }

    /* ----- Leia-me ----- */
    var lm = folha('Leia-me', [110]);
    ['Atena – planilha com fórmulas vivas (gerada pelo app para conferência)',
      'Células de entrada: abas Coletas (A a M, W, X), Triagem (A a H), Táxons e Fases (A a E). O resto são fórmulas.',
      'Só “Adulto coletado” entra em frequências, índices e correlação. “Emergido da criação” entra como presença (Sucessão e coluna “Criado a partir de imaturos”).',
      'Temperatura média = (máx. + mín.) ÷ 2. Total por 24 h = total ÷ (intervalo ÷ 24).',
      'FA = nº de indivíduos do táxon na fase. FR (%) = FA ÷ total da fase × 100.',
      'Constância (%) = coletas com o táxon ÷ total de coletas × 100. Constante > 50%; acessória 25–50%; acidental < 25% (Bodenheimer, 1955; Silveira Neto et al., 1976).',
      'Dominância (%) = indivíduos do táxon ÷ total × 100. Engelmann (1978): eudominante ≥ 32; dominante ≥ 10; subdominante ≥ 3,2; recedente ≥ 1; subrecedente ≥ 0,32; esporádica < 0,32.',
      "Shannon-Wiener H' = −Σ p·ln(p), com logaritmo natural (base e). Pielou J' = H' ÷ ln(S).",
      'Simpson: coluna E = 1 − Σ p² (índice de Gini-Simpson, 1 − D). Coluna G = 1 − Σ n(n−1) ÷ [N(N−1)] (forma sem viés para amostras finitas). Diga no artigo qual foi usada.',
      'Jaccard = táxons em comum ÷ (S₁ + S₂ − comuns).',
      'Curva do coletor = riqueza acumulada na ordem das coletas (sem aleatorização nem rarefação).',
      'Spearman: postos médios nos empates; ρ = correlação de Pearson entre os postos; p bilateral pela distribuição t com n − 2 graus de liberdade (TDIST). Com n pequeno (menos de 10 coletas) o p é só aproximado: confira no R (cor.test(..., method = "spearman")).',
      'Coluna W da aba Coletas (“Entra no Spearman e na Figura 5”): 1 = entra; 0 = fica de fora (coleta ainda não triada). É definida no app.',
      'Duração da fase (aba Fases, coluna F): se houver duração manual na coluna E, vale ela; senão, a regra em vigor: ' + r.regraDuracao + '.',
      'Abra no Excel, no Google Planilhas ou no LibreOffice. As funções MINIFS/MAXIFS (aba Sucessão) exigem Excel 2019 ou mais novo.'
    ].forEach(function (t, i) { V(lm, 'A' + (i + 1), t); });

    /* ----- Coletas ----- */
    var co = folha('Coletas', [9, 11, 9, 8, 22, 9, 9, 10, 9, 9, 9, 9, 9, 12, 7, 12, 12, 10, 10, 10, 10, 10, 12, 24]);
    cab(co, ['Carcaça', 'Data', 'Dia de exposição', 'Hora real', 'Fase (Payne)', 'Tmáx ar do intervalo (°C)', 'Tmín ar do intervalo (°C)', 'Temp. média ar (°C)', 'T ar 16h (°C)', 'UR média INMET desde a coleta anterior (%)', 'Chuva INMET desde a coleta anterior (mm)', 'Massa larval presente? (Sim/Não)', 'Intervalo desde a coleta anterior (h)', 'Chave', 'Dia nº', 'Calliphoridae (adultos)', 'Sarcophagidae (adultos)', 'Muscidae (adultos)', 'Coleoptera (adultos)', 'Formicidae (adultos)', 'Total de adultos coletados', 'Total por 24 h', 'Entra no Spearman e na Figura 5 (1/0)', 'Observação']);
    r.coletas.forEach(function (c, i) {
      var n = i + 2, s = serial(c.data);
      V(co, 'A' + n, carc(c.carcaca)); V(co, 'B' + n, s, 'dd/mm/yyyy'); V(co, 'C' + n, c.dia); V(co, 'D' + n, c.hora); V(co, 'E' + n, c.fase || '');
      V(co, 'F' + n, c.tmax); V(co, 'G' + n, c.tmin); V(co, 'I' + n, c.t16); V(co, 'J' + n, c.ur); V(co, 'K' + n, c.chuva); V(co, 'L' + n, c.massa); V(co, 'M' + n, c.intervalo);
      F(co, 'H' + n, 'IF(OR(F' + n + '="",G' + n + '=""),"",(F' + n + '+G' + n + ')/2)', c.tmed);
      F(co, 'N' + n, 'A' + n + '&"|"&B' + n, c.carcaca + '|' + s);
      F(co, 'O' + n, 'IFERROR(VALUE(SUBSTITUTE(UPPER(C' + n + '),"D","")),"")', c.diaN);
      [['P', TK, 'Calliphoridae', c.calliphoridae], ['Q', TK, 'Sarcophagidae', c.sarcophagidae], ['R', TK, 'Muscidae', c.muscidae], ['S', TL, 'Coleoptera', c.coleoptera], ['T', TK, 'Formicidae', c.formicidae]].forEach(function (g) {
        F(co, g[0] + n, 'SUMIFS(' + TG + ',' + TI + ',N' + n + ',' + TE + ',' + ADULTO + ',' + g[1] + ',"' + g[2] + '")', g[3]);
      });
      F(co, 'U' + n, 'SUMIFS(' + TG + ',' + TI + ',N' + n + ',' + TE + ',' + ADULTO + ')', c.total);
      F(co, 'V' + n, 'IF(OR(M' + n + '="",M' + n + '=0),"",U' + n + '/(M' + n + '/24))', c.por24);
      V(co, 'W' + n, c.entra ? 1 : 0); V(co, 'X' + n, c.obs || null);
    });

    /* ----- Triagem ----- */
    var tr = folha('Triagem', [10, 9, 11, 10, 20, 26, 9, 22, 12, 22, 16, 14, 7, 9]);
    cab(tr, ['Nº do lote', 'Carcaça', 'Data da coleta', 'Origem', 'Tipo', 'Táxon', 'Nº de indivíduos', 'Observação', 'Chave', 'Fase (da aba Coletas)', 'Família', 'Ordem', 'Dia nº', 'Dia para a sucessão']);
    r.triagem.forEach(function (t, i) {
      var n = i + 2, s = serial(t.data);
      V(tr, 'A' + n, String(t.lote)); V(tr, 'B' + n, carc(t.carcaca)); V(tr, 'C' + n, s, 'dd/mm/yyyy'); V(tr, 'D' + n, t.origem); V(tr, 'E' + n, t.tipo); V(tr, 'F' + n, t.taxon); V(tr, 'G' + n, t.n); V(tr, 'H' + n, t.obs || null);
      F(tr, 'I' + n, 'B' + n + '&"|"&C' + n, t.carcaca + '|' + s);
      F(tr, 'J' + n, 'IFERROR(INDEX(' + CO('E') + ',MATCH(I' + n + ',' + CO('N') + ',0)),"coleta não lançada")', t.fase);
      F(tr, 'K' + n, 'IFERROR(INDEX(' + TX('B') + ',MATCH(F' + n + ',' + TX('C') + ',0)),"táxon fora da lista")', t.familia);
      F(tr, 'L' + n, 'IFERROR(INDEX(' + TX('A') + ',MATCH(F' + n + ',' + TX('C') + ',0)),"")', t.ordem);
      F(tr, 'M' + n, 'IFERROR(INDEX(' + CO('O') + ',MATCH(I' + n + ',' + CO('N') + ',0)),"")', t.diaN);
      var suc = (t.tipo === 'Adulto coletado' || t.tipo === 'Emergido da criação') && t.diaN !== null && t.diaN > 0 ? t.diaN : '';
      F(tr, 'N' + n, 'IF(OR(E' + n + '=' + ADULTO + ',E' + n + '=' + EMERGIDO + '),IF(ISNUMBER(M' + n + '),IF(M' + n + '>0,M' + n + ',""),""),"")', suc);
    });

    /* ----- Taxons ----- */
    var tx = folha('Táxons', [16, 18, 28]);
    cab(tx, ['Ordem', 'Família', 'Táxon']);
    taxons.forEach(function (t, i) { V(tx, 'A' + (i + 2), t.ordem); V(tx, 'B' + (i + 2), t.familia); V(tx, 'C' + (i + 2), t.taxon); });

    /* ----- Fases ----- */
    var fa = folha('Fases', [9, 24, 12, 12, 14, 12, 10, 12, 10, 10, 12]);
    cab(fa, ['Carcaça', 'Fase (Payne, 1965)', 'Início (data)', 'Término (data)', 'Duração manual (dias)', 'Duração (dias)', 'Nº de coletas', 'Temp. média ar (°C)', 'UR média (%)', 'Chuva total (mm)', 'Adultos coletados']);
    r.fases.forEach(function (f, i) {
      var n = i + 2, base = 'IF(OR(C' + n + '="",D' + n + '=""),"",D' + n + '-C' + n + (r.config.duracaoRegra === 'inclusivo' ? '+1' : '') + ')';
      if (r.config.duracaoRegra === 'proxima') {
        for (var k = i + 1; k < r.fases.length && r.fases[k].carcaca === f.carcaca; k++) {
          if (r.fases[k].inicio) { base = 'IF(OR(C' + n + '="",C' + (k + 2) + '=""),"",C' + (k + 2) + '-C' + n + ')'; break; }
        }
      }
      V(fa, 'A' + n, carc(f.carcaca)); V(fa, 'B' + n, f.fase); V(fa, 'C' + n, serial(f.inicio), 'dd/mm/yyyy'); V(fa, 'D' + n, serial(f.termino), 'dd/mm/yyyy'); V(fa, 'E' + n, f.duracaoManual);
      F(fa, 'F' + n, 'IF(E' + n + '<>"",E' + n + ',' + base + ')', f.duracao);
      F(fa, 'G' + n, 'COUNTIFS(' + CO('E') + ',B' + n + ',' + CO('A') + ',A' + n + ')', f.nColetas);
      F(fa, 'H' + n, 'IFERROR(AVERAGEIFS(' + CO('H') + ',' + CO('E') + ',B' + n + ',' + CO('A') + ',A' + n + '),"")', f.tmed);
      F(fa, 'I' + n, 'IFERROR(AVERAGEIFS(' + CO('J') + ',' + CO('E') + ',B' + n + ',' + CO('A') + ',A' + n + '),"")', f.ur);
      F(fa, 'J' + n, 'IF(G' + n + '=0,"",SUMIFS(' + CO('K') + ',' + CO('E') + ',B' + n + ',' + CO('A') + ',A' + n + '))', f.chuva);
      F(fa, 'K' + n, 'SUMIFS(' + TG + ',' + TJ + ',B' + n + ',' + TB + ',A' + n + ',' + TE + ',' + ADULTO + ')', f.adultos);
    });
    V(fa, 'A' + (r.fases.length + 3), 'Regra da duração em vigor: ' + r.regraDuracao + '. Duração manual (coluna E), quando preenchida, substitui a regra.');

    /* ----- FA_FR ----- */
    var ff = folha('FA_FR', [28, 18]);
    cab(ff, ['Táxon', 'Família'].concat(C.SIGLAS.map(function (s) { return 'FA ' + s; }), ['Total'], C.SIGLAS.map(function (s) { return 'FR ' + s + ' (%)'; }), ['FR total (%)'],
      C.SIGLAS.map(function (s) { return 'p·ln(p) ' + s; }), C.SIGLAS.map(function (s) { return 'p² ' + s; }), C.SIGLAS.map(function (s) { return 'n(n−1) ' + s; })));
    taxons.forEach(function (t, i) {
      var n = i + 2, l = r.faFr[i];
      F(ff, 'A' + n, 'Táxons!C' + n, t.taxon); F(ff, 'B' + n, 'Táxons!B' + n, t.familia);
      C.FASES.forEach(function (fase, k) {
        var c = L(2 + k), N = r.totalFase[k], v = l.fa[k], p = N ? v / N : 0;
        F(ff, c + n, 'SUMIFS(' + TG + ',' + TF + ',$A' + n + ',' + TJ + ',"' + fase + '",' + TE + ',' + ADULTO + ')', v);
        F(ff, L(9 + k) + n, 'IF(' + c + '$' + TOT + '=0,"",' + c + n + '/' + c + '$' + TOT + '*100)', l.fr[k]);
        F(ff, L(16 + k) + n, 'IF(OR(' + c + '$' + TOT + '=0,' + c + n + '=0),0,(' + c + n + '/' + c + '$' + TOT + ')*LN(' + c + n + '/' + c + '$' + TOT + '))', p > 0 ? p * Math.log(p) : 0);
        F(ff, L(22 + k) + n, 'IF(' + c + '$' + TOT + '=0,0,(' + c + n + '/' + c + '$' + TOT + ')^2)', p * p);
        F(ff, L(28 + k) + n, c + n + '*(' + c + n + '-1)', v * (v - 1));
      });
      F(ff, 'I' + n, 'SUM(C' + n + ':H' + n + ')', l.total);
      F(ff, 'P' + n, 'IF($I$' + TOT + '=0,"",I' + n + '/$I$' + TOT + '*100)', l.frTotal);
    });
    V(ff, 'A' + TOT, 'Total da fase');
    C.FASES.forEach(function (fase, k) { F(ff, L(2 + k) + TOT, 'SUM(' + L(2 + k) + '2:' + L(2 + k) + xE + ')', r.totalFase[k]); });
    F(ff, 'I' + TOT, 'SUM(I2:I' + xE + ')', r.totalGeral);

    /* ----- Presenca (auxiliar) ----- */
    var pr = folha('Presença', [12]);
    V(pr, 'A1', 'Chave da coleta');
    taxons.forEach(function (t, k) { F(pr, L(1 + k) + '1', 'Táxons!C' + (k + 2), t.taxon); });
    r.coletas.forEach(function (c, i) {
      var n = i + 2;
      F(pr, 'A' + n, 'Coletas!N' + n, c.carcaca + '|' + serial(c.data));
      taxons.forEach(function (t, k) {
        F(pr, L(1 + k) + n, 'IF(SUMIFS(' + TG + ',' + TI + ',$A' + n + ',' + TF + ',' + L(1 + k) + '$1,' + TE + ',' + ADULTO + ')>0,1,0)', c.presentes[t.taxon] || 0);
      });
    });

    /* ----- Constancia e dominancia ----- */
    var cd = folha('Constância_Dominância', [28, 18, 12, 12, 16, 11, 12, 16, 14]);
    cab(cd, ['Táxon', 'Família', 'Coletas com o táxon', 'Constância (%)', 'Classe de constância', 'Indivíduos', 'Dominância (%)', 'Classe de dominância', 'Criado a partir de imaturos']);
    var NC = xE + 2;
    taxons.forEach(function (t, i) {
      var n = i + 2, x = r.constDom[i], pc = L(1 + i);
      F(cd, 'A' + n, 'Táxons!C' + n, t.taxon); F(cd, 'B' + n, 'Táxons!B' + n, t.familia);
      F(cd, 'C' + n, 'SUM(Presença!' + pc + '$2:' + pc + '$' + cE + ')', x.coletasCom);
      F(cd, 'D' + n, 'IF($C$' + NC + '=0,"",C' + n + '/$C$' + NC + '*100)', x.constancia);
      F(cd, 'E' + n, 'IF(OR(D' + n + '="",C' + n + '=0),"",IF(D' + n + '>50,"Constante",IF(D' + n + '>=25,"Acessória","Acidental")))', x.classeConstancia);
      F(cd, 'F' + n, 'FA_FR!I' + n, x.individuos);
      F(cd, 'G' + n, 'IF(FA_FR!$I$' + TOT + '=0,"",F' + n + '/FA_FR!$I$' + TOT + '*100)', x.dominancia);
      F(cd, 'H' + n, 'IF(OR(G' + n + '="",F' + n + '=0),"",IF(G' + n + '>=32,"Eudominante",IF(G' + n + '>=10,"Dominante",IF(G' + n + '>=3.2,"Subdominante",IF(G' + n + '>=1,"Recedente",IF(G' + n + '>=0.32,"Subrecedente","Esporádica"))))))', x.classeDominancia);
      F(cd, 'I' + n, 'IF(COUNTIFS(' + TF + ',A' + n + ',' + TE + ',' + EMERGIDO + ')>0,"Sim","Não")', x.criado ? 'Sim' : 'Não');
    });
    V(cd, 'A' + NC, 'Total de coletas lançadas:');
    F(cd, 'C' + NC, 'SUMPRODUCT((' + CO('N') + '<>"")*1)', r.nColetas);

    /* ----- Indices e Jaccard ----- */
    var ix = folha('Índices', [24, 12, 14, 18, 16, 12, 22]);
    cab(ix, ['Fase', 'Riqueza (S)', 'Nº de indivíduos (N)', "Shannon-Wiener (H')", 'Simpson (1 − D)', "Pielou (J')", 'Simpson sem viés (1 − D)']);
    r.indices.forEach(function (x, i) {
      var n = i + 2, c = L(2 + i);
      V(ix, 'A' + n, x.fase);
      F(ix, 'B' + n, 'COUNTIF(FA_FR!' + c + '$2:' + c + '$' + xE + ',">0")', x.S);
      F(ix, 'C' + n, 'FA_FR!' + c + '$' + TOT, x.N);
      F(ix, 'D' + n, 'IF(C' + n + '=0,"",-SUM(FA_FR!' + L(16 + i) + '$2:' + L(16 + i) + '$' + xE + '))', x.shannon);
      F(ix, 'E' + n, 'IF(C' + n + '=0,"",1-SUM(FA_FR!' + L(22 + i) + '$2:' + L(22 + i) + '$' + xE + '))', x.simpson);
      F(ix, 'F' + n, 'IF(OR(B' + n + '<2,C' + n + '=0),"",D' + n + '/LN(B' + n + '))', x.pielou);
      F(ix, 'G' + n, 'IF(C' + n + '<2,"",1-SUM(FA_FR!' + L(28 + i) + '$2:' + L(28 + i) + '$' + xE + ')/(C' + n + '*(C' + n + '-1)))', x.simpsonSemVies);
    });
    V(ix, 'A9', 'Similaridade entre fases (índice de Jaccard)');
    C.FASES.forEach(function (f, j) { V(ix, L(1 + j) + '10', f); });
    C.FASES.forEach(function (f, i) {
      V(ix, 'A' + (11 + i), f);
      C.FASES.forEach(function (g, j) {
        var a = 'FA_FR!' + L(2 + i) + '$2:' + L(2 + i) + '$' + xE, b = 'FA_FR!' + L(2 + j) + '$2:' + L(2 + j) + '$' + xE, com = 'SUMPRODUCT((' + a + '>0)*(' + b + '>0))';
        F(ix, L(1 + j) + (11 + i), 'IF(OR($B$' + (2 + i) + '=0,$B$' + (2 + j) + '=0),"",' + com + '/($B$' + (2 + i) + '+$B$' + (2 + j) + '-' + com + '))', r.jaccard[i][j]);
      });
    });

    /* ----- Composicao por fase ----- */
    var cp = folha('Composição', [24, 13, 13, 10, 14, 11, 11, 9, 9]);
    cab(cp, ['Fase'].concat(C.GRUPOS, ['Total']));
    r.grupos.forEach(function (g, i) {
      var n = i + 2, base = 'SUMIFS(' + TG + ',' + TJ + ',$A' + n + ',' + TE + ',' + ADULTO, dip = base + ',' + TL + ',"Diptera")';
      V(cp, 'A' + n, g.fase);
      F(cp, 'B' + n, base + ',' + TK + ',"Calliphoridae")', g.Calliphoridae); F(cp, 'C' + n, base + ',' + TK + ',"Sarcophagidae")', g.Sarcophagidae); F(cp, 'D' + n, base + ',' + TK + ',"Muscidae")', g.Muscidae);
      F(cp, 'E' + n, dip + '-B' + n + '-C' + n + '-D' + n, g['Outros Diptera']);
      F(cp, 'F' + n, base + ',' + TL + ',"Coleoptera")', g.Coleoptera); F(cp, 'G' + n, base + ',' + TK + ',"Formicidae")', g.Formicidae);
      F(cp, 'H' + n, 'I' + n + '-(' + dip + ')-F' + n + '-G' + n, g.Outros); F(cp, 'I' + n, base + ')', g.total);
    });

    /* ----- Sucessao ----- */
    var su = folha('Sucessão', [28, 12, 12, 16]);
    cab(su, ['Táxon', 'Primeiro dia', 'Último dia', 'Dias de presença (extensão)']);
    taxons.forEach(function (t, i) {
      var n = i + 2, s = r.sucessao[i], cond = TF + ',A' + n + ',' + TN + ',">0"';
      F(su, 'A' + n, 'Táxons!C' + n, t.taxon);
      F(su, 'B' + n, 'IF(COUNTIFS(' + cond + ')=0,"",_xlfn.MINIFS(' + TN + ',' + cond + '))', s.primeiro);
      F(su, 'C' + n, 'IF(COUNTIFS(' + cond + ')=0,"",_xlfn.MAXIFS(' + TN + ',' + cond + '))', s.ultimo);
      F(su, 'D' + n, 'IF(B' + n + '="","",C' + n + '-B' + n + '+1)', s.dias);
    });

    /* ----- Curva do coletor ----- */
    var cu = folha('Curva', [10, 20]);
    V(cu, 'A1', 'Coleta nº'); V(cu, 'B1', 'Riqueza acumulada (S)'); V(cu, 'C1', 'Auxiliar: táxon já registrado até esta coleta (1/0)');
    var visto = {};
    r.coletas.forEach(function (c, i) {
      var n = i + 2;
      V(cu, 'A' + n, i + 1);
      taxons.forEach(function (t, k) {
        if (c.presentes[t.taxon]) visto[t.taxon] = 1;
        F(cu, L(2 + k) + n, 'MAX(Presença!' + L(1 + k) + '$2:' + L(1 + k) + n + ')', visto[t.taxon] ? 1 : 0);
      });
      F(cu, 'B' + n, 'SUM(C' + n + ':' + L(1 + nX) + n + ')', r.curva[i] ? r.curva[i].S : 0);
    });

    /* ----- Spearman ----- */
    var sp = folha('Spearman', [30, 18, 18, 18, 16, 16, 16, 14, 14, 14]);
    var GR = [['Calliphoridae', 'P', 'calliphoridae'], ['Sarcophagidae', 'Q', 'sarcophagidae'], ['Muscidae', 'R', 'muscidae'], ['Coleoptera', 'S', 'coleoptera'], ['Formicidae', 'T', 'formicidae'], ['Total', 'U', 'total'], ['Total sem Formicidae', null, 'totalSemFormicidae']];
    var VA = [['Temperatura média', 'H', 'tmed'], ['UR média', 'J', 'ur'], ['Chuva', 'K', 'chuva']];
    var P0 = 15, P1 = Math.max(P0, 14 + nC), NG = GR.length;
    function COLY(gi) { return L(1 + gi); }
    var CV = L(1 + NG), CX = function (k) { return L(2 + NG + k); }, CPV = function (k) { return L(5 + NG + k); }, CRX = function (k) { return L(8 + NG + k); }, CRY = function (gi, k) { return L(11 + NG + gi * 3 + k); };
    V(sp, 'A1', 'Correlação de Spearman – abundância de adultos por 24 h × variáveis abióticas');
    V(sp, 'A2', 'Uma linha por coleta, só adultos coletados. Postos médios nos empates; p bilateral pela distribuição t (n − 2 graus de liberdade). Com n pequeno o p é aproximado: confira no R.');
    V(sp, 'A3', 'Grupo');
    VA.forEach(function (v, k) { V(sp, L(1 + k) + '3', 'ρ ' + v[0]); V(sp, L(4 + k) + '3', 'p ' + v[0]); V(sp, L(7 + k) + '3', 'n ' + v[0]); });
    /* valores auxiliares calculados aqui para ficarem guardados junto das formulas */
    var yv = r.coletas.map(function (c) { return GR.map(function (g) { return (c.intervalo === null || c.intervalo === 0) ? 0 : c[g[2]] / (c.intervalo / 24); }); });
    var val = r.coletas.map(function (c) { return ((c.intervalo === null || c.intervalo === 0) ? 0 : 1) * (c.entra ? 1 : 0); });
    var xv = r.coletas.map(function (c) { return VA.map(function (v) { return c[v[2]] === null ? 0 : c[v[2]]; }); });
    var pv = r.coletas.map(function (c, i) { return VA.map(function (v) { return val[i] * (c[v[2]] === null ? 0 : 1); }); });
    function postosValidos(valores, k) {
      var idx = [], vs = [];
      valores.forEach(function (v, i) { if (pv[i][k]) { idx.push(i); vs.push(v); } });
      var p = C.postos(vs), out = valores.map(function () { return 0; });
      idx.forEach(function (i, j) { out[i] = p[j]; });
      return out;
    }
    var rx = VA.map(function (v, k) { return postosValidos(xv.map(function (l) { return l[k]; }), k); });
    var ry = GR.map(function (g, gi) { return VA.map(function (v, k) { return postosValidos(yv.map(function (l) { return l[gi]; }), k); }); });
    GR.forEach(function (g, gi) {
      var n = 4 + gi, linha = r.spearman[gi];
      V(sp, 'A' + n, g[0]);
      VA.forEach(function (v, k) {
        var Vc = CPV(k), RX = CRX(k), RY = CRY(gi, k), nc = L(7 + k) + n, rc = L(1 + k) + n, m = '((' + nc + '+1)/2)^2';
        var a = RX + '$' + P0 + ':' + RX + '$' + P1, b = RY + '$' + P0 + ':' + RY + '$' + P1, res = linha.variaveis[k];
        F(sp, nc, 'SUM(' + Vc + '$' + P0 + ':' + Vc + '$' + P1 + ')', res.n);
        F(sp, rc, 'IF(' + nc + '<3,"",IFERROR((SUMPRODUCT(' + a + ',' + b + ')-' + nc + '*' + m + ')/SQRT((SUMPRODUCT(' + a + ',' + a + ')-' + nc + '*' + m + ')*(SUMPRODUCT(' + b + ',' + b + ')-' + nc + '*' + m + ')),""))', res.rho);
        F(sp, L(4 + k) + n, 'IF(' + rc + '="","",IF(ABS(' + rc + ')>=1,0,TDIST(ABS(' + rc + ')*SQRT((' + nc + '-2)/(1-' + rc + '^2)),' + nc + '-2,2)))', res.p);
      });
    });
    V(sp, 'A12', 'Formicidae é opcional na Tabela 5 (veja a nota no app). Marque com asterisco no artigo os valores com p < 0,05.');
    V(sp, 'A13', 'Cálculo auxiliar (não editar)');
    ['Chave'].concat(GR.map(function (g) { return g[0] + ' por 24 h'; }), ['Coleta válida'], VA.map(function (v) { return 'x ' + v[0]; }), VA.map(function (v) { return 'Par válido ' + v[0]; }), VA.map(function (v) { return 'Posto x ' + v[0]; }),
      [].concat.apply([], GR.map(function (g) { return VA.map(function (v) { return 'Posto ' + g[0] + ' | ' + v[0]; }); }))).forEach(function (c, i) { V(sp, L(i) + '14', c); });
    r.coletas.forEach(function (c, i) {
      var n = i + 2, q = i + P0, inval = 'OR(Coletas!$M' + n + '="",Coletas!$M' + n + '=0)';
      F(sp, 'A' + q, 'Coletas!N' + n, c.carcaca + '|' + serial(c.data));
      GR.forEach(function (g, gi) { F(sp, COLY(gi) + q, 'IF(' + inval + ',0,' + (g[1] ? 'Coletas!' + g[1] + n : '(Coletas!U' + n + '-Coletas!T' + n + ')') + '/(Coletas!$M' + n + '/24))', yv[i][gi]); });
      F(sp, CV + q, 'IF(' + inval + ',0,1)*Coletas!$W' + n, val[i]);
      VA.forEach(function (v, k) {
        F(sp, CX(k) + q, 'IF(ISNUMBER(Coletas!' + v[1] + n + '),Coletas!' + v[1] + n + ',0)', xv[i][k]);
        F(sp, CPV(k) + q, '$' + CV + q + '*IF(ISNUMBER(Coletas!' + v[1] + n + '),1,0)', pv[i][k]);
      });
      function posto(Vc, X) {
        var vr = Vc + '$' + P0 + ':' + Vc + '$' + P1, xr = X + '$' + P0 + ':' + X + '$' + P1;
        return 'IF(' + Vc + q + '=0,0,1+SUMPRODUCT(' + vr + '*(' + xr + '<' + X + q + '))+(SUMPRODUCT(' + vr + '*(' + xr + '=' + X + q + '))-1)/2)';
      }
      VA.forEach(function (v, k) { F(sp, CRX(k) + q, posto(CPV(k), CX(k)), rx[k][i]); });
      GR.forEach(function (g, gi) { VA.forEach(function (v, k) { F(sp, CRY(gi, k) + q, posto(CPV(k), COLY(gi)), ry[gi][k][i]); }); });
    });
    return folhas;
  }

  return { montar: montar, coluna: L };
});
