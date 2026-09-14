import crypto from "crypto";

const algorithm = "aes-256-gcm";

function getKey() {
  const key = process.env.PHI_ENCRYPTION_KEY;

  if (!key || key.length !== 64) {
    throw new Error("PHI_ENCRYPTION_KEY must be a 64-character hex string.");
  }

  return Buffer.from(key, "hex");
}

export function encryptText(value) {
  if (!value) return value;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getKey(), iv);

  const encrypted = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    authTag.toString("hex"),
    encrypted.toString("hex"),
  ].join(":");
}

export function decryptText(value) {
  if (!value || !String(value).includes(":")) return value;

  const [ivHex, authTagHex, encryptedHex] = String(value).split(":");

  const decipher = crypto.createDecipheriv(
    algorithm,
    getKey(),
    Buffer.from(ivHex, "hex")
  );

  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, "hex")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}