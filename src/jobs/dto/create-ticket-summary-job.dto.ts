import { IsString, MinLength } from 'class-validator';

export class CreateTicketSummaryJobDto {
  @IsString()
  @MinLength(1)
  ticketId!: string;
}
