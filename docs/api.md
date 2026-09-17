# API регистрации

Запуск: `npm ci && npm start`. Адрес: `http://127.0.0.1:3000`.

## POST /api/register
JSON: `email`, `password` (8–128 символов), `confirmPassword`.

```sh
curl -i -c cookies.txt -H "Content-Type: application/json" -d '{"email":"athlete@example.com","password":"Training2026","confirmPassword":"Training2026"}' http://127.0.0.1:3000/api/register
curl -b cookies.txt http://127.0.0.1:3000/api/me
```

Успех: HTTP 201, `{"user":{"id":"...","email":"athlete@example.com"}}` и cookie `session` с HttpOnly/SameSite=Strict.

Ошибки: 400 — валидация/JSON; 409 — email занят; 413 — тело > 8 КиБ; 503 — почтовый транспорт недоступен. Ошибка содержит поле `error`.

## GET /api/me
По cookie `session` возвращает HTTP 200 и `user`; без действительной сессии — HTTP 401.

## Учебный стенд
Хранилище в памяти очищается при перезапуске. Пароль хешируется scrypt с индивидуальной солью. Приветственные письма направляются во встроенный тестовый outbox; внешняя почтовая служба не подключена. HTTPS, постоянная БД, срок жизни сессии, CSRF-токен и ограничение частоты запросов необходимы перед производственным использованием. Текущий сервер привязан к loopback для локальной проверки.

Проверка: `npm test`, `npm run smoke`. CI сохраняет архив staging; внешнее развёртывание не настроено.
