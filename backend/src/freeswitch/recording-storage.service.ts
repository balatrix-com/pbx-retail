import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class RecordingStorageService {
    private readonly logger = new Logger(RecordingStorageService.name);
    private readonly basePath = process.env.FS_RECORDING_PATH || '/mnt/freeswitch-recordings/recordings';

    /**
     * Resolve the local path from the given remote/relative path.
     * Maps `/recordings/...` to the configured `basePath`.
     */
    private getLocalPath(remotePath: string): string {
        if (remotePath.startsWith('/recordings')) {
            // Replace /recordings with basePath
            return path.join(this.basePath, remotePath.substring('/recordings'.length));
        }
        return path.isAbsolute(remotePath) ? remotePath : path.join(this.basePath, remotePath);
    }

    /**
     * Ensure the recordings directory exists for a customer on the NAS mount
     * @param customerCode - Customer ID
     */
    async ensureRecordingsDirectory(customerCode: string): Promise<void> {
        try {
            const customerDir = path.join(this.basePath, customerCode);

            if (!fs.existsSync(customerDir)) {
                fs.mkdirSync(customerDir, { recursive: true, mode: 0o775 });
                this.logger.log(`Created recordings directory for customer: ${customerDir}`);
            }

            // Ensure FreeSWITCH has ownership and write permissions
            try {
                const { execSync } = require('child_process');
                execSync(`chown -R freeswitch:freeswitch "${customerDir}" 2>/dev/null && chmod -R 775 "${customerDir}" 2>/dev/null`);
            } catch {
                // Ignore if not running on Linux or freeswitch user isn't present
            }
        } catch (error) {
            this.logger.error(`Failed to ensure recordings directory for ${customerCode}: ${error.message}`);
            // Don't throw, just log
        }
    }

    /**
     * Check if a recording file exists on the NAS mount
     * @param remotePath - Full remote path or path under /recordings
     */
    async checkFileExists(remotePath: string): Promise<boolean> {
        try {
            const localPath = this.getLocalPath(remotePath);
            return fs.existsSync(localPath);
        } catch (error) {
            this.logger.error(`Failed to check recording file existence: ${error.message}`);
            return false;
        }
    }

    /**
     * Stream a recording file from the NAS mount
     * @param remotePath - Full remote path or path under /recordings
     * @param res - Response object
     */
    async streamAudio(remotePath: string, res: any): Promise<void> {
        try {
            const localPath = this.getLocalPath(remotePath);
            if (!fs.existsSync(localPath)) {
                res.status(404).send('Recording file not found');
                return;
            }

            res.setHeader('Content-Type', 'audio/mpeg'); // Or audio/wav based on file extension
            const filename = path.basename(localPath);
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            // Stream directly to response
            const readStream = fs.createReadStream(localPath);
            readStream.pipe(res);
            
            readStream.on('error', (err) => {
                this.logger.error(`Read stream error: ${err.message}`);
                if (!res.headersSent) res.status(500).send('Internal server error');
            });
        } catch (error) {
            this.logger.error(`Failed to stream recording: ${error.message}`);
            if (!res.headersSent) res.status(500).send('Internal server error');
        }
    }
}
