import crypto from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(crypto.scrypt);
const keyLength = 64;

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const key = (await scrypt(password, salt, keyLength)) as Buffer;

  return `scrypt$${salt}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, expectedHash] = passwordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !expectedHash) {
    return false;
  }

  const actualKey = (await scrypt(password, salt, keyLength)) as Buffer;
  const actual = Buffer.from(actualKey.toString("base64url"));
  const expected = Buffer.from(expectedHash);

  return (
    actual.length === expected.length &&
    crypto.timingSafeEqual(actual, expected)
  );
}
