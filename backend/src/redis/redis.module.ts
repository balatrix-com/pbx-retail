import { Module, Global } from '@nestjs/common';
import { createClient } from 'redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';
export const REDIS_SUBSCRIBER = 'REDIS_SUBSCRIBER';

@Global()
@Module({
    providers: [
        {
            provide: REDIS_CLIENT,
            useFactory: async () => {
                const client = createClient({
                    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
                    password: process.env.REDIS_PASSWORD,
                    socket: {
                        connectTimeout: 10000,
                        reconnectStrategy: (retries) => {
                            if (retries > 20) return new Error('Redis connection failed');
                            return Math.min(retries * 200, 3000);
                        }
                    }
                });
                client.on('error', (err) => {
                    if (err?.message?.includes('Connection timeout')) {
                        console.warn('Redis Client connection timed out, reconnecting...');
                    } else {
                        console.error('Redis Client Error:', err?.message || err);
                    }
                });
                try {
                    await client.connect();
                } catch (e) {
                    console.warn('Redis Client could not connect. Using mock mode.', e.message);
                    // Return a dummy client that doesn't crash on calls
                    return {
                        on: () => { },
                        get: async () => null,
                        set: async () => 'OK',
                        del: async () => 1,
                        publish: async () => 0,
                        subscribe: async () => { },
                        unsubscribe: async () => { },
                        quit: async () => { },
                        isOpen: false,
                        hGetAll: async () => ({}),
                        keys: async () => []
                    };
                }
                return client;
            },
        },
        {
            provide: REDIS_SUBSCRIBER,
            useFactory: async () => {
                const client = createClient({
                    url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
                    password: process.env.REDIS_PASSWORD,
                    socket: {
                        connectTimeout: 10000,
                        reconnectStrategy: (retries) => {
                            if (retries > 20) return new Error('Redis subscriber connection failed');
                            return Math.min(retries * 200, 3000);
                        }
                    }
                });
                client.on('error', (err) => {
                    if (err?.message?.includes('Connection timeout')) {
                        console.warn('Redis Subscriber connection timed out, reconnecting...');
                    } else {
                        console.error('Redis Subscriber Error:', err?.message || err);
                    }
                });
                try {
                    await client.connect();
                } catch (e) {
                    console.warn('Redis Subscriber could not connect. Using mock mode.', e.message);
                    return {
                        on: () => { },
                        subscribe: async () => { },
                        unsubscribe: async () => { },
                        quit: async () => { },
                        isOpen: false
                    };
                }
                return client;
            },
        },
    ],
    exports: [REDIS_CLIENT, REDIS_SUBSCRIBER],
})
export class RedisModule { }
