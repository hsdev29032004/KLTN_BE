import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class AssignPermissionDto {
  // Either permissionId or api must be provided. If api provided and permission
  // does not exist, it will be created.
  @IsOptional()
  @IsString()
  permissionId?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  api?: string;

  @IsString()
  @IsNotEmpty()
  methods: string; // comma-separated HTTP methods, eg "GET,POST"
}
