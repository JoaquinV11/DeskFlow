import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateTicketDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsString()
  categoryId?: string;
}
