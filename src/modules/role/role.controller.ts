import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionDto } from './dto/assign-permission.dto';
import { UpdateRolePermissionDto } from './dto/update-role-permission.dto';

@Controller('roles')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  findAll() {
    return this.roleService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Post()
  create(@Body() createRoleDto: CreateRoleDto) {
    return this.roleService.create(createRoleDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.roleService.update(id, dto);
  }

  @Post(':id/permissions')
  assignPermission(@Param('id') id: string, @Body() dto: AssignPermissionDto) {
    return this.roleService.assignPermission(id, dto);
  }

  @Put(':id/permissions/:permissionId')
  updatePermissionMethods(@Param('id') id: string, @Param('permissionId') permissionId: string, @Body() dto: UpdateRolePermissionDto) {
    return this.roleService.updatePermissionMethods(id, permissionId, dto);
  }

  @Delete(':id/permissions/:permissionId')
  removePermission(@Param('id') id: string, @Param('permissionId') permissionId: string) {
    return this.roleService.removePermission(id, permissionId);
  }
}
