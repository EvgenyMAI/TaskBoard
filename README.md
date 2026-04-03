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
| База данных | PostgreSQL 16 (по БД на сервис), MinIO (объектное хранилище вложений) |
| Аутентификация | JWT (HS256), BCrypt |
| Инфраструктура | Docker, Docker Compose |
| Сборка | Maven, npm |

---

## 3. Архитектура и сервисы

Система реализована в виде набора независимых backend-микросервисов, каждый из которых имеет собственную базу данных. Взаимодействие сервисов происходит через REST API. Внутри сервисов HTTP-слой (контроллеры) по возможности тонкий: запрос разбирается и делегируется в сервисы приложения, где сосредоточены правила доступа и бизнес-логика — это упрощает тестирование и сопровождение.

| Сервис | Порт (по умолчанию) | База | Назначение |
|---|---:|---|---|
| `auth-service` | `8081` | `taskboard_auth` | регистрация, вход, профиль, список пользователей |
| `tasks-service` | `8082` | `taskboard_tasks` | проекты, задачи, комментарии, вложения, история |
| `analytics-service` | `8083` | `taskboard_analytics` | уведомления, сводные отчеты |
| `frontend` | `3000` | - | пользовательский интерфейс |

Дополнительно:

- отдельный PostgreSQL-контейнер для каждого backend-сервиса;
- отдельный MinIO-контейнер для хранения файлов вложений;
- `tasks-service` отправляет внутренние уведомления в `analytics-service`;
- пользовательские API защищены JWT.

Модуль **`taskboard-common`** (общий JAR) содержит разбор и проверку JWT для resource-server’ов `tasks-service` и `analytics-service`, чтобы не дублировать одну и ту же логику. Корневой **`pom.xml`** объединяет `taskboard-common`, `tasks-service` и `analytics-service` в один Maven-reactor; **`auth-service`** по-прежнему отдельный проект со своим `pom.xml`. Сборка Docker-образов задач и аналитики выполняется с **контекстом корня репозитория** (см. `docker-compose.yml` и `Dockerfile` внутри каталогов сервисов). Для запросов из браузера (отдельный origin у Vite) в `tasks-service` и `analytics-service` в цепочке Spring Security включена настройка **CORS** совместно с JWT.

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
- `Analytics` (оформление как у профиля/уведомлений: hero, секции ◆; период и пресеты, CSV; KPI-карточки; динамика периода; статусы — кольцо или столбцы; топы проектов и исполнителей);
- `Notifications` (лента в стиле профиля; разворачиваемые записи с превью и полным текстом; фильтры: прочитанность, тип, поиск — без периода по датам в UI; непрочитанное помечается прочитанным при раскрытии; «все прочитанными»);
- `Profile` (данные профиля, смена пароля; для `ADMIN` — сворачиваемый блок «Управление ролями» с ленивой загрузкой списка, поиском по имени/почте и пагинацией);
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
- `GET /api/users` — список пользователей (для назначения задач и админского UI): `id`, `username`, `email`, `roles`;
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
- `POST /api/tasks/{taskId}/attachments/upload`
- `GET /api/tasks/{taskId}/attachments/{id}/download`
- `GET /api/tasks/{taskId}/attachments/{id}/preview`
- `DELETE /api/tasks/{taskId}/attachments/{id}`

История:

- `GET /api/tasks/{taskId}/history?limit=50`

### 4.4 Analytics Service

Уведомления (с сохранением в PostgreSQL):

- `GET /api/notifications` (фильтры API: `read`, `type`, `from`, `to`, `q`, `limit`; в UI используются `read`, `type`, `q`)
- `GET /api/notifications/unread`
- `GET /api/notifications/stream` (SSE) — поток realtime-уведомлений для текущего пользователя
- `PATCH /api/notifications/{id}/read`
- `POST /api/notifications/internal` (внутренний endpoint с ключом)

Отчеты:

- `GET /api/reports/summary` (поддержка `from`/`to`)
- `GET /api/reports/by-project` (поддержка `from`/`to`)
- `GET /api/reports/by-assignee` (поддержка `from`/`to`)
- `GET /api/reports/export` (CSV для Excel: UTF-8 BOM, русские подписи, читаемый формат даты/времени)

