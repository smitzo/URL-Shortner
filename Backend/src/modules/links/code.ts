import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const createNanoId = customAlphabet(alphabet, 8);

export function createShortCode() {
  return createNanoId();
}
