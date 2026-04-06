import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { createHash, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { JOBS_QUEUE_NAME, TICKET_SUMMARY_JOB_NAME } from './jobs.constants';

type CurrentUser = {
  userId: string;
  email: string;
  role: 'USER' | 'AGENT' | 'ADMIN';
};

@Injectable()
export class JobsService {
  private readonly redisUrl = process.env.REDIS_URL?.trim();
  private readonly redisConnection: Redis | null;
  private readonly queue: Queue | null;

  constructor(private readonly prisma: PrismaService) {
    if (!this.redisUrl) {
      this.redisConnection = null;
      this.queue = null;
      return;
    }

    this.redisConnection = new Redis(this.redisUrl, {
      maxRetriesPerRequest: null,
    });

    this.queue = new Queue(JOBS_QUEUE_NAME, {
      connection: this.redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: 200,
        removeOnFail: 200,
      },
    });
  }

  isQueueEnabled() {
    return Boolean(this.queue);
  }

  getRedisConnection() {
    return this.redisConnection;
  }

  private ensureQueueEnabled() {
    if (!this.queue) {
      throw new ServiceUnavailableException(
        'Cola de jobs deshabilitada: configurá REDIS_URL para habilitar procesamiento async',
      );
    }
  }

  private idempotentJobId(
    ticketId: string,
    currentUser: CurrentUser,
    idempotencyKey?: string,
  ) {
    if (!idempotencyKey?.trim()) {
      return `ticket-summary:${ticketId}:${randomUUID()}`;
    }

    const digest = createHash('sha256')
      .update(`${currentUser.userId}:${ticketId}:${idempotencyKey.trim()}`)
      .digest('hex')
      .slice(0, 20);

    return `ticket-summary:${ticketId}:${digest}`;
  }

  private async ensureTicketExists(ticketId: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      select: { id: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket no encontrado');
    }
  }

  async enqueueTicketSummary(
    ticketId: string,
    currentUser: CurrentUser,
    idempotencyKey?: string,
  ) {
    this.ensureQueueEnabled();
    await this.ensureTicketExists(ticketId);

    const queue = this.queue!;
    const jobId = this.idempotentJobId(ticketId, currentUser, idempotencyKey);

    try {
      const job = await queue.add(
        TICKET_SUMMARY_JOB_NAME,
        {
          ticketId,
          requestedByUserId: currentUser.userId,
          requestedByEmail: currentUser.email,
          requestedAt: new Date().toISOString(),
          idempotencyKey: idempotencyKey?.trim() || null,
        },
        {
          jobId,
        },
      );

      return this.toStatusDto(job.id!, true);
    } catch {
      const existing = await queue.getJob(jobId);
      if (!existing) {
        throw new ServiceUnavailableException(
          'No se pudo encolar el trabajo en este momento',
        );
      }
      return this.toStatusDto(existing.id!, false);
    }
  }

  async getJobStatus(jobId: string) {
    this.ensureQueueEnabled();
    const queue = this.queue!;

    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job no encontrado');
    }

    return this.toStatusDto(job.id!, false);
  }

  private async toStatusDto(jobId: string, created: boolean) {
    const queue = this.queue!;
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException('Job no encontrado');
    }

    const state = await job.getState();

    return {
      id: job.id,
      name: job.name,
      state,
      attemptsMade: job.attemptsMade,
      created,
      data: job.data,
      result: job.returnvalue ?? null,
      failedReason: job.failedReason ?? null,
      processedOn: job.processedOn ?? null,
      finishedOn: job.finishedOn ?? null,
    };
  }
}
