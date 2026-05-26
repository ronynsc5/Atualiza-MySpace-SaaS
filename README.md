# MySpace SaaS v3.15

Versão SaaS do MySpace com login, paywall, Mercado Pago, Supabase, IA BYOK e webhook de automação.

## O que esta versão adiciona

- Nome trocado para **MySpace**
- Tela de login/cadastro com e-mail e senha via Supabase Auth
- Cada usuário acessa somente o próprio projeto/mapa mental
- Paywall de **R$ 29,90/mês**
- Checkout Mercado Pago via API serverless da Vercel
- Webhook Mercado Pago para liberar 31 dias de acesso após pagamento aprovado
- Bloqueio automático quando o prazo acaba
- Cron diário para apagar projetos de usuários que passaram 30 dias sem renovar
- Painel de IA dentro do app, com API key/modelo configurados pelo próprio usuário
- Webhook genérico para WhatsApp/IA/automações criarem cards no projeto

## 1. Supabase

Rode `supabase-schema-myspace.sql` no SQL Editor do Supabase.

Depois confirme que existem as tabelas:

- `profiles`
- `projects`

## 2. Frontend config

No arquivo `config.js`, coloque sua URL do Supabase e a Publishable Key:

```js
window.SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
window.MYSPACE_SUPABASE_ANON_KEY = 'SUA_PUBLISHABLE_KEY';
```

Nunca coloque `service_role` aqui.

## 3. Variáveis da Vercel

Em Vercel > Project > Settings > Environment Variables, adicione:

```txt
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
MERCADO_PAGO_ACCESS_TOKEN
MYSPACE_PUBLIC_URL
MYSPACE_PRICE=29.90
MYSPACE_PLAN_NAME=MySpace Mensal
CRON_SECRET
AUTOMATION_WEBHOOK_SECRET
```

Depois faça Redeploy.

## 4. Mercado Pago

Use o Access Token somente nas variáveis da Vercel.

Configure o webhook do Mercado Pago para:

```txt
https://SEU-SITE.vercel.app/api/mercadopago-webhook
```

Evento: pagamentos / payments.

Esta versão usa pagamento mensal renovável por checkout. Para assinatura recorrente automática real, o próximo passo é trocar para API de assinaturas/preapproval do Mercado Pago.

## 5. IA

No app, clique no botão **IA**.
O usuário informa:

- endpoint compatível com Chat Completions
- modelo
- API key própria

A chave fica no navegador do usuário e só é enviada para `/api/ai-proxy` quando ele usa a IA.

## 6. Webhook WhatsApp/Automação

Endpoint criado:

```txt
https://SEU-SITE.vercel.app/api/automation-webhook
```

Envie POST com Bearer token `AUTOMATION_WEBHOOK_SECRET`.

Exemplo:

```json
{
  "user_email": "cliente@email.com",
  "title": "Ideia enviada pelo WhatsApp",
  "text": "Criar campanha de lançamento para sexta-feira"
}
```

Esse endpoint cria um card dentro do projeto do usuário.
Para WhatsApp real, conecte Meta WhatsApp Cloud API, Z-API, Evolution API ou Twilio apontando para esse endpoint.

## 7. Deploy

```bash
git add .
git commit -m "add MySpace SaaS auth paywall ai webhook"
git push
```

A Vercel publica automaticamente.
