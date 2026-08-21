# Aurora Legal Insights

Quero criar um sistema chamado Aurora — plataforma de inteligência jurídica para advogados.

Este é o primeiro prompt: SÓ a fundação do sistema (sem landing page, sem autenticação/login).

O sistema deve abrir direto na tela principal ao acessar a URL — sem tela de login por enquanto.

## IDENTIDADE VISUAL

Tema escuro "tech premium".

Paleta (hex exatos):

- Fundo: #0B0E14 | Painéis: #131826 | Painéis alternativos: #1B2233 | Bordas: #262E42

- Destaque dourado: #C9A24B | Dourado claro: #E4C878 | Teal (dados): #4FD1C5 | Alerta/urgente: #C1543D

- Texto principal: #E9E7DF | Texto secundário: #99A2B5

Tipografia (Google Fonts): Fraunces (títulos e resumos de IA) + IBM Plex Sans (interface) + IBM Plex Mono (números, datas, códigos de processo).

## ESTRUTURA

Menu lateral fixo (sidebar), com os itens: Início, Processos, Radar Preditivo, Análise de Peças, Configurações.

Por enquanto, crie apenas a sidebar funcional e uma tela vazia em branco (usando o tema) para cada item do menu — vamos preencher o conteúdo de cada uma em prompts separados.

## BANCO DE DADOS (Supabase) — sem autenticação de usuário por enquanto

Crie estas tabelas, todas sem vínculo a um usuário (single-tenant por enquanto):

1. **account_settings** (linha única) — nome do escritório, OAB, plano atual, créditos_totais_mes (padrão 30), créditos_usados_mes (padrão 0), dia de renovação.

2. **cases** (processos) — número do processo, nome do cliente, telefone do cliente, e-mail do cliente, parte contrária, vara/comarca, tipo de caso (ex: cível, família, consumidor), status, resumo (texto longo, vazio até a IA gerar).

3. **case_activity** (linha do tempo de cada processo) — referência ao processo, tipo de evento (resumo_gerado / peca_analisada / prazo_alterado / outro), descrição, data.

4. **case_files** (arquivos do processo) — referência ao processo, nome do arquivo, tipo (enviado_pelo_advogado / gerado_pela_aurora), URL do arquivo no Supabase Storage, data.

5. **deadlines** (prazos e agenda) — referência ao processo (pode ser nulo, pra compromissos sem processo vinculado), título, data, tipo (prazo / compromisso), tag de prioridade (urgente / importante / informativo), status (pendente/concluído).

6. **legal_profiles** (perfis salvos de juízes e advogados) — nome, tipo (juiz/advogado), vara ou comarca associada, taxa de deferimento estimada, tempo médio de decisão em dias, quantidade de decisões usadas na análise, resumo comportamental (texto), data da última atualização. IMPORTANTE: antes de criar um novo registro aqui, o sistema deve checar se já existe um perfil com o mesmo nome e tipo — se existir, reutilizar em vez de duplicar.

7. **piece_analysis** (análises de peças) — referência ao processo, modo (processo_completo / processo_mais_peca / so_peca), texto ou arquivo enviado, resultado da análise (texto longo), sugestões geradas (texto longo), data.

8. **authorization_log** (registro de consentimento) — referência ao processo, nome do juiz analisado, nome do advogado adversário analisado, autorizado (sim/não), data e hora.

## REGRAS DE CRÉDITO

Cada análise de IA (resumo, raio-x, radar) deve descontar 1 de créditos_usados_mes em account_settings. Antes de rodar qualquer análise, verifique se créditos_usados_mes < créditos_totais_mes — se não houver crédito disponível, mostre um aviso em vez de rodar a análise.

Não implemente a lógica de IA em si neste prompt — só a estrutura do banco e o desconto de crédito. As chamadas de IA de verdade vêm nos próximos prompts.

Por enquanto, não crie conteúdo dentro das telas — só confirme que a sidebar, o tema e as tabelas do banco estão prontos.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/56edc9ac-ce77-4db0-aaec-2e1ee6850d69).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
