
"use server";

import * as z from "zod";
import db from "@/lib/db";
import { invoices, invoiceItems, clients, companies } from "../../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { PDFDocument, rgb, StandardFonts, PDFFont } from "pdf-lib";
import { create } from 'xmlbuilder2';
import QRCode from 'qrcode';
import { Buffer } from 'buffer';
import { numeroALetras } from 'numero-a-letras';
import { stampWithFacturaLoPlus } from "@/lib/pac";
import { invoiceSchema, type InvoiceFormValues } from "@/lib/schemas";
import { getRateLimiter } from "@/lib/rate-limiter";
import { checkUserPermission } from "@/lib/permissions";
import { signCFDI } from "@/lib/csd-signer";
import { uploadInvoiceFiles } from "@/lib/storage";

interface PaginationOptions {
  page?: number;
  limit?: number;
}

export const getInvoices = async (userId: string, options: PaginationOptions = {}) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }

    const page = options.page || 1;
    const limit = options.limit || 50;
    const offset = (page - 1) * limit;

    // Obtener total de registros para paginación
    const countResult = await db
      .select({ count: invoices.id })
      .from(invoices)
      .where(eq(invoices.userId, userId));

    const total = countResult.length;
    const totalPages = Math.ceil(total / limit);

    // Obtener datos paginados
    const data = await db
      .select()
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(eq(invoices.userId, userId), eq(clients.userId, userId)))
      .orderBy(desc(invoices.createdAt))
      .limit(limit)
      .offset(offset)
      .then(res => res.map(r => ({...r.invoices, clientName: r.clients?.name, clientRfc: r.clients?.rfc, clientEmail: r.clients?.email })));

    return {
      success: true,
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  } catch (error) {
    console.error("Database Error (getInvoices):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener las facturas. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};

export const getPendingInvoices = async (userId: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    const data = await db
      .select({
        id: invoices.id,
        clientName: clients.name,
        clientRfc: clients.rfc,
        clientEmail: clients.email,
        status: invoices.status,
        createdAt: invoices.createdAt,
        total: invoices.total,
        pdfUrl: invoices.pdfUrl,
        xmlUrl: invoices.xmlUrl,
        serie: invoices.serie,
        folio: invoices.folio,
        metodoPago: invoices.metodoPago,
        uuid: invoices.uuid,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        eq(invoices.userId, userId),
        eq(clients.userId, userId),
        eq(invoices.metodoPago, 'PPD'),
        eq(invoices.status, 'stamped')
      ))
      .orderBy(desc(invoices.createdAt));

    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getPendingInvoices):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener las facturas pendientes. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};

export const getCanceledInvoices = async (userId: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    const data = await db
      .select({
        id: invoices.id,
        clientName: clients.name,
        clientRfc: clients.rfc,
        clientEmail: clients.email,
        status: invoices.status,
        createdAt: invoices.createdAt,
        total: invoices.total,
        pdfUrl: invoices.pdfUrl,
        xmlUrl: invoices.xmlUrl,
        serie: invoices.serie,
        folio: invoices.folio,
        metodoPago: invoices.metodoPago,
        uuid: invoices.uuid,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(and(
        eq(invoices.userId, userId),
        eq(clients.userId, userId),
        eq(invoices.status, 'canceled')
      ))
      .orderBy(desc(invoices.createdAt));

    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getCanceledInvoices):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener las facturas canceladas. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};

export const getDeletedInvoices = async (userId: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    // For now, this will return no documents as there is no "deleted" state.
    // This matches the requested UI.
    const data: Array<Record<string, never>> = [];
    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getDeletedInvoices):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener las facturas eliminadas. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};

export const saveInvoice = async (formData: InvoiceFormValues, userId: string) => {
  const ratelimit = getRateLimiter();
  const { success: rateLimitSuccess } = await ratelimit.limit(userId);
  if (!rateLimitSuccess) {
      return { success: false, message: "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde." };
  }
  
  // Verificar permisos
  const permissionCheck = await checkUserPermission(userId, 'canCreateInvoices');
  if (!permissionCheck.allowed) {
    return { success: false, message: permissionCheck.message || "No tienes permisos para crear facturas." };
  }
  
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    
    const validatedData = invoiceSchema.parse(formData);

    // Calcular totales por concepto
    let subtotal = 0;
    let totalDiscounts = 0;
    let totalIva = 0;
    let totalRetencionesIsr = 0;
    let totalRetencionesIva = 0;

    const conceptsWithTax = validatedData.concepts.map(concept => {
      const amount = (concept.quantity * concept.unitPrice) - (concept.discount || 0);
      subtotal += concept.quantity * concept.unitPrice;
      totalDiscounts += concept.discount || 0;

      // Determinar tasa de IVA según objeto de impuesto
      // 01 = No objeto de impuesto
      // 02 = Sí objeto de impuesto (gravado)
      // 03 = Sí objeto de impuesto y no obligado al desglose
      // 04 = Sí objeto del impuesto y no causa impuesto
      let ivaTasa = 0;
      let ivaAmount = 0;
      let retencionIsr = 0;
      let retencionIva = 0;

      const objetoImp = concept.objetoImpuesto || '02'; // Default: gravado

      if (objetoImp === '02') {
        // Tasa estándar 16%, pero puede variar por región (8% frontera)
        ivaTasa = concept.ivaTasa !== undefined ? concept.ivaTasa : 0.16;
        ivaAmount = amount * ivaTasa;
        totalIva += ivaAmount;

        // Retenciones (si aplican, ej: servicios profesionales)
        if (concept.retencionIsr) {
          retencionIsr = amount * (concept.retencionIsrTasa || 0.10);
          totalRetencionesIsr += retencionIsr;
        }
        if (concept.retencionIva) {
          retencionIva = amount * (concept.retencionIvaTasa || 0.106667);
          totalRetencionesIva += retencionIva;
        }
      }

      return {
        ...concept,
        amount,
        ivaAmount,
        ivaTasa,
        retencionIsr,
        retencionIva,
        objetoImpuesto: objetoImp
      };
    });

    const totalRetenciones = totalRetencionesIsr + totalRetencionesIva;
    const total = subtotal - totalDiscounts + totalIva - totalRetenciones;

    // Insertar factura
    const [newInvoice] = await db.insert(invoices).values({
      userId,
      clientId: validatedData.clientId,
      serie: validatedData.serie,
      folio: validatedData.folio,
      usoCfdi: validatedData.usoCfdi,
      formaPago: validatedData.formaPago,
      metodoPago: validatedData.metodoPago,
      condicionesPago: validatedData.condicionesPago ?? null,
      subtotal: subtotal.toString(),
      discounts: totalDiscounts.toString(),
      iva: totalIva.toString(),
      retenciones: totalRetenciones.toString(),
      total: total.toString(),
      status: 'draft',
    }).returning({ id: invoices.id, serie: invoices.serie, folio: invoices.folio, clientId: invoices.clientId });

    if (!newInvoice) {
        throw new Error("No se pudo crear la factura.");
    }

    // Preparar conceptos para insertar
    const conceptsToInsert = validatedData.concepts.map(concept => ({
      invoiceId: newInvoice.id,
      userId,
      description: concept.description,
      satKey: concept.satKey,
      unitKey: concept.unitKey,
      unitPrice: concept.unitPrice.toString(),
      quantity: concept.quantity,
      discount: (concept.discount || 0).toString(),
      amount: ((concept.quantity * concept.unitPrice) - (concept.discount || 0)).toString(),
    }));

    // Insertar conceptos - si falla, eliminar la factura (rollback manual)
    try {
      await db.insert(invoiceItems).values(conceptsToInsert);
    } catch (itemsError) {
      // Rollback: eliminar la factura creada
      await db.delete(invoices).where(eq(invoices.id, newInvoice.id));
      throw new Error("Error al guardar los conceptos de la factura. La operación fue revertida.");
    }

    revalidatePath("/dashboard/invoices");
    
    return { success: true, data: { ...newInvoice } };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Datos del formulario no válidos.", errors: error.flatten().fieldErrors };
    }
    console.error("Database Error (saveInvoice):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido al guardar la factura.";
    return { success: false, message: `${errorMessage}` };
  }
};


