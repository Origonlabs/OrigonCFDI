"use server";

import db from "@/lib/db";
import { invoices, invoiceItems, clients, payments } from "../../../drizzle/schema";
import { eq, and, between, desc, sql, gte, lte } from "drizzle-orm";
import { verifyUserRequest } from "@/lib/auth-server";

interface DateRange {
  startDate: Date;
  endDate: Date;
}

/**
 * Reporte de ingresos por mes
 */
export const getIncomeByMonthReport = async (
  userId: string,
  idToken: string,
  year: number
) => {
  if (!db) {
    return { success: false, message: "Error de configuración de base de datos." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31, 23, 59, 59);

    const data = await db
      .select({
        month: sql<number>`EXTRACT(MONTH FROM ${invoices.createdAt})`,
        totalIncome: sql<number>`SUM(CAST(${invoices.total} AS NUMERIC))`,
        totalIva: sql<number>`SUM(CAST(${invoices.iva} AS NUMERIC))`,
        invoiceCount: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, verifiedUserId),
          eq(invoices.status, 'stamped'),
          eq(invoices.tipoComprobante, 'I'),
          between(invoices.createdAt, startDate, endDate)
        )
      )
      .groupBy(sql`EXTRACT(MONTH FROM ${invoices.createdAt})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${invoices.createdAt})`);

    // Formatear datos con nombres de meses
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    const formattedData = data.map(row => ({
      month: monthNames[row.month - 1],
      monthNumber: row.month,
      totalIncome: Number(row.totalIncome),
      totalIva: Number(row.totalIva),
      invoiceCount: Number(row.invoiceCount),
      subtotal: Number(row.totalIncome) - Number(row.totalIva),
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error("Error in getIncomeByMonthReport:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, message };
  }
};

/**
 * Reporte de ingresos por cliente
 */
export const getIncomeByClientReport = async (
  userId: string,
  idToken: string,
  dateRange?: DateRange
) => {
  if (!db) {
    return { success: false, message: "Error de configuración de base de datos." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    let whereConditions = and(
      eq(invoices.userId, verifiedUserId),
      eq(invoices.status, 'stamped'),
      eq(invoices.tipoComprobante, 'I')
    );

    if (dateRange) {
      whereConditions = and(
        whereConditions,
        between(invoices.createdAt, dateRange.startDate, dateRange.endDate)
      );
    }

    const data = await db
      .select({
        clientId: clients.id,
        clientName: clients.name,
        clientRfc: clients.rfc,
        totalIncome: sql<number>`SUM(CAST(${invoices.total} AS NUMERIC))`,
        totalIva: sql<number>`SUM(CAST(${invoices.iva} AS NUMERIC))`,
        invoiceCount: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(whereConditions)
      .groupBy(clients.id, clients.name, clients.rfc)
      .orderBy(desc(sql<number>`SUM(CAST(${invoices.total} AS NUMERIC))`));

    const formattedData = data.map(row => ({
      clientId: row.clientId,
      clientName: row.clientName || 'Cliente no encontrado',
      clientRfc: row.clientRfc || 'N/A',
      totalIncome: Number(row.totalIncome),
      totalIva: Number(row.totalIva),
      invoiceCount: Number(row.invoiceCount),
      subtotal: Number(row.totalIncome) - Number(row.totalIva),
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error("Error in getIncomeByClientReport:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, message };
  }
};

/**
 * Reporte de top 10 clientes
 */
export const getTop10ClientsReport = async (
  userId: string,
  idToken: string,
  year?: number
) => {
  if (!db) {
    return { success: false, message: "Error de configuración de base de datos." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    let whereConditions = and(
      eq(invoices.userId, verifiedUserId),
      eq(invoices.status, 'stamped'),
      eq(invoices.tipoComprobante, 'I')
    );

    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year, 11, 31, 23, 59, 59);
      whereConditions = and(
        whereConditions,
        between(invoices.createdAt, startDate, endDate)
      );
    }

    const data = await db
      .select({
        clientId: clients.id,
        clientName: clients.name,
        clientRfc: clients.rfc,
        totalBilled: sql<number>`SUM(CAST(${invoices.total} AS NUMERIC))`,
        invoiceCount: sql<number>`COUNT(*)`,
        avgTicket: sql<number>`AVG(CAST(${invoices.total} AS NUMERIC))`,
      })
      .from(invoices)
      .leftJoin(clients, eq(invoices.clientId, clients.id))
      .where(whereConditions)
      .groupBy(clients.id, clients.name, clients.rfc)
      .orderBy(desc(sql<number>`SUM(CAST(${invoices.total} AS NUMERIC))`))
      .limit(10);

    const formattedData = data.map((row, index) => ({
      rank: index + 1,
      clientId: row.clientId,
      clientName: row.clientName || 'Cliente no encontrado',
      clientRfc: row.clientRfc || 'N/A',
      totalBilled: Number(row.totalBilled),
      invoiceCount: Number(row.invoiceCount),
      avgTicket: Number(row.avgTicket),
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error("Error in getTop10ClientsReport:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, message };
  }
};

/**
 * Reporte de ventas por producto/servicio
 */
export const getIncomeByProductReport = async (
  userId: string,
  idToken: string,
  dateRange?: DateRange
) => {
  if (!db) {
    return { success: false, message: "Error de configuración de base de datos." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    let whereConditions = and(
      eq(invoices.userId, verifiedUserId),
      eq(invoices.status, 'stamped'),
      eq(invoices.tipoComprobante, 'I')
    );

    if (dateRange) {
      whereConditions = and(
        whereConditions,
        between(invoices.createdAt, dateRange.startDate, dateRange.endDate)
      );
    }

    const data = await db
      .select({
        description: invoiceItems.description,
        satKey: invoiceItems.satKey,
        totalQuantity: sql<number>`SUM(${invoiceItems.quantity})`,
        totalAmount: sql<number>`SUM(CAST(${invoiceItems.amount} AS NUMERIC))`,
        avgPrice: sql<number>`AVG(CAST(${invoiceItems.unitPrice} AS NUMERIC))`,
        itemCount: sql<number>`COUNT(*)`,
      })
      .from(invoiceItems)
      .leftJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
      .where(whereConditions)
      .groupBy(invoiceItems.description, invoiceItems.satKey)
      .orderBy(desc(sql<number>`SUM(CAST(${invoiceItems.amount} AS NUMERIC))`));

    const formattedData = data.map(row => ({
      description: row.description,
      satKey: row.satKey,
      totalQuantity: Number(row.totalQuantity),
      totalAmount: Number(row.totalAmount),
      avgPrice: Number(row.avgPrice),
      itemCount: Number(row.itemCount),
    }));

    return { success: true, data: formattedData };
  } catch (error) {
    console.error("Error in getIncomeByProductReport:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, message };
  }
};

/**
 * Reporte de impuestos (IVA, ISR, Retenciones)
 */
export const getTaxReport = async (
  userId: string,
  idToken: string,
  dateRange: DateRange
) => {
  if (!db) {
    return { success: false, message: "Error de configuración de base de datos." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    // IVA cobrado (facturas de ingreso)
    const [ivaCollected] = await db
      .select({
        totalIva: sql<number>`SUM(CAST(${invoices.iva} AS NUMERIC))`,
        invoiceCount: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, verifiedUserId),
          eq(invoices.status, 'stamped'),
          eq(invoices.tipoComprobante, 'I'),
          between(invoices.createdAt, dateRange.startDate, dateRange.endDate)
        )
      );

    // IVA acreditable (notas de crédito)
    const [ivaCreditable] = await db
      .select({
        totalIva: sql<number>`SUM(CAST(${invoices.iva} AS NUMERIC))`,
        invoiceCount: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, verifiedUserId),
          eq(invoices.status, 'stamped'),
          eq(invoices.tipoComprobante, 'E'),
          between(invoices.createdAt, dateRange.startDate, dateRange.endDate)
        )
      );

    // Retenciones
    const [retentions] = await db
      .select({
        totalRetentions: sql<number>`SUM(CAST(${invoices.retenciones} AS NUMERIC))`,
        invoiceCount: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, verifiedUserId),
          eq(invoices.status, 'stamped'),
          between(invoices.createdAt, dateRange.startDate, dateRange.endDate)
        )
      );

    const ivaCollectedValue = Number(ivaCollected?.totalIva || 0);
    const ivaCreditableValue = Number(ivaCreditable?.totalIva || 0);
    const netIva = ivaCollectedValue - ivaCreditableValue;

    return {
      success: true,
      data: {
        ivaCollected: ivaCollectedValue,
        ivaCollectedCount: Number(ivaCollected?.invoiceCount || 0),
        ivaCreditable: ivaCreditableValue,
        ivaCreditableCount: Number(ivaCreditable?.invoiceCount || 0),
        netIva: netIva,
        retentions: Number(retentions?.totalRetentions || 0),
        retentionsCount: Number(retentions?.invoiceCount || 0),
      }
    };
  } catch (error) {
    console.error("Error in getTaxReport:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, message };
  }
};

/**
 * Reporte general de facturación (dashboard)
 */
export const getDashboardReport = async (
  userId: string,
  idToken: string
) => {
  if (!db) {
    return { success: false, message: "Error de configuración de base de datos." };
  }

  try {
    const verifiedUserId = await verifyUserRequest(userId, idToken);

    // Facturas totales timbradas
    const [totalInvoices] = await db
      .select({
        total: sql<number>`SUM(CAST(${invoices.total} AS NUMERIC))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, verifiedUserId),
          eq(invoices.status, 'stamped'),
          eq(invoices.tipoComprobante, 'I')
        )
      );

    // Facturas del mes actual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [monthInvoices] = await db
      .select({
        total: sql<number>`SUM(CAST(${invoices.total} AS NUMERIC))`,
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, verifiedUserId),
          eq(invoices.status, 'stamped'),
          eq(invoices.tipoComprobante, 'I'),
          between(invoices.createdAt, startOfMonth, endOfMonth)
        )
      );

    // Total de clientes
    const [totalClients] = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${clients.id})`,
      })
      .from(clients)
      .where(eq(clients.userId, verifiedUserId));

    // Facturas en borrador
    const [draftInvoices] = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(invoices)
      .where(
        and(
          eq(invoices.userId, verifiedUserId),
          eq(invoices.status, 'draft')
        )
      );

    return {
      success: true,
      data: {
        totalInvoiced: Number(totalInvoices?.total || 0),
        totalInvoicesCount: Number(totalInvoices?.count || 0),
        monthInvoiced: Number(monthInvoices?.total || 0),
        monthInvoicesCount: Number(monthInvoices?.count || 0),
        totalClients: Number(totalClients?.count || 0),
        draftInvoices: Number(draftInvoices?.count || 0),
      }
    };
  } catch (error) {
    console.error("Error in getDashboardReport:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, message };
  }
};

/**
 * Exporta datos a formato CSV
 */
export const exportToCSV = (data: any[], filename: string): string => {
  if (!data || data.length === 0) {
    return '';
  }

  // Obtener encabezados
  const headers = Object.keys(data[0]);

  // Crear filas
  const rows = data.map(row =>
    headers.map(header => {
      const value = row[header];
      // Escapar comillas y envolver en comillas si contiene comas
      if (typeof value === 'string' && value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    }).join(',')
  );

  // Combinar encabezados y filas
  const csv = [headers.join(','), ...rows].join('\n');

  return csv;
};

/**
 * Genera un CSV y devuelve como base64 para descarga
 */
export const generateCSVReport = async (
  reportType: 'income-by-month' | 'income-by-client' | 'top-clients' | 'income-by-product' | 'tax',
  userId: string,
  idToken: string,
  params?: any
): Promise<{ success: boolean; data?: string; message?: string }> => {
  try {
    let reportData: any;

    switch (reportType) {
      case 'income-by-month':
        reportData = await getIncomeByMonthReport(userId, idToken, params?.year || new Date().getFullYear());
        break;
      case 'income-by-client':
        reportData = await getIncomeByClientReport(userId, idToken, params?.dateRange);
        break;
      case 'top-clients':
        reportData = await getTop10ClientsReport(userId, idToken, params?.year);
        break;
      case 'income-by-product':
        reportData = await getIncomeByProductReport(userId, idToken, params?.dateRange);
        break;
      case 'tax':
        reportData = await getTaxReport(userId, idToken, params?.dateRange);
        break;
      default:
        return { success: false, message: 'Tipo de reporte no válido' };
    }

    if (!reportData.success) {
      return { success: false, message: reportData.message };
    }

    const csv = exportToCSV(reportData.data, reportType);
    const base64 = Buffer.from(csv, 'utf-8').toString('base64');

    return { success: true, data: base64 };
  } catch (error) {
    console.error("Error generating CSV:", error);
    const message = error instanceof Error ? error.message : "Error desconocido";
    return { success: false, message };
  }
};
