# importRealtime: спецификация изменений по адаптерам

## Контекст

Добавлен конфигурируемый флаг `importRealtime` (по умолчанию `false`), который переключает режим отправки результатов в Test IT:

- `importRealtime=false` — batch-режим (обратная совместимость): накопление результатов и отправка в конце прогона/спека;
- `importRealtime=true` — отправка результата максимально близко к завершению конкретного автотеста.

---

## Общий конфиг (testit-js-commons)

### Изменённые файлы

- `testit-js-commons/src/common/types/config.type.ts`
- `testit-js-commons/src/helpers/config/config.helper.ts`
- `testit-js-commons/src/helpers/config/config.helper.test.ts`

### Что добавлено

- Поле `importRealtime?: boolean` в `AdapterConfig`.
- Поддержка env-переменной `TMS_IMPORT_REALTIME` (`true` / `1`).
- Значение по умолчанию: `false`.
- При `compose()` в debug-лог пишется `[config] composed` с `importRealtime`, `adapterMode`, `syncStorageEnabled`, `hasTestRunId`.

---

## Отладка проливки (commons + адаптеры)

### Включение

| Переменная | Эффект |
|------------|--------|
| `LOG_LEVEL=debug` | Все `logger.debug` в commons и адаптерах |
| `TMS_DEBUG_LOAD_TEST_RUN=1` | Те же сообщения `[loadTestRun]`, что и при `LOG_LEVEL=debug` (обратная совместимость) |

### Префиксы логов

`[config]`, `[strategy]`, `[loadTestRun]`, `[http-retry]`, `[autotests]`, `[testruns]`, `[attachments]`, `[jest-env]`, `[playwright]`, `[mocha]`, `[cypress]`, `[cucumber]`.

### Изменённые файлы (commons)

| Файл | Что логируется |
|------|----------------|
| `src/common/utils/tms-load-test-run-debug.ts` | `[loadTestRun]` — вход в strategy, InProgress/sync, POST финала |
| `src/common/utils/http-retry.util.ts` | `[http-retry]` — повторы с `label` (createAutoTest, setAutoTestResults, upload…) |
| `src/strategy/base.strategy.ts` | `[strategy] loadAutotest` — externalId, число setup/teardown/test steps |
| `src/services/autotests/autotests.service.ts` | create/update, ветка loadAutotest |
| `src/services/testruns/testruns.service.ts` | успешный `setAutoTestResults` |
| `src/services/attachments/attachments.service.ts` | старт/успех upload файла и текста |

---

## 1) testit-adapter-playwright

### Изменённые файлы

- `testit-adapter-playwright/src/reporter.ts`

### Поведение

| Режим | Отправка |
|-------|----------|
| `importRealtime=false` | Буфер `bufferedResults` → flush в `onEnd` |
| `importRealtime=true` | `onTestEnd` → `runLoadTest` сразу; `onEnd` только `await loadTestPromises`, без повторного batch |

### Debug

- `[playwright] reporter init` — значение `importRealtime`
- `[playwright] onTestEnd realtime` / batch flush в `onEnd`
- `[playwright] loadTest` — title, status

### Прочее

- Логика шагов/вложений не менялась.
- При `ENOENT` на attachment path (Playwright `preserveOutput: 'never'`) — пропуск файла, без падения reporter.

---

## 2) testit-adapter-cypress

### Изменённые файлы

- `testit-adapter-cypress/src/reporter.ts`

### Поведение

| Режим | Отправка |
|-------|----------|
| `importRealtime=false` | Накопление `completedTests` → `endSpec` |
| `importRealtime=true` | `#stopTest` / `#addSkippedTest` → `#sendTestResult`; `endSpec` не дублирует |

### Debug

- `[cypress] reporter init`, `[cypress] sendTestResult` — externalId, outcome, число steps

---

## 3) testit-adapter-jest

### Изменённые файлы

- `testit-adapter-jest/src/testitEnvironment.ts`

### Поведение

| Режим | Отправка |
|-------|----------|
| `importRealtime=false` | `test_done` → массивы → `loadResults` на `run_finish` |
| `importRealtime=true` | `saveResult` на `test_done`; `loadResults` — no-op |

