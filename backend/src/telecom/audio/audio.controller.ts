import {
    Controller,
    Post,
    Get,
    Delete,
    UseInterceptors,
    UploadedFile,
    UseGuards,
    Param,
    BadRequestException,
    Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../../prisma/prisma.service';
import { AudioUploadService } from '../../freeswitch/audio-upload.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@Controller('telecom/audio')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AudioController {
    constructor(
        private readonly audioUploadService: AudioUploadService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * POST /telecom/audio/upload
     * Upload audio file for IVR
     * Accepts WAV or MP3 files
     */
    @Post('upload')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    @UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 50 * 1024 * 1024 } // 50MB
    }))
    async uploadAudio(
        @GetUser() user: any,
        @UploadedFile() file: Express.Multer.File,
        @Body('name') friendlyName: string, // Accept friendly name
    ) {
        if (!file) {
            throw new BadRequestException('No file uploaded');
        }

        // Validate file type
        const allowedMimeTypes = ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/mp3'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
            throw new BadRequestException('Only WAV and MP3 files are allowed');
        }

        // Generate filename with timestamp
        const timestamp = Date.now();
        // Use friendly name for file naming if provided, else original name
        const baseName = friendlyName || file.originalname.split('.')[0];
        // Sanitize filename
        const sanitizedName = baseName.replace(/[^a-zA-Z0-9.-]/g, '_');
        // Determine extension
        const ext = file.originalname.split('.').pop();
        const filename = `${timestamp}_${sanitizedName}.${ext}`;

        // Upload to SFTP
        const remotePath = await this.audioUploadService.uploadAudio(
            user.tenantId,
            file.buffer,
            filename,
        );

        // Save to Database
        const audioFile = await this.prisma.audioFile.create({
            data: {
                tenantId: user.tenantId,
                name: friendlyName || file.originalname,
                filename: filename,
                originalName: file.originalname,
                mimeType: file.mimetype,
                size: file.size,
                storageUrl: remotePath,
            },
        });

        return audioFile;
    }

    /**
     * GET /telecom/audio/list
     * List all audio files for tenant from DB
     */
    @Get('list')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    async listAudioFiles(@GetUser() user: any) {
        if (!user.tenantId) {
            return { files: [] };
        }
        const files = await this.prisma.audioFile.findMany({
            where: { tenantId: user.tenantId },
            orderBy: { createdAt: 'desc' },
        });
        return { files };
    }

    /**
     * DELETE /telecom/audio/:id
     * Delete audio file by ID
     */
    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    async deleteAudio(@GetUser() user: any, @Param('id') id: string) {
        const audioFile = await this.prisma.audioFile.findUnique({
            where: { id },
        });

        if (!audioFile) {
            throw new BadRequestException('Audio file not found');
        }

        if (audioFile.tenantId !== user.tenantId) {
            throw new BadRequestException('Unauthorized access to audio file');
        }

        // Delete from SFTP
        await this.audioUploadService.deleteAudio(audioFile.storageUrl);

        // Delete from DB
        await this.prisma.audioFile.delete({
            where: { id },
        });

        return { message: 'Audio file deleted successfully' };
    }
}
