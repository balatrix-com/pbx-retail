import { IsString, IsNotEmpty, IsOptional, IsObject, IsInt, Min, Max } from 'class-validator';

export class CreateIVRDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsOptional()
    greetingAudioPath?: string; // Path to audio file on SFTP server

    @IsObject()
    @IsOptional()
    menu?: Record<string, MenuAction>; // Digit -> Action mapping

    @IsInt()
    @Min(1000)
    @Max(10000)
    @IsOptional()
    timeout?: number; // Timeout in milliseconds (default 5000)

    @IsInt()
    @Min(1)
    @Max(5)
    @IsOptional()
    maxFailures?: number; // Max invalid attempts before hangup (default 3)
}

export interface MenuAction {
    type: 'extension' | 'ring_group' | 'ivr' | 'repeat' | 'hangup' | 'external' | 'submenu' | 'back';
    target?: string; // Extension ID, Ring Group ID, IVR ID, or phone number
    props?: Record<string, any>; // Additional properties like greeting override
    children?: Record<string, MenuAction>; // Nested menu for submenus
}
