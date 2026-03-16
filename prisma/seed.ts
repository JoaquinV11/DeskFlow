import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

async function main() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  const password = await bcrypt.hash('demo123', 10);

  const users = [
    {
      email: 'admin@demo.com',
      name: 'Admin Demo',
      role: 'ADMIN',
      passwordHash: password,
    },
    {
      email: 'agent@demo.com',
      name: 'Agent Demo',
      role: 'AGENT',
      passwordHash: password,
    },
    {
      email: 'user@demo.com',
      name: 'User Demo',
      role: 'USER',
      passwordHash: password,
    },
  ] as const;

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
      },
      create: user,
    });
  }

  console.log('✅ Seed completado: admin/agent/user creados (password: demo123)');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
