# Roadmap — Task Today App

Documento de acompanhamento do ciclo de vida, entregas realizadas e próximas etapas de desenvolvimento do **Task Today App** (PWA + Lit + AppShell FZL + Apache Karaf / Camel + PostgreSQL).

---

## 🧭 Visão Geral do Projeto

- **Nome**: Task Today App (`fzl-tasktodayapp`)
- **Tipo**: Progressive Web App (PWA) / Single Page Application (SPA)
- **Base UI**: Lit (Web Components nativos) + Material 3 Design (`@material/web`) + `fzl-fund-appshell--lit`
- **Back-end de Apoio**: Stack `fzlbpms` (Apache Karaf OSGi + Apache Camel REST Routes + Keycloak JWT + PostgreSQL)
- **Hospedagem / CI/CD**: GitLab Pages via `.gitlab-ci.yml`

---

## 📊 Status Geral de Desenvolvimento

```
[██████████████████░░] 75% Concluído (Fase 1 e Fase 2 entregues; Fase 3 em integração com stack fzlbpms)
```

---

## 🚀 Fases de Desenvolvimento

### Fase 1: Fundação & Scaffolding do Front-end (Concluída ✅)
- [x] Inicialização do repositório Git e estrutura de diretórios.
- [x] Integração do submódulo `fzl-fund-appshell--lit` (`git@github.com:wagnermarques/fzl-fund-appshell--lit.git`).
- [x] Configuração do `package.json` com npm workspaces e dependências peer (`lit`, `@material/web`, `vite`, `vite-plugin-pwa`, `keycloak-js`).
- [x] Configuração do `vite.config.js` com preset do AppShell e geração de Service Worker PWA (`sw.js`).
- [x] Criação de assets estáticos PWA (ícones responsivos, manifest e `favicon.svg`).
- [x] Configuração do pipeline `.gitlab-ci.yml` para deploy automatizado no GitLab Pages.

---

### Fase 2: Implementação dos Requisitos Funcionais do Front-end (Concluída ✅)

- [x] **RF01 — Cadastro de Tarefas (Criar)**:
  - Componente modal [`<task-form-dialog>`](src/components/task-form-dialog.js) com Título, Descrição, Data/Hora de Deadline (`datetime-local`), Prioridade, Categoria e Gatilhos de Alerta.
- [x] **RF02 — Categorização Multiescopo**:
  - Categorias nativas integradas: *Cursos*, *Tarefas Cotidianas*, *Financeira*, *Pessoais*.
  - View [`<task-categories-view>`](src/views/task-categories-view.js) para criação de categorias dinâmicas com paleta de cores e ícones customizados.
- [x] **RF03 — Filtragem Avançada e Visualização**:
  - Componente [`<task-filter-bar>`](src/components/task-filter-bar.js) com chips de foco em Deadline (*Atrasadas*, *Vencem Hoje*, *Esta Semana*, *Todas*).
  - Filtros combinados por Categoria, Prioridade, Status (*Pendentes*, *Concluídas*, *Arquivadas*) e busca textual instantânea.
  - Dashboard de métricas na [`<task-today-home-view>`](src/views/task-today-home-view.js).
- [x] **RF04 — View de Configuração de Alertas e Alarmes Sonoros**:
  - Serviço [`alarm-service.js`](src/services/alarm-service.js) baseado em **Web Audio API** (timbres sintetizados *Chime*, *Radar*, *Bell*, *Synth* sem dependência de MP3 externo).
  - Modal pulsante [`<task-alarm-dialog>`](src/components/task-alarm-dialog.js) com ações de Adiar 5 min, Adiar 15 min, Concluir Tarefa e Dispensar.
  - View de configuração e teste sonoro [`<task-alarms-config-view>`](src/views/task-alarms-config-view.js).
- [x] **RF05 — Integração Multiplataforma**:
  - View [`<task-integrations-view>`](src/views/task-integrations-view.js) com conectores para Google Tasks, Microsoft To Do / 365 e endpoint REST do Apache Karaf.
- [x] **RF06 — Manutenção e Edição (Atualizar)**:
  - Edição inline e atalhos rápidos de reagendamento (+1 dia, +7 dias) no componente [`<task-card>`](src/components/task-card.js).
- [x] **RF07 — Exclusão e Arquivamento (Deletar)**:
  - Exclusão individual com confirmação e funcionalidade de arquivar/desarquivar tarefas.
- [x] **RF08 — Notificações Web Push & VAPID**:
  - Serviço [`push-service.js`](src/services/push-service.js) com suporte a par de chaves VAPID, registro via Service Worker e disparo de notificações no SO/navegador.

---

### Fase 3: Coordenação & Integração com o Back-end `fzlbpms` (Em Planejamento 🔄)

- [x] Elaboração do documento de contratação de API e SQL: [`docs/backend-karaf-camel-prompt.md`](docs/backend-karaf-camel-prompt.md).
- [ ] Executar script de migração no banco `fzl-postgresql` na stack `fzlbpms` (tabelas `tasktoday_tasks`, `tasktoday_categories`, `tasktoday_push_subscriptions`).
- [ ] Compilar e instalar o bundle OSGi Camel REST no Apache Karaf (`fzl-karaf-camel-integration`).
- [ ] Configurar validação de tokens JWT do Keycloak (Realm `fzlbpms`) no interceptor Camel.
- [ ] Ativar rotina periódica no Camel (Quartz) para envio de Push Notifications via VAPID para tarefas com deadline próximo.
- [ ] Conectar o client REST do frontend ao endpoint do back-end (`https://dev/api/tasktoday`).

---

### Fase 4: Otimizações, Testes & Recursos Futuros (Próximos Passos 🎯)

- [ ] **Sincronização Offline-First com Fila (Outbox Pattern)**:
  - Gravar alterações em IndexedDB caso o usuário esteja offline e sincronizar com o back-end via Background Sync API quando a conexão retornar.
- [ ] **Visualização em Modo Calendário e Modo Quadro Kanban**:
  - Adicionar visualização de tarefas em grade semanal/mensal e colunas por status.
- [ ] **Subtarefas e Checklist interno**:
  - Suporte a itens de verificação dentro de cada tarefa.
- [ ] **Suporte a Múltiplos Idiomas (i18n)**:
  - pt-BR (padrão), en-US e es-ES.
- [ ] **Testes Automatizados**:
  - Testes unitários com Vitest para os serviços (`task-service`, `alarm-service`, `push-service`).
  - Testes E2E com Playwright.

---

## 🛠️ Comandos Úteis

| Comando | Descrição |
|---|---|
| `npm run dev` | Inicia o servidor de desenvolvimento Vite na porta `3030`. |
| `npm run build` | Executa o build de produção com empacotamento PWA em `dist/`. |
| `npm run preview` | Executa a pré-visualização do build de produção com Service Worker ativo. |
| `npm run serve` | Build + Preview em uma única instrução. |
