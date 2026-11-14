# Changelog

## 1.0.0 (2026-11-14)


### ⚠ BREAKING CHANGES

* **api:** спецификация и контракт бронирования

### Новое

* **api:** контракт TypeSpec с GET /api/health и генерация OpenAPI 3.0.0 ([58adc39](https://github.com/kolesbars/ai-for-developers-project-386/commit/58adc39914943ee1bf854462e7f9ee1ea4432a7b))
* **api:** спецификация и контракт бронирования ([d9c655d](https://github.com/kolesbars/ai-for-developers-project-386/commit/d9c655d88a1dcf87505977581f548846d613f03c))
* **backend:** бронирование с гарантией непересечения ([#18](https://github.com/kolesbars/ai-for-developers-project-386/issues/18)) ([245178e](https://github.com/kolesbars/ai-for-developers-project-386/commit/245178ee01fe5406d532e4d09cdcea57b6d36771))
* **backend:** каркас Ktor с /api/health, JUnit smoke-тест и ktlint ([8987886](https://github.com/kolesbars/ai-for-developers-project-386/commit/898788654692e5b53ebf6b415cfaf82a97387d15))
* **backend:** слоты Окна записи ([#16](https://github.com/kolesbars/ai-for-developers-project-386/issues/16)) ([9e7d7d9](https://github.com/kolesbars/ai-for-developers-project-386/commit/9e7d7d9be0f0b03130d10f10f9d22750ef84ff5c))
* **frontend:** админка — создание Типа встречи ([#21](https://github.com/kolesbars/ai-for-developers-project-386/issues/21)) ([ceb9073](https://github.com/kolesbars/ai-for-developers-project-386/commit/ceb90738389cccb3377e94cba8afd84af13e691a))
* **frontend:** главная страница с типами встреч ([206336f](https://github.com/kolesbars/ai-for-developers-project-386/commit/206336f9cb77e2d4b455f572da82671c44bc70db))
* **frontend:** каркас Vite + React + Mantine и SDK из OpenAPI ([1714c1a](https://github.com/kolesbars/ai-for-developers-project-386/commit/1714c1a80fe67f4eb57a2156c758c88fd1b59ea0))
* **frontend:** страница записи — календарь и время ([#17](https://github.com/kolesbars/ai-for-developers-project-386/issues/17)) ([cac97c0](https://github.com/kolesbars/ai-for-developers-project-386/commit/cac97c0e884ac8a794b0033afef5fdd522eee9cf))
* **frontend:** форма бронирования, конфликт и подтверждение ([#19](https://github.com/kolesbars/ai-for-developers-project-386/issues/19)) ([743f441](https://github.com/kolesbars/ai-for-developers-project-386/commit/743f44145f95aa8a34ddb0a4176d1ad5a880ffc1))
* админка — предстоящие встречи ([#20](https://github.com/kolesbars/ai-for-developers-project-386/issues/20)) ([8527666](https://github.com/kolesbars/ai-for-developers-project-386/commit/85276662517ca38dfa863d44f3ec774885d7e7c8))
* деплой Docker-образа на Render, порт из PORT, MCP-конфигурация ([11a92f5](https://github.com/kolesbars/ai-for-developers-project-386/commit/11a92f5f697ea7808186dd0ebbb81c50c7fa4617))
* Календарь звонков по спецификации ([873eb4e](https://github.com/kolesbars/ai-for-developers-project-386/commit/873eb4edb04353f0d4be3c7798477b7ddea07821))
* профиль Владельца на главной ([#15](https://github.com/kolesbars/ai-for-developers-project-386/issues/15)) ([a028bd2](https://github.com/kolesbars/ai-for-developers-project-386/commit/a028bd2e326cc2d67ec0e2fdf7e298b76a5e02ad))
* типы встреч сквозь все слои ([#14](https://github.com/kolesbars/ai-for-developers-project-386/issues/14)) ([d9dd7e5](https://github.com/kolesbars/ai-for-developers-project-386/commit/d9dd7e5dc90175b732ea145dd47bc74d139d3281))


### Исправления

* **backend:** startAt Бронирования принимается только в UTC ([#18](https://github.com/kolesbars/ai-for-developers-project-386/issues/18)) ([0a7cedf](https://github.com/kolesbars/ai-for-developers-project-386/commit/0a7cedf9b60b066266859dd2078dde24ac2b69b1))
* **backend:** название Типа встречи из одних пробелов отклоняется ([#14](https://github.com/kolesbars/ai-for-developers-project-386/issues/14)) ([d41e233](https://github.com/kolesbars/ai-for-developers-project-386/commit/d41e233d37b134915a2c1f85f734b9a03e9abaac))
* **backend:** неизвестный /api — 404 без кода не из контракта ([#23](https://github.com/kolesbars/ai-for-developers-project-386/issues/23)) ([20c6fef](https://github.com/kolesbars/ai-for-developers-project-386/commit/20c6fef94a190059cc7c012199404e2d09141d04))
* **frontend:** календарь записи — сетки месяцев пн–вс ([#17](https://github.com/kolesbars/ai-for-developers-project-386/issues/17)) ([3c7011c](https://github.com/kolesbars/ai-for-developers-project-386/commit/3c7011c8e25a1de84fd708f9c080efa3e445cedd))
* **frontend:** подсказка о поясе называет город любого пояса Владельца ([#17](https://github.com/kolesbars/ai-for-developers-project-386/issues/17)) ([7a6ab34](https://github.com/kolesbars/ai-for-developers-project-386/commit/7a6ab3484575ed0db0b17a95634f3428ccf8a9bb))
* **frontend:** подсказка о часовом поясе контрастнее и крупнее ([#17](https://github.com/kolesbars/ai-for-developers-project-386/issues/17)) ([5932e2a](https://github.com/kolesbars/ai-for-developers-project-386/commit/5932e2a4512ec5d13738ad0f0870b00781af9aa4))
* **frontend:** приветствие каталога не обещает уведомлений ([#15](https://github.com/kolesbars/ai-for-developers-project-386/issues/15)) ([c078106](https://github.com/kolesbars/ai-for-developers-project-386/commit/c078106e586a25ec09c2c9b97e00ba14a11200fd))


### Рефакторинг

* **backend:** типизированный статус Слота, slot_taken решает роут ([9e1b649](https://github.com/kolesbars/ai-for-developers-project-386/commit/9e1b6499d415c17dd5d180bb61cedf5ef6b76178))
* **frontend:** общий хук useLoad; меню админки — «Меню Владельца» ([#20](https://github.com/kolesbars/ai-for-developers-project-386/issues/20)) ([5b31ffe](https://github.com/kolesbars/ai-for-developers-project-386/commit/5b31ffef540f578e935d556e4d52c4e38ff988c1))
* **frontend:** страницы Гостя загружают данные через useLoad и useOwner ([353fcd5](https://github.com/kolesbars/ai-for-developers-project-386/commit/353fcd5bc1ba4cfc10eb52116d4c472b69fa88e1))


### Документация

* инструкции и скилы для ИИ-агентов ([89f1d5e](https://github.com/kolesbars/ai-for-developers-project-386/commit/89f1d5e692a8cf3bd49245c517f0c269ed709a50))
* правило ссылки на тикет в коммитах ([2412245](https://github.com/kolesbars/ai-for-developers-project-386/commit/24122452fdddab5d3eb32c6500d86bcc7405ecfd))
* правило ссылки на тикет в коммитах ([808d836](https://github.com/kolesbars/ai-for-developers-project-386/commit/808d836317196d5f7bb12d482071b15b222fa0db))
* публичная ссылка на Render; e2e по развёрнутому адресу (E2E_BASE_URL) ([a710f8a](https://github.com/kolesbars/ai-for-developers-project-386/commit/a710f8ad1fb52f3f8f631649b5a80959b32c5160))
* стек, установка, команды и правила коммитов ([fd1a22b](https://github.com/kolesbars/ai-for-developers-project-386/commit/fd1a22ba3f58ec7c43d6956f8d3ffbf074307942))
