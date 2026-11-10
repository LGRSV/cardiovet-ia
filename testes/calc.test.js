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
// estado vazio nao quebra
const v = C.calcular(C.estadoVazio());
assert.strictEqual(v.totalGeral, 0);
assert.strictEqual(v.indices[0].shannon, null);
console.log('calc.test.js: todos os testes passaram');
