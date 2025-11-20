'use server';

import db from '@/lib/db';
import { invoices, clients } from '../../../drizzle/schema';
import { and, eq, gte, sql, sum } from 'drizzle-orm';
import { startOfMonth, endOfMonth, subDays, format, eachDayOfInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { verifyUserRequest } from '@/lib/auth-server';
import { checkUserPermission } from '@/lib/permissions';

export const getDashboardStats = async (userId: string, idToken: string) => {
    if (!db) {
        return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
    }
    try {
        if (!userId) {
            return { success: false, message: "Usuario no autenticado." };
        }

        // Verificar permisos - todos los usuarios pueden ver su dashboard
        const permissionCheck = await checkUserPermission(userId, 'canViewReports');
        if (!permissionCheck.allowed) {
            return { success: false, message: permissionCheck.message || "No tienes permisos para ver el dashboard." };
        }

        const verifiedUserId = await verifyUserRequest(userId, idToken);
        const now = new Date();
        const startOfCurrentMonth = startOfMonth(now);
        const endOfCurrentMonth = endOfMonth(now);
        const ninetyDaysAgo = subDays(now, 89);

        // --- Stat Cards Data ---
        const [totalFacturadoResult, facturasTimbradasResult, clientesActivosResult, saldoPendienteResult] = await Promise.all([
            // Total Facturado (Mes)
            db.select({ total: sum(sql<number>`CAST(${invoices.total} AS numeric)`) }).from(invoices).where(and(
                eq(invoices.userId, verifiedUserId),
                eq(invoices.status, 'stamped'),
                gte(invoices.createdAt, startOfCurrentMonth),
                sql`${invoices.createdAt} <= ${endOfCurrentMonth}`
            )),
            // Facturas Timbradas (Mes)
            db.select({ count: sql<number>`count(${invoices.id})` }).from(invoices).where(and(
                eq(invoices.userId, verifiedUserId),
                eq(invoices.status, 'stamped'),
                gte(invoices.createdAt, startOfCurrentMonth),
                sql`${invoices.createdAt} <= ${endOfCurrentMonth}`
            )),
            // Clientes Activos
            db.select({ count: sql<number>`count(${clients.id})` }).from(clients).where(eq(clients.userId, verifiedUserId)),
            // Saldo Pendiente (PPD)
            db.select({ total: sum(sql<number>`CAST(${invoices.total} AS numeric)`) }).from(invoices).where(and(
                eq(invoices.userId, verifiedUserId),
                eq(invoices.metodoPago, 'PPD'),
                eq(invoices.status, 'stamped')
            ))
        ]);

        const totalFacturadoMes = totalFacturadoResult[0]?.total ?? 0;
        const facturasTimbradasMes = facturasTimbradasResult[0]?.count ?? 0;
        const clientesActivos = clientesActivosResult[0]?.count ?? 0;
        const saldoPendiente = saldoPendienteResult[0]?.total ?? 0;

        // --- Chart Data ---
        const last90DaysInvoices = await db.select({
            total: invoices.total,
            createdAt: invoices.createdAt,
        }).from(invoices).where(and(
            eq(invoices.userId, verifiedUserId),
            eq(invoices.status, 'stamped'),
            gte(invoices.createdAt, ninetyDaysAgo)
        ));

        const dailyTotals: { [key: string]: number } = {};
        for (const invoice of last90DaysInvoices) {
            const day = format(invoice.createdAt, 'yyyy-MM-dd');
            const total = parseFloat(invoice.total);
            if (!isNaN(total)) {
                dailyTotals[day] = (dailyTotals[day] || 0) + total;
            }
        }

        const dateInterval = eachDayOfInterval({ start: ninetyDaysAgo, end: now });
        const facturacionUltimos90Dias = dateInterval.map(day => {
            const formattedDate = format(day, 'yyyy-MM-dd');
            const chartDate = format(day, 'd MMM', { locale: es });
            return {
                date: chartDate,
                total: dailyTotals[formattedDate] || 0,
            };
        });

        return {
            success: true,
            data: {
                totalFacturadoMes,
                facturasTimbradasMes,
                clientesActivos,
                saldoPendiente,
                facturacionUltimos90Dias
            }
        };

    } catch (error) {
        console.error("Database Error (getDashboardStats):", error);
        const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
        return { success: false, message: `Error al obtener las estadísticas del dashboard: ${errorMessage}` };
    }
};
