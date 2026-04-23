import { IsString, IsOptional, IsEnum, IsBoolean } from 'class-validator';

export class UpdateLessonMaterialDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  url?: string;

  @IsOptional()
  @IsEnum(['video', 'pdf', 'img', 'link', 'other'])
  type?: string;

  @IsOptional()
  @IsBoolean()
  isPreview?: boolean;
}
