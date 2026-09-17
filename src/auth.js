import { randomBytes, scryptSync } from 'node:crypto';

export class RegistrationError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}

/** In-memory adapter for the educational staging environment. */
export function createAuth({ sendWelcome } = {}) {
  const users = new Map();
  const sessions = new Map();
  const outbox = [];
  const mailer = sendWelcome ?? (async message => { outbox.push(message); });

  async function register({ email, password, confirmPassword } = {}) {
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || email.length > 254) {
      throw new RegistrationError('Укажите корректный email.');
    }
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
      throw new RegistrationError('Пароль должен содержать от 8 до 128 символов.');
    }
    if (password !== confirmPassword) throw new RegistrationError('Пароли не совпадают.');
    const normalized = email.trim().toLowerCase();
    if (users.has(normalized)) throw new RegistrationError('Этот email уже зарегистрирован.', 409);
    const salt = randomBytes(16).toString('hex');
    const user = { id: randomBytes(16).toString('hex'), email: normalized, salt,
      passwordHash: scryptSync(password, salt, 64).toString('hex') };
    // Reserve the address before awaiting the mail transport to reject concurrent duplicates.
    users.set(normalized, user);
    try {
      await mailer({ to: normalized, subject: 'Добро пожаловать в Fitness App!',
        text: 'Регистрация завершена. Теперь вы можете начать вести историю тренировок.' });
    } catch {
      users.delete(normalized);
      throw new RegistrationError('Не удалось отправить приветственное письмо. Повторите попытку.', 503);
    }
    const token = randomBytes(32).toString('hex');
    const profile = { id: user.id, email: normalized };
    sessions.set(token, profile);
    return { user: { ...profile }, token };
  }
  function getUser(token) { const user = sessions.get(token); return user ? { ...user } : null; }
  return { register, getUser, outbox };
}
