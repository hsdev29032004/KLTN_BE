import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    // Extract message từ exception
    let message = 'An error occurred';
    let data: Record<string, any> = {};

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (typeof exceptionResponse === 'object') {
      const responseObj = exceptionResponse as any;
      message = responseObj.message || message;
      
      // Nếu có validation errors (class-validator)
      if (Array.isArray(responseObj.message)) {
        message = 'Validation failed';
        data = { errors: responseObj.message };
      } else {
        // Lấy các field khác ngoài message
        const { message: _, ...rest } = responseObj;
        data = rest;
      }
    }

    response.status(status).json({
      message,
      data,
    });
  }
}
