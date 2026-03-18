import { IsIn, IsString, MaxLength } from 'class-validator';

export class CreateTicketMessageEventDto {
  @IsString()
  @MaxLength(5000)
  message!: string;

  @IsIn(['PUBLIC', 'INTERNAL'])
  visibility!: 'PUBLIC' | 'INTERNAL';
}
