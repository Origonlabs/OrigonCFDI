"use server";

import * as z from "zod";
import db from "@/lib/db";
import { invoices, invoiceItems, clients, companies, csdCertificates } from "../../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getRateLimiter } from "@/lib/rate-limiter";
import { verifyUserRequest } from "@/lib/auth-server";
import { checkUserPermission } from "@/lib/permissions";

/**
 * Schema de validación para nota de crédito
 */
export const creditNoteSchema = z.object({
  clientId: z.number().positive(),
  relatedInvoiceId: z.number().positive(),
  relationType: z.enum(['01']), // 01 = Nota de crédito
  serie: z.string().min(1).max(10),
  folio: z.number().positive(),
  usoCfdi: z.string().min(3).max(4),
  formaPago: z.string().min(2).max(3),
  metodoPago: z.enum(['PUE', 'PPD']),
  condicionesPago: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    satKey: z.string().min(8).max(8),
    unitKey: z.string().min(3).max(3),
    unitPrice: z.number().positive(),
    quantity: z.number().positive(),
    discount: z.number().min(0).default(0),
    objetoImpuesto: z.string().min(2).max(2),
    ivaRate: z.number().min(0).default(0.16),
  })).min(1),
});

export type CreditNoteFormValues = z.infer<typeof creditNoteSchema>;

/**
 * Obtiene las facturas que pueden ser objeto de una nota de crédito
 */
export const getInvoicesForCreditNote = async (userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    // Solo facturas timbradas pueden tener nota de crédito
    const data = await db
      .select({
        id: invoices.id,
        serie: invoices.serie,
        folio: invoices.folio,
        uuid: invoices.uuid,
        clientName: clients.name,
        clientRfc: clients.rfc,
        total: invoices.total,
        createdAt: invoices.createdAt,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        eq(invoices.userId, verifiedUserId),
        eq(invoices.status, 'stamped')
      ))
      .orderBy(desc(invoices.createdAt));

    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getInvoicesForCreditNote):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener facturas: ${errorMessage}` };
  }
};

/**
 * Obtiene los detalles de una factura para generar nota de crédito
 */
export const getInvoiceDetails = async (invoiceId: number, userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    const [invoice] = await db
      .select()
      .from(invoices)
      .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, verifiedUserId)));

    if (!invoice) {
      return { success: false, message: "Factura no encontrada." };
    }

    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, invoiceId));

    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, invoice.clientId), eq(clients.userId, verifiedUserId)));

    return {
      success: true,
      data: {
        invoice,
        items,
        client
      }
    };
  } catch (error) {
    console.error("Database Error (getInvoiceDetails):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener detalles de la factura: ${errorMessage}` };
  }
};

/**
 * Crea una nota de crédito (CFDI Tipo E)
 */
export const createCreditNote = async (
  formData: CreditNoteFormValues,
  userId: string,
  idToken: string
) => {
  const ratelimit = getRateLimiter();
  if (ratelimit) {
    const { success: rateLimitSuccess } = await ratelimit.limit(userId);
    if (!rateLimitSuccess) {
      return { success: false, message: "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde." };
    }
  }

  // Verificar permisos
  const permissionCheck = await checkUserPermission(userId, 'create_invoice');
  if (!permissionCheck.allowed) {
    return { success: false, message: permissionCheck.message || "No tienes permisos para crear notas de crédito." };
  }

  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const validatedData = creditNoteSchema.parse(formData);

    // Verificar que la factura original existe y está timbrada
    const [originalInvoice] = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, validatedData.relatedInvoiceId),
        eq(invoices.userId, verifiedUserId),
        eq(invoices.status, 'stamped')
      ));

    if (!originalInvoice) {
      return { success: false, message: "La factura original no existe o no está timbrada." };
    }

    // Calcular totales
    let subtotal = 0;
    let totalIva = 0;
    let totalDiscounts = 0;

    for (const item of validatedData.items) {
      const amount = item.quantity * item.unitPrice;
      const discount = item.discount || 0;
      const amountAfterDiscount = amount - discount;

      subtotal += amountAfterDiscount;
      totalDiscounts += discount;

      // Calcular IVA si aplica
      if (item.objetoImpuesto === '02' && item.ivaRate > 0) {
        totalIva += amountAfterDiscount * item.ivaRate;
      }
    }

    const total = subtotal + totalIva;

    // Crear la nota de crédito (CFDI Tipo E)
    const [newCreditNote] = await db.insert(invoices).values({
      userId: verifiedUserId,
      clientId: validatedData.clientId,
      serie: validatedData.serie,
      folio: validatedData.folio,
      usoCfdi: validatedData.usoCfdi,
      formaPago: validatedData.formaPago,
      metodoPago: validatedData.metodoPago,
      condicionesPago: validatedData.condicionesPago || null,
      subtotal: subtotal.toFixed(2),
      discounts: totalDiscounts.toFixed(2),
      iva: totalIva.toFixed(2),
      retenciones: '0.00',
      total: total.toFixed(2),
      status: 'draft',
      tipoComprobante: 'E', // Tipo Egreso
      relationType: validatedData.relationType,
      relatedCfdis: originalInvoice.uuid ? JSON.stringify([originalInvoice.uuid]) : null,
    }).returning({ id: invoices.id, serie: invoices.serie, folio: invoices.folio });

    if (!newCreditNote) {
      throw new Error("No se pudo crear la nota de crédito.");
    }

    // Insertar conceptos
    const itemsToInsert = validatedData.items.map(item => {
      const amount = item.quantity * item.unitPrice;
      const discount = item.discount || 0;
      const amountAfterDiscount = amount - discount;

      return {
        invoiceId: newCreditNote.id,
        userId: verifiedUserId,
        description: item.description,
        satKey: item.satKey,
        unitKey: item.unitKey,
        unitPrice: item.unitPrice.toFixed(2),
        quantity: item.quantity,
        discount: discount.toFixed(2),
        amount: amountAfterDiscount.toFixed(2),
        objetoImpuesto: item.objetoImpuesto,
        ivaRate: item.ivaRate.toFixed(6),
      };
    });

    await db.insert(invoiceItems).values(itemsToInsert);

    revalidatePath("/dashboard/credit-notes");

    return {
      success: true,
      message: "Nota de crédito creada exitosamente como borrador.",
      data: newCreditNote
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Datos del formulario no válidos.", errors: error.flatten().fieldErrors };
    }
    console.error("Database Error (createCreditNote):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido al crear la nota de crédito.";
    return { success: false, message: `${errorMessage}` };
  }
};

