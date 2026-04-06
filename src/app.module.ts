import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { TicketsModule } from './tickets/tickets.module';
import { MetricsModule } from './metrics/metrics.module';
import { UsersModule } from './users/users.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    TicketsModule,
    MetricsModule,
    UsersModule,
    JobsModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
