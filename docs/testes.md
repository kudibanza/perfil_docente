# Testes automatizados

Os testes unitários usam apenas a lógica Python e não acedem ao MySQL. Os testes de integração
exercitam a API com MySQL e só são executados quando `TEST_DATABASE_URL` aponta para uma base
cujo nome termina em `_test`. As migrações são aplicadas nessa base e as tabelas da aplicação
são limpas antes de cada teste de integração. **Nunca configure aqui a URL da base de desenvolvimento
ou produção.**

## Preparar a base de teste

1. No MySQL Workbench, crie uma base vazia dedicada:

   ```sql
   CREATE DATABASE uniluanda_test
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_0900_ai_ci;
   ```

2. Copie `.env.test.example` para `.env.test` e configure `TEST_DATABASE_URL` com as credenciais
   locais que tenham acesso à base `uniluanda_test`. O ficheiro `.env.test` está excluído do Git.

3. Instale as dependências de teste no ambiente virtual:

   ```sh
   source .venv/bin/activate
   python -m pip install -e ".[test]"
   ```

## Executar

No zsh, carregue a URL de teste e execute a suite:

```sh
set -a
source .env.test
set +a
python -m pytest tests -v
```

Sem `TEST_DATABASE_URL`, os testes unitários continuam a correr e os testes de integração são
marcados como ignorados. A primeira execução aplica as migrations Alembic até `head` na base de
teste. Reexecuções preservam o schema e limpam os dados das tabelas da aplicação antes de cada
caso de integração.

## Cobertura atual

- Validação de ano académico, semestres e categoria profissional.
- Acesso de utilizadores aos próprios perfis e isolamento de administradores por unidade.
- Login e consulta da conta autenticada.
- Visibilidade pública apenas de perfis publicados.
- Permissões de `USER`, `UNIT_ADMIN` e `SUPER_ADMIN` no catálogo.
- Abertura e fecho de ano académico, bloqueio de alterações após o fecho e exclusividade de docente
  por disciplina e ano letivo.
