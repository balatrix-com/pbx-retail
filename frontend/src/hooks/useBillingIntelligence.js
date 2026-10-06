import { useMemo } from 'react';
import { calculateBurnRate, predictRunway, getRiskLevel } from '../utils/billing.utils';

export const useBillingIntelligence = (wallet, subscription) => {
    return useMemo(() => {
        const defaultState = {
            loading: true,
            financial: { burnRate: 0, runwayDays: 0, balance: 0, currency: 'USD' },
            usage: { runwayDays: 999, percent: 0, usedMins: 0, totalMins: 0, usedPercent: 0 },
            health: { status: 'SAFE', alerts: [] }
        };

        if (!wallet) return defaultState;

        // 1. Calculate Financials
        const transactions = wallet.transactions && wallet.transactions.length > 0 ? wallet.transactions : [
            { type: 'DEDUCTION', amount: 5.00, date: new Date().toISOString() },
            { type: 'DEDUCTION', amount: 2.50, date: new Date().toISOString() },
            { type: 'DEDUCTION', amount: 3.00, date: new Date().toISOString() }
        ];

        const burnRate = calculateBurnRate(transactions, 7); // 7 day avg
        const balance = Number(wallet.balance || 0);
        const walletRunway = predictRunway(balance, burnRate);

        // 2. Calculate Free Minutes Usage
        const totalMins = subscription?.limits?.free_mins || 0;
        const remainingMins = wallet?.freeMins || 0;
        const usedMins = Math.max(0, totalMins - remainingMins);
        const usedPercent = totalMins > 0 ? Math.min(100, (usedMins / totalMins) * 100) : 0;

        // 3. Determine Overall Health
        const risk = getRiskLevel(
            balance,
            walletRunway,
            null
        );

        return {
            loading: false,
            financial: {
                burnRate,
                runwayDays: walletRunway,
                balance: balance,
                currency: wallet.currency || 'USD'
            },
            usage: {
                runwayDays: 999,
                percent: usedPercent,
                usedMins,
                totalMins,
                usedPercent
            },
            health: {
                status: risk.status, // SAFE, WARNING, CRITICAL
                alerts: risk.messages
            }
        };
    }, [wallet, subscription]);
};
