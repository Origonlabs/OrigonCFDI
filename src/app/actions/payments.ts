
"use server";

import * as z from "zod";
import db from "@/lib/db";
import { payments, paymentDocuments, clients, companies } from "../../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { paymentSchema, type PaymentFormValues } from "@/lib/schemas";
import { getRateLimiter } from "@/lib/rate-limiter";
import { verifyUserRequest } from "@/lib/auth-server";
import { checkUserPermission } from "@/lib/permissions";

export const getPayments = async (userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const data = await db
      .select({
        id: payments.id,
        clientName: clients.name,
        clientRfc: clients.rfc,
        clientEmail: clients.email,
        status: payments.status,
        createdAt: payments.createdAt,
        total: payments.totalAmount,
        pdfUrl: payments.pdfUrl,
        xmlUrl: payments.xmlUrl,
        serie: payments.serie,
        folio: payments.folio,
        currency: payments.currency,
        paymentForm: payments.paymentForm,
        operationNumber: payments.operationNumber,
      })
      .from(payments)
      .leftJoin(clients, eq(payments.clientId, clients.id))
      .where(and(eq(payments.userId, verifiedUserId), eq(clients.userId, verifiedUserId)))
      .orderBy(desc(payments.createdAt));
      
    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getPayments):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener los pagos. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};

export const savePayment = async (formData: PaymentFormValues, userId: string, idToken: string) => {
    const ratelimit = getRateLimiter();
    const { success: rateLimitSuccess } = await ratelimit.limit(userId);
    if (!rateLimitSuccess) {
        return { success: false, message: "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde." };
    }
    
    if (!db) {
        return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
    }
    try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }

    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const validatedData = paymentSchema.parse(formData);

        const { fechaPago, horaPago, ...restOfData } = validatedData;
        const [hours, minutes] = horaPago.split(':').map(Number);
        const paymentDateTime = new Date(fechaPago);
        paymentDateTime.setHours(hours, minutes);

        const [newPayment] = await db.insert(payments).values({
            userId: verifiedUserId,
            clientId: restOfData.clientId,
            serie: restOfData.serie,
            folio: restOfData.folio,
            paymentDate: paymentDateTime,
            paymentForm: restOfData.formaPago,
            currency: restOfData.moneda,
            totalAmount: restOfData.totalPago.toString(),
            operationNumber: restOfData.numeroOperacion,
            status: 'draft',
            relationType: restOfData.relationType,
            relatedCfdis: restOfData.relatedCfdis && restOfData.relatedCfdis.length > 0
                ? JSON.stringify(restOfData.relatedCfdis)
                : null,
        }).returning({ id: payments.id, serie: payments.serie, folio: payments.folio });

        if (!newPayment) {
            throw new Error("No se pudo crear el complemento de pago.");
        }

        const documentsToInsert = restOfData.relatedDocuments.map(doc => ({
            paymentId: newPayment.id,
            userId: verifiedUserId,
            invoiceId: doc.invoiceId,
            uuid: doc.uuid,
            serie: doc.serie,
            folio: doc.folio,
            currency: doc.moneda,
            exchangeRate: doc.tipoCambio.toString(),
            paymentMethod: doc.metodoPago,
            partialityNumber: doc.numParcialidad,
            previousBalance: doc.saldoAnterior.toString(),
            amountPaid: doc.importePagado.toString(),
            outstandingBalance: doc.saldoInsoluto.toString(),
        }));
        
        await db.insert(paymentDocuments).values(documentsToInsert);

        revalidatePath("/dashboard/payments");
        
        return { success: true, data: newPayment };
    } catch (error) {
        if (error instanceof z.ZodError) {
          return { success: false, message: "Datos del formulario no válidos.", errors: error.flatten().fieldErrors };
        }
        console.error("Database Error (savePayment):", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido al guardar el pago.";
        return { success: false, message: `${errorMessage}` };
    }
};

export const getCanceledPayments = async (userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const data = await db
      .select({
        id: payments.id,
        clientName: clients.name,
        clientRfc: clients.rfc,
        clientEmail: clients.email,
        status: payments.status,
        createdAt: payments.createdAt,
        total: payments.totalAmount,
        pdfUrl: payments.pdfUrl,
        xmlUrl: payments.xmlUrl,
        serie: payments.serie,
        folio: payments.folio,
        currency: payments.currency,
        paymentForm: payments.paymentForm,
        operationNumber: payments.operationNumber,
      })
      .from(payments)
      .leftJoin(clients, eq(payments.clientId, clients.id))
      .where(and(
          eq(payments.userId, verifiedUserId),
          eq(clients.userId, verifiedUserId),
          eq(payments.status, 'canceled')
      ))
      .orderBy(desc(payments.createdAt));
      
    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getCanceledPayments):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener los pagos cancelados. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};

export const getDeletedPayments = async (userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    await verifyUserRequest(userId, idToken);
    // For now, this will return no documents as there is no "deleted" state.
    // This matches the requested UI.
    const data: any[] = [];
    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getDeletedPayments):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener los pagos eliminados. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};

