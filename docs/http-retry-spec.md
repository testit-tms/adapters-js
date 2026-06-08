# HTTP retry: спецификация изменений

## Контекст

Для устойчивости отправки данных в Test IT (сетевые сбои вроде `ECONNRESET`, `ETIMEDOUT`) добавлен единый механизм повторных попыток в `testit-js-commons`.  
Классификация ошибок основана на **типе** (HTTP status, network `code`, `errno`), а не на разборе текста `message`.

---

## 1) Общий хелпер

### Файлы
- `testit-js-commons/src/common/utils/http-retry.util.ts`
- `testit-js-commons/src/common/utils/http-retry.util.test.ts`
- экспорт через `testit-js-commons/src/common/utils/index.ts` → `../../common`

### Публичный API

| Функция | Назначение |
|---------|------------|
| `unwrapHttpError(err)` | Разворачивает вложенные `error` / `cause` из обёрток API-клиента |
| `getHttpStatus(err)` | HTTP-статус из `status` / `statusCode` / `response.status` |
| `getNetworkErrorCode(err)` | Сетевой код Node (`ECONNRESET`, …) |
| `isRetryableHttpError(err)` | Нужен ли retry для данной ошибки |
| `withHttpRetry(fn, options?)` | Выполняет `fn` с повторами по правилам ниже |

### Когда **ретраим**

- HTTP **5xx** (`status` / `statusCode` / `response.status` ≥ 500)
- Сетевые коды Node:
  - `ECONNRESET`, `ETIMEDOUT`, `EPIPE`, `ECONNABORTED`
  - `ECONNREFUSED`, `EHOSTUNREACH`, `ENETUNREACH`, `EAI_AGAIN`
- `errno === -104` (Windows-вариант `ECONNRESET`)

### Когда **не ретраим**

- HTTP **4xx** (ошибки клиента/валидации)
- Ошибки без распознаваемого status/code (логика, неверные данные и т.п.)
- Операции, явно исключённые из retry (см. раздел 4)

### Параметры `withHttpRetry`

```ts
type HttpRetryOptions = {
  maxAttempts?: number;  // default: 3
  delayMs?: number;      // default: 1000
  backoff?: boolean;     // default: false; если true — delayMs * attempt
};
```

---

## 2) Где подключено

### testit-js-commons / autotests

**Файл:** `testit-js-commons/src/services/autotests/autotests.service.ts`

| Метод | Retry |
|-------|-------|
| `createAutotest` | да, `withHttpRetry` (3 × 1000 ms) |
| `updateAutotest` | да, `withHttpRetry` (3 × 1000 ms) |
| `linkToWorkItems` | **нет** (одна попытка) |
| `unlinkToWorkItem` | **нет** (одна попытка) |

При ошибке линковки work item — один лог, без 10 повторов и без спама в CI.

### testit-js-commons / testruns

**Файл:** `testit-js-commons/src/services/testruns/testruns.service.ts`

| Метод | Retry |
|-------|-------|
| `postInProgressAutotestResult` | да (POST `setAutoTestResults`, InProgress) |
| `loadAutotests` → финал | если результат уже есть в прогоне (после InProgress POST / search) → **PUT** `apiV2/testResults/{id}`; иначе POST `setAutoTestResults` |

Ошибка после исчерпания попыток логируется через `logger.error` с контекстом `testRunId` / `autoTestExternalId`; отправка остальных результатов продолжается (per-result `catch`).

### testit-js-commons / attachments

**Файл:** `testit-js-commons/src/services/attachments/attachments.service.ts`

| Операция | Retry |
|----------|-------|
| `apiV2AttachmentsPost` (upload) | да: **5** попыток, `delayMs: 500`, `backoff: true` |

---

## 3) Логирование

**Файл:** `testit-js-commons/src/logger/index.ts`

- Синглтон `logger` (уровни: `error`, `warn`, `info`, `log`, `debug`)
- Уровень из env: `LOG_LEVEL` (default: `info`)

Используется в сервисах commons вместо разрозненных `console.*` для ошибок отправки и линковки.

Импорт в адаптерах (после re-export в `testit-js-commons`):

```ts
import { logger } from "testit-js-commons";
// или
import logger from "testit-js-commons"; // при export { default as logger }
```

---

## 4) Явные исключения из retry

| Операция | Причина |
|----------|---------|
| `linkToWorkItems` | Обычно 4xx (неверный work item id в примерах); retry не помогает |
| `unlinkToWorkItem` | Аналогично |
| `getAutotestByExternalId` | Поиск; при сбое возвращается `null` |
| `getWorkItemsLinkedToAutoTest` | Вспомогательный запрос; при сбое `[]` |

---

## 5) Тесты

`testit-js-commons/src/common/utils/http-retry.util.test.ts`:

- retry на `code: ECONNRESET`
- retry на HTTP 503 / 502
- no retry на 400 / 404
- unwrap `error: { code: ETIMEDOUT }`
- no retry на generic `Error` без code/status

Запуск: `npm test` в `testit-js-commons`.

---

## 6) Связанные документы

- [importRealtime-adapters-spec.md](./importRealtime-adapters-spec.md) — режим realtime-отправки по адаптерам
