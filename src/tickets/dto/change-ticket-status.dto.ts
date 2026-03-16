import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChangeTicketStatusDto {
  @IsIn(['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'CLOSED', 'CANCELLED'])
  toStatus!: 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'CLOSED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
