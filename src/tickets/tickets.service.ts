import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';

type CurrentUser = {
  userId: string;
  email: string;
  role: 'USER' | 'AGENT' | 'ADMIN';
};

const ALLOWED_STATUS_TRANSITIONS: Record<
  'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'CLOSED' | 'CANCELLED',
  Array<'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'CLOSED' | 'CANCELLED'>
> = {
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['WAITING_USER', 'CLOSED', 'CANCELLED'],
  WAITING_USER: ['IN_PROGRESS', 'CLOSED', 'CANCELLED'],
  CLOSED: [],
  CANCELLED: [],
};

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateTicketDto, currentUser: CurrentUser) {
    const ticket = await this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        priority: dto.priority ?? 'MEDIUM',
        creatorId: currentUser.userId,
        categoryId: dto.categoryId ?? null,
        events: {
          create: {
            type: 'CREATED',
            visibility: 'PUBLIC',
            actorId: currentUser.userId,
            message: 'Ticket creado',
          },
        },
      },
      include: {
        events: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return ticket;
  }

  async findAll(
    currentUser: CurrentUser,
    query: {
      status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'CLOSED' | 'CANCELLED';
      priority?: 'LOW' | 'MEDIUM' | 'HIGH';
      assignedToId?: string;
      q?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    // USER solo ve sus tickets
    if (currentUser.role === 'USER') {
      where.creatorId = currentUser.userId;
    }

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.assignedToId) where.assignedToId = query.assignedToId;

    if (query.q && query.q.trim()) {
      where.OR = [
        { title: { contains: query.q.trim(), mode: 'insensitive' } },
        { description: { contains: query.q.trim(), mode: 'insensitive' } },
      ];
    }

    const isEndUser = currentUser.role === 'USER';

    const [items, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          creator: {
            select: { id: true, email: true, name: true, role: true },
          },
          assignedTo: {
            select: { id: true, email: true, name: true, role: true },
          },
          _count: {
            select: {
              events: isEndUser ? { where: { visibility: 'PUBLIC' } } : true,
            },
          },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async findOne(ticketId: string, currentUser: CurrentUser) {
    const isEndUser = currentUser.role === 'USER';

    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        creator: {
          select: { id: true, email: true, name: true, role: true },
        },
        assignedTo: {
          select: { id: true, email: true, name: true, role: true },
        },
        category: true,
        ticketTags: {
          include: { tag: true },
        },
        _count: {
          select: {
            attachments: true,
            events: isEndUser ? { where: { visibility: 'PUBLIC' } } : true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    // USER solo puede ver sus tickets
    if (
      currentUser.role === 'USER' &&
      ticket.creatorId !== currentUser.userId
    ) {
      throw new ForbiddenException('No tenés permisos para ver este ticket');
    }

    return ticket;
  }

  async findEvents(
    ticketId: string,
    currentUser: CurrentUser,
    query?: { page?: number; limit?: number },
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true, creatorId: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    if (
      currentUser.role === 'USER' &&
      ticket.creatorId !== currentUser.userId
    ) {
      throw new ForbiddenException('No tenés permisos para ver este ticket');
    }

    const page = query?.page ?? 1;
    const limit = query?.limit ?? 20;
    const skip = (page - 1) * limit;

    const where =
      currentUser.role === 'USER'
        ? { ticketId, visibility: 'PUBLIC' as const }
        : { ticketId };

    const [items, total] = await Promise.all([
      this.prisma.ticketEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'asc' },
        include: {
          actor: {
            select: { id: true, email: true, name: true, role: true },
          },
          tag: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.ticketEvent.count({ where }),
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async createMessageEvent(
    ticketId: string,
    dto: { message: string; visibility: 'PUBLIC' | 'INTERNAL' },
    currentUser: CurrentUser,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        creatorId: true,
        status: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    // USER solo puede operar sobre sus tickets
    if (
      currentUser.role === 'USER' &&
      ticket.creatorId !== currentUser.userId
    ) {
      throw new ForbiddenException(
        'No tenés permisos para comentar en este ticket',
      );
    }

    // USER no puede crear notas internas
    if (currentUser.role === 'USER' && dto.visibility === 'INTERNAL') {
      throw new ForbiddenException(
        'Un usuario final no puede crear notas internas',
      );
    }

    // Tickets cerrados/cancelados no aceptan mensajes
    if (ticket.status === 'CLOSED' || ticket.status === 'CANCELLED') {
      throw new ForbiddenException(
        'El ticket no acepta mensajes en su estado actual',
      );
    }

    const event = await this.prisma.ticketEvent.create({
      data: {
        ticketId: ticket.id,
        actorId: currentUser.userId,
        type: 'MESSAGE',
        visibility: dto.visibility,
        message: dto.message,
      },
      include: {
        actor: {
          select: { id: true, email: true, name: true, role: true },
        },
        tag: {
          select: { id: true, name: true },
        },
      },
    });

    return event;
  }

  async assign(
    ticketId: string,
    dto: { assigneeId: string },
    currentUser: CurrentUser,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        status: true,
        assignedToId: true,
        creatorId: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    if (ticket.status === 'CLOSED' || ticket.status === 'CANCELLED') {
      throw new ForbiddenException(
        'No se puede asignar un ticket en estado final',
      );
    }

    if (ticket.assignedToId === dto.assigneeId) {
      throw new BadRequestException('El ticket ya está asignado a ese usuario');
    }

    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.assigneeId },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!assignee) {
      throw new NotFoundException('Usuario asignado no encontrado');
    }

    if (assignee.role === 'USER') {
      throw new BadRequestException('Solo se puede asignar a AGENT o ADMIN');
    }

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assignedToId: assignee.id,
        events: {
          create: {
            type: 'ASSIGNED',
            visibility: 'INTERNAL',
            actorId: currentUser.userId,
            fromAssigneeId: ticket.assignedToId,
            toAssigneeId: assignee.id,
            message: `Asignado a ${assignee.name} (${assignee.email})`,
          },
        },
      },
      include: {
        creator: {
          select: { id: true, email: true, name: true, role: true },
        },
        assignedTo: {
          select: { id: true, email: true, name: true, role: true },
        },
        _count: {
          select: { events: true },
        },
      },
    });

    return updatedTicket;
  }

  async changeStatus(
    ticketId: string,
    dto: {
      toStatus:
        | 'OPEN'
        | 'IN_PROGRESS'
        | 'WAITING_USER'
        | 'CLOSED'
        | 'CANCELLED';
      reason?: string;
    },
    currentUser: CurrentUser,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: {
        id: true,
        status: true,
        creatorId: true,
        assignedToId: true,
        closedAt: true,
        cancelledAt: true,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    if (ticket.status === dto.toStatus) {
      throw new BadRequestException('El ticket ya está en ese estado');
    }

    const allowed =
      ALLOWED_STATUS_TRANSITIONS[
        ticket.status as keyof typeof ALLOWED_STATUS_TRANSITIONS
      ] ?? [];
    if (!allowed.includes(dto.toStatus)) {
      throw new BadRequestException(
        `Transición inválida: ${ticket.status} -> ${dto.toStatus}`,
      );
    }

    // (Opcional, pero útil): para pasar a IN_PROGRESS pedimos asignación
    if (dto.toStatus === 'IN_PROGRESS' && !ticket.assignedToId) {
      throw new BadRequestException(
        'No se puede pasar a IN_PROGRESS sin un responsable asignado',
      );
    }

    const now = new Date();

    const updatedTicket = await this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: dto.toStatus,
        closedAt: dto.toStatus === 'CLOSED' ? now : null,
        cancelledAt: dto.toStatus === 'CANCELLED' ? now : null,
        events: {
          create: {
            type: 'STATUS_CHANGED',
            visibility: 'PUBLIC',
            actorId: currentUser.userId,
            fromStatus: ticket.status,
            toStatus: dto.toStatus,
            message:
              dto.reason ??
              `Estado cambiado de ${ticket.status} a ${dto.toStatus}`,
          },
        },
      },
      include: {
        creator: {
          select: { id: true, email: true, name: true, role: true },
        },
        assignedTo: {
          select: { id: true, email: true, name: true, role: true },
        },
        _count: {
          select: { events: true, attachments: true },
        },
      },
    });

    return updatedTicket;
  }
}
