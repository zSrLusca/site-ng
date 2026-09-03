# Garoa RP — Loja Virtual

Plataforma de e-commerce da cidade Garoa RP: catálogo, carrinho, checkout, Pix/cartão via gateway, webhook, entrega digital e painel administrativo.

## Arquitetura

```
Frontend (React + TypeScript + Vite)
        ↓
Backend (Fastify + Prisma)
        ↓
PostgreSQL
        ↓
PaymentProvider (Mercado Pago)
        ↓
Webhook → Pedido pago → Entrega → API FiveM
```

O código do gateway fica isolado em `backend/src/payments`. A entrega FiveM fica em `backend/src/services/fivem.ts`.

## Requisitos

- Node.js 20+
- Docker (PostgreSQL) **ou** PostgreSQL 16 local

## Desenvolvimento

```bash
# 1. Backend (SQLite local, sem Docker)
copy .env.example backend\.env
cd backend
npm install
npx prisma db push
npm run db:seed
npm run dev

# 2. Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

Para produção com PostgreSQL na VPS, use `docker compose` e altere o `provider` em `backend/prisma/schema.prisma` para `postgresql`.

Loja: http://localhost:5173  
Admin: http://localhost:5173/admin

Login padrão (altere no `.env`):

- e-mail: `admin@garoarp.com`
- senha: `TroqueEstaSenha123!`

## Pagamento (Mercado Pago)

Tokens **nunca** passam pelo painel nem pelo frontend. Configure só no `backend/.env` (ou nas variáveis da VPS):

```
MERCADOPAGO_ACCESS_TOKEN=TEST-...   # ou APP_USR-... em produção
MERCADOPAGO_PUBLIC_KEY=TEST-...
MERCADOPAGO_WEBHOOK_SECRET=...
PAYMENT_PROVIDER=mercadopago
PAYMENT_DEV_MODE=false
```

Reinicie a API. Em `/admin/settings` dá para **testar a conexão** e ver se o token está presente — sem exibir o valor.

No painel do MP, cadastre o webhook: `{API_URL}/webhooks/payment`.

O pedido **só** vira pago depois do webhook oficial do Mercado Pago — nunca só porque o jogador voltou da página de sucesso.

Enquanto as credenciais não existirem, `PAYMENT_DEV_MODE=true` usa o provedor de desenvolvimento **apenas local**. Para testar o fluxo completo:

```bash
curl -X POST http://localhost:3333/webhooks/dev-confirm ^
  -H "Content-Type: application/json" ^
  -d "{\"orderNumber\":\"GR-2026-00001\",\"status\":\"approved\"}"
```

## FiveM

Configure `FIVEM_API_URL` e `FIVEM_API_KEY`. A loja chama `POST {FIVEM_API_URL}/deliveries` com a API key. Sem essas variáveis, a entrega é registrada no banco como concluída em fila (sem comando no servidor).

O servidor da cidade também pode puxar pendências em `GET /fivem/deliveries/pending` com header `X-Api-Key`.

Entregas usam chave de idempotência `pedido:item`. Webhook duplicado não entrega de novo.

## Produção (VPS + Nginx)

1. Copie `.env.example` para `backend/.env` com `NODE_ENV=production`, `JWT_SECRET` forte e `PAYMENT_DEV_MODE=false`.
2. Ajuste `nginx/garoa.conf` com o domínio e certificados HTTPS.
3. `docker compose up -d --build`
4. Aponte o DNS (Cloudflare) para a VPS.
5. Entre em `/admin/settings` e vincule o Mercado Pago + URLs públicas HTTPS.

Nunca coloque token, senha ou API key no frontend.

## URLs

- Produto: `/produto/vip-bronze`
- Categoria: `/categoria/planos-vip`
- Admin: `/admin`
