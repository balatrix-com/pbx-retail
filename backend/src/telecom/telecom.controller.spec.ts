import { Test, TestingModule } from '@nestjs/testing';
import { TelecomController } from './telecom.controller';

describe('TelecomController', () => {
  let controller: TelecomController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TelecomController],
    }).compile();

    controller = module.get<TelecomController>(TelecomController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
