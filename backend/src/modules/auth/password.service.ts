import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export const hashPassword = async (password: string) => {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;

  return `scrypt$${salt}$${hash.toString("hex")}`;
};

export const verifyPassword = async (password: string, storedHash: string) => {
  const [scheme, salt, expectedHex] = storedHash.split("$");

  if (scheme !== "scrypt" || !salt || !expectedHex) {
    return false;
  }

  const expected = Buffer.from(expectedHex, "hex");

  if (expected.length !== 64) {
    return false;
  }

  const actual = (await scrypt(password, salt, 64)) as Buffer;

  return timingSafeEqual(actual, expected);
};
