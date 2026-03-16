import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { TicketPriority } from "@prisma/client";

export class CreateTicketDto {
  @IsString()
  @MaxLength(120)
  title!: string;

  @IsString()
  @MaxLength(5000)
  description!: string;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @IsOptional()
  @IsString()
  categoryId?: string;
}
