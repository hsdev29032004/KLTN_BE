import { Injectable, BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import type { Multer } from 'multer';

declare global {
  namespace Express {
    interface Multer {
      File: Multer.File;
    }
  }
}

@Injectable()
export class CloudinaryService {
  /**
   * Upload file to Cloudinary
   * @param file - Express file object from multer
   * @param folder - Optional folder name in Cloudinary
   * @returns Promise containing public_id and secure_url
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'kltn',
  ): Promise<{ publicId: string; url: string }> {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new BadRequestException('File không được cung cấp'));
      }

      // Create a stream to upload the file
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            console.error('❌ Cloudinary upload error:', error);
            reject(
              new BadRequestException(
                `Lỗi upload file: ${error.message || 'Unknown error'}`,
              ),
            );
          } else if (result) {
            console.log('✅ Upload thành công:', {
              publicId: result.public_id,
              url: result.secure_url,
              size: result.bytes,
              format: result.format,
              width: result.width,
              height: result.height,
              version: result.version,
            });
            resolve({
              publicId: result.public_id,
              url: result.secure_url,
            });
          } else {
            reject(
              new BadRequestException('Lỗi upload file: Không nhận được response từ Cloudinary'),
            );
          }
        },
      );

      // Convert buffer to stream and pipe to Cloudinary
      const stream = Readable.from(file.buffer);
      stream.pipe(uploadStream);
    });
  }

  /**
   * Upload multiple files to Cloudinary
   * @param files - Array of Express file objects
   * @param folder - Optional folder name in Cloudinary
   * @returns Promise containing array of public_id and secure_url
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'kltn',
  ): Promise<{ publicId: string; url: string }[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('Không có file nào được cung cấp');
    }

    const uploadPromises = files.map((file) =>
      this.uploadFile(file, folder),
    );

    return Promise.all(uploadPromises);
  }

  /**
   * Delete file from Cloudinary
   * @param publicId - Public ID of the file in Cloudinary
   * @returns Promise
   */
  async deleteFile(publicId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(publicId, (error, result) => {
        if (error) {
          reject(
            new BadRequestException(
              `Lỗi xoá file: ${error.message || 'Unknown error'}`,
            ),
          );
        } else if (result) {
          resolve();
        } else {
          reject(
            new BadRequestException('Lỗi xoá file: Không nhận được response từ Cloudinary'),
          );
        }
      });
    });
  }

  /**
   * Get file info from Cloudinary
   * @param publicId - Public ID of the file
   * @returns Promise containing file info
   */
  async getFileInfo(publicId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.api.resource(publicId, (error, result) => {
        if (error) {
          reject(
            new BadRequestException(
              `Lỗi lấy thông tin file: ${error.message || 'Unknown error'}`,
            ),
          );
        } else if (result) {
          resolve(result);
        } else {
          reject(
            new BadRequestException('Lỗi lấy thông tin file: Không nhận được response từ Cloudinary'),
          );
        }
      });
    });
  }
}
