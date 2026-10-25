# Frontend UniLuanda

Aplicação Next.js com TypeScript para o diretório público e as áreas de gestão.

## Requisitos

- Node.js 22.13 ou superior (Node 24 recomendado)
- API FastAPI disponível em `http://127.0.0.1:8000`

## Configuração local

Na pasta `frontend`:

```sh
npm install
cp .env.local.example .env.local
```

Defina `IRON_SESSION_PASSWORD` com um segredo independente do segredo JWT da API. Gere um valor
com:

```sh
openssl rand -hex 32
```

Inicie a aplicação:

```sh
npm run dev
```

Abra `http://localhost:3000`. A sessão usa uma cookie `HttpOnly`; o token Bearer permanece no
servidor Next.js. Os pedidos administrativos passam pelo BFF em `/api/backend/...` e continuam
sujeitos às regras de autorização da API FastAPI.

O logótipo usado pela aplicação está em `public/brand/logo-uniluanda.png`.

## Variáveis de ambiente

- `APP_ORIGIN`: origem da aplicação no navegador, incluindo protocolo e porta.
- `FASTAPI_INTERNAL_URL`: endereço servidor-a-servidor da API, sem o sufixo `/api/v1`.
- `IRON_SESSION_PASSWORD`: segredo próprio com pelo menos 32 bytes para selar a cookie.

Não exponha estes valores com o prefixo `NEXT_PUBLIC_`.

## Manutenção

```sh
npm run format       # formatar o código do frontend
npm run format:check # verificar a formatação
npm run lint         # executar ESLint
npm run build        # criar a compilação de produção
```
