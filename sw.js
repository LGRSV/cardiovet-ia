/* Atena - service worker simples: guarda o app para funcionar sem internet. */
var VERSAO = 'atena-v2';
var ARQUIVOS = ['./', 'index.html', 'style.css', 'calc.js', 'planilha.js', 'charts.js', 'exemplo.js', 'app.js', 'manifest.webmanifest',
  'icones/icone.svg', 'icones/icone-180.png', 'icones/icone-192.png', 'icones/icone-512.png'];
var XLSX_URL = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSAO).then(function (c) {
    return c.addAll(ARQUIVOS).then(function () { return c.add(XLSX_URL).catch(function () { /* fica para depois */ }); });
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSAO; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

/* rede primeiro (para pegar atualizacoes); sem rede, usa a copia guardada */
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(function (r) {
    if (r && r.ok) { var copia = r.clone(); caches.open(VERSAO).then(function (c) { c.put(e.request, copia); }); }
    return r;
  }).catch(function () {
    return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); });
  }));
});
