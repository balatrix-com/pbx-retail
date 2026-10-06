import { Injectable, Logger } from '@nestjs/common';
import SftpClient from 'ssh2-sftp-client';
import { Readable } from 'stream';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';

@Injectable()
export class AudioUploadService {
    private readonly logger = new Logger(AudioUploadService.name);
    private readonly sftpConfig = {
        host: process.env.FS_AUDIO_HOST || 'localhost',
        port: parseInt(process.env.FS_AUDIO_PORT || '22'),
        username: process.env.FS_AUDIO_USER || 'soxuser',
        password: process.env.FS_AUDIO_PASSWORD || 'soxuser',
    };
    private readonly basePath = process.env.FS_AUDIO_BASE_PATH || '/opt/ivr_audio';

    /**
     * Upload audio file to SFTP server
     * @param tenantId - Tenant ID for directory isolation
     * @param file - File buffer
     * @param filename - Filename
     * @returns Remote file path
     */
    async uploadAudio(
        tenantId: string,
        file: Buffer,
        filename: string,
    ): Promise<string> {
        const sftp = new SftpClient();
        const remotePath = `${this.basePath}/${tenantId}/${filename}`;

        const isLocalhost = this.sftpConfig.host === 'localhost' || this.sftpConfig.host === '127.0.0.1';
        if (isLocalhost) {
            try {
                const tenantDir = `${this.basePath}/${tenantId}`;
                await fs.mkdir(tenantDir, { recursive: true });
                await fs.writeFile(remotePath, file);
                this.logger.log(`Saved audio file locally to: ${remotePath}`);
                return remotePath;
            } catch (error) {
                this.logger.error(`Failed to save local audio file: ${error.message}`);
                throw new Error(`Local audio save failed: ${error.message}`);
            }
        }

        try {
            await sftp.connect(this.sftpConfig);

            // Create tenant directory if it doesn't exist
            const tenantDir = `${this.basePath}/${tenantId}`;
            const dirExists = await sftp.exists(tenantDir);
            if (!dirExists) {
                await sftp.mkdir(tenantDir, true);
                this.logger.log(`Created directory: ${tenantDir}`);
            }

            // Upload file
            await sftp.put(file, remotePath);

            this.logger.log(`Uploaded audio file to: ${remotePath}`);

            await sftp.end();

            return remotePath;
        } catch (error) {
            this.logger.error(`Failed to upload audio file: ${error.message}`);
            // Fallback for development if SFTP fails
            if (process.env.NODE_ENV !== 'production') {
                this.logger.warn('Mocking SFTP upload for development');
                return remotePath; // Return path as if uploaded
            }
            await sftp.end();
            throw new Error(`Audio upload failed: ${error.message}`);
        }
    }

    /**
     * Delete audio file from SFTP server
     * @param remotePath - Full remote path to file
     */
    async deleteAudio(remotePath: string): Promise<void> {
        const isLocalhost = this.sftpConfig.host === 'localhost' || this.sftpConfig.host === '127.0.0.1';
        if (isLocalhost) {
            try {
                await fs.unlink(remotePath);
                this.logger.log(`Deleted local audio file: ${remotePath}`);
            } catch (error) {
                // Ignore if file doesn't exist
                this.logger.warn(`Could not delete local file ${remotePath}: ${error.message}`);
            }
            return;
        }

        const sftp = new SftpClient();

        try {
            await sftp.connect(this.sftpConfig);

            const fileExists = await sftp.exists(remotePath);
            if (fileExists) {
                await sftp.delete(remotePath);
                this.logger.log(`Deleted audio file: ${remotePath}`);
            }

            await sftp.end();
        } catch (error) {
            this.logger.error(`Failed to delete audio file: ${error.message}`);
            if (process.env.NODE_ENV !== 'production') {
                this.logger.warn('Mocking SFTP delete for development');
                return;
            }
            await sftp.end();
            throw new Error(`Audio deletion failed: ${error.message}`);
        }
    }

