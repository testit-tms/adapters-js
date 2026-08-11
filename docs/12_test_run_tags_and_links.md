# Test run tags & links

Краткая выжимка по поддержке **тегов и ссылок тест-рана** в JS-адаптерах (`testit-js-commons`).

## Зачем

- Передавать run-level теги из CI/конфига так же, как в UI.
- Сразу после создания / при подключении к существующему прогону вешать ссылку на CI-джобу, пока статус ещё **In Progress**.

Это **не** теги/ссылки автотеста или результата.

## Конфиг

| Свойство | Env | Формат |
|----------|-----|--------|
| `testRunTags` | `TMS_TEST_RUN_TAGS` | CSV (`smoke,nightly`) или JSON-массив |
| `testRunLinks` | `TMS_TEST_RUN_LINKS` | JSON-массив `{ url, title?, description?, type? }` |

Типы ссылок: `Related`, `BlockedBy`, `Defect`, `Issue`, `Requirement`, `Repository`.

Пустые значения = «не менять». Приоритет: base options > env > `tms.config.json`.

## Поведение

| Режим | Когда | Что |
|-------|--------|-----|
| `adapterMode=2` | `createTestRun` | `tags` / `links` в create-запросе |
| `adapterMode=0\|1` | `setup()` **до** `startTestRun` | GET → merge → PUT |

**Merge:** существующие теги/ссылки сохраняются; новые добавляются без дублей (тег по имени, ссылка по `url`). Ошибка merge логируется, сьют не валится.

## Где в коде

- Парсеры / merge: `testit-js-commons/src/helpers/config/test-run-metadata.util.ts`
- Config: `config.helper.ts`, `config.type.ts`
- Create: `testruns.service.ts` → `createTestRun`
- Early merge: `strategy/base.strategy.ts` → `updateTestRun` из `setup()`
- Тесты: `test-run-metadata.util.test.ts`

## Пример CI

```bash
TMS_TEST_RUN_TAGS=smoke,nightly
TMS_TEST_RUN_LINKS=[{"url":"https://gitlab.example.com/group/project/-/jobs/12345","title":"CI Job","type":"Related"}]
```

Подробности и таблицы конфигурации — в README каждого адаптера. Полное ТЗ: [`ТЗ.md`](../ТЗ.md).
