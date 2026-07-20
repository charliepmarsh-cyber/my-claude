import { customAlphabet } from "nanoid";

// URL-safe, unambiguous, sortable enough for our purposes.
const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(alphabet, 20);

export function newId(prefix: string): string {
  return `${prefix}_${nano()}`;
}
