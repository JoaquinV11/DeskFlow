import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prismaMock = {
    user: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('returns assignable users ordered by role and name', async () => {
    prismaMock.user.findMany.mockResolvedValueOnce([
      { id: 'agt_1', name: 'Ana', email: 'ana@demo.com', role: 'AGENT' },
      { id: 'adm_1', name: 'Zoe', email: 'zoe@demo.com', role: 'ADMIN' },
    ]);

    const result = await service.findAssignable();

    expect(prismaMock.user.findMany).toHaveBeenCalledWith({
      where: {
        role: {
          in: ['AGENT', 'ADMIN'],
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    });
    expect(result).toHaveLength(2);
    expect(result[0].role).toBe('AGENT');
    expect(result[1].role).toBe('ADMIN');
  });
});
