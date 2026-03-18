import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { PrismaService } from './prisma/prisma.service';

describe('AppController', () => {
  let appController: AppController;
  const prismaMock = {
    $queryRaw: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [{ provide: PrismaService, useValue: prismaMock }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('health', () => {
    it('should return API heartbeat payload', () => {
      const result = appController.health();

      expect(result.ok).toBe(true);
      expect(result.service).toBe('deskflow-api');
      expect(result.timestamp).toEqual(expect.any(String));
    });
  });

  describe('healthDb', () => {
    it('should verify db connectivity and return status payload', async () => {
      prismaMock.$queryRaw.mockResolvedValueOnce([{ '?column?': 1 }]);

      const result = await appController.healthDb();

      expect(prismaMock.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result.ok).toBe(true);
      expect(result.db).toBe('up');
      expect(result.timestamp).toEqual(expect.any(String));
    });
  });
});
