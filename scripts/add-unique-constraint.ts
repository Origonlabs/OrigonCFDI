import db from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function addUniqueConstraint() {
  if (!db) {
    console.error('Database connection not available');
    process.exit(1);
  }

  try {
    console.log('Agregando constraint UNIQUE a tenant_id...');

    // PostgreSQL permite múltiples valores NULL en una columna UNIQUE
    // Los valores NULL no se consideran duplicados
    await db.execute(sql`
      ALTER TABLE users
      ADD CONSTRAINT users_tenant_id_unique
      UNIQUE (tenant_id);
    `);

    console.log('✓ Constraint agregado exitosamente!');
    console.log('  - tenantId ahora debe ser único (excluyendo valores NULL)');

    process.exit(0);
  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('✓ El constraint ya existe en la base de datos.');
      process.exit(0);
    } else {
      console.error('Error al agregar constraint:', error);
      process.exit(1);
    }
  }
}

addUniqueConstraint();