export const stampInvoice = async (invoiceId: number, userId: string) => {
    const ratelimit = getRateLimiter();
    const { success: rateLimitSuccess } = await ratelimit.limit(userId);
    if (!rateLimitSuccess) {
        return { success: false, message: "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde." };
    }

    // Verificar permisos
    const permissionCheck = await checkUserPermission(userId, 'canEditInvoices');
    if (!permissionCheck.allowed) {
        return { success: false, message: permissionCheck.message || "No tienes permisos para timbrar facturas." };
    }

    if (!db) {
        return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
    }
    try {
        if (!userId) {
            return { success: false, message: "Usuario no autenticado." };
        }

        const invoiceData = await getInvoiceForDownload(invoiceId, userId);
        
        if (!invoiceData) {
            return { success: false, message: "Factura no encontrada o datos de empresa/cliente incompletos." };
        }

        if (invoiceData.invoice.status !== 'draft') {
            return { success: false, message: "La factura ya ha sido timbrada o está cancelada." };
        }

        const unsignedXmlString = await _generateXmlString(invoiceData, userId);

        const pacResult = await stampWithFacturaLoPlus(unsignedXmlString);

        if (!pacResult.success) {
            return { success: false, message: pacResult.message };
        }

        const { stampedXml, uuid, stampDate } = pacResult;

        await db.update(invoices).set({
            status: 'stamped',
            uuid: uuid,
            stampDate: new Date(stampDate),
            updatedAt: new Date()
        }).where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));
        
        // Update local object for PDF generation
        invoiceData.invoice.status = 'stamped';
        invoiceData.invoice.uuid = uuid;
        invoiceData.invoice.stampDate = new Date(stampDate);

        const pdfBytes = await _generatePdfBuffer(invoiceData);

        // Subir archivos con URLs firmadas (más seguro que makePublic)
        const { pdfUrl, xmlUrl, pdfPath, xmlPath } = await uploadInvoiceFiles(
            userId,
            invoiceData.invoice.clientId,
            invoiceData.invoice.serie,
            invoiceData.invoice.folio,
            Buffer.from(pdfBytes),
            stampedXml
        );

        if (pdfUrl || xmlUrl) {
            await db.update(invoices).set({
                pdfUrl: pdfPath, // Guardamos el path para regenerar URLs firmadas
                xmlUrl: xmlPath
            }).where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));
        } else {
            console.warn("No se pudieron subir los archivos a Firebase Storage.");
        }


        revalidatePath("/dashboard/invoices");
        return { success: true, message: "Factura timbrada exitosamente." };
    } catch (error) {
        console.error("Database Error (stampInvoice):", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido al timbrar la factura.";
        return { success: false, message: errorMessage };
    }
};


