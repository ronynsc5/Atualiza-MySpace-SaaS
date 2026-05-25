# MyMind Pro

Projeto estático pronto para GitHub, Vercel e Supabase.

## Rodar local

```bash
npm install
npm run dev
```

## Supabase

1. Crie um projeto no Supabase.
2. Vá em SQL Editor.
3. Rode o arquivo `supabase-schema.sql`.
4. Vá em Project Settings > API.
5. Copie `Project URL` e `anon public key`.
6. Cole no arquivo `config.js`.
7. Ative Auth por email/senha em Authentication > Providers.

## Deploy Vercel

1. Suba estes arquivos para um repositório GitHub.
2. Na Vercel, clique em Add New > Project.
3. Importe o repositório.
4. Framework Preset: Other.
5. Build Command: vazio.
6. Output Directory: vazio ou `.`.
7. Deploy.

## Uso Cloud

No app aparecerão botões:

- Login
- Cloud Save
- Cloud Load

Primeiro crie conta pelo Supabase Auth ou use `MyMindCloud.signup()` no console.
