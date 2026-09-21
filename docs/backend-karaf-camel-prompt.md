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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasktoday_tasks (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64),
    category_id VARCHAR(64) REFERENCES tasktoday_categories(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    priority VARCHAR(32) DEFAULT 'MEDIA', -- 'BAIXA', 'MEDIA', 'ALTA', 'URGENTE'
    status VARCHAR(32) DEFAULT 'PENDENTE',   -- 'PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDA'
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
```

---

### 2. Endpoints REST Camel (Prefix: `/api/tasktoday`)

Implementar as rotas Camel REST com validação de JWT Bearer Token (Keycloak):

- `GET /api/tasktoday/tasks` — Listar tarefas com suporte a query params (`deadline_scope`, `category_id`, `priority`, `status`, `include_archived`).
- `POST /api/tasktoday/tasks` — Criar nova tarefa.
- `PUT /api/tasktoday/tasks/{id}` — Atualizar tarefa.
- `DELETE /api/tasktoday/tasks/{id}` — Deletar tarefa.
- `GET /api/tasktoday/categories` — Listar categorias nativas e do usuário.
- `POST /api/tasktoday/categories` — Criar categoria personalizada.
- `DELETE /api/tasktoday/categories/{id}` — Deletar categoria personalizada.
- `POST /api/tasktoday/push/subscribe` — Registrar inscrição Web Push (VAPID).
- `POST /api/tasktoday/push/test` — Disparar notificação push de teste.

---

### 3. Serviço de Notificações Web Push (VAPID)

- Configurar rota Camel com timer agendado (ex: `quartz:taskAlarmChecker?cron=0/30+*+*+*+*+?`) para verificar tarefas cujo `deadline - trigger_minutes` atingiu o momento atual.
- Enviar payload JSON criptografado via biblioteca Java Web Push (ex: `nl.martijndwars:web-push`) para os endpoints das inscrições registradas.

Por favor, gere o bundle Maven OSGi no Karaf e instale na stack.
```