async function getInvoiceForDownload(invoiceId: number, userId: string) {
    if (!db) return null;

    const [invoice] = await db.select().from(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));
    if (!invoice) return null;

    const [client] = await db.select().from(clients).where(and(eq(clients.id, invoice.clientId), eq(clients.userId, userId)));
    if (!client) return null;

    const items = await db.select().from(invoiceItems).where(and(eq(invoiceItems.invoiceId, invoice.id), eq(invoiceItems.userId, userId)));

    const [company] = await db.select().from(companies).where(eq(companies.userId, userId));
    if (!company) return null;

    return { invoice, client, items, company };
}

async function _generateXmlString(data: NonNullable<Awaited<ReturnType<typeof getInvoiceForDownload>>>, userId: string) {
    const { invoice, client, items, company } = data;
    const date = new Date(invoice.createdAt!).toISOString().slice(0, -5);

    // Preparar datos para la firma digital
    const xmlData = {
        version: '4.0',
        serie: invoice.serie,
        folio: invoice.folio.toString(),
        fecha: date,
        formaPago: invoice.formaPago,
        noCertificado: '', // Se llenará con el CSD
        subTotal: parseFloat(invoice.subtotal).toFixed(2),
        moneda: 'MXN',
        total: parseFloat(invoice.total).toFixed(2),
        tipoDeComprobante: 'I',
        exportacion: '01',
        metodoPago: invoice.metodoPago,
        lugarExpedicion: company.zip || '00000',
        emisor: {
            rfc: company.rfc,
            nombre: company.companyName,
            regimenFiscal: company.taxRegime,
        },
        receptor: {
            rfc: client.rfc,
            nombre: client.name,
            domicilioFiscal: client.zip,
            regimenFiscal: client.taxRegime,
            usoCFDI: invoice.usoCfdi,
        },
        conceptos: items.map(item => ({
            claveProdServ: item.satKey,
            cantidad: item.quantity,
            claveUnidad: item.unitKey,
            descripcion: item.description,
            valorUnitario: parseFloat(item.unitPrice).toFixed(2),
            importe: parseFloat(item.amount).toFixed(2),
            objetoImp: '02',
            impuestos: {
                base: parseFloat(item.amount).toFixed(2),
                impuesto: '002',
                tipoFactor: 'Tasa',
                tasaOCuota: '0.160000',
                importe: (parseFloat(item.amount) * 0.16).toFixed(2),
            }
        })),
        impuestos: {
            totalImpuestosTrasladados: parseFloat(invoice.iva).toFixed(2),
            traslados: [{
                base: parseFloat(invoice.subtotal).toFixed(2),
                impuesto: '002',
                tipoFactor: 'Tasa',
                tasaOCuota: '0.160000',
                importe: parseFloat(invoice.iva).toFixed(2),
            }]
        }
    };

    // Firmar el CFDI con el CSD del usuario
    const signResult = await signCFDI(userId, xmlData);

    let sello: string;
    let certificado: string;
    let noCertificado: string;

    if (signResult.success) {
        sello = signResult.sello;
        certificado = signResult.certificado;
        noCertificado = signResult.noCertificado;
    } else {
        // Fallback para pruebas si no hay CSD configurado
        console.warn('CSD signing failed:', 'message' in signResult ? signResult.message : 'Unknown error');
        sello = 'SELLO_PENDIENTE_CONFIGURAR_CSD';
        certificado = 'CERTIFICADO_PENDIENTE_CONFIGURAR_CSD';
        noCertificado = '00000000000000000000';
    }
    
    const concepts = items.map(item => ({
        'cfdi:Concepto': {
            '@Importe': parseFloat(item.amount).toFixed(2),
            '@ValorUnitario': parseFloat(item.unitPrice).toFixed(2),
            '@Descripcion': item.description,
            '@Unidad': item.unitKey,
            '@ClaveUnidad': item.unitKey,
            '@Cantidad': item.quantity,
            '@ClaveProdServ': item.satKey,
            '@ObjetoImp': '02',
            'cfdi:Impuestos': {
                'cfdi:Traslados': {
                    'cfdi:Traslado': {
                        '@Base': parseFloat(item.amount).toFixed(2),
                        '@Impuesto': '002',
                        '@TipoFactor': 'Tasa',
                        '@TasaOCuota': '0.160000',
                        '@Importe': (parseFloat(item.amount) * 0.16).toFixed(2),
                    }
                }
            }
        }
    }));

    // Tipo para la estructura XML del CFDI 4.0 compatible con xmlbuilder2
    type CfdiXmlObject = {
        'cfdi:Comprobante': Record<string, unknown>;
    };

    const xmlObject: CfdiXmlObject = {
        'cfdi:Comprobante': {
            '@xmlns:cfdi': 'http://www.sat.gob.mx/cfd/4',
            '@xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
            '@xsi:schemaLocation': 'http://www.sat.gob.mx/cfd/4 http://www.sat.gob.mx/sitio_internet/cfd/4/cfdv40.xsd',
            '@Version': '4.0',
            '@Serie': invoice.serie,
            '@Folio': invoice.folio,
            '@Fecha': date,
            '@Sello': sello,
            '@FormaPago': invoice.formaPago,
            '@NoCertificado': noCertificado,
            '@Certificado': certificado,
            '@SubTotal': parseFloat(invoice.subtotal).toFixed(2),
            '@Moneda': 'MXN',
            '@Total': parseFloat(invoice.total).toFixed(2),
            '@TipoDeComprobante': 'I',
            '@Exportacion': '01',
            '@MetodoPago': invoice.metodoPago,
            '@LugarExpedicion': company.zip || '00000',
            'cfdi:Emisor': {
                '@Rfc': company.rfc,
                '@Nombre': company.companyName,
                '@RegimenFiscal': company.taxRegime,
            },
            'cfdi:Receptor': {
                '@Rfc': client.rfc,
                '@Nombre': client.name,
                '@DomicilioFiscalReceptor': client.zip,
                '@RegimenFiscalReceptor': client.taxRegime,
                '@UsoCFDI': invoice.usoCfdi,
            },
            'cfdi:Conceptos': concepts,
            'cfdi:Impuestos': {
                '@TotalImpuestosTrasladados': parseFloat(invoice.iva).toFixed(2),
                'cfdi:Traslados': {
                    'cfdi:Traslado': {
                        '@Base': parseFloat(invoice.subtotal).toFixed(2),
                        '@Impuesto': '002',
                        '@TipoFactor': 'Tasa',
                        '@TasaOCuota': '0.160000',
                        '@Importe': parseFloat(invoice.iva).toFixed(2),
                    }
                }
            }
        }
    };
    
    const doc = create({ version: '1.0', encoding: 'UTF-8' }, xmlObject);
    return doc.end({ prettyPrint: true });
}

