# Integração do frontend

O frontend usa React, TypeScript e Next.js. Os Route Handlers do Next.js encaminham pedidos
autenticados à API FastAPI e mantêm o token fora do navegador.

## Endereços locais

- API: `http://127.0.0.1:8000/api/v1`
- Documentação OpenAPI: `http://127.0.0.1:8000/docs`
- Frontend: `http://localhost:3000`

## Sessão e pedidos

- `POST /api/session/login` encaminha as credenciais para `POST /api/v1/auth/login` e guarda o
  token numa sessão `iron-session` com cookie `HttpOnly` e `SameSite=Lax`.
- O token Bearer fica apenas no servidor Next.js. Os pedidos autenticados do navegador usam
  `/api/backend/...`; o Route Handler acrescenta o token e encaminha o pedido para a API.
- As mutações passam por validação de origem. CORS não substitui esta proteção CSRF.
- A sessão expira com o access token. A API não disponibiliza refresh token.
- Um `401` encerra a sessão do frontend; um `403` indica que a operação não está autorizada.

## Perfis e fotografias

- A área pública lê perfis publicados sem autenticação. Rascunhos e perfis de contas desativadas
  não são expostos.
- A lista pública permite pesquisa por nome e paginação. A API também aceita filtros por Unidade
  Orgânica e função principal.
- O detalhe do perfil inclui formação académica, investigação, publicações e docência agrupada por
  ano académico e semestre. A área pública limita a docência ao ano aberto e aos dois anos
  anteriores.
- Upload: `POST /api/v1/profiles/{id}/photo`, com formulário `multipart/form-data`, campo `file` e
  imagem JPEG, PNG ou WebP até 5 MB. O backend converte a imagem para WebP.
- Remoção: `DELETE /api/v1/profiles/{id}/photo`.
- As imagens são guardadas em `MEDIA_STORAGE_DIR` (por omissão `.data/media`) e servidas em
  `PUBLIC_API_BASE_URL`. Em produção, o diretório deve ser armazenamento persistente.

## Regras administrativas

- A API valida autenticação, papel e âmbito da Unidade Orgânica em cada operação. Os menus do
  frontend não são uma barreira de segurança.
- UNIT_ADMIN só administra dados da unidade atribuída à sua conta.
- SUPER_ADMIN pode escolher a unidade para gerir perfis, cursos, disciplinas e anos académicos.
- Um UNIT_ADMIN pode criar contas USER apenas quando SUPER_ADMIN lhe concede
  `CREATE_USER_ACCOUNT`.
- Docentes podem associar a si próprios disciplinas de cursos ativos, incluindo cursos de outras
  unidades. A mesma disciplina só pode ter um docente por ano académico.
- Ao encerrar um ano académico, as atribuições passam a somente leitura.

## Respostas e validação

- `401`: sessão ausente, inválida ou expirada.
- `403`: utilizador autenticado sem permissão ou fora do âmbito da unidade.
- `404`: recurso inexistente ou perfil não publicado na API pública.
- `409`: conflito com dados existentes, como slug, email ou código duplicado.
- `422`: corpo ou parâmetros inválidos.

Os enums são enviados à API em maiúsculas com underscore, por exemplo `PROFESSOR_AUXILIAR` e
`LICENCIATURA`. O frontend apresenta rótulos em português e preserva os valores de domínio nos
pedidos.
