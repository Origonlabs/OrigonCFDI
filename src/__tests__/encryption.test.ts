/**
 * Tests para el módulo de cifrado
 */

// Mock de variables de entorno ANTES de importar el módulo
const TEST_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

// Usamos jest.resetModules y reimportamos después de configurar env
beforeAll(() => {
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
});

// Importaciones dinámicas para que usen el env actualizado
let encrypt: (plaintext: string) => string;
let decrypt: (encryptedData: string) => string;
let isEncryptionConfigured: () => boolean;
let hashData: (data: string) => string;

beforeAll(async () => {
  jest.resetModules();
  process.env.ENCRYPTION_KEY = TEST_ENCRYPTION_KEY;
  const encryption = await import('@/lib/encryption');
  encrypt = encryption.encrypt;
  decrypt = encryption.decrypt;
  isEncryptionConfigured = encryption.isEncryptionConfigured;
  hashData = encryption.hashData;
});

describe('Encryption Module', () => {
  describe('encrypt/decrypt', () => {
    it('should encrypt and decrypt text correctly', () => {
      const originalText = 'This is a secret message';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(encrypted).not.toBe(originalText);
      expect(decrypted).toBe(originalText);
    });

    it('should generate different ciphertexts for same input (due to random IV)', () => {
      const originalText = 'Same text';
      const encrypted1 = encrypt(originalText);
      const encrypted2 = encrypt(originalText);

      expect(encrypted1).not.toBe(encrypted2);
      expect(decrypt(encrypted1)).toBe(originalText);
      expect(decrypt(encrypted2)).toBe(originalText);
    });

    it('should handle empty strings', () => {
      const originalText = '';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should handle special characters', () => {
      const originalText = '¡Hola! ¿Cómo estás? 你好 🎉';
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });

    it('should handle multiline text', () => {
      const originalText = `Line 1
Line 2
Line 3`;
      const encrypted = encrypt(originalText);
      const decrypted = decrypt(encrypted);

      expect(decrypted).toBe(originalText);
    });
  });

  describe('isEncryptionConfigured', () => {
    it('should return true when ENCRYPTION_KEY is set', () => {
      expect(isEncryptionConfigured()).toBe(true);
    });
  });

  describe('hashData', () => {
    it('should generate consistent hash for same input', () => {
      const data = 'test data';
      const hash1 = hashData(data);
      const hash2 = hashData(data);

      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different inputs', () => {
      const hash1 = hashData('data1');
      const hash2 = hashData('data2');

      expect(hash1).not.toBe(hash2);
    });

    it('should return 64 character hex string (SHA-256)', () => {
      const hash = hashData('test');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });
  });
});