async function _generatePdfBuffer(data: NonNullable<Awaited<ReturnType<typeof getInvoiceForDownload>>>) {
    const { invoice, client, items, company } = data;
    const isStamped = invoice.status === 'stamped';

    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage();
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const lightGray = rgb(0.9, 0.9, 0.9);
    const darkGray = rgb(0.4, 0.4, 0.4);
    const textGray = rgb(0.3, 0.3, 0.3);

    const margin = 40;
    let y = height - margin;

    const drawText = (text: string, x: number, yPos: number, fontType: PDFFont = font, size = 9, color = textGray) => {
        page.drawText(text, { x, y: yPos, font: fontType, size, color, lineHeight: size + 2 });
    };

    const drawTextBlock = (text: string, x: number, yPos: number, maxWidth: number, fontType: PDFFont = font, size = 9, color = textGray) => {
        const words = text.split(' ');
        let line = '';
        let currentY = yPos;
        for(const word of words) {
            const testLine = line + word + ' ';
            const textWidth = fontType.widthOfTextAtSize(testLine, size);
            if (textWidth > maxWidth) {
                drawText(line, x, currentY, fontType, size, color);
                line = word + ' ';
                currentY -= size + 2;
            } else {
                line = testLine;
            }
        }
        drawText(line, x, currentY, fontType, size, color);
        return currentY - (size + 2);
    };

    // --- Header ---
    drawText('Factura Electrónica', margin, y, boldFont, 18, rgb(0,0,0));
    y -= 30;

    // --- Company Info & CFDI Data ---
    const columnWidth = (width - margin * 3) / 2;
    const rightColumnX = margin + columnWidth + margin;
    
    if (company.logoUrl) {
      try {
        const imageBytes = await fetch(company.logoUrl).then(res => res.arrayBuffer());
        const logoImage = company.logoUrl.endsWith('.png') 
            ? await pdfDoc.embedPng(imageBytes) 
            : await pdfDoc.embedJpg(imageBytes);
        const logoDims = logoImage.scale(0.25);
        page.drawImage(logoImage, { x: margin, y: y - logoDims.height + 25, width: logoDims.width, height: logoDims.height });
      } catch (e) {
        console.error("Could not embed company logo:", e);
      }
    }
    
    let leftY = y - 40;
    drawText(company.companyName, margin, leftY, boldFont, 10);
    leftY -= 12;
    drawText(company.rfc, margin, leftY);
    leftY -= 12;

    const companyAddress = [
      company.street,
      company.exteriorNumber,
      company.interiorNumber ? `Int. ${company.interiorNumber}` : null,
      company.neighborhood,
      company.municipality,
      company.state,
      company.zip
    ].filter(Boolean).join(', ');
    leftY = drawTextBlock(companyAddress, margin, leftY, columnWidth);
    
    page.drawRectangle({x: rightColumnX - 10, y: y - 110, width: columnWidth + 20, height: 130, borderColor: lightGray, borderWidth: 1});
    drawText(`Factura #${invoice.serie}-${invoice.folio}`, rightColumnX, y, boldFont, 12, rgb(0,0,0));
    let rightY = y - 20;
    drawText('Folio Fiscal:', rightColumnX, rightY, boldFont);
    drawText(isStamped ? invoice.uuid! : 'PENDIENTE_DE_TIMBRADO', rightColumnX + 70, rightY, font, 7);
    rightY -= 15;
    drawText('Fecha Expedición:', rightColumnX, rightY, boldFont);
    drawText(new Date(invoice.createdAt!).toLocaleString('es-MX'), rightColumnX + 70, rightY);
    rightY -= 15;
    drawText('Fecha Timbrado:', rightColumnX, rightY, boldFont);
    drawText(isStamped ? new Date(invoice.stampDate!).toLocaleString('es-MX') : 'PENDIENTE_DE_TIMBRADO', rightColumnX + 70, rightY);
    rightY -= 15;
    drawText('CSD del SAT:', rightColumnX, rightY, boldFont);
    drawText(isStamped ? '20001000000500001234' : 'PENDIENTE', rightColumnX + 70, rightY);
    rightY -= 15;
    drawText('CSD del Emisor:', rightColumnX, rightY, boldFont);
    drawText(isStamped ? '30001000000500003416' : 'PENDIENTE', rightColumnX + 70, rightY);
    rightY -= 15;
    drawText('Tipo de Comprobante:', rightColumnX, rightY, boldFont);
    drawText('I - Ingreso', rightColumnX + 100, rightY);

    y = Math.min(leftY, rightY) - 20;

    // --- Client Info ---
    page.drawRectangle({x: margin, y: y - 5, width: width - margin*2, height: 20, color: lightGray});
    drawText('Empresa', margin + 5, y, boldFont, 10, rgb(0,0,0));
    y -= 25;
    drawText('Cliente:', margin, y, boldFont);
    drawText(client.name, margin + 100, y);
    y -= 15;
    drawText('R.F.C:', margin, y, boldFont);
    drawText(client.rfc, margin + 100, y);
    y -= 15;
    drawText('Dirección Fiscal:', margin, y, boldFont);
    drawText(client.zip, margin + 100, y);
    y -= 15;
    drawText('Uso CFDI:', margin, y, boldFont);
    drawText(invoice.usoCfdi, margin + 100, y);
    y -= 15;
    drawText('Régimen Fiscal:', margin, y, boldFont);
    drawText(client.taxRegime, margin + 100, y);
    y -= 20;

    // --- Items Table ---
    page.drawRectangle({x: margin, y: y-5, width: width - margin*2, height: 20, color: lightGray});
    const tableHeadersX = [margin + 5, margin + 60, margin + 120, margin + 350, margin + 420, margin + 490];
    const tableHeaders = ['Cantidad', 'Clave Unidad', 'Descripción', 'Clave Producto', 'Precio Unitario', 'Importe Neto'];
    tableHeaders.forEach((header, i) => drawText(header, tableHeadersX[i], y, boldFont, 10, rgb(0,0,0)));
    y -= 20;

    items.forEach(item => {
        if (y < margin + 150) { // Check for page break
            page = pdfDoc.addPage();
            y = height - margin;
        }
        const itemY = y;
        drawText(item.quantity.toString(), tableHeadersX[0], itemY);
        drawText(item.unitKey, tableHeadersX[1], itemY);
        const descY = drawTextBlock(item.description, tableHeadersX[2], itemY, 220);
        drawText(item.satKey, tableHeadersX[3], itemY);
        drawText(`$${parseFloat(item.unitPrice).toFixed(2)}`, tableHeadersX[4], itemY);
        drawText(`$${parseFloat(item.amount).toFixed(2)}`, tableHeadersX[5], itemY);
        y = descY - 5;
        page.drawLine({start: {x: margin, y: y}, end: {x: width - margin, y: y}, thickness: 0.5, color: lightGray});
        y -= 10;
    });
    
    y -= 10;

    // --- Totals Section ---
    const totalX = width - margin - 200;
    const totalAmountX = width - margin - 80;
    const amountInWords = numeroALetras(parseFloat(invoice.total), {
        plural: 'PESOS', singular: 'PESO', centavos: { plural: 'CENTAVOS', singular: 'CENTAVO' }
    });
    drawText('Importe con Letra:', margin, y, boldFont);
    drawTextBlock(`(${amountInWords})`, margin, y - 15, totalX - margin - 10, font, 8);
    
    drawText('Subtotal:', totalX, y, boldFont);
    drawText(`$${parseFloat(invoice.subtotal).toFixed(2)}`, totalAmountX, y, font, 9, rgb(0,0,0));
    y -= 15;
    drawText('Descuento:', totalX, y, boldFont);
    drawText(`$${parseFloat(invoice.discounts).toFixed(2)}`, totalAmountX, y, font, 9, rgb(0,0,0));
    y -= 15;
    drawText('IVA 16.0%:', totalX, y, boldFont);
    drawText(`$${parseFloat(invoice.iva).toFixed(2)}`, totalAmountX, y, font, 9, rgb(0,0,0));
    y -= 5;
    page.drawLine({start: {x: totalX - 5, y: y}, end: {x: width - margin, y: y}, thickness: 1, color: rgb(0,0,0)});
    y -= 15;
    drawText('Total:', totalX, y, boldFont, 12, rgb(0,0,0));
    drawText(`$${parseFloat(invoice.total).toFixed(2)}`, totalAmountX, y, boldFont, 12, rgb(0,0,0));
    y -= 30;

    // --- Payment Info ---
    drawText('Forma de Pago:', margin, y, boldFont);
    drawText(invoice.formaPago, margin + 80, y);
    y -= 15;
    drawText('Método de Pago:', margin, y, boldFont);
    drawText(invoice.metodoPago, margin + 80, y);
    y -= 15;
    drawText('Moneda:', margin, y, boldFont);
    drawText('MXN', margin + 80, y);
    y -= 30;

    // --- QR & Seals ---
    const sealX = margin + 140;
    const sealWidth = width - margin*2 - sealX;
    let sealY = y;
    if (isStamped) {
        const qrData = `https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx?id=${invoice.uuid}&re=${company.rfc}&rr=${client.rfc}&tt=${invoice.total}&fe=${invoice.createdAt.toISOString().slice(2, 8)}`;
        const qrCodeImage = await pdfDoc.embedPng(await QRCode.toDataURL(qrData));
        page.drawImage(qrCodeImage, { x: margin, y: y - 110, width: 120, height: 120 });
        
        drawText('SELLO DIGITAL DEL CFDI', sealX, sealY, boldFont);
        sealY -= 12;
        sealY = drawTextBlock('...FAKE_SELLO_CFDI...', sealX, sealY, sealWidth, font, 7);
        sealY -= 10;
        drawText('SELLO DIGITAL DEL SAT', sealX, sealY, boldFont);
        sealY -= 12;
        sealY = drawTextBlock('...FAKE_SELLO_SAT...', sealX, sealY, sealWidth, font, 7);
        sealY -= 10;
        drawText('CADENA ORIGINAL DEL COMPLEMENTO DE CERTIFICACIÓN DIGITAL DEL SAT', sealX, sealY, boldFont, 8);
        sealY -= 12;
        sealY = drawTextBlock(`||1.1|${invoice.uuid}|${invoice.stampDate?.toISOString()}...||`, sealX, sealY, sealWidth, font, 7);
    } else {
        drawText("BORRADOR - SIN VALIDEZ FISCAL", margin, sealY, boldFont, 14, rgb(0.8, 0.2, 0.2));
    }
    
    // --- Footer ---
    page.drawText('ESTE DOCUMENTO ES UNA REPRESENTACIÓN IMPRESA DE UN CFDI', {
        x: width / 2,
        y: margin / 2,
        font: boldFont,
        size: 8,
        color: darkGray,
    });

    return await pdfDoc.save();
}


