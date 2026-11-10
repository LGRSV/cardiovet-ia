// Gera dados FICTICIOS (nao sao resultados da pesquisa) para o exemplo do app e para os testes.
const fs = require('fs'), path = require('path');
const C = require('../calc.js');
let s = 20261214; const rnd = () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const iso = (d) => d.toISOString().slice(0, 10);
const est = C.estadoVazio(); let id = 1;
function faseDoDia(d) { return d <= 1 ? 'Fresco' : d <= 3 ? 'Gasoso' : d <= 8 ? 'Decomposição ativa' : d <= 15 ? 'Decomposição avançada' : d <= 23 ? 'Seco' : 'Restos'; }
// taxon: [dia inicial, dia final, pico]
const perfil = {
  'Chrysomya albiceps': [1, 12, 60], 'Chrysomya megacephala': [1, 9, 25], 'Cochliomyia macellaria': [1, 6, 12], 'Lucilia eximia': [1, 4, 8],
  'Sarcophagidae spp.': [1, 14, 10], 'Musca domestica': [2, 19, 14], 'Hydrotaea spp.': [5, 21, 9], 'Fannia spp.': [4, 13, 5], 'Phoridae spp.': [7, 25, 6],
  'Piophilidae spp.': [9, 23, 4], 'Hermetia illucens': [10, 17, 2], 'Dermestes maculatus': [9, 27, 16], 'Necrobia rufipes': [11, 27, 9], 'Histeridae spp.': [5, 17, 6],
  'Staphylinidae spp.': [4, 15, 4], 'Formicidae spp.': [1, 27, 12], 'Vespidae spp.': [2, 7, 2]
};
function carcaca(cc, d0, dias, fator) {
  let lote = cc * 1000;
  const fasesVistas = {};
  dias.forEach((d, i) => {
    const data = new Date(Date.UTC(d0[0], d0[1] - 1, d0[2] + d));
    const fase = faseDoDia(d); const intervalo = i === 0 ? 24 : (d - dias[i - 1]) * 24;
    const tmax = Math.round((31 + rnd() * 6) * 10) / 10, tmin = Math.round((21 + rnd() * 4) * 10) / 10;
    const chuva = rnd() < 0.45 ? Math.round(rnd() * 380) / 10 : 0;
    est.coletas.push({
      id: 'c' + id++, carcaca: String(cc), data: iso(data), dia: 'D' + d, hora: '16:' + String(ri(0, 12)).padStart(2, '0'), fase,
      tmax, tmin, t16: Math.round((tmax - rnd() * 3) * 10) / 10, ur: ri(52, 88), chuva, massa: d >= 3 && d <= 10 ? 'Sim' : 'Não', intervalo, obs: ''
    });
    (fasesVistas[fase] = fasesVistas[fase] || []).push(iso(data));
    Object.keys(perfil).forEach((t) => {
      const [a, b, pico] = perfil[t]; if (d < a || d > b) return;
      const meio = (a + b) / 2, forma = Math.max(0.15, 1 - Math.abs(d - meio) / ((b - a) / 2 + 1));
      const n = Math.round(pico * forma * fator * (0.6 + rnd() * 0.8) * (intervalo / 24)); if (n <= 0) return;
      const rasteiro = /Dermestes|Necrobia|Histeridae|Staphylinidae|Formicidae/.test(t);
      est.triagem.push({ id: 't' + id++, lote: String(++lote).padStart(3, '0'), carcaca: String(cc), data: iso(data), origem: rasteiro ? (rnd() < 0.7 ? 'Pitfall' : 'Bandeja') : 'Shannon', tipo: 'Adulto coletado', taxon: t, n, obs: '' });
    });
    if (d >= 3 && d <= 9 && d % 2 === 1) {
      est.triagem.push({ id: 't' + id++, lote: String(++lote).padStart(3, '0'), carcaca: String(cc), data: iso(data), origem: 'Carcaça', tipo: 'Imaturo fixado', taxon: 'Chrysomya albiceps', n: ri(8, 20), obs: 'larvas L2-L3' });
      est.triagem.push({ id: 't' + id++, lote: String(++lote).padStart(3, '0'), carcaca: String(cc), data: iso(data), origem: 'Criação', tipo: 'Emergido da criação', taxon: d === 7 ? 'Chrysomya putoria' : 'Chrysomya albiceps', n: ri(5, 18), obs: '' });
    }
  });
  C.FASES.forEach((f) => {
    if (!fasesVistas[f]) return;
    const v = fasesVistas[f]; const fim = new Date(Date.parse(v[v.length - 1] + 'T00:00:00Z') + 86400000);
    est.fases.push({ carcaca: String(cc), fase: f, inicio: v[0], termino: f === 'Restos' ? v[v.length - 1] : iso(fim) });
  });
}
const diasC1 = []; for (let d = 1; d <= 15; d++) diasC1.push(d); for (let d = 17; d <= 27; d += 2) diasC1.push(d);
carcaca(1, [2030, 1, 6], diasC1, 1);
carcaca(2, [2030, 3, 3], [1, 2, 3, 4, 5, 6, 7, 8], 0.7);
// um lote com data sem coleta lancada, para testar o aviso
est.triagem.push({ id: 't' + id++, lote: '999', carcaca: '1', data: '2030-02-20', origem: 'Pitfall', tipo: 'Adulto coletado', taxon: 'Formicidae spp.', n: 3, obs: 'data sem coleta' });
est.exemplo = true;
fs.writeFileSync(path.join(__dirname, 'exemplo.json'), JSON.stringify(est, null, 1));
fs.writeFileSync(path.join(__dirname, '../exemplo.js'), '/* Dados FICTICIOS de demonstracao. Nao sao resultados da pesquisa. */\nwindow.ATENA_EXEMPLO = ' + JSON.stringify(est) + ';\n');
const r = C.calcular(est);
console.log(est.coletas.length, 'coletas', est.triagem.length, 'lotes', JSON.stringify(r.resumo));
console.log(JSON.stringify(r.indices.map(i => [i.sigla, i.S, i.N, i.shannon && +i.shannon.toFixed(3)])));
console.log(JSON.stringify(r.spearman[5].variaveis));
