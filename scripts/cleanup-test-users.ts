import db from '../src/lib/db';
import { users } from '../drizzle/schema';
import { like } from 'drizzle-orm';

async function cleanupTestUsers() {
  if (!db) {
    console.error('Database connection not available');
    process.exit(1);
  }

  try {
    console.log('Eliminando usuarios de prueba...');

    const result = await db
      .delete(users)
      .where(like(users.userId, 'test_user_%'));

    console.log('✓ Usuarios de prueba eliminados exitosamente');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

cleanupTestUsers();
