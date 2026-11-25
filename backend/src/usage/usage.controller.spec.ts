import { GoneException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

describe('UsageController', () => {
    let controller: UsageController;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [UsageController],
            providers: [{ provide: UsageService, useValue: {} }],
        }).compile();
        controller = module.get<UsageController>(UsageController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('rejects the retired per-minute charge endpoint', () => {
        expect(() => controller.reportUsage()).toThrow(GoneException);
    });
});
