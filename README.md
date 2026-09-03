# Garoa RP — Loja Virtual

Plataforma de e-commerce da cidade Garoa RP: catálogo, carrinho, checkout, Pix/cartão via gateway, webhook, entrega digital e painel administrativo.

## Arquitetura

```
Frontend (React + TypeScript + Vite)
        ↓
Backend (Fastify + Prisma + SQLite)
        ↓
PaymentProvider (Mercado Pago)
        ↓
Webhook → Pedido pago → Entrega → API FiveM
```

O código do gateway fica isolado em `backend/src/payments`. A entrega FiveM fica em `backend/src/services/fivem.ts`.

## Requisitos

- Node.js 20+
- SQLite (arquivo `backend/prisma/dev.db` — sem servidor de banco)

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

O banco é sempre SQLite (`DATABASE_URL=file:./dev.db`), no PC e na VPS.

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

Configure `FIVEM_API_URL=http://104.234.63.151:30120/ng-loja` e `FIVEM_API_KEY`. A loja chama `POST {FIVEM_API_URL}/deliveries` com a API key. Sem essas variáveis, a entrega é registrada no banco como concluída em fila (sem comando no servidor).

O servidor da cidade também pode puxar pendências em `GET /fivem/deliveries/pending` com header `X-Api-Key`.

Entregas usam chave de idempotência `pedido:item`. Webhook duplicado não entrega de novo.

## Produção (VPS + Nginx)

Domínio: `novagaroa.com.br`  
VPS: `104.234.63.151`

No DNS do domínio, crie:

| Tipo | Nome | Valor            |
|------|------|------------------|
| A    | @    | 104.234.63.151   |
| A    | www  | 104.234.63.151   |

1. Na VPS: `git clone https://github.com/zSrLusca/site-ng.git && cd site-ng`
2. Copie `backend/.env.vps.example` para `backend/.env`. Mantenha `DATABASE_URL=file:./dev.db`. Gere `JWT_SECRET` e senha do admin novos.
3. URLs da loja:
   - `APP_URL=https://novagaroa.com.br`
   - `API_URL=https://novagaroa.com.br/api`
   - `ALLOWED_ORIGINS=https://novagaroa.com.br,https://www.novagaroa.com.br`
   - `FIVEM_API_URL=http://104.234.63.151:30120/ng-loja`
4. Copie o Nginx: `sudo cp nginx/garoa.conf /etc/nginx/sites-available/novagaroa.conf` e ative o site.
5. `docker compose up -d --build`
6. Quando o DNS resolver: `sudo certbot --nginx -d novagaroa.com.br -d www.novagaroa.com.br`
7. Webhook no Mercado Pago: `https://novagaroa.com.br/api/webhooks/payment`

Nunca coloque token, senha ou API key no frontend.

## URLs

- Produto: `/produto/vip-bronze`
- Categoria: `/categoria/planos-vip`
- Admin: `/admin`
