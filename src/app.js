import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createAuth, RegistrationError } from './auth.js';

export function createApp(auth = createAuth()) {
  function json(res, status, payload, headers = {}) {
    res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...headers });
    res.end(JSON.stringify(payload));
  }
  return createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(await readFile(new URL('../public/index.html', import.meta.url)));
      } else if (req.method === 'POST' && req.url === '/api/register') {
        let body = '';
        for await (const chunk of req) {
          body += chunk;
          if (Buffer.byteLength(body) > 8192) throw new RegistrationError('Запрос слишком большой.', 413);
        }
        let input;
        try { input = JSON.parse(body); } catch { throw new RegistrationError('Некорректный JSON.'); }
        if (!input || Array.isArray(input) || typeof input !== 'object') throw new RegistrationError('Ожидается JSON-объект.');
        const result = await auth.register(input);
        json(res, 201, { user: result.user }, { 'Set-Cookie': `session=${result.token}; HttpOnly; SameSite=Strict; Path=/` });
      } else if (req.method === 'GET' && req.url === '/api/me') {
        const cookie = req.headers.cookie ?? '';
        const token = cookie.split(';').map(s => s.trim()).find(s => s.startsWith('session='))?.slice(8);
        const user = auth.getUser(token);
        json(res, user ? 200 : 401, user ? { user } : { error: 'Требуется вход.' });
      } else {
        json(res, 404, { error: 'Не найдено.' });
      }
    } catch (error) {
      json(res, error instanceof RegistrationError ? error.status : 500,
        { error: error instanceof RegistrationError ? error.message : 'Внутренняя ошибка.' });
    }
  });
}
