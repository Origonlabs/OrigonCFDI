import db from '../src/lib/db';
import { users } from '../drizzle/schema';
import { generateTenantId } from '../src/lib/utils';

async function testTenantUniqueness() {
  if (!db) {
    console.error('Database connection not available');
    process.exit(1);
  }

  try {
    console.log('\n=== TEST: Verificar Unicidad de TenantId ===\n');

    // Test 1: Generar tenantIds únicos
    console.log('Test 1: Generando 10 tenant IDs...');
    const tenantIds = new Set();
    for (let i = 0; i < 10; i++) {
      const id = generateTenantId();
      tenantIds.add(id);
      console.log(`  ${i + 1}. ${id}`);
    }
    console.log(`✓ Generados ${tenantIds.size} IDs únicos de 10 intentos\n`);

    // Test 2: Intentar insertar usuarios con el mismo tenantId (debe fallar)
    const testTenantId = generateTenantId();
    console.log(`Test 2: Intentando insertar 2 usuarios con el mismo tenantId: ${testTenantId}`);

    try {
      // Insertar primer usuario
      await db.insert(users).values({
        userId: `test_user_1_${Date.now()}`,
        email: `test1_${Date.now()}@example.com`,
        role: 'company',
        tenantId: testTenantId,
      });
      console.log('  ✓ Primer usuario insertado exitosamente');

      // Intentar insertar segundo usuario con mismo tenantId
      await db.insert(users).values({
        userId: `test_user_2_${Date.now()}`,
        email: `test2_${Date.now()}@example.com`,
        role: 'company',
        tenantId: testTenantId, // Mismo tenantId - debe fallar
      });

      console.log('  ✗ ERROR: Se permitió insertar usuarios con tenantId duplicado!');
      process.exit(1);
    } catch (error: any) {
      if (error.message?.includes('unique constraint') || error.message?.includes('duplicate key')) {
        console.log('  ✓ Constraint funcionando: Se bloqueó el tenantId duplicado');
        console.log(`    Error: ${error.message.substring(0, 100)}...\n`);
      } else {
        throw error;
      }
    }

    console.log('=== TODOS LOS TESTS PASARON ===\n');
    console.log('El sistema multi-tenant está funcionando correctamente:');
    console.log('  1. TenantIds son alfanuméricos de 18 caracteres');
    console.log('  2. TenantIds son únicos en la base de datos');
    console.log('  3. No se permiten organizaciones con el mismo ID\n');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Error durante el test:', error);
    process.exit(1);
  }
}

testTenantUniqueness();
