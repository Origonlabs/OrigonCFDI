/**
 * Utilidades para cálculo de impuestos según normativa SAT
 * Soporta IVA (0%, 8%, 16%), IEPS, y retenciones (ISR, IVA)
 */

export interface TaxConfig {
  ivaRate?: number;          // 0, 0.08, 0.16
  iepsRate?: number;         // 0, 0.03, 0.08, 0.265, 0.30, 0.53
  isrRetention?: number;     // 0.106667 (10.6667%)
  ivaRetention?: number;     // 0.106666 (2/3 del IVA), 0.04 (servicios profesionales)
}

export interface TaxCalculationResult {
  subtotal: number;
  ivaAmount: number;
  iepsAmount: number;
  isrRetentionAmount: number;
  ivaRetentionAmount: number;
  total: number;
  totalTaxes: number;
  totalRetentions: number;
}

/**
 * Calcula todos los impuestos para un concepto
 */
export function calculateTaxes(
  baseAmount: number,
  config: TaxConfig
): TaxCalculationResult {
  const {
    ivaRate = 0.16,
    iepsRate = 0,
    isrRetention = 0,
    ivaRetention = 0
  } = config;

  // IEPS se calcula sobre el precio antes de IVA
  const iepsAmount = baseAmount * iepsRate;

  // IVA se calcula sobre (precio + IEPS)
  const baseForIva = baseAmount + iepsAmount;
  const ivaAmount = baseForIva * ivaRate;

  // Retenciones
  const isrRetentionAmount = baseAmount * isrRetention;
  const ivaRetentionAmount = baseForIva * ivaRetention;

  const totalTaxes = ivaAmount + iepsAmount;
  const totalRetentions = isrRetentionAmount + ivaRetentionAmount;

  const total = baseAmount + totalTaxes - totalRetentions;

  return {
    subtotal: baseAmount,
    ivaAmount,
    iepsAmount,
    isrRetentionAmount,
    ivaRetentionAmount,
    total,
    totalTaxes,
    totalRetentions
  };
}

/**
 * Valida que la tasa de IVA sea válida según SAT
 */
export function isValidIvaRate(rate: number): boolean {
  const validRates = [0, 0.08, 0.16];
  return validRates.some(validRate => Math.abs(rate - validRate) < 0.0001);
}

/**
 * Valida que la tasa de IEPS sea válida según SAT
 */
export function isValidIepsRate(rate: number): boolean {
  const validRates = [0, 0.03, 0.08, 0.265, 0.30, 0.53, 0.60, 1.60];
  return validRates.some(validRate => Math.abs(rate - validRate) < 0.0001);
}

/**
 * Obtiene el nombre descriptivo de una tasa de IVA
 */
export function getIvaRateDescription(rate: number): string {
  if (Math.abs(rate - 0) < 0.0001) return 'IVA 0% (Tasa 0)';
  if (Math.abs(rate - 0.08) < 0.0001) return 'IVA 8% (Frontera)';
  if (Math.abs(rate - 0.16) < 0.0001) return 'IVA 16% (General)';
  return `IVA ${(rate * 100).toFixed(2)}%`;
}

/**
 * Obtiene el nombre descriptivo de una tasa de IEPS
 */
export function getIepsRateDescription(rate: number): string {
  if (Math.abs(rate - 0) < 0.0001) return 'Sin IEPS';
  if (Math.abs(rate - 0.03) < 0.0001) return 'IEPS 3%';
  if (Math.abs(rate - 0.08) < 0.0001) return 'IEPS 8%';
  if (Math.abs(rate - 0.265) < 0.0001) return 'IEPS 26.5%';
  if (Math.abs(rate - 0.30) < 0.0001) return 'IEPS 30%';
  if (Math.abs(rate - 0.53) < 0.0001) return 'IEPS 53%';
  if (Math.abs(rate - 0.60) < 0.0001) return 'IEPS 60%';
  if (Math.abs(rate - 1.60) < 0.0001) return 'IEPS 160%';
  return `IEPS ${(rate * 100).toFixed(2)}%`;
}

