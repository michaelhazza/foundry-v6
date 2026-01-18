import { db, closeDatabase } from './index';
import { organizations, users, projects, processingConfigs } from './schema';
import bcrypt from 'bcrypt';

async function seed() {
  console.log('Seeding database...');

  const passwordHash = await bcrypt.hash('admin123', 12);

  // Create platform organization
  const [platformOrg] = await db
    .insert(organizations)
    .values({ name: 'Foundry Platform' })
    .returning();

  console.log('Created platform organization:', platformOrg.name);

  // Create platform admin
  await db.insert(users).values({
    organizationId: platformOrg.id,
    email: 'admin@foundry.io',
    passwordHash,
    name: 'Platform Admin',
    role: 'platform_admin',
  });

  console.log('Created platform admin: admin@foundry.io');

  // Create demo organization
  const [demoOrg] = await db
    .insert(organizations)
    .values({ name: 'Demo Company' })
    .returning();

  console.log('Created demo organization:', demoOrg.name);

  // Create demo users
  await db.insert(users).values([
    {
      organizationId: demoOrg.id,
      email: 'admin@demo.com',
      passwordHash,
      name: 'Demo Admin',
      role: 'admin',
    },
    {
      organizationId: demoOrg.id,
      email: 'user@demo.com',
      passwordHash,
      name: 'Demo User',
      role: 'member',
    },
  ]);

  console.log('Created demo users: admin@demo.com, user@demo.com');

  // Create sample project
  const [project] = await db
    .insert(projects)
    .values({
      organizationId: demoOrg.id,
      name: 'Sample Support Data',
      description: 'Demo project for testing data processing workflows',
    })
    .returning();

  console.log('Created sample project:', project.name);

  // Create default processing config
  await db.insert(processingConfigs).values({
    projectId: project.id,
  });

  console.log('Created default processing config');

  console.log('\n✅ Seed complete!');
  console.log('\nTest credentials:');
  console.log('  Platform Admin: admin@foundry.io / admin123');
  console.log('  Demo Admin:     admin@demo.com / admin123');
  console.log('  Demo User:      user@demo.com / admin123');
}

seed()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await closeDatabase();
  });
