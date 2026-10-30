import axios from 'axios';
import { signInternalRequest } from './internal-service-auth';

export function installBillingHttpAuth(): void {
    const configured = process.env.SUB_BILLING_API_URL || 'http://localhost:5005/api';
    const base = new URL(configured);
    axios.interceptors.request.use(config => {
        if (!config.url) return config;
        let target: URL;
        try {
            target = new URL(axios.getUri(config), config.baseURL || undefined);
        } catch {
            return config;
        }
        if (target.origin !== base.origin ||
            !(target.pathname === base.pathname.replace(/\/$/, '') ||
              target.pathname.startsWith(`${base.pathname.replace(/\/$/, '')}/`))) return config;
        if (!config.timeout) config.timeout = 10000;
        const body = config.data == null ? '' :
            typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
        const headers = axios.AxiosHeaders.from(config.headers);
        const customerId = String(headers.get('x-pbx-customer-id') || '');
        const idempotencyKey = String(headers.get('idempotency-key') || '');
        headers.set(signInternalRequest(config.method || 'GET', target.href, body, customerId, idempotencyKey));
        config.headers = headers as typeof config.headers;
        return config;
    });
}
