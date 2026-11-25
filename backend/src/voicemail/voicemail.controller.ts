import { BadRequestException, Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, Res, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { resolveTenantScope } from '../auth/tenant-scope';
import { VoicemailService } from './voicemail.service';

@Controller('telecom/voicemail')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VoicemailController {
  constructor(private readonly voicemail: VoicemailService) {}

  private tenant(user: any) { return resolveTenantScope(user); }

  @Get('capabilities')
  @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
  capabilities(@GetUser() user: any) { return this.voicemail.capabilities(this.tenant(user)); }

  @Get('boxes')
  @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
  boxes(@GetUser() user: any) { return this.voicemail.listBoxes(this.tenant(user)); }

  @Post('boxes')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  createBox(@GetUser() user: any, @Body() body: any) { return this.voicemail.createBox(this.tenant(user), body); }

  @Patch('boxes/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  updateBox(@GetUser() user: any, @Param('id') id: string, @Body() body: any) { return this.voicemail.updateBox(this.tenant(user), id, body); }

  @Delete('boxes/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteBox(@GetUser() user: any, @Param('id') id: string) { return this.voicemail.deleteBox(this.tenant(user), id); }

  @Put('boxes/:id/greeting/library')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  libraryGreeting(@GetUser() user: any, @Param('id') id: string, @Body() body: { audioFileId: string }) {
    return this.voicemail.selectLibraryGreeting(this.tenant(user), id, body?.audioFileId);
  }

  @Delete('boxes/:id/greeting')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  removeGreeting(@GetUser() user: any, @Param('id') id: string) { return this.voicemail.removeGreeting(this.tenant(user), id); }

  @Get('boxes/:id/greeting')
  @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
  playGreeting(@GetUser() user: any, @Param('id') id: string, @Res() res: any) {
    return this.voicemail.streamGreeting(this.tenant(user), id, res);
  }

  @Get('messages')
  @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
  messages(@GetUser() user: any, @Query('boxId') boxId?: string, @Query('page') rawPage?: string) {
    const page = rawPage ? Number(rawPage) : 1;
    if (!Number.isSafeInteger(page) || page < 1) throw new BadRequestException('Invalid page');
    return this.voicemail.listMessages(this.tenant(user), boxId, page);
  }

  @Get('messages/:id/audio')
  @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
  audio(@GetUser() user: any, @Param('id') id: string, @Headers('range') range: string, @Res() res: any) {
    return this.voicemail.streamMessage(this.tenant(user), id, res, false, range);
  }

  @Get('messages/:id/download')
  @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
  download(@GetUser() user: any, @Param('id') id: string, @Res() res: any) {
    return this.voicemail.streamMessage(this.tenant(user), id, res, true);
  }

  @Patch('messages/:id/read')
  @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
  markRead(@GetUser() user: any, @Param('id') id: string, @Body() body: { read: boolean }) {
    if (typeof body?.read !== 'boolean') throw new BadRequestException('read must be a boolean');
    return this.voicemail.markRead(this.tenant(user), id, body.read);
  }

  @Delete('messages/:id')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  deleteMessage(@GetUser() user: any, @Param('id') id: string) { return this.voicemail.deleteMessage(this.tenant(user), id); }
}
