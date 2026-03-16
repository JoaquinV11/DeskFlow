import {
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

  async findAll(currentUser: CurrentUser) {
    const where = currentUser.role === 'USER' ? { creatorId: currentUser.userId } : {};

    return this.prisma.ticket.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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
  }

  async findOne(ticketId: string, currentUser: CurrentUser) {
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
          select: { events: true, attachments: true },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }

    // USER solo puede ver sus tickets
    if (currentUser.role === 'USER' && ticket.creatorId !== currentUser.userId) {
      throw new ForbiddenException('No tenés permisos para ver este ticket');
    }

    return ticket;
  }
}
