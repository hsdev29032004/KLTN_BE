import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateRolePermissionDto {
  @IsString()
  @IsNotEmpty()
  methods: string;
}
