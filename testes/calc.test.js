// Teste dos calculos com valores de referencia (dados ficticios de exemplo.json).
// As referencias foram conferidas contra as formulas da planilha de tabulacao, calculadas fora do app.
const assert = require('assert');
const path = require('path');
const C = require(path.join(__dirname, '..', 'calc.js'));
const r = C.calcular(require('./exemplo.json'));
const perto = (a, b, nome) => assert.ok(Math.abs(a - b) < 1e-9, nome + ': ' + a + ' != ' + b);

assert.strictEqual(r.resumo.nColetas, 29);
assert.strictEqual(r.totalGeral, 1895);
assert.strictEqual(r.resumo.pendentes, 1);
assert.deepStrictEqual(r.indices.map((i) => i.S), [6, 8, 13, 14, 9, 4]);
assert.deepStrictEqual(r.indices.map((i) => i.N), [45, 198, 851, 498, 271, 32]);
perto(r.indices[0].shannon, 1.587450904017425, 'Shannon fresco');
perto(r.indices[0].simpson, 0.7624691358024691, 'Simpson fresco');
perto(r.indices[0].pielou, 0.8859732186605089, 'Pielou fresco');
perto(r.jaccard[1][0], 0.75, 'Jaccard G x F');
perto(r.spearman[5].variaveis[0].rho, 0.24722708262825502, 'rho total x temperatura');
perto(r.spearman[5].variaveis[0].p, 0.19601907287028242, 'p total x temperatura');
assert.strictEqual(+r.spearman[0].variaveis[2].rho.toFixed(5), -0.39771);
assert.ok(r.spearman[0].variaveis[2].p < 0.05);

// classes
assert.strictEqual(C.classeConstancia(50.1), 'Constante');
assert.strictEqual(C.classeConstancia(50), 'Acessória');
assert.strictEqual(C.classeConstancia(25), 'Acessória');
assert.strictEqual(C.classeConstancia(24.9), 'Acidental');
assert.deepStrictEqual([32, 10, 3.2, 1, 0.32, 0.31].map(C.classeDominancia), ['Eudominante', 'Dominante', 'Subdominante', 'Recedente', 'Subrecedente', 'Esporádica']);
// Spearman: casos conhecidos
perto(C.spearman([1, 2, 3, 4, 5], [5, 6, 7, 8, 7]).rho, 0.8207826816681233, 'rho com empate');
assert.strictEqual(C.spearman([1, 2, 3, 4], [2, 4, 6, 8]).rho, 1);
assert.strictEqual(C.spearman([1, 2], [2, 1]).rho, null);
assert.deepStrictEqual(C.postos([10, 20, 20, 30]), [1, 2.5, 2.5, 4]);
// V2: regra da duracao, duracao manual, coleta sem triagem e Total sem Formicidae
const copia = () => JSON.parse(JSON.stringify(require('./exemplo.json')));
let e = copia();
assert.deepStrictEqual(C.calcular(e).fases.slice(0, 3).map((f) => f.duracao), [1, 2, 5]);
e.config = { duracaoRegra: 'inclusivo' };
assert.deepStrictEqual(C.calcular(e).fases.slice(0, 3).map((f) => f.duracao), [2, 3, 6]);
e.config = { duracaoRegra: 'proxima' };
e.fases.find((f) => f.carcaca === '1' && f.fase === 'Gasoso').duracaoManual = 2.5;
assert.deepStrictEqual(C.calcular(e).fases.slice(0, 3).map((f) => [f.duracao, f.duracaoOrigem]), [[1, 'próxima fase'], [2.5, 'manual'], [5, 'próxima fase']]);
e = copia();
e.coletas.push({ id: 'x', carcaca: '2', data: '2030-04-01', dia: 'D9', fase: 'Seco', tmax: 33.5, tmin: 22.5, ur: 70, chuva: 0, intervalo: 24 });
assert.strictEqual(C.calcular(e).resumo.nSpearman, 30); // sem triagem conta como zero (padrao)
e.config = { naoTriadas: 'fora' };
const rf = C.calcular(e);
assert.strictEqual(rf.resumo.nSpearman, 29);
perto(rf.spearman[5].variaveis[0].rho, 0.24722708262825502, 'rho volta ao original com a coleta de fora');
assert.strictEqual(rf.nColetas, 30); // constancia continua contando a coleta
e.config = {}; e.coletas[3].fora = true;
assert.strictEqual(C.calcular(e).resumo.nSpearman, 29); // marcada de fora, por coleta
assert.strictEqual(r.spearman[6].grupo, 'Total sem Formicidae');
perto(r.spearman[6].variaveis[0].rho, 0.24522255406854862, 'rho total sem Formicidae');
perto(r.indices[0].simpsonSemVies, 1 - (r.faFr.reduce((a, l) => a + l.fa[0] * (l.fa[0] - 1), 0)) / (45 * 44), 'Simpson sem vies');

// estado vazio nao quebra
const v = C.calcular(C.estadoVazio());
assert.strictEqual(v.totalGeral, 0);
assert.strictEqual(v.indices[0].shannon, null);
console.log('calc.test.js: todos os testes passaram');
