import { Test, TestingModule } from '@nestjs/testing';
import { EnforcementService } from './enforcement.service';

describe('EnforcementService', () => {
  let service: EnforcementService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EnforcementService],
    }).compile();

    service = module.get<EnforcementService>(EnforcementService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
