import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListTicketsQueryDto {
  @IsOptional()
  @IsIn(['OPEN', 'IN_PROGRESS', 'WAITING_USER', 'CLOSED', 'CANCELLED'])
  status?: 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'CLOSED' | 'CANCELLED';

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;
}
