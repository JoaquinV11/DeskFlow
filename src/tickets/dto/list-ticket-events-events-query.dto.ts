import { IsIn, IsOptional } from 'class-validator';

export class ListTicketEventsQueryDto {
  @IsOptional()
  @IsIn(['PUBLIC', 'INTERNAL'])
  visibility?: 'PUBLIC' | 'INTERNAL';
}
