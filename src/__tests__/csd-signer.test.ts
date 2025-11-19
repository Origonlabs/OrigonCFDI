/**
 * Tests para el módulo de firma CSD
 */

import {
  generateCadenaOriginal,
  getCertificateBase64,
  isCertificateValid
} from '@/lib/csd-signer';

describe('CSD Signer Module', () => {
  describe('generateCadenaOriginal', () => {
    it('should generate a cadena original with correct format', () => {
      const xmlData = {
        version: '4.0',
        serie: 'A',
        folio: '1',
        fecha: '2024-01-15T10:30:00',
        formaPago: '01',
        noCertificado: '30001000000500003416',
        subTotal: '1000.00',
        moneda: 'MXN',
        total: '1160.00',
        tipoDeComprobante: 'I',
        exportacion: '01',
        metodoPago: 'PUE',
        lugarExpedicion: '06600',
        emisor: {
          rfc: 'AAA010101AAA',
          nombre: 'Empresa Ejemplo SA de CV',
          regimenFiscal: '601'
        },
        receptor: {
          rfc: 'BBB010101BBB',
          nombre: 'Cliente Ejemplo',
          domicilioFiscal: '06600',
          regimenFiscal: '612',
          usoCFDI: 'G03'
        },
        conceptos: [
          {
            claveProdServ: '84111506',
            cantidad: 1,
            claveUnidad: 'E48',
            descripcion: 'Servicio de consultoría',
            valorUnitario: '1000.00',
            importe: '1000.00',
            objetoImp: '02',
            impuestos: {
              base: '1000.00',
              impuesto: '002',
              tipoFactor: 'Tasa',
              tasaOCuota: '0.160000',
              importe: '160.00'
            }
          }
        ],
        impuestos: {
          totalImpuestosTrasladados: '160.00',
          traslados: [
            {
              base: '1000.00',
              impuesto: '002',
              tipoFactor: 'Tasa',
              tasaOCuota: '0.160000',
              importe: '160.00'
            }
          ]
        }
      };

      const cadena = generateCadenaOriginal(xmlData);

      // Debe empezar y terminar con ||
      expect(cadena).toMatch(/^\|\|.+\|\|$/);

      // Debe contener los valores principales
      expect(cadena).toContain('4.0');
      expect(cadena).toContain('AAA010101AAA');
      expect(cadena).toContain('BBB010101BBB');
      expect(cadena).toContain('1000.00');
      expect(cadena).toContain('160.00');
    });
  });

  describe('getCertificateBase64', () => {
    it('should remove PEM headers and whitespace', () => {
      const pemCert = `-----BEGIN CERTIFICATE-----
MIIBkTCB+wIJAKHBfpEJ5rVCMA0GCSqGSIb3DQEBCwUAMBExDzANBgNVBAMMBnRl
c3RDQTAeFw0yNDAxMDEwMDAwMDBaFw0yNTAxMDEwMDAwMDBaMBExDzANBgNVBAMM
BnRlc3RDQTBcMA0GCSqGSIb3DQEBAQUAA0sAMEgCQQC7FYz7d8GY3q5e3vS3j5lL
-----END CERTIFICATE-----`;

      const base64 = getCertificateBase64(pemCert);

      expect(base64).not.toContain('-----BEGIN CERTIFICATE-----');
      expect(base64).not.toContain('-----END CERTIFICATE-----');
      expect(base64).not.toContain('\n');
      expect(base64).not.toContain(' ');
    });
  });

  describe('isCertificateValid', () => {
    it('should return false for invalid certificate format', () => {
      const invalidCert = 'not a valid certificate';
      expect(isCertificateValid(invalidCert)).toBe(false);
    });
  });
});
