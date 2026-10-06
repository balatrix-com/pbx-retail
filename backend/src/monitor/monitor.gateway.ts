import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnGatewayInit,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, Inject } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { REDIS_SUBSCRIBER, REDIS_CLIENT } from '../redis/redis.module';
import type { RedisClientType } from 'redis';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

const ANALYTICS_INTERVAL_MS = 30_000; // 30 seconds

@WebSocketGateway({
    path: '/api/socket.io',
    cors: {
        origin: '*',
    },
    namespace: 'monitor',
})
export class MonitorGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;
    private readonly logger = new Logger(MonitorGateway.name);

    /** tenantId → set of socket IDs currently in that room */
    private readonly tenantRooms = new Map<string, Set<string>>();
    private analyticsTimer?: ReturnType<typeof setInterval>;

    constructor(
        @Inject(REDIS_SUBSCRIBER) private readonly redisSubscriber: RedisClientType,
        @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
        private readonly jwtService: JwtService,
        private readonly prismaService: PrismaService,
    ) { }

    async afterInit() {
        this.logger.log('MonitorGateway initialized');

        try {
            // Subscribe to calls_stream
            this.logger.log('Subscribing to calls_stream...');
            await this.redisSubscriber.subscribe('calls_stream', (message) => {
                this.logger.log(`Received Redis Message: ${message.substring(0, 50)}...`); // DEBUG
                try {
                    const rawData = JSON.parse(message);
                    if (rawData.customer_id) {
                        const rawStatus = (rawData.call_status || '').toLowerCase().trim();
                        const normalizedStatus = rawStatus === 'connected' ? 'answered' : (rawData.call_status || '');

                        // Map to camelCase to match MonitorService / Frontend expectations
                        const callData = {
                            uuid: rawData.uuid,
                            bUuid: rawData.b_uuid || '',
                            caller: rawData.caller || '',
                            callee: rawData.callee || '',
                            status: normalizedStatus,
                            destType: rawData.dest_type || '',
                            destValue: rawData.dest_value || '',
                            direction: rawData.direction || '',
                            // Keep timestamps as numbers/strings for JSON transport
                            startTime: rawData.start_ts || '',
                            answerTime: rawData.answer_ts || '',
                            duration: rawData.duration ? parseInt(rawData.duration) : 0,
                            tenantId: rawData.customer_id // Explicitly map to tenantId if handy
                        };

                        const customerId = rawData.customer_id;
                        this.logger.log(`Emitting call_update for customer ${customerId} (status: ${normalizedStatus})`);

                        // Emit to specific tenant room and alias rooms
                        this.server.to(`tenant:${customerId}`).emit('call_update', callData);
                        if (customerId.startsWith('U')) {
                            this.server.to(`tenant:${customerId.slice(1)}`).emit('call_update', callData);
                        } else {
                            this.server.to(`tenant:U${customerId}`).emit('call_update', callData);
                        }

                        // Emit to global room for Super Admins
                        this.server.to('tenant:all').emit('call_update', callData);
                    }
                } catch (error) {
                    this.logger.error('Error processing call update:', error);
                }
            });
            this.logger.log('Subscribed to calls_stream successfully');
        } catch (err) {
            this.logger.error('Failed to subscribe to Redis:', err);
        }

        // Start the analytics snapshot ticker
        this.startAnalyticsTicker();
    }

    // ---------------------------------------------------------------------------
    // Analytics snapshot ticker
    // ---------------------------------------------------------------------------

    private startAnalyticsTicker() {
        this.analyticsTimer = setInterval(async () => {
            if (this.tenantRooms.size === 0) return;

            for (const [tenantId, socketIds] of this.tenantRooms.entries()) {
                if (socketIds.size === 0) continue;

                try {
                    const snapshot = await this.buildAnalyticsSnapshot(tenantId);
                    this.server.to(`tenant:${tenantId}`).emit('analytics_snapshot', snapshot);
                } catch (err) {
                    this.logger.warn(`Analytics snapshot failed for tenant ${tenantId}: ${err.message}`);
                }
            }
        }, ANALYTICS_INTERVAL_MS);

        this.logger.log(`Analytics ticker started (interval: ${ANALYTICS_INTERVAL_MS / 1000}s)`);
    }

    private async buildAnalyticsSnapshot(tenantId: string) {
        const patterns = new Set<string>();

        if (!tenantId || tenantId === 'all') {
            patterns.add('customer:*:call:*');
        } else {
            const tenant = await this.prismaService.tenant.findUnique({
                where: { id: tenantId },
                select: { customerCode: true, subBillingCustomerId: true }
            });

            const candidateCodes = new Set<string>();
            candidateCodes.add(tenantId);
            if (tenant?.customerCode) {
                candidateCodes.add(tenant.customerCode);
                if (tenant.customerCode.startsWith('U')) {
                    candidateCodes.add(tenant.customerCode.slice(1));
                } else {
                    candidateCodes.add(`U${tenant.customerCode}`);
                }
            }
            if (tenant?.subBillingCustomerId) {
                candidateCodes.add(tenant.subBillingCustomerId);
                if (tenant.subBillingCustomerId.startsWith('U')) {
                    candidateCodes.add(tenant.subBillingCustomerId.slice(1));
                } else {
                    candidateCodes.add(`U${tenant.subBillingCustomerId}`);
                }
            }

            for (const code of candidateCodes) {
                patterns.add(`customer:${code}:call:*`);
            }
        }

        const keys = new Set<string>();
        for (const pattern of patterns) {
            for await (const chunk of this.redisClient.scanIterator({
                MATCH: pattern,
                COUNT: 100
            })) {
                for (const key of chunk) {
                    keys.add(key);
                }
            }
        }

        let ringing = 0;
        let answered = 0;
        let inbound = 0;
        let outbound = 0;

        for (const key of keys) {
            const data = await this.redisClient.hGetAll(key);
            const status = (data.call_status || '').toLowerCase().trim();
            const direction = (data.direction || '').toLowerCase();

            if (status === 'ringing' || status === 'new') ringing++;
            if (status === 'answered' || status === 'connected') answered++;
            if (direction === 'inbound') inbound++;
            else outbound++;
        }

        return {
            tenantId,
            activeCalls: keys.size,
            ringing,
            answered,
            inbound,
            outbound,
            timestamp: Date.now(),
        };
    }

    // ---------------------------------------------------------------------------
    // Socket lifecycle
    // ---------------------------------------------------------------------------

    async handleConnection(client: Socket) {
        try {
            const token = client.handshake.auth?.token || client.handshake.query?.token;
            if (!token) {
                this.logger.warn(`Client ${client.id} tried to connect without token`);
                client.disconnect();
                return;
            }

            const payload = this.jwtService.verify(token);

            // Check permissions
            const canMonitor = payload.role === 'SUPER_ADMIN' || payload.role === 'ADMIN' || payload.monitoringEnabled === true;
            if (!canMonitor) {
                this.logger.warn(`Client ${client.id} (User: ${payload.sub}) denied monitoring access`);
                client.disconnect();
                return;
            }

            // Store user info in socket data for later use
            client.data.user = payload;
            this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);
        } catch (err) {
            this.logger.error(`Connection unauthorized: ${err.message}`);
            client.disconnect();
        }
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
        // Remove from all tenant rooms
        for (const [tenantId, socketIds] of this.tenantRooms.entries()) {
            socketIds.delete(client.id);
            if (socketIds.size === 0) {
                this.tenantRooms.delete(tenantId);
            }
        }
    }

    @SubscribeMessage('join_room')
    async handleJoinRoom(@MessageBody() tenantId: string, @ConnectedSocket() client: Socket) {
        this.logger.log(`Received join_room request for tenant: ${tenantId}`); // DEBUG
        const user = client.data.user;
        if (!user) {
            this.logger.warn(`Join room failed: No user attached to socket ${client.id}`);
            client.emit('error', { message: 'Unauthorized' });
            return;
        }

        this.logger.log(`User attempting join: ${user.sub}, Role: ${user.role}, UserTenant: ${user.tenantId}, ReqTenant: ${tenantId}`); // DEBUG

        // Validate tenant access
        if (user.role !== 'SUPER_ADMIN' && user.tenantId !== tenantId) {
            this.logger.warn(`User ${user.sub} tried to join unauthorized tenant room ${tenantId}`);
            client.emit('error', { message: 'Unauthorized tenant access' });
            return;
        }

        const roomsToJoin = new Set<string>();

        if (tenantId === 'all') {
            roomsToJoin.add('tenant:all');
        } else {
            roomsToJoin.add(`tenant:${tenantId}`);
            const tenant = await this.prismaService.tenant.findUnique({
                where: { id: tenantId },
                select: { customerCode: true, subBillingCustomerId: true }
            });
            if (tenant?.customerCode) {
                roomsToJoin.add(`tenant:${tenant.customerCode}`);
                if (tenant.customerCode.startsWith('U')) {
                    roomsToJoin.add(`tenant:${tenant.customerCode.slice(1)}`);
                } else {
                    roomsToJoin.add(`tenant:U${tenant.customerCode}`);
                }
            }
            if (tenant?.subBillingCustomerId) {
                roomsToJoin.add(`tenant:${tenant.subBillingCustomerId}`);
                if (tenant.subBillingCustomerId.startsWith('U')) {
                    roomsToJoin.add(`tenant:${tenant.subBillingCustomerId.slice(1)}`);
                } else {
                    roomsToJoin.add(`tenant:U${tenant.subBillingCustomerId}`);
                }
            }
        }

        for (const room of roomsToJoin) {
            client.join(room);
            if (!this.tenantRooms.has(room)) {
                this.tenantRooms.set(room, new Set());
            }
            this.tenantRooms.get(room)!.add(client.id);
        }

        this.logger.log(`Client ${client.id} joined rooms: ${Array.from(roomsToJoin).join(', ')} for user ${user.sub}`);
        client.emit('room_joined', { room: Array.from(roomsToJoin)[0], rooms: Array.from(roomsToJoin) });

        // Emit an immediate snapshot so the client doesn't wait 30s
        this.buildAnalyticsSnapshot(tenantId)
            .then(snapshot => client.emit('analytics_snapshot', snapshot))
            .catch(err => this.logger.warn(`Immediate snapshot failed: ${err.message}`));
    }

    @SubscribeMessage('leave_room')
    async handleLeaveRoom(@MessageBody() tenantId: string, @ConnectedSocket() client: Socket) {
        const roomsToLeave = new Set<string>();

        if (tenantId === 'all') {
            roomsToLeave.add('tenant:all');
        } else {
            roomsToLeave.add(`tenant:${tenantId}`);
            const tenant = await this.prismaService.tenant.findUnique({
                where: { id: tenantId },
                select: { customerCode: true, subBillingCustomerId: true }
            });
            if (tenant?.customerCode) {
                roomsToLeave.add(`tenant:${tenant.customerCode}`);
                if (tenant.customerCode.startsWith('U')) {
                    roomsToLeave.add(`tenant:${tenant.customerCode.slice(1)}`);
                } else {
                    roomsToLeave.add(`tenant:U${tenant.customerCode}`);
                }
            }
            if (tenant?.subBillingCustomerId) {
                roomsToLeave.add(`tenant:${tenant.subBillingCustomerId}`);
                if (tenant.subBillingCustomerId.startsWith('U')) {
                    roomsToLeave.add(`tenant:${tenant.subBillingCustomerId.slice(1)}`);
                } else {
                    roomsToLeave.add(`tenant:U${tenant.subBillingCustomerId}`);
                }
            }
        }

        for (const room of roomsToLeave) {
            client.leave(room);
            const socketIds = this.tenantRooms.get(room);
            if (socketIds) {
                socketIds.delete(client.id);
                if (socketIds.size === 0) this.tenantRooms.delete(room);
            }
        }

        this.logger.log(`Client ${client.id} left rooms: ${Array.from(roomsToLeave).join(', ')}`);
        client.emit('room_left', { room: `tenant:${tenantId}` });
    }

    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() client: Socket) {
        this.logger.log(`Ping from ${client.id}`);
        return { event: 'pong', data: { time: Date.now() } };
    }
}