/**
 * Timbra un Complemento de Pago (REP 2.0)
 * @param paymentId - ID del pago a timbrar
 * @param userId - ID del usuario
 * @param idToken - Token de autenticación
 */
export const stampPayment = async (paymentId: number, userId: string, idToken: string) => {
  // Rate limiting
  const rateLimiter = getRateLimiter();
  if (rateLimiter) {
    const identifier = `stamp_payment_${userId}`;
    const { success: rateLimitOk } = await rateLimiter.limit(identifier);
    if (!rateLimitOk) {
      return { success: false, message: "Demasiadas solicitudes. Por favor, intenta más tarde." };
    }
  }

  // Verificar permisos
  const permissionCheck = await checkUserPermission(userId, 'stamp_payment');
  if (!permissionCheck.allowed) {
    return { success: false, message: permissionCheck.message || "No tienes permisos para timbrar pagos." };
  }

  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    // Obtener datos del pago
    const [payment] = await db
      .select()
      .from(payments)
      .where(and(eq(payments.id, paymentId), eq(payments.userId, verifiedUserId)));

    if (!payment) {
      return { success: false, message: "Pago no encontrado." };
    }

    if (payment.status !== 'draft') {
      return { success: false, message: "Solo se pueden timbrar pagos en borrador." };
    }

    // Obtener datos del cliente
    const [client] = await db
      .select()
      .from(clients)
      .where(and(eq(clients.id, payment.clientId), eq(clients.userId, verifiedUserId)));

    if (!client) {
      return { success: false, message: "Cliente no encontrado." };
    }

    // Obtener datos de la empresa
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.userId, verifiedUserId));

    if (!company) {
      return { success: false, message: "Datos de empresa no encontrados." };
    }

    // Obtener documentos relacionados (facturas que se están pagando)
    const relatedDocs = await db
      .select()
      .from(paymentDocuments)
      .where(eq(paymentDocuments.paymentId, paymentId));

    if (relatedDocs.length === 0) {
      return { success: false, message: "El pago debe tener al menos una factura relacionada." };
    }

    // Generar XML del Complemento de Pago (REP 2.0)
    const paymentXml = await generatePaymentXML({
      payment,
      client,
      company,
      relatedDocs
    });

    // Timbrar con el PAC
    const { stampWithFacturaLoPlus } = await import('@/lib/pac');
    const pacResult = await stampWithFacturaLoPlus(paymentXml);

    if (!pacResult.success) {
      return { success: false, message: pacResult.message };
    }

    const { stampedXml, uuid, stampDate } = pacResult;

    // Generar PDF del complemento de pago
    const pdfBuffer = await generatePaymentPDF({
      payment,
      client,
      company,
      relatedDocs,
      uuid,
      stampDate
    });

    // Subir archivos a Storage con URLs firmadas
    const { uploadInvoiceFiles } = await import('@/lib/storage');
    const result = await uploadInvoiceFiles(
      verifiedUserId,
      client.id.toString(),
      payment.serie,
      payment.folio.toString(),
      Buffer.from(pdfBuffer),
      stampedXml
    );

    if (!result.success) {
      throw new Error(result.error || 'Error al subir archivos');
    }

    // Actualizar el pago en la BD
    await db.update(payments).set({
      status: 'stamped',
      uuid: uuid,
      stampDate: new Date(stampDate),
      pdfUrl: result.pdfUrl,
      xmlUrl: result.xmlUrl,
      pdfPath: result.pdfPath,
      xmlPath: result.xmlPath,
      updatedAt: new Date()
    }).where(and(eq(payments.id, paymentId), eq(payments.userId, verifiedUserId)));

    revalidatePath("/dashboard/payments");

    return { success: true, message: "Complemento de pago timbrado exitosamente." };
  } catch (error) {
    console.error("Error al timbrar pago:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido al timbrar el pago.";
    return { success: false, message: errorMessage };
  }
};

/**
 * Genera el XML del Complemento de Pago REP 2.0
 */
async function generatePaymentXML(data: any): Promise<string> {
  // TODO: Implementar generación de XML REP 2.0
  // Estructura según especificación del SAT:
  // - Nodo Pagos con versión 2.0
  // - Totales
  // - Pago con atributos (fecha, forma, moneda, monto, etc.)
  // - DoctoRelacionado por cada factura relacionada

  throw new Error('Generación de XML REP 2.0 pendiente de implementar. Consulte la especificación del SAT.');
}

/**
 * Genera el PDF del Complemento de Pago
 */
async function generatePaymentPDF(data: any): Promise<Uint8Array> {
  // TODO: Implementar generación de PDF para complemento de pago
  // Debe incluir:
  // - Datos del emisor y receptor
  // - Información del pago (fecha, forma, monto)
  // - Tabla de documentos relacionados
  // - UUID, sello digital, QR

  throw new Error('Generación de PDF de complemento de pago pendiente de implementar.');
}