    /**
     * List audio files for a tenant
     * @param tenantId - Tenant ID
     * @returns Array of filenames
     */
    async listAudioFiles(tenantId: string): Promise<string[]> {
        const tenantDir = `${this.basePath}/${tenantId}`;
        const isLocalhost = this.sftpConfig.host === 'localhost' || this.sftpConfig.host === '127.0.0.1';
        if (isLocalhost) {
            try {
                const files = await fs.readdir(tenantDir, { withFileTypes: true });
                return files.filter(f => f.isFile()).map(f => f.name);
            } catch (error) {
                return [];
            }
        }

        const sftp = new SftpClient();

        try {
            await sftp.connect(this.sftpConfig);

            const dirExists = await sftp.exists(tenantDir);
            if (!dirExists) {
                await sftp.end();
                return [];
            }

            const files = await sftp.list(tenantDir);
            const filenames = files
                .filter((file: any) => file.type === '-') // Only files, not directories
                .map((file: any) => file.name);

            await sftp.end();

            return filenames;
        } catch (error) {
            this.logger.error(`Failed to list audio files: ${error.message}`);
            if (process.env.NODE_ENV !== 'production') {
                this.logger.warn('Mocking SFTP list for development');
                return [];
            }
            await sftp.end();
            throw new Error(`Audio listing failed: ${error.message}`);
        }
    }

    /**
     * Check if an audio file exists
     * @param remotePath - Full remote path
     */
    async checkFileExists(remotePath: string): Promise<boolean> {
        const isLocalhost = this.sftpConfig.host === 'localhost' || this.sftpConfig.host === '127.0.0.1';
        if (isLocalhost) {
            try {
                await fs.access(remotePath);
                return true;
            } catch {
                return false;
            }
        }

        const sftp = new SftpClient();
        try {
            await sftp.connect(this.sftpConfig);
            const exists = await sftp.exists(remotePath);
            await sftp.end();
            return !!exists;
        } catch (error) {
            this.logger.error(`Failed to check file existence: ${error.message}`);
            return false;
        }
    }

    /**
     * Stream an audio file from SFTP
     * @param remotePath - Full remote path
     * @param res - Response object
     */
    async streamAudio(remotePath: string, res: any): Promise<void> {
        const isLocalhost = this.sftpConfig.host === 'localhost' || this.sftpConfig.host === '127.0.0.1';
        if (isLocalhost) {
            try {
                await fs.access(remotePath);
                res.setHeader('Content-Type', 'audio/mpeg');
                const parts = remotePath.split('/');
                const filename = parts[parts.length - 1];
                res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
                const stream = fsSync.createReadStream(remotePath);
                stream.pipe(res);
            } catch {
                if (!res.headersSent) res.status(404).send('File not found');
            }
            return;
        }

        const sftp = new SftpClient();
        try {
            await sftp.connect(this.sftpConfig);
            const exists = await sftp.exists(remotePath);
            if (!exists) {
                await sftp.end();
                res.status(404).send('File not found');
                return;
            }

            res.setHeader('Content-Type', 'audio/mpeg');
            const parts = remotePath.split('/');
            const filename = parts[parts.length - 1];
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            // Stream directly to response
            await sftp.get(remotePath, res);
            await sftp.end();
        } catch (error) {
            this.logger.error(`Failed to stream audio: ${error.message}`);
            await sftp.end();
            if (!res.headersSent) res.status(500).send('Internal server error');
        }
    }

    /**
     * Ensure the recordings directory exists for a tenant
     * @param customerCode - Customer code / Tenant ID
     */
    async ensureRecordingsDirectory(customerCode: string): Promise<void> {
        const tenantDir = `${this.basePath}/${customerCode}`;
        const recordingsDir = `${tenantDir}/recordings`;

        const isLocalhost = this.sftpConfig.host === 'localhost' || this.sftpConfig.host === '127.0.0.1';
        if (isLocalhost) {
            try {
                await fs.mkdir(tenantDir, { recursive: true });
                await fs.mkdir(recordingsDir, { recursive: true });
            } catch (error) {
                this.logger.error(`Failed to ensure local recordings directory: ${error.message}`);
            }
            return;
        }

        const sftp = new SftpClient();
        try {
            await sftp.connect(this.sftpConfig);
            const tenantDir = `${this.basePath}/${customerCode}`;
            const recordingsDir = `${tenantDir}/recordings`;

            if (!(await sftp.exists(tenantDir))) {
                await sftp.mkdir(tenantDir, true);
                this.logger.log(`Created tenant directory: ${tenantDir}`);
            }

            if (!(await sftp.exists(recordingsDir))) {
                await sftp.mkdir(recordingsDir, true);
                this.logger.log(`Created recordings directory: ${recordingsDir}`);
            }

            await sftp.end();
        } catch (error) {
            this.logger.error(`Failed to ensure recordings directory for ${customerCode}: ${error.message}`);
            // Don't throw, just log
        }
    }
}
