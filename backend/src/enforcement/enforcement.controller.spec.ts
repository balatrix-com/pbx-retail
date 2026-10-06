import { Test, TestingModule } from '@nestjs/testing';
import { EnforcementController } from './enforcement.controller';

describe('EnforcementController', () => {
  let controller: EnforcementController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EnforcementController],
    }).compile();

    controller = module.get<EnforcementController>(EnforcementController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
