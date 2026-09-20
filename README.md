# RICOCHETE — A caixa

Protótipo jogável: uma caixa quadrada, uma bola metálica e um primeiro puzzle de ricochete. Three.js + Rapier, Vite, pronto para Vercel.

## Jogar

- Tocar na caixa para abrir.
- Rodar a placa com o controlo inferior ou arrastando a própria placa.
- Arrastar dentro da caixa: para os lados define a direção; para baixo aumenta a força. Soltar lança.
- Tocar nas duas campainhas no mesmo lançamento revela um pequeno segredo na tampa.
- A mesma bola regressa ao centro pela gravidade. Não há vidas, perdas nem teletransporte de retorno.
- Arrastar fora da caixa permite uma pequena rotação. Pinça ou roda do rato permitem zoom limitado.
- Teclado: esquerda/direita ajustam direção, cima/baixo força, espaço lança. O controlo da placa também aceita teclado.

O chão côncavo e as paredes são colisores reais, iguais à superfície visível. A placa altera os ressaltos físicos. Sons são sintetizados no navegador após interação.

## Executar

Node 20.19 ou superior. `npm ci`, depois `npm run dev`. `npm test` verifica física; `npm run build` gera `dist`. Vercel: preset Vite, build `npm run build`, saída `dist`.

## Validação

40 testes aprovados, incluindo três testes da nova caixa: retorno de 20 combinações de força/direção, solução que toca na placa e nas duas campainhas, e retorno em 25 combinações de ângulo da placa/direção. A solução também foi executada pelos controlos do navegador. Apresentação verificada a 1280×720 e 390×844; dispositivo físico iPhone ainda não testado.

Solução de referência: placa -30°, direção +25°, força 80%. Há outras trajetórias possíveis.

## Organização

Entrada atual: `index.html`, `src/simple.js`, `src/simple-physics.js`, `src/simple.css`, `src/view-controls.js` e `tests/simple.test.js`.

As experiências anteriores permanecem em `src/main.js`, `src/physics.js` e restantes módulos antigos. `lab.html` conserva a entrada anterior apenas para desenvolvimento local; não faz parte da publicação de produção. Os testes antigos mantêm a cobertura dessas experiências. Esta versão concentra-se num único puzzle, sem progressão de níveis, personagens ou modo de dois ecrãs.