/**
 * Obtiene todas las notas de crédito del usuario
 */
export const getCreditNotes = async (userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    const data = await db
      .select({
        id: invoices.id,
        serie: invoices.serie,
        folio: invoices.folio,
        uuid: invoices.uuid,
        clientName: clients.name,
        clientRfc: clients.rfc,
        total: invoices.total,
        status: invoices.status,
        createdAt: invoices.createdAt,
        pdfUrl: invoices.pdfUrl,
        xmlUrl: invoices.xmlUrl,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        eq(invoices.userId, verifiedUserId),
        eq(invoices.tipoComprobante, 'E') // Tipo Egreso
      ))
      .orderBy(desc(invoices.createdAt));

    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getCreditNotes):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener notas de crédito: ${errorMessage}` };
  }
};

/**
 * Timbra una nota de crédito (CFDI Tipo E)
 */
export const stampCreditNote = async (creditNoteId: number, userId: string, idToken: string) => {
  const rateLimiter = getRateLimiter();
  if (rateLimiter) {
    const identifier = `stamp_credit_note_${userId}`;
    const { success: rateLimitOk } = await rateLimiter.limit(identifier);
    if (!rateLimitOk) {
      return { success: false, message: "Demasiadas solicitudes. Por favor, intenta más tarde." };
    }
  }

  const permissionCheck = await checkUserPermission(userId, 'stamp_invoice');
  if (!permissionCheck.allowed) {
    return { success: false, message: permissionCheck.message || "No tienes permisos para timbrar notas de crédito." };
  }

  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    // Obtener la nota de crédito
    const [creditNote] = await db
      .select()
      .from(invoices)
      .where(and(
        eq(invoices.id, creditNoteId),
        eq(invoices.userId, verifiedUserId),
        eq(invoices.tipoComprobante, 'E')
      ));

    if (!creditNote) {
      return { success: false, message: "Nota de crédito no encontrada." };
    }

    if (creditNote.status !== 'draft') {
      return { success: false, message: "Solo se pueden timbrar notas de crédito en borrador." };
    }

    // Obtener cliente
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, creditNote.clientId), eq(clients.userId, verifiedUserId)));

    if (!client) {
      return { success: false, message: "Cliente no encontrado." };
    }

    // Obtener empresa
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.userId, verifiedUserId));

    if (!company) {
      return { success: false, message: "Datos de empresa no encontrados." };
    }

    // Obtener conceptos
    const items = await db
      .select()
      .from(invoiceItems)
      .where(eq(invoiceItems.invoiceId, creditNoteId));

    if (items.length === 0) {
      return { success: false, message: "La nota de crédito debe tener al menos un concepto." };
    }

    // Generar XML (CFDI 4.0 Tipo E)
    const creditNoteData = {
      invoice: creditNote,
      client,
      company,
      items,
      tipoComprobante: 'E'
    };

    // TODO: Implementar firma, timbrado y generación de PDF para notas de crédito
    // Por ahora, retornar error indicando que la funcionalidad está pendiente
    return {
      success: false,
      message: 'La funcionalidad de notas de crédito está en desarrollo. Por favor, use facturas regulares por el momento.'
    };
  } catch (error) {
    console.error("Error al timbrar nota de crédito:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al timbrar la nota de crédito.";
    return { success: false, message: errorMessage };
  }
};

/**
 * Genera el XML de la nota de crédito (CFDI 4.0 Tipo E)
 */
async function generateCreditNoteXML(data: any, signData?: { sello: string; certificado: string; noCertificado: string }): Promise<string> {
  // Estructura similar a generateXmlString pero con TipoDeComprobante="E"
  // y los conceptos en negativo según sea necesario

  const { invoice, client, company, items } = data;

  // TODO: Implementar generación completa de XML CFDI 4.0 Tipo E
  // - TipoDeComprobante="E"
  // - CfdiRelacionados con tipo relación "01" (Nota de crédito)
  // - Conceptos con cantidades y montos correctos
  // - Firma digital si está disponible

  throw new Error('Generación de XML para nota de crédito pendiente de implementar completamente.');
}
