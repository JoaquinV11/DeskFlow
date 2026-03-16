import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
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

@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @Roles('USER', 'ADMIN')
  create(@Body() dto: CreateTicketDto, @Req() req: any) {
    return this.ticketsService.create(dto, req.user);
  }

  @Get()
  @Roles('USER', 'AGENT', 'ADMIN')
  findAll(@Req() req: any, @Query() query: ListTicketsQueryDto) {
    return this.ticketsService.findAll(req.user, query);
  }

  @Get(':id/events')
  @Roles('USER', 'AGENT', 'ADMIN')
  findEvents(
    @Param('id') id: string,
    @Req() req: any,
    @Query() query: ListTicketEventsQueryDto,
  ) {
    return this.ticketsService.findEvents(id, req.user, query);
  }

  @Post(':id/events/message')
  @Roles('USER', 'AGENT', 'ADMIN')
  createMessageEvent(
    @Param('id') id: string,
    @Body() dto: CreateTicketMessageEventDto,
    @Req() req: any,
  ) {
    return this.ticketsService.createMessageEvent(id, dto, req.user);
  }

  @Post(':id/assign')
  @Roles('AGENT', 'ADMIN')
  assign(
    @Param('id') id: string,
    @Body() dto: AssignTicketDto,
    @Req() req: any,
  ) {
    return this.ticketsService.assign(id, dto, req.user);
  }

  @Post(':id/status')
  @Roles('AGENT', 'ADMIN')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: ChangeTicketStatusDto,
    @Req() req: any,
  ) {
    return this.ticketsService.changeStatus(id, dto, req.user);
  }

  @Get(':id')
  @Roles('USER', 'AGENT', 'ADMIN')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.findOne(id, req.user);
  }
}
