import { Controller, Get, Query, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('branding')
  async getBranding() {
    const defaultBranding = {
      name: 'Cloud PBX',
      logoMain: '/svg logo/logo-main.svg',
      logoSidebar: '/svg logo/logo-main.svg',
      favicon: '/svg logo/favicon.svg',
      primaryColor: '#3d52a0',
      accentColor: '#ed8f55',
      supportEmail: 'support@telecom-platform.com',
      supportPhone: '+1-800-555-0199',
    };

    try {
      const partner = await this.prisma.partner.findFirst();

      if (!partner) {
        return defaultBranding;
      }

      return {
        name: partner.name,
        logoMain: partner.logoMain || defaultBranding.logoMain,
        logoSidebar: partner.logoSidebar || defaultBranding.logoSidebar,
        favicon: partner.favicon || defaultBranding.favicon,
        primaryColor: partner.primaryColor || defaultBranding.primaryColor,
        accentColor: partner.accentColor || defaultBranding.accentColor,
        supportEmail: partner.supportEmail || defaultBranding.supportEmail,
        supportPhone: partner.supportPhone || defaultBranding.supportPhone,
      };
    } catch (error) {
      return defaultBranding;
    }
  }
}

