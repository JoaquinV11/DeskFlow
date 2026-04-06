import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { JOBS_QUEUE_NAME, TICKET_SUMMARY_JOB_NAME } from './jobs.constants';
import { JobsService } from './jobs.service';

@Injectable()
export class JobsWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsWorker.name);
  private worker: Worker | null = null;

  constructor(
    private readonly jobsService: JobsService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    if (!this.jobsService.isQueueEnabled()) {
      this.logger.warn(
        'Worker async deshabilitado: faltó REDIS_URL en variables de entorno',
      );
      return;
    }

    const connection = this.jobsService.getRedisConnection();
    if (!connection) {
      return;
    }

    const concurrency = Number(process.env.JOBS_WORKER_CONCURRENCY ?? 2);

    this.worker = new Worker(
      JOBS_QUEUE_NAME,
      async (job) => this.handleJob(job),
      {
        connection,
        concurrency: Number.isFinite(concurrency)
          ? Math.max(1, Math.floor(concurrency))
          : 2,
      },
    );

    this.worker.on('completed', (job) => {
      this.logger.log(`Job completado: ${job.id}`);
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(
        `Job fallido: ${job?.id ?? 'unknown'} - ${error.message}`,
      );
    });
  }

  async onModuleDestroy() {
    if (this.worker) {
      await this.worker.close();
    }
  }

  private async handleJob(job: Job) {
    switch (job.name) {
      case TICKET_SUMMARY_JOB_NAME:
        return this.buildTicketSummary(job.data.ticketId);
      default:
        throw new Error(`Tipo de job no soportado: ${job.name}`);
    }
  }

  private async buildTicketSummary(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        creator: {
          select: { id: true, email: true, name: true, role: true },
        },
        assignedTo: {
          select: { id: true, email: true, name: true, role: true },
        },
        events: {
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            type: true,
            visibility: true,
            createdAt: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new Error('No se puede generar resumen: ticket no encontrado');
    }

    const publicEvents = ticket.events.filter(
      (event) => event.visibility === 'PUBLIC',
    ).length;
    const internalEvents = ticket.events.filter(
      (event) => event.visibility === 'INTERNAL',
    ).length;

    return {
      generatedAt: new Date().toISOString(),
      ticket: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
        updatedAt: ticket.updatedAt,
      },
      owner: ticket.creator,
      assignee: ticket.assignedTo,
      events: {
        total: ticket.events.length,
        public: publicEvents,
        internal: internalEvents,
      },
    };
  }
}
