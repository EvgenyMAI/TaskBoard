# curl quick checks

Ниже минимальные команды для smoke-check backend API.

## 1) Register

```bash
curl -sS -X POST http://localhost:8081/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"curl_user","password":"password123","email":"curl_user@example.com"}'
```

## 2) Login and save token

```bash
TOKEN=$(curl -sS -X POST http://localhost:8081/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"curl_user","password":"password123"}' | jq -r '.accessToken')
```

## 3) Create project

```bash
PROJECT_ID=$(curl -sS -X POST http://localhost:8082/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Curl project","description":"Created by curl"}' | jq -r '.id')
```

## 4) Create task

```bash
TASK_ID=$(curl -sS -X POST http://localhost:8082/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"projectId\":$PROJECT_ID,\"title\":\"Curl task\",\"description\":\"Task from curl\",\"status\":\"OPEN\"}" | jq -r '.id')
```

## 5) Read task + history + notifications

```bash
curl -sS -H "Authorization: Bearer $TOKEN" http://localhost:8082/api/tasks/$TASK_ID
curl -sS -H "Authorization: Bearer $TOKEN" "http://localhost:8082/api/tasks/$TASK_ID/history?limit=20"
curl -sS -H "Authorization: Bearer $TOKEN" http://localhost:8083/api/notifications/unread
```

## 6) Cleanup

```bash
curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:8082/api/tasks/$TASK_ID
curl -sS -X DELETE -H "Authorization: Bearer $TOKEN" http://localhost:8082/api/projects/$PROJECT_ID
```

> Примечание: примеры используют `jq` для парсинга JSON.
