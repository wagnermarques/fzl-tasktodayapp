# Prompt para Implementação do Back-end no `fzlbpms` (Apache Karaf + Camel + PostgreSQL)

Você pode copiar e colar o texto abaixo diretamente no chat do repositório **`fzlbpms`**:

```markdown
Olá! Precisamos implementar o bundle e a infraestrutura de back-end para o **Task Today App** no Apache Karaf e PostgreSQL da stack FZL.

Abaixo estão as especificações dos serviços REST, schemas de banco de dados e rotas Camel necessárias:

---

### 1. Schema do Banco de Dados (PostgreSQL - Container `fzl-postgresql`)

Criar a tabela e índices no schema público ou schema `tasktoday`:

```sql
CREATE TABLE IF NOT EXISTS tasktoday_categories (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    name VARCHAR(120) NOT NULL,
    color VARCHAR(32) DEFAULT '#6750a4',
    icon VARCHAR(64) DEFAULT 'label',
    is_native BOOLEAN DEFAULT FALSE,
    -- Tipo de item que a categoria sugere ao criar: 'TAREFA' ou 'ANOTACAO'
    default_kind VARCHAR(16) DEFAULT 'TAREFA',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasktoday_tasks (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    category_id VARCHAR(64) REFERENCES tasktoday_categories(id) ON DELETE SET NULL,
    -- 'TAREFA' tem prazo, prioridade, status e alarme; 'ANOTACAO' tem só título e conteúdo
    kind VARCHAR(16) NOT NULL DEFAULT 'TAREFA',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(32) DEFAULT 'MEDIA', -- 'BAIXA', 'MEDIA', 'ALTA', 'URGENTE'; nulo em anotação
    status VARCHAR(32) DEFAULT 'PENDENTE',   -- 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'; nulo em anotação
    deadline TIMESTAMP WITH TIME ZONE,
    alert_type VARCHAR(32) DEFAULT 'sound',  -- 'sound', 'notification', 'none'
    trigger_minutes INTEGER DEFAULT 15,
    is_archived BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP WITH TIME ZONE,
    alarm_fired BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasktoday_push_subscriptions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_deadline ON tasktoday_tasks (user_id, deadline);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasktoday_tasks (status);
CREATE INDEX IF NOT EXISTS idx_tasks_user_kind ON tasktoday_tasks (user_id, kind);
```

**Migração em base já existente** (as colunas `kind` e `default_kind` foram acrescentadas depois):

```sql
ALTER TABLE tasktoday_tasks      ADD COLUMN IF NOT EXISTS kind VARCHAR(16) NOT NULL DEFAULT 'TAREFA';
ALTER TABLE tasktoday_categories ADD COLUMN IF NOT EXISTS default_kind VARCHAR(16) DEFAULT 'TAREFA';
```

---

### 2. Endpoints REST Camel (Prefix: `/api/tasktoday`)

Implementar as rotas Camel REST com validação de JWT Bearer Token (Keycloak):

- `GET /api/tasktoday/tasks` — Listar tarefas **e anotações** com suporte a query params (`deadline_scope`, `category_id`, `priority`, `status`, `kind`, `include_archived`).
- `POST /api/tasktoday/tasks` — Criar nova tarefa ou anotação (campo `kind`).
- `PUT /api/tasktoday/tasks/{id}` — Atualizar tarefa ou anotação (inclusive trocando o `kind`).
- `DELETE /api/tasktoday/tasks/{id}` — Deletar tarefa.
- `GET /api/tasktoday/categories` — Listar categorias nativas e do usuário.
- `POST /api/tasktoday/categories` — Criar categoria personalizada (campo `defaultKind`).
- `DELETE /api/tasktoday/categories/{id}` — Deletar categoria personalizada.
- `POST /api/tasktoday/push/subscribe` — Registrar inscrição Web Push (VAPID).
- `POST /api/tasktoday/push/test` — Disparar notificação push de teste.

**Tarefa x Anotação (`kind`)**: as duas vivem na mesma tabela e nos mesmos endpoints, separadas pelo campo `kind`.

- `kind: "TAREFA"` — tem `deadline`, `priority`, `status`, `alertType` e `triggerMinutes`.
- `kind: "ANOTACAO"` — só `title`, `description` e `categoryId`; o PWA envia `deadline`, `priority` e `status` nulos, `alertType: "none"` e `triggerMinutes` nulo. Aceitar esses nulos sem recusar o payload.
- O `kind` pode mudar num `PUT` (a edição permite converter nos dois sentidos); nesse caso o PWA manda, no mesmo patch, os campos que foram zerados ou repreenchidos.
- Enquanto o servidor não persistir `kind`, o PWA preserva o tipo local a cada pull para a anotação não voltar como tarefa — mas a distinção fica só no navegador.

---

### 3. Serviço de Notificações Web Push (VAPID)

- Configurar rota Camel com timer agendado (ex: `quartz:taskAlarmChecker?cron=0/30+*+*+*+*+?`) para verificar tarefas cujo `deadline - trigger_minutes` atingiu o momento atual. Filtrar por `kind = 'TAREFA'`: anotação não tem prazo nem alarme (o `deadline` nulo já a exclui, mas o filtro deixa a intenção explícita).
- Enviar payload JSON criptografado via biblioteca Java Web Push (ex: `nl.martijndwars:web-push`) para os endpoints das inscrições registradas.

Por favor, gere o bundle Maven OSGi no Karaf e instale na stack.
```
