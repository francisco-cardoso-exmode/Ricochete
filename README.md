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

## Contrôle mobile et passage / atualização

Arrasta o Bico ou a Bola (ou o respetivo botão) para os lados. Solta para dar a cabeçada; também podes posicioná-los antes do lançamento. Defesas seguidas dão 25, 50, 75 e até 100 pontos; o recorde fica guardado neste navegador.

A passagem desenha a mesma malha da bola à frente da linha divisória, com o ponto médio alinhado à dobradiça. O corpo físico não é duplicado nem teleportado. Os gestos de zoom e deslocação da página estão bloqueados no modo de jogo.
