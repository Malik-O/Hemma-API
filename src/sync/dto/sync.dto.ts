import { IsNumber, IsObject, IsString, IsArray } from 'class-validator';

export class SyncUploadDto {
  @IsObject()
  trackerState!: Record<string, unknown>;

  @IsArray()
  customHabits!: unknown[];

  @IsNumber()
  currentDay!: number;

  @IsString()
  theme!: string;
}
