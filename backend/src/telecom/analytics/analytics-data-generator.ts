import { Injectable } from '@nestjs/common';

/**
 * Data generator for analytics demonstration
 * Generates realistic-looking call data for testing and UI development
 * Will be replaced with real FreeSWITCH call data in production
 */
@Injectable()
export class AnalyticsDataGenerator {
    /**
     * Generate daily call volume data
     */
    generateDailyData(days: number = 30) {
        const data = [];
        const now = new Date();

        for (let i = days - 1; i >= 0; i--) {
            const date = new Date(now);
            date.setDate(date.getDate() - i);

            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Lower call volume on weekends
            const baseInbound = isWeekend ? 15 : 45;
            const baseOutbound = isWeekend ? 8 : 25;

            data.push({
                date: date.toISOString().split('T')[0],
                inbound: Math.floor(Math.random() * 20) + baseInbound,
                outbound: Math.floor(Math.random() * 15) + baseOutbound,
                duration: Math.floor(Math.random() * 3600) + 1800, // 30-90 minutes total
            });
        }

        return data.map(d => ({
            ...d,
            total: d.inbound + d.outbound,
        }));
    }

    /**
     * Generate calls by DID data
     */
    generateCallsByDID(dids: string[]) {
        if (dids.length === 0) {
            // Generate sample DIDs if none exist
            dids = ['+18005551234', '+18005555678', '+18005559012'];
        }

        return dids.slice(0, 10).map(didNumber => {
            const callCount = Math.floor(Math.random() * 200) + 50;
            const totalDuration = callCount * (Math.floor(Math.random() * 300) + 120); // 2-7 min avg

            return {
                didNumber,
                callCount,
                totalDuration,
                averageDuration: Math.floor(totalDuration / callCount),
                cost: (callCount * 0.02 * Math.random()).toFixed(2), // $0.01-0.02 per call
            };
        });
    }

    /**
     * Generate hourly call distribution
     */
    generateHourlyData() {
        const hourlyData = [];

        for (let hour = 0; hour < 24; hour++) {
            let calls = 0;

            // Business hours (9am-5pm) have more calls
            if (hour >= 9 && hour <= 17) {
                calls = Math.floor(Math.random() * 40) + 60; // 60-100 calls
            } else if (hour >= 8 && hour <= 18) {
                calls = Math.floor(Math.random() * 30) + 30; // 30-60 calls
            } else if (hour >= 6 && hour <= 22) {
                calls = Math.floor(Math.random() * 20) + 10; // 10-30 calls
            } else {
                calls = Math.floor(Math.random() * 5) + 1; // 1-6 calls (night)
            }

            hourlyData.push({ hour, calls });
        }

        return hourlyData;
    }

    /**
     * Generate call summary metrics
     */
    generateSummary() {
        const totalCalls = Math.floor(Math.random() * 500) + 1000; // 1000-1500 calls
        const answeredCalls = Math.floor(totalCalls * (0.85 + Math.random() * 0.1)); // 85-95% answer rate
        const missedCalls = totalCalls - answeredCalls;

        return {
            totalCalls,
            answeredCalls,
            missedCalls,
            totalDuration: Math.floor(totalCalls * 240), // avg 4 min per call
            averageDuration: 240 + Math.floor(Math.random() * 120), // 4-6 minutes
            totalCost: (totalCalls * 0.015 * (1 + Math.random() * 0.5)).toFixed(2),
            answerRate: ((answeredCalls / totalCalls) * 100).toFixed(1),
        };
    }

    /**
     * Generate cost breakdown
     */
    generateCostBreakdown(didCount: number = 5) {
        const didFees = didCount * 2.0; // $2 per DID
        const inboundMinutes = Math.floor(Math.random() * 5000) + 10000;
        const outboundMinutes = Math.floor(Math.random() * 3000) + 5000;

        const inboundCost = inboundMinutes * 0.005; // $0.005 per minute
        const outboundCost = outboundMinutes * 0.01; // $0.01 per minute

        return {
            didFees: didFees.toFixed(2),
            callCosts: (inboundCost + outboundCost).toFixed(2),
            totalCost: (didFees + inboundCost + outboundCost).toFixed(2),
            breakdown: [
                { category: 'DID Monthly Fees', amount: didFees.toFixed(2), percentage: '15%' },
                { category: 'Inbound Minutes', amount: inboundCost.toFixed(2), percentage: '40%' },
                { category: 'Outbound Minutes', amount: outboundCost.toFixed(2), percentage: '45%' },
            ],
            minutes: {
                inbound: inboundMinutes,
                outbound: outboundMinutes,
                total: inboundMinutes + outboundMinutes,
            },
        };
    }
}
