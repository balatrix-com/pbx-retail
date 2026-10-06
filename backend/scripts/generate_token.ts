import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

async function main() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: false });
    const jwtService = app.get(JwtService);
    const configService = app.get(ConfigService);

    // Payload for a SALES user
    const payload = {
        sub: 'sales-user-id-test-manual',
        email: 'sales-manual@example.com',
        role: 'SALES',
        tenantId: null
    };

    const secret = configService.get<string>('JWT_SECRET') || 'dev_secret';
    const token = jwtService.sign(payload, { secret });

    // Only print the token so shell script can capture it
    console.log(token);
    await app.close();
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
