import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { WalletService } from '../src/wallet/wallet.service';
import { firstValueFrom } from 'rxjs';
import { HttpService } from '@nestjs/axios';

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const walletService = app.get(WalletService);
  const httpService = app.get(HttpService);
  
  console.log('Fetching balance directly via HTTP...');
  try {
    const url = `${walletService.subBillingUrl}/pbx/balance/1005`;
    console.log(`Connecting to: ${url}`);
    const response = await firstValueFrom(httpService.get(url));
    console.log('HTTP Success:', response.data);
  } catch (err: any) {
    console.error('HTTP Failure:', err.message);
    if (err.response) {
      console.error('Response status:', err.response.status);
      console.error('Response data:', err.response.data);
    }
  }

  await app.close();
}

main().catch(console.error);
