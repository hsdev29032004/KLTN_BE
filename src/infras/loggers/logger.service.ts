// src/core/logger/logger.service.ts
import { Injectable, LoggerService } from '@nestjs/common';
import { createLogger, format, transports } from 'winston';

@Injectable()
export class AppLogger implements LoggerService {
  private logger: ReturnType<typeof createLogger>;

  constructor() {
    this.logger = createLogger({
      level: 'info',
      format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.json(),
      ),
      transports: [
        new transports.Console(),
        new transports.File({
          filename: 'logs/http.log',
          level: 'info',
        }),
      ],
    });
  }

  log(message: string, meta: any = {}) {
    this.logger.info(message, meta);
  }

  error(message: string, meta: any = {}) {
    this.logger.error(message, meta);
  }

  warn(message: string, meta: any = {}) {
    this.logger.warn(message, meta);
  }
}
