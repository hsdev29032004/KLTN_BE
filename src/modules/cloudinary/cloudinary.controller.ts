import {
  Controller,
  Post,
  Param,
  Query,
  DefaultValuePipe,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiBody, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { CloudinaryService } from './cloudinary.service';
import { PublicAPI } from '@/common/decorators/public-api.decorator';

@Controller('cloudinary')
export class CloudinaryController {
  constructor(private readonly cloudinaryService: CloudinaryService) {}

  /**
   * Upload single file to Cloudinary
   * POST /cloudinary/upload?folder=courses
   * Form-data: file (multipart/form-data)
   * Query params: folder (optional, default: 'kltn')
   */
  @PublicAPI()
  @Post('upload')
  @ApiOperation({ summary: 'Upload single file to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    required: false,
    type: 'string',
    description: 'Optional folder name in Cloudinary (default: kltn)',
    example: 'courses',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully',
    schema: {
      example: {
        message: 'Upload file thành công',
        data: {
          publicId: 'kltn/abc123xyz',
          url: 'https://res.cloudinary.com/.../kltn/abc123xyz.jpg',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder', new DefaultValuePipe('kltn')) folder: string,
  ) {
    if (!file) {
      throw new BadRequestException('File không được cung cấp');
    }

    const result = await this.cloudinaryService.uploadFile(file, folder);

    return {
      message: 'Upload file thành công',
      data: {
        publicId: result.publicId,
        url: result.url,
      },
    };
  }

  /**
   * Upload multiple files to Cloudinary
   * POST /cloudinary/upload-multiple?folder=courses
   * Form-data: files (multipart/form-data)
   * Query params: folder (optional, default: 'kltn')
   */
  @PublicAPI()
  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple files to Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiQuery({
    name: 'folder',
    required: false,
    type: 'string',
    description: 'Optional folder name in Cloudinary (default: kltn)',
    example: 'courses',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Files to upload (select multiple)',
        },
      },
      required: ['files'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Files uploaded successfully',
    schema: {
      example: {
        message: 'Upload các file thành công',
        data: [
          {
            publicId: 'kltn/file1',
            url: 'https://res.cloudinary.com/.../kltn/file1.jpg',
          },
          {
            publicId: 'kltn/file2',
            url: 'https://res.cloudinary.com/.../kltn/file2.jpg',
          },
        ],
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Query('folder', new DefaultValuePipe('kltn')) folder: string,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào được cung cấp');
    }

    const results = await this.cloudinaryService.uploadMultipleFiles(files, folder);

    return {
      message: 'Upload các file thành công',
      data: results.map((result) => ({
        publicId: result.publicId,
        url: result.url,
      })),
    };
  }

  /**
   * Upload file với folder tùy chỉnh
   * POST /cloudinary/upload/:folder
   * Form-data: file (multipart/form-data)
   */
  @PublicAPI()
  @Post('upload/:folder')
  @ApiOperation({ summary: 'Upload file to specific folder' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'File to upload',
        },
      },
      required: ['file'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'File uploaded successfully to specified folder',
    schema: {
      example: {
        message: 'Upload file thành công',
        data: {
          publicId: 'courses/abc123xyz',
          url: 'https://res.cloudinary.com/.../courses/abc123xyz.jpg',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFileWithFolder(
    @UploadedFile() file: Express.Multer.File,
    @Param('folder') folder: string,
  ) {
    if (!file) {
      throw new BadRequestException('File không được cung cấp');
    }

    const result = await this.cloudinaryService.uploadFile(file, folder);

    return {
      message: 'Upload file thành công',
      data: {
        publicId: result.publicId,
        url: result.url,
      },
    };
  }
}