---

## 5. Безопасность

- для REST API `tasks-service` и `analytics-service` настроены **CORS** (вместе с JWT), чтобы браузер мог вызывать API с dev-сервера Vite;
- JWT-аутентификация для защищенных endpoint;
- пароли хранятся в виде BCrypt-хеша;
- RBAC по ролям `ADMIN` / `MANAGER` / `EXECUTOR` (роли включены в JWT и применяются во всех сервисах);
- первый зарегистрированный пользователь получает роль `ADMIN` (bootstrap-сценарий), последующие — `EXECUTOR`;
- права видимости/действий по проектам и задачам проверяются на backend и дублируются ограничениями UI;
- участие в проекте определяется таблицей `project_members` (отдельно от назначения задач);
- при создании и изменении задачи исполнитель (`assigneeId`), если указан, должен быть участником этого проекта; иначе API возвращает ошибку с пояснением, интерфейс показывает текст ответа сервера;
- пользователь не может читать чужие уведомления (фильтрация по `userId` из токена);
- в публичном создании уведомлений `userId` берется из аутентификации, не из тела запроса;
- внутренние уведомления между сервисами защищены `NOTIFICATIONS_INTERNAL_KEY`.
- содержимое вложений хранится в MinIO, доступ к чтению/скачиванию идет только через защищенные endpoint `tasks-service`.

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

## 7. Как пользоваться приложением (через UI)

Основные разделы (проекты, задачи, аналитика, уведомления, профиль и карточки сущностей) выдержаны в едином светлом визуальном стиле: поверхности карточек и секций на светлом фоне, спокойные акценты и рамки, согласованная типографика. Вверху типичен блок-герой с аватаром-буквой и чипами с понятными подписями («Задач: N», «Проектов: N», «Непрочитанных: N», выбранный период отчёта и т.п.), ниже — секции с заголовками и маркерами разделов.

<details>
  <summary><strong>Шаг 1. Регистрация и вход</strong></summary>

  - Регистрация: [docs/screenshots/01-register-login.png](docs/screenshots/01-register-login.png)
  - Экран после входа (Dashboard): [docs/screenshots/02-register-login.png](docs/screenshots/02-register-login.png)
</details>

<details>
  <summary><strong>Шаг 2. Работа с проектами (Projects)</strong></summary>

  - Страница проектов: верхний блок (hero) с краткой сводкой и кнопкой создания, ниже секция со списком карточек проектов. [docs/screenshots/03-projects-create.png](docs/screenshots/03-projects-create.png)
  - Создание и редактирование проекта (модальное окно): [docs/screenshots/04-projects-create.png](docs/screenshots/04-projects-create.png)
  - Карточка проекта: тот же тип шапки, чипы «Задач: N» и при необходимости «Участников: N», секции фильтров, списка задач и формы новой задачи; для администратора и менеджера блок «Участники проекта» свёрнут по умолчанию (как управление ролями в профиле), внутри — поиск, пагинация и приглашение. [docs/screenshots/05-projects-create.png](docs/screenshots/05-projects-create.png)
</details>

<details>
  <summary><strong>Шаг 3. Создание задач внутри проекта</strong></summary>

  - Создание задачи в проекте: [docs/screenshots/06-tasks-create.png](docs/screenshots/06-tasks-create.png)
  - Список задач проекта: [docs/screenshots/07-tasks-create.png](docs/screenshots/07-tasks-create.png)
</details>

<details>
  <summary><strong>Шаг 4. Работа со списком задач (Tasks)</strong></summary>

  - Общая страница задач (hero, чип «Задач: N», фильтры и список): [docs/screenshots/08-tasks-create.png](docs/screenshots/08-tasks-create.png)
  - Создание задачи: [docs/screenshots/09-tasks-create.png](docs/screenshots/09-tasks-create.png)
  - Фильтрация задач по проекту: [docs/screenshots/10-tasks-create.png](docs/screenshots/10-tasks-create.png)
</details>