### Realtime: teardown и afterAll

Jest выполняет `afterAll` **после всех тестов**, до `run_finish`. На `test_done` в teardown попадает только `afterEach`.

1. **Первая отправка** (`saveResult`): `teardown = afterEach`, снимок autotest (`snapshotAutotestData`).
2. **`run_finish` → `flushRealtimeTeardown`**: если есть `afterAll`, повторная отправка всех накопленных realtime-результатов с `teardown = afterEach.concat(afterAll)` (как в batch).
3. Буфер `realtimeSent: { autotest, result }[]` для финального flush.

### Debug

- `[jest-env] setup start` — `importRealtime`, sync-storage
- `[jest-env] realtime test_done`, `sendRealtimePayload`, `flushRealtimeTeardown`, `run_finish`
- `[jest-env] loadResults skip (importRealtime)` / batch

### Прочее

- Очередь вложений текущего теста (`currentTestAttachmentsQueue`) — дожидание перед отправкой.

---

## 4) testit-adapter-mocha

### Изменённые файлы

- `testit-adapter-mocha/src/reporter.ts`

### Поведение

| Режим | Отправка |
|-------|----------|
| `importRealtime=false` | `loadAutotest` по тесту; `loadTestRun` в `teardown` (batch) |
| `importRealtime=true` | После теста: `loadAutotest` + `loadTestRun([result])`; batch в `teardown` отключён |

### Debug

- `[mocha] reporter init`, `onEndTest realtime`, `onEndRun skip batch`

### Прочее

- Очередь вложений текущего теста; setup/teardown hooks в payload без изменений.

---

## 5) testit-adapter-cucumber

### Изменённые файлы

- `testit-adapter-cucumber/src/formatter.ts`
- `testit-adapter-cucumber/src/storage.ts`
- `testit-adapter-cucumber/src/mappers.ts`
- `testit-adapter-cucumber/src/types/storage.type.ts`

### Поведение batch (`importRealtime=false`)

Без изменений по смыслу: `getTestRunResults()` + `getAutotests()` → `loadAutotest` / `loadTestRun` в `onTestRunFinished`.

### Поведение realtime (`importRealtime=true`)

#### Отправка (formatter)

- На **`testCaseFinished`** — публикация **только** для `testCaseFinished.testCaseStartedId` (не полный rescan всех pickles).
- **Сериализованная очередь** `realtimeSendChain` — envelope обрабатываются параллельно, публикации в TMS — строго по одной.
- **Дедупликация** по `testCaseStarted.id` (`sentTestCaseStartedIds`): одно выполнение сценария = одна публикация; id резервируется до успешного `loadTestRun`, при ошибке — снимается для retry.
- На **`onTestRunFinished`** — `catchUpRealtimeResults`: только ещё не отправленные `testCaseStarted.id`.
- Перед отправкой: `await Promise.allSettled(attachmentsQueue)`.

#### Модель данных (storage)

**Источник истины — Pickle**, не Gherkin Scenario:

- Раньше `getAutotests()` шёл из `mapDocument(scenario)` → один `externalId` на весь Scenario Outline.
- Сейчас autotest и result строятся по связке `testCaseStarted → testCase → pickle`.

**`externalId`:**

```text
@ExternalId из тегов pickle ?? hash(name ?? pickle.name)
```

**Важно:** суффиксы к `externalId` **не добавляются** (в т.ч. для Scenario Outline). Иначе ломается совместимость с уже заведёнными автотестами в TMS (`parametrized test_success`, а не `parametrized test_success__hash…`). Несколько строк Examples с одним `@ExternalId` — один и тот же autotest, отдельные **результаты** в прогоне; дубли POST устраняются дедупом по `testCaseStarted.id`, а не изменением externalId.

**Дедуп envelope в storage:** `savePickle`, `saveTestCase`, `saveTestCaseStarted`, `saveTestCaseFinished`, `saveTestStep*` — обновление по id, без дублей в массивах.

**API storage:**

