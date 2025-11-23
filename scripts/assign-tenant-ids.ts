import db from '../src/lib/db';
import { users } from '../drizzle/schema';
import { eq, isNull } from 'drizzle-orm';
import { generateTenantId } from '../src/lib/utils';

async function assignTenantIds() {
  if (!db) {
    console.error('Database connection not available');
    process.exit(1);
  }

  try {
    console.log('Buscando usuarios con rol "company" sin tenantId...');

    // Obtener todos los usuarios company sin tenantId
    const companyUsers = await db
      .select()
      .from(users)
      .where(eq(users.role, 'company'));

    console.log(`Encontrados ${companyUsers.length} usuarios company.`);

    for (const user of companyUsers) {
      if (!user.tenantId) {
        // Generar un tenantId único
        let tenantId = generateTenantId();
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          const [existingTenant] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.tenantId, tenantId))
            .limit(1);

          if (!existingTenant) {
            break; // tenantId es único
          }

          tenantId = generateTenantId();
          attempts++;
        }

        if (attempts >= maxAttempts) {
          console.error(`No se pudo generar un tenantId único para ${user.email}`);
          continue;
        }

        // Actualizar el usuario con el nuevo tenantId
        await db
          .update(users)
          .set({ tenantId, updatedAt: new Date() })
          .where(eq(users.userId, user.userId));

        console.log(`✓ Asignado tenantId ${tenantId} a ${user.email}`);
      } else {
        console.log(`  ${user.email} ya tiene tenantId: ${user.tenantId}`);
      }
    }

    console.log('\n✓ Migración completada exitosamente!');
    process.exit(0);
  } catch (error) {
    console.error('Error durante la migración:', error);
    process.exit(1);
  }
}

assignTenantIds();
