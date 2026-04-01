import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SystemService } from './system.service';
import { SkipPermission } from '@/common/decorators/authenticated.decorator';
import { PublicAPI } from '@/common/decorators/public-api.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';
import { UpdateSystemInfoDto } from './dto/update-system-info.dto';

@ApiTags('System - Banks')
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) { }

  @Get()
  @PublicAPI()
  @ApiOperation({ summary: 'Get system information' })
  @ApiResponse({
    status: 200,
    description: 'System information retrieved successfully',
    schema: {
      example: {
        id: 'system',
        timeRefund: 7,
        limitRefund: 3,
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
  @ApiOperation({ summary: 'Get all banks' })
  @ApiResponse({
    status: 200,
    description: 'List of all active banks',
    schema: {
      example: [
        {
          id: 'uuid',
          bankNumber: '1234567890',
          bankName: 'Bank Name',
          recipient: 'Recipient Name',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ],
    },
  })
  async getBanks() {
    return this.systemService.getBanks();
  }

  @Post('banks')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new bank' })
  @ApiResponse({
    status: 201,
    description: 'Bank created successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async createBank(@Body() createSystemDto: CreateSystemDto) {
    return this.systemService.create(createSystemDto);
  }

  @Patch('banks/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a bank' })
  @ApiResponse({
    status: 200,
    description: 'Bank updated successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  async updateBank(
    @Param('id') id: string,
    @Body() updateSystemDto: UpdateSystemDto,
  ) {
    return this.systemService.updateBank(id, updateSystemDto);
  }

  @Delete('banks/:id')
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a bank (soft delete)' })
  @ApiResponse({
    status: 200,
    description: 'Bank deleted successfully',
  })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  @ApiResponse({ status: 404, description: 'Bank not found' })
  async deleteBank(@Param('id') id: string) {
    return this.systemService.deleteBank(id);
  }
}
