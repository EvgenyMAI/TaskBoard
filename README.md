# TaskBoard

**Автор:** Кострюков Евгений Сергеевич, М8О-407Б-22  
**Проект:** микросервисное веб-приложение для управления проектами, задачами и командной коммуникацией

---

## 1. Что это за проект

`TaskBoard` — рабочий прототип (MVP) микросервисного веб-приложения с UI для управления задачами и проектами.

- регистрация, вход и профиль пользователя;
- управление проектами;
- полный цикл задач (создание, фильтрация, изменение статуса, назначение исполнителя);
- комментарии, вложения и история изменений задач;
- уведомления в интерфейсе и отдельная страница уведомлений;
- ролевая модель доступа (`ADMIN`, `MANAGER`, `EXECUTOR`) и управление ролями через UI;
- управление участниками проекта (invite/remove) через UI и отдельную таблицу membership;
- базовые отчеты и backend-логи для отладки.

Система развернута как набор отдельных сервисов и БД в Docker.

---

## 2. Технологии

| Зона | Технологии |
|---|---|
| Backend | Java 17, Spring Boot 3, Spring Data JPA, Spring Security |
| Frontend | React 18, Vite, React Router |
| База данных | PostgreSQL 16 (по БД на сервис) |
| Аутентификация | JWT (HS256), BCrypt |
| Инфраструктура | Docker, Docker Compose |
| Сборка | Maven, npm |

---

## 3. Архитектура и сервисы

Система реализована в виде набора независимых backend-микросервисов, каждый из которых имеет собственную базу данных. Взаимодействие сервисов происходит через REST API.

| Сервис | Порт (по умолчанию) | База | Назначение |
|---|---:|---|---|
| `auth-service` | `8081` | `taskboard_auth` | регистрация, вход, профиль, список пользователей |
| `tasks-service` | `8082` | `taskboard_tasks` | проекты, задачи, комментарии, вложения, история |
| `analytics-service` | `8083` | `taskboard_analytics` | уведомления, сводные отчеты |
| `frontend` | `3000` | - | пользовательский интерфейс |

Дополнительно:

- отдельный PostgreSQL-контейнер для каждого backend-сервиса;
- `tasks-service` отправляет внутренние уведомления в `analytics-service`;
- пользовательские API защищены JWT.

### 3.1 Визуальная схема архитектуры

- Схема: `docs/architecture.png`
- Исходник схемы: `docs/architecture.mmd`
- Скрипт генерации PNG: `docs/generate-architecture.ps1`

Команда генерации:

```powershell
.\docs\generate-architecture.ps1
```

Схема: [TaskBoard architecture](docs/architecture.png)

---

## 4. Реализованный функционал

### 4.1 UI (основной сценарий работы)

Реализованы страницы:

- `Dashboard` (главная с карточками и быстрыми переходами);
- `Projects` (CRUD проектов);
- `Project detail` (детали проекта и задачи проекта);
- `Tasks` (список задач + фильтры + создание);
- `Task detail` (редактирование, комментарии, вложения, история);
- `Notifications` (лента уведомлений, фильтры, read/unread);
- `Profile` (изменение username/email и смена пароля);
- `Login` / `Register`.

Также в UI:

- inline-валидация форм;
- toast-уведомления;
- skeleton-загрузки;
- адаптивная верхняя навигация (mobile menu);
- бейдж непрочитанных уведомлений в шапке.

### 4.2 Auth Service

- `POST /api/auth/register` — регистрация;
- `POST /api/auth/login` — вход и выдача JWT;
- `GET /api/auth/validate` — проверка JWT;
- `GET /api/auth/me` — профиль текущего пользователя;
- `PUT /api/auth/me` — обновление username/email;
- `PUT /api/auth/me/password` — смена пароля с валидацией;
- `GET /api/users` — список пользователей для назначения задач;
- `PUT /api/auth/users/{id}/roles` — обновление ролей пользователя (только `ADMIN`).

### 4.3 Tasks Service

Проекты:

