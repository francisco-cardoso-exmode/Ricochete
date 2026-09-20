# Validação v0.4

18 testes de física passaram:
- Passagem contínua e previsão correspondente nos quatro ângulos.
- Conclusão dos três alvos e pontuação sem duplicação.
- Identidade da bola preservada e colisores realmente rodados pela dobradiça.
- Rampa sem descontinuidade e juntas das peças suspensas.
- Cinco perdas consecutivas, decremento único por saída e fim da partida.
- Cabeçada por contacto físico, regresso pela dobradiça e bola preservada.
- Cabeçada fora de tempo falha e não salva remotamente.
- Patrulha e manutenção dos alvos após uma perda.

No browser integrado, viewport 390×844: UI sem painéis de afinação, duas personagens visíveis, lançamento por arrastar/soltar, ativação dos botões de defesa durante a jogada, alvo atingido, perda de uma vida (5 → 4), reposição para a tentativa seguinte e pontuação preservada. Sem erros JavaScript reportados.

A inspeção móvel é uma simulação de dimensões, não um teste em Safari/iPhone físico. O conjunto Playwright adicional é fornecido para reprodução; a validação interativa desta sessão foi feita pelo browser integrado.