<details>
  <summary><strong>Шаг 5. Детали задачи (Task detail)</strong></summary>

  - Управление задачей: [docs/screenshots/11-task-detail.png](docs/screenshots/11-task-detail.png)
  - Редактирование задачи: [docs/screenshots/12-task-detail.png](docs/screenshots/12-task-detail.png)
  - Добавление комментария: [docs/screenshots/13-task-detail.png](docs/screenshots/13-task-detail.png)
  - История изменений задачи: [docs/screenshots/14-task-detail.png](docs/screenshots/14-task-detail.png)
  - Вкладки «Комментарии», «Вложения», «История»: комментарии и события истории — карточки; история с подписями полей на русском и парами «было/стало»; вложения — сетка карточек (предпросмотр изображений с увеличением по клику, просмотр текста в карточке); в списке исполнителей при редактировании — только участники проекта.
</details>

<details>
  <summary><strong>Шаг 6. Аналитика (Analytics)</strong></summary>

  - Выбор периода (`from` / `to`), пресеты длительности, выгрузка отчёта в CSV.
  - Сводные показатели: подблок «Контекст» (всего задач, просрочено, без исполнителя) и «Коэффициенты» (завершение, доля просрочки, доля назначенных задач) — без дублирования детального разбора по статусам.
  - При наличии данных — сравнение с предыдущим интервалом той же длины («Динамика периода»).
  - Распределение по статусам: переключение вида «Кольцо» / «Столбцы», топы проектов и исполнителей ниже по странице.
  - Скриншот: [docs/screenshots/19-analytics.png](docs/screenshots/19-analytics.png)
</details>

<details>
  <summary><strong>Шаг 7. Уведомления (Notifications)</strong></summary>

  - Общий вид ленты и фильтров: [docs/screenshots/15-notifications.png](docs/screenshots/15-notifications.png)
  - Пример с развёрнутой записью / прочитанными: [docs/screenshots/16-notifications.png](docs/screenshots/16-notifications.png)
</details>

<details>
  <summary><strong>Шаг 8. Профиль (Profile)</strong></summary>

  - Страница профиля: [docs/screenshots/17-profile.png](docs/screenshots/17-profile.png)
  - Профиль после обновления: [docs/screenshots/18-profile.png](docs/screenshots/18-profile.png)
  - Для `ADMIN`: управление ролями в сворачиваемом блоке на странице профиля (список подгружается при раскрытии; при большом числе пользователей — поиск и постраничный просмотр).
</details>

---

## 8. Проверка API без UI

- `curl`-чеклист: `docs/curl-checks.md`
- готовый `.http`-набор запросов: `docs/api.http`

---

## 9. Первый запуск на новой машине, окружение, пересборка и тесты

Ниже — единая инструкция для разработчика: развёртывание с нуля, согласование портов Docker и Vite, пересборка без лишнего `--no-cache`, локальные тесты и CI. Ручное «перекидывание» файлов **не обязательно**, если вы используете порты по умолчанию (см. п. 9.2).

### 9.1 Новая машина: клонирование и запуск

1. Установите **Docker Desktop** (или Docker Engine + Compose v2) и **Node.js** (LTS), **Git**.
2. Клонируйте репозиторий и перейдите в каталог проекта.
3. Поднимите backend и базы (из **корня** репозитория):

   ```powershell
   docker compose up -d --build
   ```

   Либо явно зафиксируйте порты хоста (удобно, если в сессии PowerShell остались старые `TASKS_SERVICE_PORT` и т.п.):

   ```powershell
   docker compose --env-file docker.defaults.env up -d --build
   ```

4. Запустите фронтенд:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

