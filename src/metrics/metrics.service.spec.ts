import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  const prismaMock = {
    ticket: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
  });

  it('returns aggregated ticket counters', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-03-08T10:00:00.000Z'));

    prismaMock.ticket.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2);

    const result = await service.overview();

    expect(prismaMock.ticket.count).toHaveBeenCalledTimes(9);
    expect(result).toEqual({
      generatedAt: '2026-03-08T10:00:00.000Z',
      tickets: {
        total: 12,
        byStatus: {
          OPEN: 4,
          IN_PROGRESS: 3,
          WAITING_USER: 2,
          CLOSED: 2,
          CANCELLED: 1,
        },
        unassigned: 5,
        createdLast7Days: 6,
        closedLast7Days: 2,
      },
    });

    jest.useRealTimers();
  });
});