/**
 * Calcula el total de una factura con múltiples conceptos
 */
export function calculateInvoiceTotal(
  concepts: Array<{
    quantity: number;
    unitPrice: number;
    discount?: number;
    ivaRate?: number;
    iepsRate?: number;
    isrRetention?: number;
    ivaRetention?: number;
  }>
): TaxCalculationResult {
  let totalSubtotal = 0;
  let totalIva = 0;
  let totalIeps = 0;
  let totalIsrRetention = 0;
  let totalIvaRetention = 0;

  for (const concept of concepts) {
    const amount = concept.quantity * concept.unitPrice;
    const discount = concept.discount || 0;
    const baseAmount = amount - discount;

    const taxes = calculateTaxes(baseAmount, {
      ivaRate: concept.ivaRate,
      iepsRate: concept.iepsRate,
      isrRetention: concept.isrRetention,
      ivaRetention: concept.ivaRetention
    });

    totalSubtotal += taxes.subtotal;
    totalIva += taxes.ivaAmount;
    totalIeps += taxes.iepsAmount;
    totalIsrRetention += taxes.isrRetentionAmount;
    totalIvaRetention += taxes.ivaRetentionAmount;
  }

  const totalTaxes = totalIva + totalIeps;
  const totalRetentions = totalIsrRetention + totalIvaRetention;
  const total = totalSubtotal + totalTaxes - totalRetentions;

  return {
    subtotal: totalSubtotal,
    ivaAmount: totalIva,
    iepsAmount: totalIeps,
    isrRetentionAmount: totalIsrRetention,
    ivaRetentionAmount: totalIvaRetention,
    total,
    totalTaxes,
    totalRetentions
  };
}

/**
 * Redondea un valor monetario a 2 decimales
 */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Formatea un valor monetario a string con 2 decimales
 */
export function formatMoney(value: number): string {
  return value.toFixed(2);
}

/**
 * Valida que los totales calculados coincidan con los proporcionados
 * (útil para validar datos del cliente)
 */
export function validateInvoiceTotals(
  concepts: Array<{
    quantity: number;
    unitPrice: number;
    discount?: number;
    ivaRate?: number;
    iepsRate?: number;
    isrRetention?: number;
    ivaRetention?: number;
  }>,
  expectedTotals: {
    subtotal: number;
    iva: number;
    retentions: number;
    total: number;
  }
): { valid: boolean; message?: string } {
  const calculated = calculateInvoiceTotal(concepts);

  const subtotalMatch = Math.abs(calculated.subtotal - expectedTotals.subtotal) < 0.01;
  const ivaMatch = Math.abs(calculated.ivaAmount - expectedTotals.iva) < 0.01;
  const retentionsMatch = Math.abs(calculated.totalRetentions - expectedTotals.retentions) < 0.01;
  const totalMatch = Math.abs(calculated.total - expectedTotals.total) < 0.01;

  if (!subtotalMatch) {
    return {
      valid: false,
      message: `Subtotal no coincide. Esperado: ${expectedTotals.subtotal}, Calculado: ${calculated.subtotal}`
    };
  }

  if (!ivaMatch) {
    return {
      valid: false,
      message: `IVA no coincide. Esperado: ${expectedTotals.iva}, Calculado: ${calculated.ivaAmount}`
    };
  }

  if (!retentionsMatch) {
    return {
      valid: false,
      message: `Retenciones no coinciden. Esperado: ${expectedTotals.retentions}, Calculado: ${calculated.totalRetentions}`
    };
  }

  if (!totalMatch) {
    return {
      valid: false,
      message: `Total no coincide. Esperado: ${expectedTotals.total}, Calculado: ${calculated.total}`
    };
  }

  return { valid: true };
}
