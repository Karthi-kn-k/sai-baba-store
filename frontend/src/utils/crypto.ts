/**
 * Simple & Lightweight Client-Side Password Encryption
 * Zero-dependency XOR Cipher with Hex encoding.
 */
const CRYPTO_SECRET_KEY = "SaiBabaStore@SecretKey2026";

export function encryptPassword(password: string): string {
  if (!password) return "";
  let hexResult = "";
  for (let i = 0; i < password.length; i++) {
    const charCode = password.charCodeAt(i) ^ CRYPTO_SECRET_KEY.charCodeAt(i % CRYPTO_SECRET_KEY.length);
    hexResult += charCode.toString(16).padStart(2, "0");
  }
  return `ENC:${hexResult}`;
}

export function decryptPassword(encryptedText: string): string {
  if (!encryptedText) return "";
  if (!encryptedText.startsWith("ENC:")) return encryptedText;
  const hex = encryptedText.slice(4);
  let result = "";
  for (let i = 0; i < hex.length; i += 2) {
    const hexPair = hex.substring(i, i + 2);
    const charCode = parseInt(hexPair, 16) ^ CRYPTO_SECRET_KEY.charCodeAt((i / 2) % CRYPTO_SECRET_KEY.length);
    result += String.fromCharCode(charCode);
  }
  return result;
}
