# curl quick checks

Ниже минимальные команды для smoke-check backend API.

## 1) Register admin + executor

```bash
curl -sS -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"curl_admin","password":"password123","email":"curl_admin@example.com"}'

curl -sS -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"curl_exec","password":"password123","email":"curl_exec@example.com"}'
```

## 2) Login and save tokens

```bash
ADMIN_TOKEN=$(curl -sS -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"curl_admin","password":"password123"}' | jq -r '.accessToken')

EXEC_TOKEN=$(curl -sS -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"curl_exec","password":"password123"}' | jq -r '.accessToken')

EXEC_USER_ID=$(curl -sS -H "Authorization: Bearer $EXEC_TOKEN" \
  http://localhost:8081/api/auth/me | jq -r '.id')
```

## 3) Create project (admin/manager only)

```bash
PROJECT_ID=$(curl -sS -X POST http://localhost:8082/api/projects \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Curl project","description":"Created by curl"}' | jq -r '.id')
```

## 4) Add executor to project members

```bash
curl -sS -X POST http://localhost:8082/api/projects/$PROJECT_ID/members \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"userId\":$EXEC_USER_ID}"
```

## 5) Create task for executor

```bash
TASK_ID=$(curl -sS -X POST http://localhost:8082/api/tasks \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":$PROJECT_ID,\"title\":\"Curl task\",\"description\":\"Task from curl\",\"status\":\"OPEN\",\"assigneeId\":$EXEC_USER_ID}" | jq -r '.id')
```

## 6) Check access as executor (project/tasks/comments)

```bash
curl -sS -H "Authorization: Bearer $EXEC_TOKEN" http://localhost:8082/api/projects
curl -sS -H "Authorization: Bearer $EXEC_TOKEN" "http://localhost:8082/api/tasks?projectId=$PROJECT_ID&size=20"
curl -sS -X POST -H "Authorization: Bearer $EXEC_TOKEN" -H "Content-Type: application/json" \
  -d '{"text":"Comment from executor"}' \
  http://localhost:8082/api/tasks/$TASK_ID/comments
```

## 7) Optional: promote user role (admin only)

```bash
curl -sS -X PUT http://localhost:8081/api/auth/users/$EXEC_USER_ID/roles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"roles":["MANAGER"]}'
```

## 8) Read history + notifications

```bash
curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" "http://localhost:8082/api/tasks/$TASK_ID/history?limit=20"
curl -sS -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8083/api/notifications/unread
```

## 9) Cleanup

```bash
curl -sS -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8082/api/tasks/$TASK_ID
curl -sS -X DELETE -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:8082/api/projects/$PROJECT_ID
```

> Примечание: примеры используют `jq` для парсинга JSON.
