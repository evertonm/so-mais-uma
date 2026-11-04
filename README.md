# Só Mais Uma ⚽

Jogo de faltas em seis fases, preservando a versão local **v15 (Fernandes fiel)**. A imagem da torcida, os jogadores, Wilson, Fernandes e os assets continuam embutidos no HTML.

## Executar

Abra `index.html` no navegador para jogar localmente sem instalação. O ranking global requer deploy com a API e as variáveis do banco (abrir só o HTML não grava dados online).

Deploy: importe esta pasta no projeto Vercel `so-mais-uma` (framework **Other**, diretório raiz), mantendo `index.html`, `api` e `lib` juntos. Conecte o banco **Upstash Redis** pelo Vercel Marketplace e utilize as variáveis `KV_REST_API_URL` e `KV_REST_API_TOKEN` (ou `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`) nos ambientes desejados. Depois redeploy.

## Regras

- Seis gols para concluir a campanha, todos os seis jogadores originais.
- Os cantos superiores valem +300 pontos; cantos inferiores +240; faixas laterais +180; parte alta central +140; centro +100.
- Bônus crescente a cada fase de +35, +70, +105, +140 e +175 pontos.
- Erro: -35 pontos, aumentando em 15 por erro consecutivo na mesma fase, até -120; pontuação mínima de zero.
- Treino não afeta classificação. Só a conclusão de seis gols envia a partida.
- O servidor recalcula a física de cada cobrança a partir das entradas enviadas pelo jogo antes de gravar no ranking, em vez de aceitar a pontuação apresentada pelo cliente.
- O ranking conserva a melhor campanha de cada instalação anônima (UUID no localStorage), sem exigir cadastro.
- A imagem de resultado mostra pontuação, posição e link da página. Compartilhar no celular ou baixar a imagem.

O HTML funciona offline. Sem configuração Redis, o ranking indica indisponibilidade (sem simular jogadores ou dados de produção).

## Correções de 04/11/2026
- Corrigido o recorte do sprite Wilson: pose em repouso e ponte, sem mostrar fragmentos de outras poses.
- Aplicada correção cromática seletiva nas partes acinzentadas da pele de Fernandes, preservando camisa, meias e cabelos.
- A versão final é criada a partir de `index.html` e `scripts/postprocess.mjs` com `npm run build`, resultando em `dist/index.html`.
- O endpoint `api/leaderboard.js` já valida as seis fases e calcula os pontos no servidor. Para ativar o ranking global é necessário conectar o Upstash Redis à Vercel com `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` e gerar um novo deploy.

### Testes
Execute `npm test` para física e cálculo de pontuação. Para publicar, execute `npm run build` e configure saída `dist` na Vercel.


## Integração Upstash/Vercel (04/11/2026)
Compatibilidade com nomes de variáveis tanto do Upstash quanto do Vercel KV, com fallback explícito. Não inclua credenciais no arquivo HTML. Depois de conectar o armazenamento ao projeto, é necessário publicar um novo deploy de produção e testar a API `/api/leaderboard`.


### Diagnóstico rápido do ranking
- `GET /api/leaderboard?health=1` retorna se o Redis está configurado, se há token de escrita e quantos registros existem hoje no ranking.

## Fernandes — arte aprovada
As quatro poses usam **fernandes-sprite-aprovado.webp**, gerado a partir da arte aprovada. O WebP tem transparência verdadeira (sem fundo preto), caixas de recorte próprias e é copiado ao diretório `dist` junto com os sprites do Wilson. Não aplicar filtros de cor no navegador à sprite revisada.
