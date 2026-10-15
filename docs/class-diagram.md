# Diagrama de Classes — Task Today App

Visão geral das classes do front-end (`src/`) depois da refatoração para orientação a
objetos da camada de serviços. Todos os componentes de UI já eram classes (`LitElement`);
`StorageManager`, `KeycloakAuthProvider`, `ApiClient` e `DescriptionSanitizer` eram módulos
de funções soltas e passaram a encapsular seu próprio estado em classes.

Cada serviço é exportado como uma instância única (singleton), ex.: `export const
taskService = new TaskService()`.

```mermaid
classDiagram
  direction LR

  %% ---------------- Serviços (camada de domínio / infraestrutura) ----------------

  class StorageManager {
    -prefix: string
    +getItem(key, fallback) any
    +setItem(key, value) void
    +initSeedData() void
  }

  class KeycloakAuthProvider {
    -config: object
    -keycloak: Keycloak
    -ready: Promise
    -signOutListeners: Set
    +isConfigured() boolean
    +getAccessToken() Promise~string~
    +isAdmin() boolean
    +onSignOut(listener) Function
    +init(appshell) Function
    +signIn() Promise
    +signOut() Promise
  }
  note for KeycloakAuthProvider "Exporta também `keycloakProvider`: objeto\nplano { redirect, init, signIn, signOut }\nexigido pelo appshell, delegando para a instância."

  class ApiError {
    +status: number
    +code: string
  }
  ApiError --|> Error

  class ApiClient {
    +getBaseUrl() string
    +fetch(path, options) Promise
  }

  class SyncService {
    -pulledListeners: Set
    -loginListeners: Set
    +isActive() boolean
    +flush() Promise
    +sync() Promise
    +taskCreated(task) void
    +taskUpdated(id, patch) void
    +taskDeleted(id) void
    +categoryCreated(category) void
    +categoryUpdated(id, patch) void
    +categoryDeleted(id) void
    +start() void
  }

  class TaskService {
    -listeners: Set
    +getTasks() Task[]
    +getCategories() Category[]
    +createTask(data) Task
    +updateTask(id, patch) Task
    +deleteTask(id) void
    +rescheduleTask(id, days) Task
    +archiveTask(id, archived) Task
    +filterTasks(filters) Task[]
    +getMetrics() object
    +addCategory(category) Category
    +updateCategory(id, patch) Category
    +deleteCategory(id) void
  }

  class AlarmService {
    -audioCtx: AudioContext
    -activeAlarmTask: Task
    +playSound(tone, volume) void
    +stopSound() void
    +triggerAlarm(task) void
    +dismissAlarm() void
    +snoozeAlarm(minutes) void
    +startTicker(callback) void
  }

  class PushService {
    -subscription: PushSubscription
    -vapidPublicKey: string
    +fetchVapidPublicKey() Promise~string~
    +subscribe(vapidKey) Promise
    +unsubscribe() Promise~boolean~
    +sendTestNotification(title, msg) Promise
  }

  class DescriptionSanitizer {
    +sanitize(html)$ string
  }

  %% ---------------- Componentes e views (Lit) ----------------

  class LitElement
  <<external>> LitElement

  class RichTextEditor {
    +value: string
    +label: string
    +placeholder: string
    -_exec(command, arg) void
    -_insertLink() void
    -_onInput() void
  }
  RichTextEditor --|> LitElement

  class TaskFormDialog {
    +open: boolean
    +task: Task
    +categories: Category[]
    +isEditing: boolean
    -_handleSubmit(e) void
  }
  TaskFormDialog --|> LitElement

  class TaskCard {
    +task: Task
    +category: Category
  }
  TaskCard --|> LitElement

  class TaskDeadlineBadge
  TaskDeadlineBadge --|> LitElement

  class TaskFilterBar
  TaskFilterBar --|> LitElement

  class TaskAlarmDialog
  TaskAlarmDialog --|> LitElement

  class TaskTodayHomeView
  TaskTodayHomeView --|> LitElement

  class TaskCategoriesView
  TaskCategoriesView --|> LitElement

  class TaskAlarmsConfigView
  TaskAlarmsConfigView --|> LitElement

  class TaskIntegrationsView
  TaskIntegrationsView --|> LitElement

  %% ---------------- Dependências entre serviços ----------------

  TaskService ..> StorageManager : usa
  TaskService ..> AlarmService : usa
  TaskService ..> SyncService : usa
  TaskService ..> KeycloakAuthProvider : usa (onSignOut/isAdmin)

  SyncService ..> StorageManager : usa
  SyncService ..> ApiClient : usa
  SyncService ..> ApiError : trata
  SyncService ..> KeycloakAuthProvider : usa (isConfigured)

  PushService ..> StorageManager : usa
  PushService ..> ApiClient : usa
  PushService ..> SyncService : usa

  AlarmService ..> StorageManager : usa
  ApiClient ..> KeycloakAuthProvider : usa (getAccessToken)
  KeycloakAuthProvider ..> StorageManager : usa

  %% ---------------- Dependências da UI ----------------

  TaskTodayHomeView ..> TaskService : usa
  TaskTodayHomeView *-- TaskCard
  TaskTodayHomeView *-- TaskFilterBar
  TaskTodayHomeView *-- TaskFormDialog
  TaskTodayHomeView *-- TaskAlarmDialog

  TaskCategoriesView ..> TaskService : usa
  TaskCategoriesView ..> KeycloakAuthProvider : usa (isAdmin)

  TaskAlarmsConfigView ..> StorageManager : usa
  TaskAlarmsConfigView ..> AlarmService : usa
  TaskAlarmsConfigView ..> PushService : usa

  TaskIntegrationsView ..> StorageManager : usa

  TaskCard *-- TaskDeadlineBadge
  TaskCard ..> DescriptionSanitizer : usa

  TaskFormDialog *-- RichTextEditor
  RichTextEditor ..> DescriptionSanitizer : usa

  TaskAlarmDialog ..> AlarmService : usa
```

## Notas de projeto

- **Singletons com estado encapsulado**: cada serviço guarda seu estado (fila de
  sincronização, contexto de áudio, listeners, inscrição push, sessão Keycloak) como
  campos de instância, em vez de variáveis de módulo soltas.
- **`keycloakProvider`**: o appshell (`fzl-fund-appshell--lit`) espera um objeto simples
  com `redirect`/`init`/`signIn`/`signOut` como propriedades próprias. Por isso ele
  continua sendo exportado como um objeto plano que delega para `KeycloakAuthProvider`,
  em vez da própria instância da classe.
- **`DescriptionSanitizer`**: utilitário sem estado (métodos estáticos) usado tanto no
  `rich-text-editor` (ao salvar) quanto no `task-card` (ao renderizar), como defesa em
  profundidade contra HTML malicioso na descrição da tarefa.
