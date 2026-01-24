import { pbkdf2Sync, randomBytes, timingSafeEqual } from 'crypto';

const PBKDF2_ITERATIONS = 310_000;
const PBKDF2_KEYLEN_BYTES = 32;
const PBKDF2_DIGEST = 'sha256';

function splitHash(hash: string): string[] {
  return hash.split('$');
}

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derivedKey = pbkdf2Sync(
    password,
    salt,
    PBKDF2_ITERATIONS,
    PBKDF2_KEYLEN_BYTES,
    PBKDF2_DIGEST
  );

  return [
    'pbkdf2_sha256',
    String(PBKDF2_ITERATIONS),
    salt.toString('base64'),
    derivedKey.toString('base64'),
  ].join('$');
}

export function verifyPassword(password: string, passwordHash: string): boolean {
  const [algorithm, iterationsRaw, saltB64, hashB64] = splitHash(passwordHash);
  if (algorithm !== 'pbkdf2_sha256') return false;

  const iterations = Number(iterationsRaw);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  if (!saltB64 || !hashB64) return false;

  const salt = Buffer.from(saltB64, 'base64');
  const expected = Buffer.from(hashB64, 'base64');

  const derived = pbkdf2Sync(
    password,
    salt,
    iterations,
    expected.length,
    PBKDF2_DIGEST
  );

  return timingSafeEqual(expected, derived);
}

