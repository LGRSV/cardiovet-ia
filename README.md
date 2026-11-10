# Atena

Aplicativo web (PWA) para tabular e analisar levantamentos de fauna entomonecrófaga em carcaças: coletas diárias, triagem por lote e táxon, fases de decomposição, e as tabelas e figuras de resultado calculadas na hora.

- Funciona no celular e no computador, sem login e sem servidor. Abre sempre em modo claro.
- Os dados ficam só no aparelho (localStorage), em dois conjuntos separados: **Piloto** e **Oficial**.
- Exporta e importa JSON, CSV e XLSX por conjunto. Gera também um Excel com as fórmulas vivas, para conferência.
- Sem framework: HTML, CSS e JavaScript simples; gráficos em SVG próprio.
- Os dados que vêm no repositório (`exemplo.js`, `testes/exemplo.json`) são **fictícios**, só para demonstração e teste.

## O que calcula

- Temperatura média do intervalo, total de adultos por coleta e por 24 h.
- Frequência absoluta e relativa por fase (Payne, 1965).
- Constância (Bodenheimer, 1955) e dominância (Engelmann, 1978).
- Shannon-Wiener (logaritmo natural), Simpson (1 − Σp²), Pielou e similaridade de Jaccard entre fases.
- Diagrama de sucessão, composição por fase, curva do coletor.
- Correlação de Spearman (postos médios nos empates; p pela aproximação t) entre a abundância por 24 h e temperatura, umidade e chuva.

## Opções

- Regra da duração da fase (término − início; contando o dia inicial; até o início da fase seguinte) e duração manual por fase.
- Coleta ainda sem triagem: conta como zero ou fica de fora do Spearman e da Figura 5.
- Formicidae na tabela de correlação: desligada por padrão; a tabela mostra o total com e sem formigas.

## Arquivos

- `index.html`, `style.css`, `app.js`: interface.
- `calc.js`: todos os cálculos (roda no navegador e no Node).
- `planilha.js`: monta o Excel com fórmulas.
- `charts.js`: gráficos.
- `sw.js`, `manifest.webmanifest`, `icones/`: instalação na Tela de Início e uso sem internet.
- `testes/`: `node testes/calc.test.js` confere os cálculos com valores de referência.

## Instalar no iPhone

Abra o endereço no Safari, toque em Compartilhar e em "Adicionar à Tela de Início".
