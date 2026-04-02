import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { SystemService } from './system.service';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UpdateSystemInfoDto } from './dto/update-system-info.dto';
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Get system information' })
  @ApiResponse({
    status: 200,
    description: 'System information retrieved successfully',
    schema: {
      example: {
        id: 'system',
        comissionRate: 5.5,
        term: 'Terms and conditions...',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    },
  })
  async getSystem() {
    return this.systemService.getSystem();
  }

  @Patch()
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update system information' })
  @ApiResponse({
    status: 200,
    description: 'System information updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async updateSystem(@Body() updateSystemInfoDto: UpdateSystemInfoDto) {
    return this.systemService.updateSystem(updateSystemInfoDto);
  }

  @Get('banks')
  @PublicAPI()
  async getBanks() {
    return this.systemService.getBanks();
  }

  @Post('banks')
  @Roles('admin')
  async createBank(@Body() createSystemDto: CreateSystemDto) {
    return this.systemService.create(createSystemDto);
  }

  @Patch('banks/:id')
  @Roles('admin')
  async updateBank(
    @Param('id') id: string,
    @Body() updateSystemDto: UpdateSystemDto,
  ) {
    return this.systemService.updateBank(id, updateSystemDto);
  }

  @Delete('banks/:id')
  @Roles('admin')
  async deleteBank(@Param('id') id: string) {
    return this.systemService.deleteBank(id);
  }
}
