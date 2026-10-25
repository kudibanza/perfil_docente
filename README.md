# Portal de Perfis da UniLuanda
##Run uniluanda/front
-- npm run dev 
##Run back
-- uvicorn app.main:app --reload

Aplicação institucional para gerir e publicar perfis de docentes, funcionários e investigadores.
O projeto inclui uma API FastAPI e uma aplicação Next.js com TypeScript.

## Requisitos

- Python 3.11 ou superior
- MySQL 8.0.16 ou superior
- Node.js 22.13 ou superior (Node 24 recomendado)

## API — configuração local

Na raiz do projeto:

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
cp .env.example .env
```

Configure a base de dados e os segredos em `.env`. Depois aplique as migrations e inicie a API:

```sh
alembic upgrade head
uvicorn app.main:app --reload
```

A documentação OpenAPI fica disponível em `http://127.0.0.1:8000/docs`.

Para criar o primeiro SUPER_ADMIN, depois de aplicar as migrations:

```sh
python -m app.cli bootstrap-super-admin
```

O comando solicita as credenciais sem mostrar a palavra-passe no terminal. Não use os valores de
exemplo de `.env.example` num ambiente partilhado ou publicado.

## Frontend — configuração local

Com a API em execução, abra outro terminal:

```sh
cd frontend
npm install
cp .env.local.example .env.local
```

Defina `IRON_SESSION_PASSWORD` em `frontend/.env.local` com um segredo próprio de pelo menos
32 bytes. Depois inicie o frontend:

```sh
npm run dev
```

Abra `http://localhost:3000`. Consulte [frontend/README.md](frontend/README.md) para detalhes das
variáveis de ambiente e comandos de manutenção.

## Testes

Os testes unitários e de integração estão descritos em [docs/testes.md](docs/testes.md). Os testes
de integração usam uma base MySQL de teste separada da base de desenvolvimento.

## Documentação do sistema

- [Área administrativa](docs/area-administrativa.md): papéis e fluxos de gestão.
- [Integração do frontend](docs/integracao-frontend.md): contratos e autenticação entre aplicações.
- [Planeamento e estado do frontend](docs/planeamento-frontend.md): módulos implementados e próximos
  passos.

Em produção, defina `CORS_ALLOWED_ORIGINS` com as origens HTTPS exatas do frontend. Fotografias de
perfil são guardadas em `MEDIA_STORAGE_DIR`; nesse ambiente, a pasta deve apontar para armazenamento
persistente.
