import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { TicketStatus } from "@prisma/client";

export class ChangeStatusDto {
  @IsEnum(TicketStatus)
  toStatus!: TicketStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}
