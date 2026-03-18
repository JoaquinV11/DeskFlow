import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketMessageEventDto } from './dto/create-ticket-message-event.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { ChangeTicketStatusDto } from './dto/change-ticket-status.dto';
import { Query } from '@nestjs/common';
import { ListTicketsQueryDto } from './dto/list-tickets-query.dto';
import { ListTicketEventsQueryDto } from './dto/list-ticket-events-query.dto';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Tickets')
@ApiBearerAuth('access-token')
@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles('USER', 'ADMIN')
  @ApiOperation({ summary: 'Crear ticket' })
  create(@Body() dto: CreateTicketDto, @Req() req: any) {
    return this.ticketsService.create(dto, req.user);
  }

  @Get()
  @Roles('USER', 'AGENT', 'ADMIN')
  @ApiOperation({ summary: 'Listar tickets (con filtros y paginación)' })
  findAll(@Req() req: any, @Query() query: ListTicketsQueryDto) {
    return this.ticketsService.findAll(req.user, query);
  }

  @Get(':id/events')
  @Roles('USER', 'AGENT', 'ADMIN')
  @ApiOperation({ summary: 'Listar eventos del ticket (timeline)' })
  findEvents(
    @Param('id') id: string,
    @Req() req: any,
    @Query() query: ListTicketEventsQueryDto,
  ) {
    return this.ticketsService.findEvents(id, req.user, query);
  }

  @Post(':id/events/message')
  @Roles('USER', 'AGENT', 'ADMIN')
  @ApiOperation({ summary: 'Agregar mensaje al ticket (público o interno)' })
  createMessageEvent(
    @Param('id') id: string,
    @Body() dto: CreateTicketMessageEventDto,
    @Req() req: any,
  ) {
    return this.ticketsService.createMessageEvent(id, dto, req.user);
  }

  @Post(':id/assign')
  @Roles('AGENT', 'ADMIN')
  @ApiOperation({ summary: 'Asignar o reasignar ticket' })
  @ApiResponse({ status: 201, description: 'Ticket asignado correctamente' })
  @ApiResponse({
    status: 400,
    description: 'Solicitud inválida (por ejemplo, usuario no asignable)',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({ status: 404, description: 'Ticket o usuario no encontrado' })
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @Req() req: any,
  ) {
    return this.ticketsService.assign(id, dto, req.user);
  }

  @Post(':id/status')
  @Roles('AGENT', 'ADMIN')
  @ApiOperation({ summary: 'Cambiar estado del ticket' })
  @ApiResponse({
    status: 201,
    description: 'Estado del ticket actualizado correctamente',
  })
  @ApiResponse({
    status: 400,
    description: 'Transición inválida o payload inválido',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'Sin permisos' })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeTicketStatusDto,
    @Req() req: any,
  ) {
    return this.ticketsService.changeStatus(id, dto, req.user);
  }

  @Get(':id')
  @Roles('USER', 'AGENT', 'ADMIN')
  @ApiOperation({ summary: 'Obtener detalle de ticket' })
  @ApiResponse({
    status: 200,
    description: 'Detalle de ticket obtenido correctamente',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'Sin permisos para ver este ticket',
  })
  @ApiResponse({ status: 404, description: 'Ticket no encontrado' })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.findOne(id, req.user);
  }
}
