export default () => ({
    port: parseInt(process.env.PORT || '3000', 10),
    database: {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        url: process.env.DATABASE_URL,
    },
    redis: {
        host: process.env.REDIS_HOST,
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'secretKey',
        expiresIn: '1h',
        refreshSecret: process.env.JWT_REFRESH_SECRET || 'refreshSecretKey',
        refreshExpiresIn: '7d',
    },
    stripe: {
        secretKey: process.env.STRIPE_SECRET_KEY,
        publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
        webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    zeptoMail: {
        apiKey: process.env.ZEPTOMAIL_API_KEY,
    },
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    subBilling: {
        apiUrl: process.env.SUB_BILLING_API_URL || 'http://localhost:5005/api',
    },
    billingCacheRefresh: {
        url: process.env.BILLING_CACHE_REFRESH_URL || 'http://localhost:8000/api/v1/cache/refresh',
        token: process.env.BILLING_CACHE_REFRESH_TOKEN || 'dev-token-123',
    },
    kamailio: {
        rpcUrl: process.env.KAMAILIO_RPC_URL || 'http://10.30.0.61:8080/rpc',
    },
});
