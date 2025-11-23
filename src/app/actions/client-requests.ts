'use server';

import db from '@/lib/db';
import { clientRequests, users, clients, companies } from '../../../drizzle/schema';
import { eq, and } from 'drizzle-orm';
import { verifyUserRequest } from '@/lib/auth-server';
import crypto from 'crypto';

/**
 * Genera un token único de 64 caracteres para el link
 */
function generateRequestToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Crea una solicitud de datos de cliente y retorna el link único
 */
export async function createClientRequest(
  userId: string,
  clientEmail: string | null,
  idToken: string
): Promise<{ success: boolean; token?: string; link?: string; message?: string }> {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    await verifyUserRequest(userId, idToken);

    // Obtener tenantId del usuario
    const [user] = await db
      .select({ tenantId: users.tenantId })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Obtener dominio personalizado de la empresa si existe
    const [company] = await db
      .select({ customDomain: companies.customDomain })
      .from(companies)
      .where(eq(companies.userId, userId))
      .limit(1);

    // Generar token único
    const token = generateRequestToken();

    // Expiración en 7 días
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Crear solicitud
    await db.insert(clientRequests).values({
      userId,
      tenantId: user.tenantId,
      token,
      clientEmail,
      expiresAt,
      status: 'pending',
    });

    // Generar link público usando dominio personalizado si está configurado
    const defaultUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const baseUrl = company?.customDomain || defaultUrl;
    const link = `${baseUrl}/client-form/${token}`;

    return {
      success: true,
      token,
      link,
      message: "Solicitud creada exitosamente. Comparte el link con tu cliente.",
    };
  } catch (error) {
    console.error("Database Error (createClientRequest):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al crear solicitud: ${errorMessage}` };
  }
}

/**
 * Obtiene una solicitud por token (para el formulario público)
 */
export async function getClientRequestByToken(
  token: string
): Promise<{ success: boolean; request?: any; message?: string }> {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    const [request] = await db
      .select()
      .from(clientRequests)
      .where(eq(clientRequests.token, token))
      .limit(1);

    if (!request) {
      return { success: false, message: "Solicitud no encontrada." };
    }

    // Verificar si expiró
    if (new Date() > new Date(request.expiresAt)) {
      return { success: false, message: "Esta solicitud ha expirado." };
    }

    // Verificar si ya fue completada
    if (request.status === 'completed') {
      return { success: false, message: "Esta solicitud ya fue completada." };
    }

    return { success: true, request };
  } catch (error) {
    console.error("Database Error (getClientRequestByToken):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener solicitud: ${errorMessage}` };
  }
}

/**
 * El cliente envía sus datos a través del formulario público
 */
export async function submitClientData(
  token: string,
  clientData: any
): Promise<{ success: boolean; message?: string }> {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    // Verificar que la solicitud existe y está activa
    const requestResult = await getClientRequestByToken(token);
    if (!requestResult.success) {
      return { success: false, message: requestResult.message };
    }

    // Actualizar solicitud con los datos del cliente
    await db
      .update(clientRequests)
      .set({
        clientData: JSON.stringify(clientData),
        status: 'completed',
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(clientRequests.token, token));

    return {
      success: true,
      message: "¡Datos enviados exitosamente! El vendedor recibirá tu información.",
    };
  } catch (error) {
    console.error("Database Error (submitClientData):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al enviar datos: ${errorMessage}` };
  }
}

/**
 * Obtiene todas las solicitudes pendientes del usuario/organización
 */
export async function getPendingClientRequests(
  userId: string,
  idToken: string
): Promise<{ success: boolean; requests?: any[]; message?: string }> {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    await verifyUserRequest(userId, idToken);

    // Obtener tenantId del usuario
    const [user] = await db
      .select({ tenantId: users.tenantId, role: users.role })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      return { success: false, message: "Usuario no encontrado." };
    }

    let requests;

    if (user.role === 'admin') {
      // Admin ve todas las solicitudes
      requests = await db
        .select()
        .from(clientRequests)
        .orderBy(clientRequests.createdAt);
    } else if (user.tenantId) {
      // Users de la organización ven solo las de su tenant
      requests = await db
        .select()
        .from(clientRequests)
        .where(eq(clientRequests.tenantId, user.tenantId))
        .orderBy(clientRequests.createdAt);
    } else {
      // Usuario sin organización
      requests = await db
        .select()
        .from(clientRequests)
        .where(eq(clientRequests.userId, userId))
        .orderBy(clientRequests.createdAt);
    }

    return {
      success: true,
      requests: requests.map(r => ({
        ...r,
        clientData: r.clientData ? JSON.parse(r.clientData) : null,
        createdAt: r.createdAt.toISOString(),
        expiresAt: r.expiresAt.toISOString(),
        completedAt: r.completedAt?.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Database Error (getPendingClientRequests):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener solicitudes: ${errorMessage}` };
  }
}

/**
 * Convierte una solicitud completada en un cliente real
 */
export async function approveClientRequest(
  requestId: number,
  userId: string,
  idToken: string
): Promise<{ success: boolean; clientId?: number; message?: string }> {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    await verifyUserRequest(userId, idToken);

    // Obtener la solicitud
    const [request] = await db
      .select()
      .from(clientRequests)
      .where(eq(clientRequests.id, requestId))
      .limit(1);

    if (!request) {
      return { success: false, message: "Solicitud no encontrada." };
    }

    if (request.status !== 'completed') {
      return { success: false, message: "La solicitud aún no ha sido completada por el cliente." };
    }

    if (!request.clientData) {
      return { success: false, message: "No hay datos del cliente." };
    }

    const clientData = JSON.parse(request.clientData);

    // Crear el cliente en la base de datos
    const [newClient] = await db.insert(clients).values({
      userId,
      name: clientData.name,
      rfc: clientData.rfc,
      email: clientData.email,
      zip: clientData.zip,
      taxRegime: clientData.taxRegime,
      phone: clientData.phone || null,
      country: clientData.country || null,
      state: clientData.state || null,
      municipality: clientData.municipality || null,
      city: clientData.city || null,
      neighborhood: clientData.neighborhood || null,
      street: clientData.street || null,
      exteriorNumber: clientData.exteriorNumber || null,
      interiorNumber: clientData.interiorNumber || null,
      usoCfdi: clientData.usoCfdi || null,
      paymentMethod: clientData.paymentMethod || null,
      paymentForm: clientData.paymentForm || null,
      reference: clientData.reference || null,
    }).returning({ id: clients.id });

    // Marcar la solicitud como procesada (puedes agregar un campo adicional si lo deseas)
    await db
      .update(clientRequests)
      .set({ updatedAt: new Date() })
      .where(eq(clientRequests.id, requestId));

    return {
      success: true,
      clientId: newClient.id,
      message: "Cliente creado exitosamente.",
    };
  } catch (error) {
    console.error("Database Error (approveClientRequest):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al aprobar solicitud: ${errorMessage}` };
  }
}
