# RICOCHETE — A caixa

Protótipo jogável: uma caixa dobrada, uma bola metálica grande e um puzzle na metade superior. Three.js + Rapier, Vite, pronto para Vercel.

## Jogar

- Tocar na caixa para abrir.
- Rodar a placa com o controlo inferior ou arrastando a própria placa.
- Arrastar dentro da caixa: para os lados define a direção; para baixo aumenta a força. Soltar lança.
- Lançar da base, subir pela curva da dobradiça e tocar nas duas campainhas da metade superior no mesmo lançamento.
- A mesma bola regressa ao centro pela gravidade. Não há vidas, perdas nem teletransporte de retorno.
- Arrastar fora da caixa permite uma pequena rotação. Pinça ou roda do rato permitem zoom limitado.
- Teclado: esquerda/direita ajustam direção, cima/baixo força, espaço lança. O controlo da placa também aceita teclado.

O chão côncavo, a curva contínua da dobradiça e a câmara superior inclinada a 65° são superfícies físicas. Paredes e proteção transparente mantêm a bola dentro da caixa. A placa altera os ressaltos físicos. Sons são sintetizados no navegador após interação.

## Executar

Node 20.19 ou superior. `npm ci`, depois `npm run dev`. `npm test` verifica física; `npm run build` gera `dist`. Vercel: preset Vite, build `npm run build`, saída `dist`.

## Validação

43 testes aprovados, incluindo subida pela dobradiça com a mesma bola, colisão nas duas campainhas superiores, retorno físico e regressão da trajetória que antes ficava presa na placa. Uma exploração de 340 combinações de força, direção e placa terminou sempre com regresso ao centro. Solução também executada pelos controlos do navegador. Apresentação verificada em computador e a 390×844; dispositivo físico iPhone ainda não testado.

Solução de referência: placa 0°, direção +5°, força 70%. Há outras trajetórias; uma com contacto na placa usa 30°, +5°, força 100%.

## Organização

Entrada atual: `index.html`, `src/simple.js`, `src/fold-physics.js`, `src/simple.css`, `src/view-controls.js` e `tests/fold.test.js`.

As experiências anteriores permanecem em `src/main.js`, `src/physics.js` e restantes módulos antigos. `lab.html` conserva a entrada anterior apenas para desenvolvimento local; não faz parte da publicação de produção. Os testes antigos mantêm a cobertura dessas experiências. Esta versão concentra-se num único puzzle, sem progressão de níveis, personagens ou modo de dois ecrãs.
