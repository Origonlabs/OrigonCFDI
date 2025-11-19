

import crypto from 'crypto';

// La clave de cifrado debe estar en variables de entorno
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;
const KEY_LENGTH = 32;

/**
 * Deriva una clave de cifrado a partir de la clave maestra y un salt
 */
function deriveKey(masterKey: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(masterKey, salt, 100000, KEY_LENGTH, 'sha256');
}

/**
 * Cifra un texto usando AES-256-GCM
 * @param plaintext - Texto a cifrar
 * @returns Texto cifrado en formato: salt:iv:authTag:ciphertext (todo en hex)
 */
export function encrypt(plaintext: string): string {
  if (!ENCRYPTION_KEY) {
    console.warn('ENCRYPTION_KEY not configured. Data will not be encrypted.');
    return plaintext;
  }

  try {
    // Generar salt e IV aleatorios
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);

    // Derivar clave del master key
    const key = deriveKey(ENCRYPTION_KEY, salt);

    // Cifrar
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Obtener el authentication tag
    const authTag = cipher.getAuthTag();

    // Combinar: salt:iv:authTag:ciphertext
    return [
      salt.toString('hex'),
      iv.toString('hex'),
      authTag.toString('hex'),
      encrypted
    ].join(':');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Error al cifrar los datos');
  }
}

/**
 * Descifra un texto cifrado con AES-256-GCM
 * @param encryptedData - Datos cifrados en formato salt:iv:authTag:ciphertext
 * @returns Texto descifrado
 */
export function decrypt(encryptedData: string): string {
  if (!ENCRYPTION_KEY) {
    console.warn('ENCRYPTION_KEY not configured. Returning data as-is.');
    return encryptedData;
  }

  // Verificar si los datos están cifrados (formato esperado)
  if (!encryptedData.includes(':')) {
    // Los datos no están cifrados, devolver tal cual
    return encryptedData;
  }

  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 4) {
      // Formato no reconocido, devolver tal cual
      return encryptedData;
    }

    const [saltHex, ivHex, authTagHex, ciphertext] = parts;

    const salt = Buffer.from(saltHex, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    // Derivar clave del master key
    const key = deriveKey(ENCRYPTION_KEY, salt);

    // Descifrar
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Error al descifrar los datos. La clave puede ser incorrecta.');
  }
}

/**
 * Verifica si la clave de cifrado está configurada
 */
export function isEncryptionConfigured(): boolean {
  return !!ENCRYPTION_KEY && ENCRYPTION_KEY.length >= 32;
}

/**
 * Genera una clave de cifrado segura
 * Usar solo para generar la clave inicial
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Cifra datos sensibles del certificado CSD
 */
export function encryptCSDData(data: {
  privateKey: string;
  certificate: string;
}): {
  privateKey: string;
  certificate: string;
} {
  return {
    privateKey: encrypt(data.privateKey),
    certificate: encrypt(data.certificate),
  };
}

/**
 * Descifra datos del certificado CSD
 */
export function decryptCSDData(data: {
  privateKey: string;
  certificate: string;
}): {
  privateKey: string;
  certificate: string;
} {
  return {
    privateKey: decrypt(data.privateKey),
    certificate: decrypt(data.certificate),
  };
}

/**
 * Hash para verificación de integridad (no reversible)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