- `GET /api/projects`
- `GET /api/projects/{id}`
- `POST /api/projects`
- `PUT /api/projects/{id}`
- `DELETE /api/projects/{id}`
- `GET /api/projects/{id}/members`
- `POST /api/projects/{id}/members`
- `DELETE /api/projects/{id}/members/{userId}`

Задачи:

- `GET /api/tasks` (фильтры: `projectId`, `status`, `assigneeId`, пагинация)
- `GET /api/tasks/{id}`
- `POST /api/tasks`
- `PUT /api/tasks/{id}`
- `DELETE /api/tasks/{id}`

Комментарии:

- `GET /api/tasks/{taskId}/comments`
- `POST /api/tasks/{taskId}/comments`
- `DELETE /api/tasks/{taskId}/comments/{id}`

Вложения:

- `GET /api/tasks/{taskId}/attachments`
- `POST /api/tasks/{taskId}/attachments`
- `DELETE /api/tasks/{taskId}/attachments/{id}`

История:

- `GET /api/tasks/{taskId}/history?limit=50`

### 4.4 Analytics Service

Уведомления (с сохранением в PostgreSQL):

- `GET /api/notifications` (фильтры: `read`, `type`, `from`, `to`, `q`, `limit`)
- `GET /api/notifications/unread`
- `PATCH /api/notifications/{id}/read`
- `POST /api/notifications/internal` (внутренний endpoint с ключом)

Отчеты:

- `GET /api/reports/summary`
- `GET /api/reports/by-project`
- `GET /api/reports/by-assignee`
- `GET /api/reports/export`

---

## 5. Безопасность

- JWT-аутентификация для защищенных endpoint;
- пароли хранятся в виде BCrypt-хеша;
- RBAC по ролям `ADMIN` / `MANAGER` / `EXECUTOR` (роли включены в JWT и применяются во всех сервисах);
- первый зарегистрированный пользователь получает роль `ADMIN` (bootstrap-сценарий), последующие — `EXECUTOR`;
- права видимости/действий по проектам и задачам проверяются на backend и дублируются ограничениями UI;
- участие в проекте определяется таблицей `project_members` (отдельно от назначения задач);
- пользователь не может читать чужие уведомления (фильтрация по `userId` из токена);
- в публичном создании уведомлений `userId` берется из аутентификации, не из тела запроса;
- внутренние уведомления между сервисами защищены `NOTIFICATIONS_INTERNAL_KEY`.

---

## 6. Логирование и отладка

Backend пишет логи в файлы с ротацией:

- `logs/auth-service/auth-service.log`
- `logs/tasks-service/tasks-service.log`
- `logs/analytics-service/analytics-service.log`

Формат записи включает:

- `rid` — requestId для трассировки запроса;
- `uid` — userId (если пользователь аутентифицирован);
- метод, endpoint, HTTP-статус, время выполнения.

Настройка уровня:

```env
LOG_LEVEL=INFO
```

### Скрипт быстрого просмотра логов

В корне проекта есть `logs.ps1`.

Примеры:

```powershell
# Последние 80 строк по всем сервисам
.\logs.ps1 -Service all -Tail 80

# Онлайн-режим для tasks-service
.\logs.ps1 -Service tasks -Follow

# Фильтр по requestId
.\logs.ps1 -Service analytics -Rid 0ceda534

# Фильтр по userId
.\logs.ps1 -Service auth -Uid 5
```

---

## 7. Быстрый запуск (локально через Docker)

1) Скопировать переменные окружения:

```powershell
copy .env.example .env
copy .\frontend\.env.example .\frontend\.env
```

2) Поднять backend и БД:

```powershell
docker compose up -d --build
```

3) Запустить frontend:

```powershell
cd frontend
npm install
npm run dev
```

4) Открыть приложение:

