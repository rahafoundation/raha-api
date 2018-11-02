import cryptoRandomString = require("crypto-random-string");

/**
 * Generates an unpredictable identifier. Not globally unique, but pretty
 * unlikely to collide.
 */
export function generateId(): string {
  return cryptoRandomString(32);
}
