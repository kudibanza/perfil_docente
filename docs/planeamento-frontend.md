# Arquitetura e estado do frontend

## Stack e arquitetura

- Next.js com App Router e TypeScript estrito.
- Server Components por omissão; Client Components nas interações com estado local.
- Route Handlers do Next.js como backend-for-frontend (BFF).
- `iron-session` guarda a sessão numa cookie `HttpOnly`, `SameSite=Lax` e `Secure` em produção.
- FastAPI permanece responsável pela autenticação, validação e autorização.
- CSS próprio, sem biblioteca externa de componentes.

O navegador comunica com o BFF para pedidos autenticados. O BFF encaminha os pedidos à FastAPI com
o token Bearer guardado no servidor. A API verifica o papel e o âmbito da Unidade Orgânica em cada
operação.

## Rotas implementadas

| Rota                                   | Acesso                | Função                                                               |
| -------------------------------------- | --------------------- | -------------------------------------------------------------------- |
| `/`                                    | Público               | Página inicial institucional                                         |
| `/docentes`                            | Público               | Diretório pesquisável pelo nome, com paginação                       |
| `/perfil/[slug]`                       | Público               | Perfil, formação, investigação, publicações e docência recente       |
| `/entrar`                              | Público               | Autenticação                                                         |
| `/painel`                              | Autenticado           | Redireciona para o painel do papel da conta                          |
| `/painel/perfil`                       | USER                  | Editar perfil e gerir formação, investigação, publicações e docência |
| `/painel/unidade`                      | UNIT_ADMIN            | Estatísticas da Unidade Orgânica                                     |
| `/painel/unidade/perfis`               | UNIT_ADMIN            | Consultar, rever, editar e publicar perfis da unidade                |
| `/painel/unidade/catalogo/cursos`      | UNIT_ADMIN            | Gerir cursos                                                         |
| `/painel/unidade/catalogo/disciplinas` | UNIT_ADMIN            | Gerir disciplinas por curso                                          |
| `/painel/unidade/anos-academicos`      | UNIT_ADMIN            | Abrir e encerrar anos académicos                                     |
| `/painel/unidade/contas`               | UNIT_ADMIN autorizado | Criar contas USER quando tem `CREATE_USER_ACCOUNT`                   |
| `/painel/super-admin`                  | SUPER_ADMIN           | Estatísticas institucionais                                          |
| `/painel/super-admin/contas`           | SUPER_ADMIN           | Gerir contas, papéis e permissões                                    |
| `/painel/super-admin/perfis`           | SUPER_ADMIN           | Pesquisar, rever, editar e publicar perfis por unidade               |
| `/painel/super-admin/unidades`         | SUPER_ADMIN           | Gerir Unidades Orgânicas                                             |
| `/painel/super-admin/gestao-unidades`  | SUPER_ADMIN           | Administrar perfis, catálogo e anos por unidade                      |
| `/painel/super-admin/cursos`           | SUPER_ADMIN           | Gerir cursos por unidade                                             |
| `/painel/super-admin/disciplinas`      | SUPER_ADMIN           | Gerir disciplinas por unidade e curso                                |

## Comportamento funcional

- Novos perfis começam em rascunho. SUPER_ADMIN pode publicá-los; UNIT_ADMIN pode publicar perfis
  apenas da sua Unidade Orgânica.
- Só perfis publicados e associados a contas ativas aparecem no portal público.
- A página pública apresenta formação e docência no primeiro separador, e investigação e publicações
  no segundo.
- A docência pública inclui o ano académico aberto e até dois anos anteriores. O histórico completo
  permanece na área administrativa.
- Docentes associam disciplinas a si próprios por ano académico e semestre. Anos encerrados são
  somente leitura.
- Os rótulos de enums são apresentados em português sem alterar os valores enviados à API.
- A pesquisa do diretório atualiza os resultados sem recarregar a página; a pesquisa é pelo nome.
- A gestão de cursos e disciplinas usa tabelas filtráveis e paginadas no frontend.

## Estado das fases

| Fase                              | Estado                                                 |
| --------------------------------- | ------------------------------------------------------ |
| Stack, identidade visual e sessão | Implementada                                           |
| Área USER                         | Implementada                                           |
| Área UNIT_ADMIN                   | Implementada                                           |
| Área SUPER_ADMIN                  | Implementada                                           |
| Diretório e perfil público        | Implementados                                          |
| Testes funcionais                 | Executados                                             |
| Preparação do deploy              | Em planeamento; fornecedor e domínio ainda por definir |

## Preparação para hospedagem

- O projeto ainda guarda fotografias localmente em `MEDIA_STORAGE_DIR` (por omissão `.data/media`).
  Em hospedagem, esse caminho tem de apontar para armazenamento persistente.
- `FASTAPI_INTERNAL_URL` deve ser o endereço da API acessível pelo servidor Next.js.
- `PUBLIC_API_BASE_URL` deve ser a origem pública da API, usada nos endereços das fotografias.
- Se o navegador chamar a API diretamente, configure `CORS_ALLOWED_ORIGINS` com as origens HTTPS
  exatas. O fluxo autenticado atual passa pelo BFF.
- Configure `IRON_SESSION_PASSWORD` e `JWT_SECRET_KEY` como segredos independentes e fora do
  repositório.

## Identidade visual

A interface utiliza dourado institucional, azul moderado, branco e preto, com CSS próprio.
O logótipo está em `frontend/public/brand/logo-uniluanda.png`.

| Token      | Valor     | Aplicação                 |
| ---------- | --------- | ------------------------- |
| Azul       | `#315D7A` | Navegação, botões e links |
| Dourado    | `#C49A25` | Destaques e detalhes      |
| Texto      | `#111111` | Texto principal           |
| Superfície | `#FFFFFF` | Cartões e formulários     |
| Fundo      | `#F5F6F8` | Fundo das páginas         |
