# Área administrativa — especificação funcional

Documento independente de framework frontend. A interface deve consumir a API FastAPI e nunca tomar decisões de autorização apenas no cliente.

## USER

- Entrar e consultar a própria conta: `POST /api/v1/auth/login`, `GET /api/v1/auth/me`.
- Criar o próprio perfil como rascunho: `POST /api/v1/profiles/me`.
- Consultar e editar o próprio perfil: `GET /api/v1/profiles/me`, `PATCH /api/v1/profiles/{profile_id}`.
- Gerir formações, linhas de investigação e publicações nos endpoints aninhados em
  `/api/v1/profiles/{profile_id}`.
- Consultar cursos e disciplinas ativos de qualquer Unidade Orgânica e gerir as disciplinas associadas
  ao seu perfil, se a função principal for `DOCENTE`. Pode associar-se a disciplinas de outros
  cursos, incluindo cursos de outra Unidade Orgânica.
- Não pode publicar o próprio perfil nem administrar dados de outras pessoas.
- Não pode associar outro docente a uma disciplina.

## UNIT_ADMIN

- Ver e gerir perfis apenas da unidade atribuída à conta.
- Criar perfis, rever rascunhos e alterar o estado de publicação.
- Gerir cursos e disciplinas da própria unidade; as remoções são desativações para preservar o
  histórico.
- Abrir e encerrar anos académicos da própria unidade. Um ano encerrado não aceita alterações às
  atribuições de disciplinas.
- O backend rejeita tentativas sobre outra unidade com `403 Forbidden`.

## SUPER_ADMIN

- Consultar e administrar perfis, cursos e disciplinas de todas as unidades.
- Criar, listar, atualizar e desativar contas de utilizadores e administradores.
- Criar, atualizar e desativar Unidades Orgânicas.
- Abrir e encerrar anos académicos de qualquer unidade.
- Não existe eliminação física de unidades ou contas nos endpoints administrativos.

## Fluxos de navegação

1. Login → dashboard conforme o papel da conta.
2. `USER` sem perfil → formulário de criação do perfil, com seleção de uma unidade ativa.
3. `UNIT_ADMIN` → lista de perfis da unidade, filtros, formulário do perfil, publicação e catálogo.
4. `SUPER_ADMIN` → seletor de unidade ou visão global, gestão de utilizadores e administração
   institucional.

## Estados e comportamento

- Apenas um perfil `PUBLISHED` associado a uma conta ativa aparece em `/api/v1/public/profiles`.
- `DRAFT` e `INACTIVE` não são apresentados publicamente.
- A interface deve tratar `401` como sessão ausente ou expirada e `403` como falta de permissão.
- Os códigos de domínio devem ser apresentados com rótulos legíveis; os valores da API permanecem
  estáveis, por exemplo `PROFESSOR_AUXILIAR` e `LICENCIATURA`.
- Os formulários de disciplina devem selecionar itens do catálogo; não devem enviar o nome da
  disciplina como texto livre na associação ao docente.

## APIs administrativas usadas pela interface

- Autenticação: `/api/v1/auth/login`, `/api/v1/auth/me`.
- Unidades: `/api/v1/organizational-units`.
- Utilizadores: `/api/v1/users`.
- Anos académicos: `/api/v1/academic-years`.
- Perfis: `/api/v1/profiles`, `/api/v1/profiles/me` e os endpoints aninhados de formação,
  investigação, publicações e disciplinas.
- Catálogo: `/api/v1/courses` e `/api/v1/courses/{course_id}/disciplines`; docentes consultam o
  catálogo ativo das quatro unidades para autoassociação.
- Consulta pública: `/api/v1/public/profiles`.

## Frontend escolhido

O frontend será desenvolvido com React, TypeScript e Next.js. A sessão e os componentes visuais
estão planeados em [planeamento-frontend.md](planeamento-frontend.md), antes da implementação da
interface.
