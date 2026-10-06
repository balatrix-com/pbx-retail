const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../src/app.module');
const { WalletService } = require('../src/wallet/wallet.service');

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const walletService = app.get(WalletService);
  
  console.log('Fetching balance for tenant 1005:');
  try {
    const balance = await walletService.getBalance('1005');
    console.log('Result:', balance);
  } catch (err) {
    console.error('Error fetching balance:', err.message);
  }
  
  await app.close();
}

main().catch(console.error);
