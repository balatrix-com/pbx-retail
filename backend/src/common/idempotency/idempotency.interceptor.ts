import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    ConflictException,
} from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { mergeMap, catchError } from 'rxjs/operators';
import { IdempotencyService } from './idempotency.service';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(private idempotencyService: IdempotencyService) { }

    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const req = context.switchToHttp().getRequest();
        const key = req.headers['idempotency-key'];

        if (!key) {
            return next.handle();
        }

        // Check if key exists
        const existing = await this.idempotencyService.check(key as string, req.path, req.method, req.body);

        if (existing) {
            // console.log(`Idempotency Hit: ${key} -> ${existing.response ? 'Hit' : 'Pending'}`);
            // If response is present, return it
            if (existing.response && existing.response !== null) {
                return of(existing.response);
            }
            // If response is null, it's pending -> Conflict (or 429 Retry-After)
            throw new ConflictException('Request with this Idempotency-Key is currently processing or failed previously.');
        }

        // console.log(`Idempotency Miss: ${key} -> Processing`);

        // Proceed and save response
        return next.handle().pipe(
            mergeMap(async (response) => {
                try {
                    // console.log(`Idempotency Saving: ${key}`);
                    await this.idempotencyService.saveResponse(key as string, response);
                } catch (e) {
                    console.error('Failed to save idempotency response', e);
                }
                return response;
            }),
            catchError(err => {
                // If the request fails, we should probably delete the key or mark as error?
                // For now, we leave it as Pending (so retries fail) or allowed?
                // Stripe allows retries on failure (500).
                // Concurrency safety suggests keeping it locked if we don't know state.
                // But MVP user wants "Safe".
                // I will log it.
                // console.error(`Idempotency Handler Error: ${key}`, err);
                return throwError(() => err);
            })
        );
    }
}
