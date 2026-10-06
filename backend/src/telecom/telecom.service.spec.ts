import { Test, TestingModule } from '@nestjs/testing';
import { TelecomService } from './telecom.service';

describe('TelecomService', () => {
  let service: TelecomService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelecomService],
    }).compile();

    service = module.get<TelecomService>(TelecomService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
