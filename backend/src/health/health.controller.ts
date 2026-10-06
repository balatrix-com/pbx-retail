import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
    constructor(
        private health: HealthCheckService,
        private http: HttpHealthIndicator,
        private prisma: PrismaService,
    ) { }

    @Get()
    @HealthCheck()
    check() {
        return this.health.check([
            () => this.http.pingCheck('nestjs-docs', 'https://docs.nestjs.com'),
            // Custom prisma check since PrismaHealthIndicator might need specific setup or just use simple check
            async () => {
                try {
                    await this.prisma.$queryRaw`SELECT 1`;
                    return {
                        database: {
                            status: 'up',
                        }
                    }
                } catch (e) {
                    return {
                        database: {
                            status: 'down',
                            message: e.message
                        }
                    }
                }
            }
        ]);
    }
}