- [http://localhost:3000](http://localhost:3000)

---

## 8. Как пользоваться приложением (через UI)

<details>
  <summary><strong>Шаг 1. Регистрация и вход</strong></summary>

  - Регистрация: [docs/screenshots/01-register-login.png](docs/screenshots/01-register-login.png)
  - Экран после входа (Dashboard): [docs/screenshots/02-register-login.png](docs/screenshots/02-register-login.png)
</details>

<details>
  <summary><strong>Шаг 2. Работа с проектами (Projects)</strong></summary>

  - Страница проектов: [docs/screenshots/03-projects-create.png](docs/screenshots/03-projects-create.png)
  - Создание проекта: [docs/screenshots/04-projects-create.png](docs/screenshots/04-projects-create.png)
  - Управление проектом: [docs/screenshots/05-projects-create.png](docs/screenshots/05-projects-create.png)
  - Добавление/удаление участников проекта: [docs/screenshots/05-projects-create.png](docs/screenshots/05-projects-create.png)
</details>

<details>
  <summary><strong>Шаг 3. Создание задач внутри проекта</strong></summary>

  - Создание задачи в проекте: [docs/screenshots/06-tasks-create.png](docs/screenshots/06-tasks-create.png)
  - Список задач проекта: [docs/screenshots/07-tasks-create.png](docs/screenshots/07-tasks-create.png)
</details>

<details>
  <summary><strong>Шаг 4. Работа со списком задач (Tasks)</strong></summary>

  - Общая страница задач: [docs/screenshots/08-tasks-create.png](docs/screenshots/08-tasks-create.png)
  - Создание задачи: [docs/screenshots/09-tasks-create.png](docs/screenshots/09-tasks-create.png)
  - Фильтрация задач по проекту: [docs/screenshots/10-tasks-create.png](docs/screenshots/10-tasks-create.png)
</details>

<details>
  <summary><strong>Шаг 5. Детали задачи (Task detail)</strong></summary>

  - Управление задачей: [docs/screenshots/11-task-detail.png](docs/screenshots/11-task-detail.png)
  - Редактирование задачи: [docs/screenshots/12-task-detail.png](docs/screenshots/12-task-detail.png)
  - Добавление комментария: [docs/screenshots/13-task-detail.png](docs/screenshots/13-task-detail.png)
  - История изменений задачи: [docs/screenshots/14-task-detail.png](docs/screenshots/14-task-detail.png)
</details>

<details>
  <summary><strong>Шаг 6. Уведомления (Notifications)</strong></summary>

  - Непрочитанные уведомления: [docs/screenshots/15-notifications.png](docs/screenshots/15-notifications.png)
  - Прочитанные уведомления: [docs/screenshots/16-notifications.png](docs/screenshots/16-notifications.png)
</details>

<details>
  <summary><strong>Шаг 7. Профиль (Profile)</strong></summary>

  - Страница профиля: [docs/screenshots/17-profile.png](docs/screenshots/17-profile.png)
  - Профиль после обновления: [docs/screenshots/18-profile.png](docs/screenshots/18-profile.png)
  - Для `ADMIN`: управление ролями пользователей на странице профиля
</details>

---

## 9. Переменные окружения

Основной `.env`:

- `JWT_SECRET`
- `NOTIFICATIONS_INTERNAL_KEY`
- `LOG_LEVEL`
- `AUTH_SERVICE_PORT`
- `TASKS_SERVICE_PORT`
- `ANALYTICS_SERVICE_PORT`
- `POSTGRES_AUTH_*`
- `POSTGRES_TASKS_*`
- `POSTGRES_ANALYTICS_*`

Frontend (`frontend/.env`):

- `VITE_AUTH_API`
- `VITE_USERS_API`
- `VITE_TASKS_API`
- `VITE_ANALYTICS_API`

Примеры значений подготовлены в:

- `.env.example`
- `frontend/.env.example`

---

## 10. Проверка API без UI

- `curl`-чеклист: `docs/curl-checks.md`
- готовый `.http`-набор запросов: `docs/api.http`

---

## 11. Что можно улучшать дальше

- реальная загрузка/хранение файлов вложений;
- расширение отчетности на основе фактических данных tasks-service;
- WebSocket/SSE для realtime-уведомлений вместо polling;
- покрытие критичных сценариев unit/integration/e2e тестами;
- CI/CD pipeline и автоматические проверки при pull request.