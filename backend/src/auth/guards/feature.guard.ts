import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { FEATURE_KEY } from '../decorators/feature.decorator';

@Injectable()
export class FeatureGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private prisma: PrismaService,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const requiredFeature = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (!requiredFeature) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (!user) {
            return false;
        }

        // Super admins and support platform staff bypass all tenant feature restrictions
        if (user.role === 'SUPER_ADMIN' || user.role === 'SUPPORT') {
            // Wait, does tenant-level SUPPORT role bypass? 
            // Actually, if a user has tenantId, and they are SUPPORT, it depends.
            // If they are SUPER_ADMIN or SALES, they are definitely global staff.
            // But let's check if user role SUPER_ADMIN bypasses it. 
            // In list of roles: SUPER_ADMIN, ADMIN, USER, SUPPORT, SALES. 
            // Let's only bypass for SUPER_ADMIN or if they don't belong to a tenant.
            if (user.role === 'SUPER_ADMIN') {
                return true;
            }
        }

        const tenantId = user.tenantId;
        if (!tenantId) {
            // If there's no tenant associated with the user, allow (like global super admin)
            return true;
        }

        // Fetch tenant features
        const tenantFeatures = await this.prisma.tenantFeature.findUnique({
            where: { tenantId },
        });

        // Default to true for all features if not set in the database
        if (!tenantFeatures) {
            return true;
        }

        let isEnabled = true;
        if (requiredFeature === 'ivr') {
            isEnabled = tenantFeatures.ivrEnabled;
        } else if (requiredFeature === 'ringGroup') {
            isEnabled = tenantFeatures.ringGroupEnabled;
        } else if (requiredFeature === 'scheduler') {
            isEnabled = tenantFeatures.schedulerEnabled;
        } else if (requiredFeature === 'didForward') {
            isEnabled = tenantFeatures.didForwardEnabled;
        } else if (requiredFeature === 'monitor') {
            isEnabled = tenantFeatures.monitorEnabled;
        }

        if (!isEnabled) {
            throw new ForbiddenException(`The feature '${requiredFeature}' is disabled for your tenant. Please contact your administrator to upgrade.`);
        }

        return true;
    }
}