- `getRealtimePayload(testCaseStartedId)` — один готовый `{ autotest, result }` или `undefined` (шаги ещё не полные).
- `listCatchUpRealtimePayloads(sentIds)` — догон в конце прогона.
- `resolvePickleExternalId(pickle)` — публичный расчёт id (фильтр `testsInRun` в formatter).

**`namespace` / `classname`:**

Совпадают с `mapScenario`: теги pickle → сценарий (по `pickle.astNodeIds`) → feature (документ по `pickle.uri`, не «первый» в storage) → `feature.name` → `scenario.name`.

**Заголовки шагов:**

PickleStep содержит только `text` (`return true`). Keyword (`Then`) восстанавливается из Gherkin:

- `pickleStep.astNodeIds` → `Step.id` в сохранённых `gherkinDocument`;
- формат как в `mapStep`: `` `${keyword} ${text}` `` (`Then  return true`);
- функции: `findGherkinStep`, `formatPickleStepTitle`, `buildSetupForScenario` в `mappers.ts`;
- **`setup`**: Examples + Background (как `mapScenario`), не теряется для Scenario Outline;
- используется в `autotest.steps` и `stepResults`.

**Исправления побочных багов:**

- `addLinks` / `addAttachments` — `push(...)` вместо потерянного `concat()`.
- Поиск `TestCaseStarted` по `testCaseId` (не по индексу).
- Out-of-order envelope: если шаги не собраны — `getRealtimePayload` возвращает `undefined`, catch-up на `onTestRunFinished`; без throw `TestStepStarted not found`.

#### Фильтр `testsInRun` (formatter)

При заданном списке автотестов прогона pickle сохраняется, если `resolvedExternalId` совпадает с `resolvePickleExternalId(pickle)`.

### Debug

- `[cucumber] formatter init`
- `[cucumber] realtime send` / `skip: already sent` / `skip: not ready`
- `[cucumber] catch-up realtime` — число pending

### Типичные проблемы (устранены)

| Симптом | Причина | Решение |
|---------|---------|---------|
| Один тест в прогоне 4–14 раз | Rescan + гонка `sentExternalIds` | Отправка по `testCaseStartedId` + очередь |
| Diff шагов: `return true` vs `Then return true` | Pickle без keyword | `formatPickleStepTitle` через astNodeIds |
| externalId с суффиксом `__hash` | Суффикс outline (запрещён) | Только значение `@ExternalId`, без модификаций |

---

## Адаптеры без изменений в рамках importRealtime

- **testit-adapter-codecept** — уже отправляет на `event.test.finished`.
- **testcafe-reporter-testit** — уже отправляет в `onTestEnd`.

---

## Связанные изменения вне importRealtime (кратко)

Для стабильной проливки в realtime также задействованы (см. `docs/http-retry-spec.md`):

- HTTP retry в `autotests` / `testruns` / `attachments` (5xx, сетевые коды).
- `toOriginLink` — default `Related`, если `type` не задан (400 от API).
- Sync-storage: InProgress cut, master/non-master (логи `[syncstorage]` при debug).

---

## Unit-тесты (testit-adapter-cucumber)

Запуск: `npm test` в `testit-adapter-cucumber/`.

| Файл | Что фиксирует |
|------|----------------|
| `src/mappers.test.ts` | `classname` по `pickle.uri`, `@ClassName`, keyword в title шага |
| `src/storage.test.ts` | несколько feature в одном run, один `externalId` для outline rows, `getRealtimePayload`, catch-up |

Фикстуры: `src/test-fixtures.ts` (не входят в `dist`).

---

## Чеклист проверки

1. `importRealtime=false` — поведение как до фичи (batch).
2. `importRealtime=true` + `LOG_LEVEL=debug` — один `[cucumber] realtime send` / аналог на тест, без лавины POST.
3. Jest: сценарий с `afterAll` — teardown в TMS после `run_finish`.
4. Cucumber: обычный Scenario и Scenario Outline (3 строки Examples) — отдельные результаты, шаги с `Then`/`When`.
5. Playwright/Cypress/Mocha — нет дублей в конце прогона.
