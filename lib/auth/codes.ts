/* Access codes (blueprint 6.2).

   Eight characters of Crockford base32, shown as HRA-7K2Q-9M4D. Only
   HMAC-SHA256(pepper, normalised) is stored, plus the last four characters as
   a hint. The plain code is returned once, at creation or rotation.

   Server-only: this module imports node:crypto. */

import { createHmac, randomInt } from "node:crypto";

/** Crockford base32: no I, L, O or U. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateCode(): string {
  let raw = "";
  for (let i = 0; i < 8; i++) raw += ALPHABET[randomInt(ALPHABET.length)];
  return raw;
}

/** Uppercase, strip prefix and dashes, map I/L to 1 and O to 0. */
export function normaliseCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/^HRA[-\s]?/, "")
    .replace(/[-\s]/g, "")
    .replace(/I/g, "1")
    .replace(/L/g, "1")
    .replace(/O/g, "0");
}

export function hashCode(code: string): string {
  const pepper = process.env.ACCESS_CODE_PEPPER;
  if (!pepper) throw new Error("ACCESS_CODE_PEPPER is not set");
  return createHmac("sha256", pepper).update(normaliseCode(code)).digest("hex");
}

/** The last four characters, shown to admins so they can tell codes apart. */
export function codeHint(code: string): string {
  return normaliseCode(code).slice(-4);
}

/** HRA-7K2Q-9M4D */
export function formatCode(code: string): string {
  const n = normaliseCode(code);
  return `HRA-${n.slice(0, 4)}-${n.slice(4, 8)}`;
}