5. Откройте [http://localhost:3000](http://localhost:3000). Зарегистрируйте первого пользователя — ему будет назначена роль `ADMIN`.

**Не нужно** копировать `frontend/.env` для обычной разработки: в репозитории уже есть **`frontend/.env.development`** с URL `http://localhost:8081` / `8082` / `8083` — Vite подхватывает его в режиме `npm run dev`.

Опционально, если нужны свои секреты или порты:

- скопируйте **`.env.example` → `.env`** в корне (JWT, ключи MinIO, БД и т.д.);
- для переопределения только URL API во фронте — **`frontend/.env.example` → `frontend/.env.local`** (файл в `.gitignore`).

### 9.2 Переменные окружения и согласование портов (Docker + Vite)

| Назначение | Файл / источник |
|---|---|
| Фиксированные порты для `docker compose` без правки shell | **`docker.defaults.env`** в корне (можно передать как `--env-file`) |
| URL API при `npm run dev` | **`frontend/.env.development`** (уже в репозитории) |
| Свои секреты и переопределения compose | **`.env`** в корне (не коммитится; образец — `.env.example`) |
| Свои `VITE_*` без коммита | **`frontend/.env.local`** |

Переменные публикации портов в `docker-compose.yml` (при отсутствии переопределений): `AUTH_SERVICE_PORT` → **8081**, `TASKS_SERVICE_PORT` → **8082**, `ANALYTICS_SERVICE_PORT` → **8083**, PostgreSQL — **5432** / **5433** / **5434**, MinIO — **9000** / **9001**.

**Важно:** ранее скрипт `run-tests.ps1` мог выставлять случайные порты в **переменные процесса PowerShell**; Docker Compose отдаёт им приоритет над значениями по умолчанию, из‑за чего фронт в dev (ожидающий 8082/8083) «не видел» API. Сейчас e2e использует **временный `--env-file`**, а переменные порта после прогона восстанавливаются. Если что-то «залипло», выполните `.\scripts\clean-dev.ps1 -ClearComposePortEnv` или откройте новое окно терминала.

### 9.3 Пересборка образов и очистка артефактов

- Обычная пересборка после изменения кода или Dockerfile:

  ```powershell
  docker compose up -d --build
  ```

  Полный `--no-cache` нужен только при подозрении на порченный слой сборки, а не при каждом запуске.

- Локальная очистка кэшей сборки, логов прогонов, артефактов Vite (без удаления `node_modules` и без принудительной очистки образов Docker):

  ```powershell
  .\scripts\clean-dev.ps1
  ```

  Дополнительно: **`-ClearComposePortEnv`** — сбросить переменные портов compose в текущей сессии PowerShell; **`-DockerBuildCache`** — `docker buildx prune -f`.

### 9.4 Локальное тестирование (`run-tests.ps1`)

В корне репозитория:

```powershell
# Только backend (Maven внутри Docker; кэш зависимостей в .cache/m2)
.\run-tests.ps1 -BackendOnly

# Только e2e (временный compose + build фронта + Playwright)
.\run-tests.ps1 -E2EOnly

# Полный прогон
.\run-tests.ps1

# Полный Maven-лог в консоль
.\run-tests.ps1 -VerboseBackendLogs

# Backend на хосте (JDK 17 и mvn в PATH; кэш артефактов — .cache/m2/repository)
.\run-tests.ps1 -BackendOnly -UseHostMaven
```

Скрипт:

- гоняет **auth-service** отдельно и **один** прогон Maven по reactor: **`tasks-service` + `analytics-service`** с модулем **`taskboard-common`** (как в CI);
- для backend проверяет **код выхода Maven** (в Docker или на хосте с **`-UseHostMaven`**), наличие **`BUILD FAILURE`** в логе и **сумму тестов** по блокам Surefire `[INFO] Results:` (чтобы не пропустить «тихий» сбой);
- для e2e поднимает изолированный стек, подставляет `VITE_*` под выбранные порты, затем выполняет **`docker compose down -v`**;
- логи: **`logs/test-runs/<timestamp>/`**.

**Почему e2e не ловит рассинхрон портов с ручным `npm run dev`:** в прогоне подставляются те же порты, что и у временного compose; обычный dev полагается на **`frontend/.env.development`** и стандартные порты Docker — их нужно держать согласованными (п. 9.2).

Рекомендуемый workflow:

1. После правок backend — `.\run-tests.ps1 -BackendOnly`
2. После правок UI / авторизации / уведомлений — `.\run-tests.ps1 -E2EOnly` или полный прогон
3. Перед merge — `.\run-tests.ps1`

Принципы: не размножать хрупкие e2e; тяжёлую подготовку данных в smoke выносить в API; в e2e проверять пользовательский поток, а не вёрстку.

### 9.5 CI/CD (GitHub Actions)

Файл **`.github/workflows/ci.yml`**: на `push` и `pull_request` — backend-тесты (`auth-service`; из корня `mvn … -pl tasks-service,analytics-service -am test`), затем e2e с поднятым compose и Playwright.
