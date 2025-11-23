import db from '../src/lib/db';
import { sql } from 'drizzle-orm';

async function showTenantStorage() {
  if (!db) {
    console.error('Database connection not available');
    process.exit(1);
  }

  try {
    console.log('\n=== UBICACIÓN DEL TENANT ID ===\n');

    // Mostrar estructura de la tabla
    const tableInfo = await db.execute(sql`
      SELECT
        column_name,
        data_type,
        character_maximum_length,
        is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('tenant_id', 'user_id', 'email', 'role', 'owner_id')
      ORDER BY ordinal_position;
    `);

    console.log('TABLA: users');
    console.log('COLUMNAS RELEVANTES:\n');
    tableInfo.rows.forEach((col: any) => {
      const nullable = col.is_nullable === 'YES' ? '(puede ser NULL)' : '(obligatorio)';
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`  ${col.column_name.padEnd(20)} ${col.data_type}${length} ${nullable}`);
    });

    // Mostrar constraints
    console.log('\n\nCONSTRAINTS:\n');
    const constraints = await db.execute(sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'users'
        AND constraint_name LIKE '%tenant%';
    `);

    constraints.rows.forEach((c: any) => {
      console.log(`  ✓ ${c.constraint_name} (${c.constraint_type})`);
    });

    // Mostrar ejemplo de datos
    console.log('\n\nEJEMPLO DE DATOS ALMACENADOS:\n');
    const examples = await db.execute(sql`
      SELECT
        email,
        role,
        CASE
          WHEN tenant_id IS NULL THEN 'NULL'
          ELSE tenant_id
        END as tenant_id,
        CASE
          WHEN owner_id IS NULL THEN 'NULL'
          ELSE LEFT(owner_id, 20) || '...'
        END as owner_id
      FROM users
      LIMIT 5;
    `);

    console.log('Email                          | Role       | TenantId           | OwnerId');
    console.log('─'.repeat(85));
    examples.rows.forEach((row: any) => {
      const email = row.email.padEnd(30);
      const role = row.role.padEnd(10);
      const tenantId = (row.tenant_id || 'NULL').padEnd(18);
      const ownerId = (row.owner_id || 'NULL');
      console.log(`${email} | ${role} | ${tenantId} | ${ownerId}`);
    });

    console.log('\n\n=== RESUMEN ===\n');
    console.log('El Tenant ID se almacena en:');
    console.log('  🗄️  Base de datos: PostgreSQL (Neon Cloud)');
    console.log('  📊 Tabla: users');
    console.log('  📝 Columna: tenant_id');
    console.log('  🔤 Tipo: VARCHAR(18)');
    console.log('  🔒 Constraint: UNIQUE (no permite duplicados)');
    console.log('  ✅ Permite NULL (para admins sin organización)');
    console.log('\nCuando un usuario con rol "company" se registra,');
    console.log('se genera automáticamente un tenant_id único de 18 caracteres.');
    console.log('');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

showTenantStorage();
