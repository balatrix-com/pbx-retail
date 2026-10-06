import {
    Body,
    Controller,
    Get,
    Post,
    Patch,
    UseGuards,
    Req,
    Query,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { GetUser } from './decorators/get-user.decorator';
import type { User } from '@prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) { }

    @Post('signup')
    async signup(@Body() createUserDto: CreateUserDto) {
        console.log('Signup DTO:', createUserDto);
        return this.authService.signup(createUserDto);
    }

    @UseGuards(LocalAuthGuard)
    @Post('login')
    async login(@GetUser() user: User) {
        return this.authService.login(user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@Req() req: any) {
        // Extract impersonation from JWT payload
        const impersonation = req.user.impersonation;
        return this.authService.getMe(req.user.id, impersonation);
    }

    @UseGuards(JwtRefreshGuard)
    @Post('refresh')
    refreshTokens(@GetUser() user: User) {
        return this.authService.refreshTokens(user.id, user['refreshToken']);
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    logout(@GetUser('id') userId: string) {
        return this.authService.logout(userId);
    }

    @UseGuards(JwtAuthGuard)
    @Post('end-impersonation')
    endImpersonation(@Req() req: any) {
        return this.authService.endImpersonation(req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Patch('me')
    updateProfile(@GetUser('id') userId: string, @Body() updateProfileDto: UpdateProfileDto) {
        return this.authService.updateProfile(userId, updateProfileDto);
    }

    @Post('forgot-password')
    async forgotPassword(@Body() { email }: { email: string }) {
        return this.authService.forgotPassword(email);
    }
    @Get('verify-reset-token')
    async verifyResetToken(@Query('token') token: string) {
        return this.authService.verifyResetToken(token);
    }

    @Post('reset-password')
    async resetPassword(@Body() { token, newPassword }: { token: string; newPassword: string }) {
        return this.authService.resetPassword(token, newPassword);
    }
}
