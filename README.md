# Atena

Aplicativo web (PWA) para tabular e analisar levantamentos de fauna entomonecrófaga em carcaças: coletas diárias, triagem por lote e táxon, fases de decomposição, e as tabelas e figuras de resultado calculadas na hora.

- Funciona no celular e no computador, sem login e sem servidor.
- Os dados ficam só no aparelho (localStorage). Exporta e importa JSON, CSV e XLSX.
- Sem framework: HTML, CSS e JavaScript simples; gráficos em SVG próprio.
- Os dados que vêm no repositório (`exemplo.js`, `testes/exemplo.json`) são **fictícios**, só para demonstração e teste.

## O que calcula

- Temperatura média do intervalo, total de adultos por coleta e por 24 h.
- Frequência absoluta e relativa por fase (Payne, 1965).
- Constância (Bodenheimer, 1955) e dominância (Engelmann, 1978).
- Shannon-Wiener, Simpson, Pielou e similaridade de Jaccard entre fases.
- Diagrama de sucessão, composição por fase, curva do coletor.
- Correlação de Spearman entre a abundância por 24 h e temperatura, umidade e chuva.

## Arquivos

- `index.html`, `style.css`, `app.js`: interface.
- `calc.js`: todos os cálculos (roda no navegador e no Node).
- `charts.js`: gráficos.
- `sw.js`, `manifest.webmanifest`, `icones/`: instalação na Tela de Início e uso sem internet.
- `testes/`: `node testes/calc.test.js` confere os cálculos com valores de referência.

## Instalar no iPhone

Abra o endereço no Safari, toque em Compartilhar e em "Adicionar à Tela de Início".