export const generateInvoiceXml = async (invoiceId: number, userId: string) => {
    try {
        const data = await getInvoiceForDownload(invoiceId, userId);
        if (!data) {
            return { success: false, message: "No se encontró la factura." };
        }
        const xml = await _generateXmlString(data, userId);
        return { success: true, xml };
    } catch (error) {
        console.error("Error generating XML:", error);
        const message = error instanceof Error ? error.message : "Error desconocido al generar el XML.";
        return { success: false, message: `Error al generar XML: ${message}` };
    }
};

export const generateInvoicePdf = async (invoiceId: number, userId: string) => {
    try {
        const data = await getInvoiceForDownload(invoiceId, userId);
        if (!data) {
            return { success: false, message: "No se encontró la factura." };
        }
        const pdfBytes = await _generatePdfBuffer(data);
        return { success: true, pdf: Buffer.from(pdfBytes).toString('base64') };
    } catch (error) {
        console.error("Error generating PDF:", error);
        const message = error instanceof Error ? error.message : "Error desconocido al generar el PDF.";
        return { success: false, message: `Error al generar PDF: ${message}` };
    }
};

export const cancelInvoice = async (
    invoiceId: number,
    userId: string,
    cancellationReason: string = '02' // 02 = Comprobantes emitidos con errores con relación
) => {
    const ratelimit = getRateLimiter();
    const { success: rateLimitSuccess } = await ratelimit.limit(userId);
    if (!rateLimitSuccess) {
        return { success: false, message: "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde." };
    }

    // Verificar permisos
    const permissionCheck = await checkUserPermission(userId, 'canCancelInvoices');
    if (!permissionCheck.allowed) {
        return { success: false, message: permissionCheck.message || "No tienes permisos para cancelar facturas." };
    }

    if (!db) {
        return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
    }

    try {
        if (!userId) {
            return { success: false, message: "Usuario no autenticado." };
        }

        // Obtener la factura
        const [invoice] = await db
            .select()
            .from(invoices)
            .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));

        if (!invoice) {
            return { success: false, message: "Factura no encontrada." };
        }

        if (invoice.status === 'canceled') {
            return { success: false, message: "La factura ya está cancelada." };
        }

        if (invoice.status === 'draft') {
            return { success: false, message: "No se puede cancelar una factura en borrador. Elimínela directamente." };
        }

        if (!invoice.uuid) {
            return { success: false, message: "La factura no tiene UUID. Solo se pueden cancelar facturas timbradas." };
        }

        // TODO: Implementar llamada al PAC para cancelación ante el SAT
        // La cancelación ante el SAT requiere:
        // 1. UUID de la factura
        // 2. Motivo de cancelación (01, 02, 03, 04)
        // 3. UUID de sustitución si el motivo es 01
        // 4. Certificado CSD para firmar la solicitud

        // Por ahora, solo actualizamos el estado local
        // En producción, esto debe conectarse al servicio de cancelación del PAC

        await db.update(invoices).set({
            status: 'canceled',
            updatedAt: new Date()
        }).where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));

        revalidatePath("/dashboard/invoices");
        revalidatePath("/dashboard/invoices/canceled");

        return {
            success: true,
            message: "Factura marcada como cancelada. Nota: La cancelación ante el SAT debe realizarse manualmente.",
            data: {
                invoiceId,
                uuid: invoice.uuid,
                cancellationReason
            }
        };
    } catch (error) {
        console.error("Database Error (cancelInvoice):", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido al cancelar la factura.";
        return { success: false, message: errorMessage };
    }
};

