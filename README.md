# Nexus AI — GitHub + Netlify

Assistente de IA estático no frontend com uma Netlify Function como backend seguro.

## Arquivos

- `public/index.html`
- `public/style.css`
- `public/app.js`
- `netlify/functions/chat.mjs`
- `netlify.toml`

## Publicar

1. Envie todos os arquivos para o GitHub.
2. Na Netlify, conecte o repositório.
3. Em **Project configuration → Environment variables**, crie:
   - `OPENAI_API_KEY` = sua chave
   - `OPENAI_MODEL` = `gpt-5` (opcional)
4. Garanta que `OPENAI_API_KEY` esteja disponível para **Functions**.
5. Faça um novo deploy.

A chave nunca deve ser colocada no HTML ou no JavaScript público.

## Observação

Esta versão usa a Netlify Function para chamadas de texto e busca na web. O upload de arquivos/imagens da versão local anterior precisa de uma camada específica de armazenamento/multipart na Function para ser enviado diretamente à API; a interface continua preparada para anexos, mas a função atual não envia os binários.

Para uma versão comercial completa, recomendo adicionar autenticação, banco de dados, limite por usuário, pagamentos e armazenamento de arquivos.
