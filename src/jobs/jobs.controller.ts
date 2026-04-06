import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateTicketSummaryJobDto } from './dto/create-ticket-summary-job.dto';
import { JobsService } from './jobs.service';

@ApiTags('Jobs')
@ApiBearerAuth('access-token')
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Post('ticket-summary')
  @Roles('AGENT', 'ADMIN')
  @ApiOperation({
    summary:
      'Encolar job async para generar resumen de ticket (Redis + worker + retries)',
  })
  @ApiResponse({ status: 201, description: 'Job encolado correctamente' })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  @ApiResponse({
    status: 503,
    description: 'REDIS_URL no configurado para jobs async',
  })
  enqueueTicketSummary(
    @Body() dto: CreateTicketSummaryJobDto,
    @Req() req: any,
    @Headers('x-idempotency-key') idempotencyKey?: string,
  ) {
    return this.jobsService.enqueueTicketSummary(
      dto.ticketId,
      req.user,
      idempotencyKey,
    );
  }

  @Get(':id')
  @Roles('AGENT', 'ADMIN')
  @ApiOperation({ summary: 'Consultar estado de un job async' })
  @ApiResponse({ status: 200, description: 'Estado del job obtenido' })
  @ApiResponse({ status: 404, description: 'Job no encontrado' })
  getJobStatus(@Param('id') id: string) {
    return this.jobsService.getJobStatus(id);
  }
}
