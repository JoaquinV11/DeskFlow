import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsWorker } from './jobs.worker';

@Module({
  imports: [PrismaModule],
  controllers: [JobsController],
  providers: [JobsService, JobsWorker],
})
export class JobsModule {}
