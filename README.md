# RICOCHETE v0.4 — Bico & Bola

Jogo 3D em Three.js + Rapier. Duas perspetivas do mesmo mundo físico, uma bola de jogo e duas personagens que podem salvá-la com cabeçadas.

## Jogar

- Arrasta na base: esquerda/direita aponta, para baixo aumenta a força. Solta para lançar.
- Quando a bola regressar, toca no **Bico** ou na **Bola**, no próprio cenário ou nos botões. No teclado, **A** e **D**.
- A cabeçada só salva com contacto real. O ponto de contacto altera o rumo; há 0,9 s de recuperação entre tentativas de cada personagem.
- Começas com **5 bolas**. Só perdes uma tentativa quando a bola escapa do campo, normalmente pela saída riscada no fundo.
- Ativa os **3 alvos** para ganhar. Os acertos mantêm-se entre bolas. Uma defesa vale 25 pontos; sinos e cestos dão bónus.
- Se uma bola ficar presa, recebe um pequeno impulso sem perder uma vida. Uma corrente suave na base evita que fique parada indefinidamente.
- As personagens passeiam em trajetórias previsíveis, olham para a bola, piscam e provocam o jogador. As falas não alteram a resposta dos controlos.
- **?** explica as regras e pausa o jogo. **♪** liga/desliga os sons.

Não existem pás. As defesas são impulsos aplicados após uma colisão entre a bola e a personagem em movimento. Falhar o timing não provoca uma defesa remota.

## Modo de afinação

O jogo abre sem os painéis de desenvolvimento. Acrescenta `?lab=1` ao endereço para mostrar força, direção, trajetória, presets de dobradiça e reset manual. O modo `?debug=1` expõe a API usada pelos testes. Não é necessário para jogar.

## Desenvolvimento e Vercel

Node.js 20.19+ ou 22.12+.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Vercel: preset Vite; `npm run build`; saída `dist`. O ficheiro `vercel.json` já configura o build. Sem chaves, backend ou variáveis de ambiente. Fontes e WASM incluídos no build, sem CDN em execução.

Na mesma rede Wi-Fi, o servidor de desenvolvimento também pode ser aberto pelo endereço de rede indicado pelo Vite. Para testar fora dessa rede, usar o URL publicado na Vercel.

## Estrutura

- `src/characters.js`: patrulha, janela de cabeçada, recuperação e corrente de retorno.
- `src/physics.js`: mundo único, bola com CCD, colisores, vidas, pontuação e vitória/derrota.
- `src/level.js`: construction kit, rampa tangente da dobradiça e transformação dos ângulos.
- `src/graphics.js`: greybox, câmaras, personagens com expressões, sombras e contornos.
- `src/main.js`: gestos, UI, áudio e ciclo de jogo.
- `tests/physics.test.js`: 18 testes automáticos, incluindo contacto, falha, perda das cinco vidas e conclusão do nível.

Para testes de interface reproduzíveis, iniciar `npm run dev`, depois `npx playwright install chromium` e `npm run test:browser`. Pode definir `BASE_URL` para testar outra origem.

## Física e limites

A bola de jogo mantém o mesmo rigid body durante lançamentos e reposições. As duas personagens são corpos cinemáticos separados, não duplicações da bola. Duas câmaras renderizam a mesma cena com planos de corte complementares. A previsão usa uma cópia temporária do mundo, nunca inserida no mundo em execução. A dobradiça roda meshes e colisores, com uma rampa física segmentada entre 90° e 180°.

Requer WebGL 2 e WebAssembly. Validado no browser integrado e viewport móvel 390×844; ainda não validado num iPhone físico/Safari. Esta versão inclui um nível e não guarda partidas entre sessões.

## Controlos móveis e vista contínua

Arrasta o Bico ou a Bola (ou o respetivo botão) para os lados. Solta para dar a cabeçada; também podes posicioná-los antes do lançamento. Defesas seguidas dão 25, 50, 75 e até 100 pontos; o recorde fica guardado neste navegador.

O jogo usa uma câmara para mostrar o tabuleiro dobrado inteiro. A bola é desenhada na posição física real, sem interpolação entre ecrãs nem alteração artificial de escala. A comparação com duas câmaras fica apenas no laboratório. Os gestos de zoom e deslocação da página estão bloqueados no modo de jogo.

## Caixas de aprendizagem

O modo de jogo começa com a caixa fechada. Toca em Abrir caixa: a tampa abre durante 2,2 segundos, com a simulação parada até a abertura terminar. A câmara está mais próxima do tabuleiro.

1. O primeiro lançamento: um alvo, espaço livre para aprender.
2. Escolhe o ângulo: dois alvos e bumpers.
3. Devolve a bola: um alvo e uma defesa física obrigatória.
4. Ressaltos e sinos: três alvos, sinos e cestos.
5. O playground: construção completa.

O teste atual destina-se a um ecrã único. Não existe ainda integração com a dobradiça física de telemóveis dobráveis.

## Interação e destruição

A vitória deixa a ação continuar 2,4 segundos antes do resultado. Ao apontar, a barra mostra a força e a seta sobe e cresce. A próxima bola entra a partir da armação exterior usando o mesmo corpo físico. A partir da caixa 3, mantém a defesa premida e posiciona a almofada mecânica para devolver a bola por contacto.

A partir da caixa 2 há duas pequenas pilhas de tijolos com arestas gastas. Impactos acima de 4 unidades/s partem cada tijolo em oito fragmentos físicos, com gravidade, rotação e colisão. São peças pré-divididas, não fratura procedural; o limite é 64 fragmentos para conter o custo em telemóveis. O tratamento visual continua cinzento nesta etapa, inspirado nos volumes e desgaste da referência.

A bola que regressa ao círculo é recolhida suavemente e pode ser relançada sem gastar vida. Puxar acima de 72% aumenta a velocidade e a elasticidade. A cavidade superior tem 3,6 unidades de profundidade; as barras diagonais e riscas exteriores foram retiradas.

## Primeira caixa: O sino e o ninho

Pingo é o nome provisório da personagem jogável: a única bola física, com olhos, tufo e reações à força/velocidade. Na caixa 1, tocar no sino abre uma comporta real. Só cair no ninho rebaixado conclui a jogada. O botão FOLE aplica um impulso de ar local na base, centra e abranda o regresso, com recarga de 0,8 segundos. Fora dessa zona não afeta a bola. A vitória aguarda o regresso; uma saída lateral desconta uma vida. Ninho e reserva estão dentro do perímetro exterior da caixa. As caixas 2–5 mantêm os objetivos anteriores nesta primeira experiência.

A inspeção da vista permite arrastar fora da caixa (±8° horizontal, ±5° vertical) e usar dois dedos ou roda do rato para zoom de 92%–110%. Dois cliques fora repõem a vista. O gesto de dois dedos cancela a mira sem lançar.

A cavidade superior tem agora 5,8 unidades de profundidade. A partir da caixa 2, placas inclinadas dianteiras e traseiras permitem ressaltos entre planos. Um lançamento normal de força 60 e direção -6° na caixa 2 foi verificado a atingir duas placas com mais de 1,5 unidades de profundidade entre contactos.
