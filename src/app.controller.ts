import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  health() {
    return {
      ok: true,
      service: 'deskflow-api',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/db')
  async healthDb() {
    await this.prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      db: 'up',
      timestamp: new Date().toISOString(),
    };
  }
}
