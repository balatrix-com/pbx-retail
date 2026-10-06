import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const exceptionResponse: any =
            exception instanceof HttpException
                ? exception.getResponse()
                : { message: 'Internal server error' };

        // Log the error
        if (status >= 500) {
            this.logger.error(
                `Http Status: ${status} Error Message: ${JSON.stringify(exceptionResponse)}`,
                exception instanceof Error ? exception.stack : undefined
            );
        } else {
            this.logger.warn(`Http Status: ${status} Error Message: ${JSON.stringify(exceptionResponse)}`);
        }

        const responseBody = typeof exceptionResponse === 'object'
            ? { ...exceptionResponse, timestamp: new Date().toISOString(), path: request.url }
            : { message: exceptionResponse, statusCode: status, timestamp: new Date().toISOString(), path: request.url };

        // Ensure statusCode is consistent with the HTTP status
        responseBody.statusCode = status;

        response.status(status).json(responseBody);
    }
}
