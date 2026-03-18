import 'dotenv/config';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

type SeedUser = {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'AGENT' | 'ADMIN';
};

type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'CLOSED' | 'CANCELLED';
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH';
type EventVisibility = 'PUBLIC' | 'INTERNAL';
type EventType = 'CREATED' | 'MESSAGE' | 'ASSIGNED' | 'STATUS_CHANGED';

type TicketEventSeed = {
  actorId: string;
  type: EventType;
  visibility: EventVisibility;
  message?: string | null;
  fromStatus?: TicketStatus | null;
  toStatus?: TicketStatus | null;
  fromAssigneeId?: string | null;
  toAssigneeId?: string | null;
  createdAt: Date;
};

type TicketScenario = {
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  creatorId: string;
  assignedToId?: string | null;
  categoryId?: string | null;
  createdAt: Date;
  closedAt?: Date | null;
  cancelledAt?: Date | null;
  events: TicketEventSeed[];
};

function daysAgo(days: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

function plusMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL no está definida');
  }

  const adapter = new PrismaPg({ connectionString });
  const prisma = new PrismaClient({ adapter });

  console.log('🧹 Limpiando datos demo (tickets, eventos, attachments, categorías, tags)...');

  // Orden seguro para limpiar tablas operativas
  await prisma.ticketEvent.deleteMany();
  await prisma.attachment.deleteMany();
  await prisma.ticketTag.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.category.deleteMany();

  // Usuarios demo (se conservan con upsert)
  const password = await bcrypt.hash('demo123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@demo.com' },
    update: { name: 'Admin Demo', role: 'ADMIN' },
    create: {
      email: 'admin@demo.com',
      name: 'Admin Demo',
      role: 'ADMIN',
      passwordHash: password,
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: 'agent@demo.com' },
    update: { name: 'Agent Demo', role: 'AGENT' },
    create: {
      email: 'agent@demo.com',
      name: 'Agent Demo',
      role: 'AGENT',
      passwordHash: password,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'user@demo.com' },
    update: { name: 'User Demo', role: 'USER' },
    create: {
      email: 'user@demo.com',
      name: 'User Demo',
      role: 'USER',
      passwordHash: password,
    },
  });

  console.log('👥 Usuarios demo listos');

  // Categorías
  const categoryNames = [
    'Accesos',
    'Bug',
    'Infraestructura',
    'Facturación',
    'Integraciones',
  ];

  for (const name of categoryNames) {
    await prisma.category.create({ data: { name } });
  }

  const categories = await prisma.category.findMany();
  const categoryByName = Object.fromEntries(categories.map((c) => [c.name, c]));

  console.log('🗂️ Categorías creadas');

  const users: Record<string, SeedUser> = {
    admin: { id: admin.id, email: admin.email, name: admin.name, role: admin.role as SeedUser['role'] },
    agent: { id: agent.id, email: agent.email, name: agent.name, role: agent.role as SeedUser['role'] },
    user: { id: user.id, email: user.email, name: user.name, role: user.role as SeedUser['role'] },
  };

  const scenarios: TicketScenario[] = [];

  // 1) OPEN - unassigned
  {
    const created = daysAgo(6, 9, 15);
    scenarios.push({
      title: 'No puedo entrar al panel de clientes',
      description: 'Desde esta mañana me rechaza usuario/contraseña aunque estoy seguro de que son correctos.',
      priority: 'HIGH',
      status: 'OPEN',
      creatorId: users.user.id,
      assignedToId: null,
      categoryId: categoryByName['Accesos']?.id ?? null,
      createdAt: created,
      events: [
        {
          actorId: users.user.id,
          type: 'CREATED',
          visibility: 'PUBLIC',
          message: 'Ticket creado',
          createdAt: created,
        },
        {
          actorId: users.user.id,
          type: 'MESSAGE',
          visibility: 'PUBLIC',
          message: 'Probé reiniciar y sigue igual.',
          createdAt: plusMinutes(created, 25),
        },
      ],
    });
  }

  // 2) OPEN - unassigned
  {
    const created = daysAgo(5, 11, 40);
    scenarios.push({
      title: 'Error al descargar reporte mensual',
      description: 'Al hacer clic en exportar Excel aparece un error genérico.',
      priority: 'MEDIUM',
      status: 'OPEN',
      creatorId: users.user.id,
      assignedToId: null,
      categoryId: categoryByName['Bug']?.id ?? null,
      createdAt: created,
      events: [
        {
          actorId: users.user.id,
          type: 'CREATED',
          visibility: 'PUBLIC',
          message: 'Ticket creado',
          createdAt: created,
        },
      ],
    });
  }

  // 3) OPEN - assigned but not started yet
  {
    const created = daysAgo(3, 14, 10);
    scenarios.push({
      title: 'Consulta sobre integración con webhook',
      description: 'Necesito confirmar el formato esperado del payload para la integración.',
      priority: 'LOW',
      status: 'OPEN',
      creatorId: users.user.id,
      assignedToId: users.agent.id,
      categoryId: categoryByName['Integraciones']?.id ?? null,
      createdAt: created,
      events: [
        {
          actorId: users.user.id,
          type: 'CREATED',
          visibility: 'PUBLIC',
          message: 'Ticket creado',
          createdAt: created,
        },
        {
          actorId: users.agent.id,
          type: 'ASSIGNED',
          visibility: 'INTERNAL',
          fromAssigneeId: null,
          toAssigneeId: users.agent.id,
          message: `Asignado a ${users.agent.name} (${users.agent.email})`,
          createdAt: plusMinutes(created, 18),
        },
      ],
    });
  }

  // 4) IN_PROGRESS - assigned
  {
    const created = daysAgo(4, 8, 35);
    const assignedAt = plusMinutes(created, 20);
    const inProgressAt = plusMinutes(created, 30);
    scenarios.push({
      title: 'Lentitud al abrir listado de facturas',
      description: 'La pantalla tarda más de 20 segundos en cargar.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      creatorId: users.user.id,
      assignedToId: users.agent.id,
      categoryId: categoryByName['Facturación']?.id ?? null,
      createdAt: created,
      events: [
        { actorId: users.user.id, type: 'CREATED', visibility: 'PUBLIC', message: 'Ticket creado', createdAt: created },
        {
          actorId: users.agent.id,
          type: 'ASSIGNED',
          visibility: 'INTERNAL',
          fromAssigneeId: null,
          toAssigneeId: users.agent.id,
          message: `Asignado a ${users.agent.name} (${users.agent.email})`,
          createdAt: assignedAt,
        },
        {
          actorId: users.agent.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          message: 'Tomado por soporte para análisis',
          createdAt: inProgressAt,
        },
        {
          actorId: users.agent.id,
          type: 'MESSAGE',
          visibility: 'INTERNAL',
          message: 'Revisar query de listados y posibles índices faltantes.',
          createdAt: plusMinutes(inProgressAt, 10),
        },
      ],
    });
  }

  // 5) IN_PROGRESS - assigned to admin
  {
    const created = daysAgo(2, 9, 5);
    scenarios.push({
      title: 'Error 500 al guardar configuración SMTP',
      description: 'Al guardar la configuración de correo aparece error 500.',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      creatorId: users.user.id,
      assignedToId: users.admin.id,
      categoryId: categoryByName['Infraestructura']?.id ?? null,
      createdAt: created,
      events: [
        { actorId: users.user.id, type: 'CREATED', visibility: 'PUBLIC', message: 'Ticket creado', createdAt: created },
        {
          actorId: users.admin.id,
          type: 'ASSIGNED',
          visibility: 'INTERNAL',
          fromAssigneeId: null,
          toAssigneeId: users.admin.id,
          message: `Asignado a ${users.admin.name} (${users.admin.email})`,
          createdAt: plusMinutes(created, 12),
        },
        {
          actorId: users.admin.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          message: 'En revisión de configuración y logs',
          createdAt: plusMinutes(created, 16),
        },
      ],
    });
  }

  // 6) WAITING_USER
  {
    const created = daysAgo(3, 10, 20);
    scenarios.push({
      title: 'No llegan emails de recuperación',
      description: 'Solicité recuperación de contraseña y no recibo el correo.',
      priority: 'MEDIUM',
      status: 'WAITING_USER',
      creatorId: users.user.id,
      assignedToId: users.agent.id,
      categoryId: categoryByName['Accesos']?.id ?? null,
      createdAt: created,
      events: [
        { actorId: users.user.id, type: 'CREATED', visibility: 'PUBLIC', message: 'Ticket creado', createdAt: created },
        {
          actorId: users.agent.id,
          type: 'ASSIGNED',
          visibility: 'INTERNAL',
          fromAssigneeId: null,
          toAssigneeId: users.agent.id,
          message: `Asignado a ${users.agent.name} (${users.agent.email})`,
          createdAt: plusMinutes(created, 15),
        },
        {
          actorId: users.agent.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          message: 'Tomado por soporte',
          createdAt: plusMinutes(created, 20),
        },
        {
          actorId: users.agent.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'IN_PROGRESS',
          toStatus: 'WAITING_USER',
          message: 'Necesitamos confirmar si revisaste spam/correo no deseado',
          createdAt: plusMinutes(created, 35),
        },
      ],
    });
  }

  // 7) WAITING_USER
  {
    const created = daysAgo(1, 13, 30);
    scenarios.push({
      title: 'Webhook responde 401',
      description: 'La integración con nuestro sistema externo recibe 401 desde ayer.',
      priority: 'HIGH',
      status: 'WAITING_USER',
      creatorId: users.user.id,
      assignedToId: users.agent.id,
      categoryId: categoryByName['Integraciones']?.id ?? null,
      createdAt: created,
      events: [
        { actorId: users.user.id, type: 'CREATED', visibility: 'PUBLIC', message: 'Ticket creado', createdAt: created },
        {
          actorId: users.user.id,
          type: 'MESSAGE',
          visibility: 'PUBLIC',
          message: 'Puedo compartir logs si hace falta.',
          createdAt: plusMinutes(created, 8),
        },
        {
          actorId: users.agent.id,
          type: 'ASSIGNED',
          visibility: 'INTERNAL',
          fromAssigneeId: null,
          toAssigneeId: users.agent.id,
          message: `Asignado a ${users.agent.name} (${users.agent.email})`,
          createdAt: plusMinutes(created, 12),
        },
        {
          actorId: users.agent.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          message: 'Revisión inicial de credenciales',
          createdAt: plusMinutes(created, 20),
        },
        {
          actorId: users.agent.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'IN_PROGRESS',
          toStatus: 'WAITING_USER',
          message: 'Necesitamos header Authorization completo para reproducir',
          createdAt: plusMinutes(created, 34),
        },
      ],
    });
  }

  // 8) CLOSED (within 7 days)
  {
    const created = daysAgo(2, 8, 0);
    const closedAt = plusMinutes(created, 180);
    scenarios.push({
      title: 'Permisos incorrectos al crear usuarios',
      description: 'Los nuevos usuarios quedan con permisos limitados por defecto.',
      priority: 'HIGH',
      status: 'CLOSED',
      creatorId: users.user.id,
      assignedToId: users.admin.id,
      categoryId: categoryByName['Accesos']?.id ?? null,
      createdAt: created,
      closedAt,
      events: [
        { actorId: users.user.id, type: 'CREATED', visibility: 'PUBLIC', message: 'Ticket creado', createdAt: created },
        {
          actorId: users.admin.id,
          type: 'ASSIGNED',
          visibility: 'INTERNAL',
          fromAssigneeId: null,
          toAssigneeId: users.admin.id,
          message: `Asignado a ${users.admin.name} (${users.admin.email})`,
          createdAt: plusMinutes(created, 15),
        },
        {
          actorId: users.admin.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          message: 'Revisando roles y defaults',
          createdAt: plusMinutes(created, 20),
        },
        {
          actorId: users.admin.id,
          type: 'MESSAGE',
          visibility: 'INTERNAL',
          message: 'Bug en seed de permisos por defecto.',
          createdAt: plusMinutes(created, 35),
        },
        {
          actorId: users.admin.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'IN_PROGRESS',
          toStatus: 'CLOSED',
          message: 'Se corrigió la asignación inicial de permisos',
          createdAt: closedAt,
        },
      ],
    });
  }

  // 9) CLOSED (within 7 days)
  {
    const created = daysAgo(6, 15, 10);
    const closedAt = plusMinutes(created, 90);
    scenarios.push({
      title: 'No se actualiza avatar del perfil',
      description: 'Subo imagen pero sigue mostrando la anterior.',
      priority: 'LOW',
      status: 'CLOSED',
      creatorId: users.user.id,
      assignedToId: users.agent.id,
      categoryId: categoryByName['Bug']?.id ?? null,
      createdAt: created,
      closedAt,
      events: [
        { actorId: users.user.id, type: 'CREATED', visibility: 'PUBLIC', message: 'Ticket creado', createdAt: created },
        {
          actorId: users.agent.id,
          type: 'ASSIGNED',
          visibility: 'INTERNAL',
          fromAssigneeId: null,
          toAssigneeId: users.agent.id,
          message: `Asignado a ${users.agent.name} (${users.agent.email})`,
          createdAt: plusMinutes(created, 10),
        },
        {
          actorId: users.agent.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          message: 'Reproduciendo problema de cache',
          createdAt: plusMinutes(created, 15),
        },
        {
          actorId: users.agent.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'IN_PROGRESS',
          toStatus: 'CLOSED',
          message: 'Se invalidó cache de imágenes y quedó resuelto',
          createdAt: closedAt,
        },
      ],
    });
  }

  // 10) CLOSED (older than 7 days)
  {
    const created = daysAgo(10, 9, 50);
    const closedAt = plusMinutes(created, 240);
    scenarios.push({
      title: 'Doble cobro en pantalla de pagos',
      description: 'Un usuario reportó que visualmente se duplicó un cobro.',
      priority: 'HIGH',
      status: 'CLOSED',
      creatorId: users.user.id,
      assignedToId: users.admin.id,
      categoryId: categoryByName['Facturación']?.id ?? null,
      createdAt: created,
      closedAt,
      events: [
        { actorId: users.user.id, type: 'CREATED', visibility: 'PUBLIC', message: 'Ticket creado', createdAt: created },
        {
          actorId: users.admin.id,
          type: 'ASSIGNED',
          visibility: 'INTERNAL',
          fromAssigneeId: null,
          toAssigneeId: users.admin.id,
          message: `Asignado a ${users.admin.name} (${users.admin.email})`,
          createdAt: plusMinutes(created, 18),
        },
        {
          actorId: users.admin.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          message: 'Auditoría de transacciones en curso',
          createdAt: plusMinutes(created, 25),
        },
        {
          actorId: users.admin.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'IN_PROGRESS',
          toStatus: 'WAITING_USER',
          message: 'Solicitamos capturas de pantalla para confirmar',
          createdAt: plusMinutes(created, 60),
        },
        {
          actorId: users.user.id,
          type: 'MESSAGE',
          visibility: 'PUBLIC',
          message: 'Adjunto capturas. Parece un problema visual, no de transacción.',
          createdAt: plusMinutes(created, 95),
        },
        {
          actorId: users.admin.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'WAITING_USER',
          toStatus: 'IN_PROGRESS',
          message: 'Reanudamos análisis con evidencia',
          createdAt: plusMinutes(created, 120),
        },
        {
          actorId: users.admin.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'IN_PROGRESS',
          toStatus: 'CLOSED',
          message: 'Corregido render duplicado en UI',
          createdAt: closedAt,
        },
      ],
    });
  }

  // 11) CLOSED (within 7 days)
  {
    const created = daysAgo(1, 8, 45);
    const closedAt = plusMinutes(created, 75);
    scenarios.push({
      title: 'Timeout al consultar API externa',
      description: 'Intermitencias en integración con proveedor externo.',
      priority: 'MEDIUM',
      status: 'CLOSED',
      creatorId: users.user.id,
      assignedToId: users.agent.id,
      categoryId: categoryByName['Integraciones']?.id ?? null,
      createdAt: created,
      closedAt,
      events: [
        { actorId: users.user.id, type: 'CREATED', visibility: 'PUBLIC', message: 'Ticket creado', createdAt: created },
        {
          actorId: users.agent.id,
          type: 'ASSIGNED',
          visibility: 'INTERNAL',
          fromAssigneeId: null,
          toAssigneeId: users.agent.id,
          message: `Asignado a ${users.agent.name} (${users.agent.email})`,
          createdAt: plusMinutes(created, 10),
        },
        {
          actorId: users.agent.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'OPEN',
          toStatus: 'IN_PROGRESS',
          message: 'Validando timeouts y reintentos',
          createdAt: plusMinutes(created, 15),
        },
        {
          actorId: users.agent.id,
          type: 'MESSAGE',
          visibility: 'INTERNAL',
          message: 'Aumentar timeout y revisar circuit breaker.',
          createdAt: plusMinutes(created, 25),
        },
        {
          actorId: users.agent.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'IN_PROGRESS',
          toStatus: 'CLOSED',
          message: 'Se ajustó timeout y quedó estable',
          createdAt: closedAt,
        },
      ],
    });
  }

  // 12) CANCELLED
  {
    const created = daysAgo(4, 16, 20);
    const cancelledAt = plusMinutes(created, 40);
    scenarios.push({
      title: 'Solicitud duplicada de reseteo de clave',
      description: 'Este ticket fue creado por error, ya se resolvió por otro canal.',
      priority: 'LOW',
      status: 'CANCELLED',
      creatorId: users.user.id,
      assignedToId: null,
      categoryId: categoryByName['Accesos']?.id ?? null,
      createdAt: created,
      cancelledAt,
      events: [
        { actorId: users.user.id, type: 'CREATED', visibility: 'PUBLIC', message: 'Ticket creado', createdAt: created },
        {
          actorId: users.user.id,
          type: 'MESSAGE',
          visibility: 'PUBLIC',
          message: 'Ignorar, ya lo resolví con otro ticket.',
          createdAt: plusMinutes(created, 15),
        },
        {
          actorId: users.admin.id,
          type: 'STATUS_CHANGED',
          visibility: 'PUBLIC',
          fromStatus: 'OPEN',
          toStatus: 'CANCELLED',
          message: 'Cancelado por duplicado',
          createdAt: cancelledAt,
        },
      ],
    });
  }

  console.log(`🎟️ Creando ${scenarios.length} tickets demo...`);

  for (const s of scenarios) {
    const ticket = await prisma.ticket.create({
      data: {
        title: s.title,
        description: s.description,
        priority: s.priority,
        status: s.status,
        creatorId: s.creatorId,
        assignedToId: s.assignedToId ?? null,
        categoryId: s.categoryId ?? null,
        createdAt: s.createdAt,
        closedAt: s.closedAt ?? null,
        cancelledAt: s.cancelledAt ?? null,
      },
    });

    if (s.events.length > 0) {
      await prisma.ticketEvent.createMany({
        data: s.events.map((e) => ({
          ticketId: ticket.id,
          actorId: e.actorId,
          type: e.type,
          visibility: e.visibility,
          message: e.message ?? null,
          fromStatus: e.fromStatus ?? null,
          toStatus: e.toStatus ?? null,
          fromAssigneeId: e.fromAssigneeId ?? null,
          toAssigneeId: e.toAssigneeId ?? null,
          createdAt: e.createdAt,
        })),
      });
    }
  }

  const [ticketCount, eventCount, categoriesCount] = await Promise.all([
    prisma.ticket.count(),
    prisma.ticketEvent.count(),
    prisma.category.count(),
  ]);

  console.log('✅ Seed demo completado');
  console.log(`   - Usuarios demo: 3 (password: demo123)`);
  console.log(`   - Categorías: ${categoriesCount}`);
  console.log(`   - Tickets: ${ticketCount}`);
  console.log(`   - Eventos: ${eventCount}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('❌ Error en seed:', e);
  process.exit(1);
});