export const deleteInvoice = async (invoiceId: number, userId: string) => {
    const ratelimit = getRateLimiter();
    const { success: rateLimitSuccess } = await ratelimit.limit(userId);
    if (!rateLimitSuccess) {
        return { success: false, message: "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde." };
    }

    // Verificar permisos
    const permissionCheck = await checkUserPermission(userId, 'canEditInvoices');
    if (!permissionCheck.allowed) {
        return { success: false, message: permissionCheck.message || "No tienes permisos para eliminar facturas." };
    }

    if (!db) {
        return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
    }

    try {
        // Obtener la factura primero
        const [invoice] = await db
            .select()
            .from(invoices)
            .where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));

        if (!invoice) {
            return { success: false, message: "Factura no encontrada." };
        }

        // Solo se pueden eliminar borradores
        if (invoice.status !== 'draft') {
            return { success: false, message: "Solo se pueden eliminar facturas en borrador. Las facturas timbradas deben cancelarse." };
        }

        // Eliminar la factura (los items se eliminan en cascada)
        await db.delete(invoices).where(and(eq(invoices.id, invoiceId), eq(invoices.userId, userId)));

        revalidatePath("/dashboard/invoices");

        return { success: true, message: "Factura eliminada exitosamente." };
    } catch (error) {
        console.error("Database Error (deleteInvoice):", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido al eliminar la factura.";
        return { success: false, message: errorMessage };
    }
};
