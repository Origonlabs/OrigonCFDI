import db from '../src/lib/db';
import { users } from '../drizzle/schema';

async function checkUsers() {
  if (!db) {
    console.error('Database connection not available');
    process.exit(1);
  }

  try {
    const allUsers = await db.select().from(users);

    console.log('\n=== USUARIOS EN LA BASE DE DATOS ===\n');
    console.log(`Total: ${allUsers.length} usuarios\n`);

    allUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   - Role: ${user.role}`);
      console.log(`   - TenantId: ${user.tenantId || 'NULL'}`);
      console.log(`   - OwnerId: ${user.ownerId || 'NULL'}`);
      console.log('');
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
