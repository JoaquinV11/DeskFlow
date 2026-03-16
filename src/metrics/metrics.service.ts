import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);

    const [
      total,
      open,
      inProgress,
      waitingUser,
      closed,
      cancelled,
      unassigned,
      createdLast7Days,
      closedLast7Days,
    ] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.count({ where: { status: 'OPEN' } }),
      this.prisma.ticket.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.ticket.count({ where: { status: 'WAITING_USER' } }),
      this.prisma.ticket.count({ where: { status: 'CLOSED' } }),
      this.prisma.ticket.count({ where: { status: 'CANCELLED' } }),
      this.prisma.ticket.count({ where: { assignedToId: null } }),
      this.prisma.ticket.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.ticket.count({
        where: {
          status: 'CLOSED',
          closedAt: { gte: sevenDaysAgo },
        },
      }),
    ]);

    return {
      generatedAt: now.toISOString(),
      tickets: {
        total,
        byStatus: {
          OPEN: open,
          IN_PROGRESS: inProgress,
          WAITING_USER: waitingUser,
          CLOSED: closed,
          CANCELLED: cancelled,
        },
        unassigned,
        createdLast7Days,
        closedLast7Days,
      },
    };
  }
}
