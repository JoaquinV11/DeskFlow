import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { EventVisibility } from "@prisma/client";

export class CreateMessageEventDto {
  @IsEnum(EventVisibility)
  visibility!: EventVisibility; // PUBLIC o INTERNAL

  @IsString()
  @MaxLength(5000)
  message!: string;
}
