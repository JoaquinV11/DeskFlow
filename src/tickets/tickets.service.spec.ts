import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { TicketsService } from './tickets.service';

describe('TicketsService', () => {
  let service: TicketsService;

  const prismaMock = {
    ticket: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    ticketEvent: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  it('rejects invalid status transitions', async () => {
    prismaMock.ticket.findUnique.mockResolvedValueOnce({
      id: 'tic_1',
      status: 'OPEN',
      creatorId: 'usr_1',
      assignedToId: 'agt_1',
      closedAt: null,
      cancelledAt: null,
    });

    await expect(
      service.changeStatus(
        'tic_1',
        { toStatus: 'WAITING_USER' },
        { userId: 'agt_1', email: 'agent@demo.com', role: 'AGENT' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
  });

  it('requires assignee before moving ticket to IN_PROGRESS', async () => {
    prismaMock.ticket.findUnique.mockResolvedValueOnce({
      id: 'tic_2',
      status: 'OPEN',
      creatorId: 'usr_1',
      assignedToId: null,
      closedAt: null,
      cancelledAt: null,
    });

    await expect(
      service.changeStatus(
        'tic_2',
        { toStatus: 'IN_PROGRESS' },
        { userId: 'adm_1', email: 'admin@demo.com', role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
  });

  it('forbids end users from creating internal notes', async () => {
    prismaMock.ticket.findUnique.mockResolvedValueOnce({
      id: 'tic_3',
      creatorId: 'usr_1',
      status: 'OPEN',
    });

    await expect(
      service.createMessageEvent(
        'tic_3',
        { message: 'nota interna', visibility: 'INTERNAL' },
        { userId: 'usr_1', email: 'user@demo.com', role: 'USER' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prismaMock.ticketEvent.create).not.toHaveBeenCalled();
  });

  it('blocks new messages in terminal ticket states', async () => {
    prismaMock.ticket.findUnique.mockResolvedValueOnce({
      id: 'tic_4',
      creatorId: 'usr_1',
      status: 'CLOSED',
    });

    await expect(
      service.createMessageEvent(
        'tic_4',
        { message: 'seguimiento', visibility: 'PUBLIC' },
        { userId: 'agt_1', email: 'agent@demo.com', role: 'AGENT' },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prismaMock.ticketEvent.create).not.toHaveBeenCalled();
  });

  it('rejects assigning tickets to USER role', async () => {
    prismaMock.ticket.findUnique.mockResolvedValueOnce({
      id: 'tic_5',
      status: 'OPEN',
      assignedToId: null,
      creatorId: 'usr_1',
    });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      id: 'usr_2',
      email: 'user2@demo.com',
      name: 'User 2',
      role: 'USER',
    });

    await expect(
      service.assign(
        'tic_5',
        { assigneeId: 'usr_2' },
        { userId: 'adm_1', email: 'admin@demo.com', role: 'ADMIN' },
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prismaMock.ticket.update).not.toHaveBeenCalled();
  });
});
