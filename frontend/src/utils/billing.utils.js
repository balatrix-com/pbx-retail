import { differenceInDays, addDays } from 'date-fns';

/**
 * Calculates the daily burn rate based on recent transactions.
 * @param {Array} transactions - List of transactions from wallet.
 * @param {number} days - Number of days to look back (default 30).
 * @returns {number} - Estimated daily spend.
 */
export const calculateBurnRate = (transactions, days = 30) => {
    if (!transactions || transactions.length === 0) return 0;

    const now = new Date();
    const cutoffDate = addDays(now, -days);

    const recentDeductions = transactions.filter(tx =>
        tx.type === 'DEDUCTION' && new Date(tx.date) >= cutoffDate
    );

    const totalSpent = recentDeductions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    // Avoid division by zero, min 1 day
    return totalSpent / days;
};

/**
 * Predicts the number of days until the wallet is empty.
 * @param {number} balance - Current wallet balance.
 * @param {number} burnRate - Daily spend.
 * @returns {number} - Days remaining. Returns 999 if burn rate is 0.
 */
export const predictRunway = (balance, burnRate) => {
    if (burnRate <= 0) return 999;
    return Math.floor(balance / burnRate);
};

/**
 * Determines the health/risk level of the billing account.
 * @param {number} balance 
 * @param {number} runwayDays 

 * @returns {Object} - { status: 'SAFE' | 'WARNING' | 'CRITICAL', messages: [] }
 */
export const getRiskLevel = (balance, runwayDays) => {
    let status = 'SAFE';
    const messages = [];

    // Wallet Risks
    if (runwayDays <= 3 || balance <= 0) {
        status = 'CRITICAL';
        messages.push('Wallet empty or very low. Please recharge to avoid service shutdown.');
    } else if (runwayDays <= 7 || balance < 10) {
        status = status === 'CRITICAL' ? 'CRITICAL' : 'WARNING';
        messages.push('Low balance alert: Add funds soon to keep your service running.');
    }



    return { status, messages };
};

/**
 * Formats a customer code or tenant ID to consistently start with a lowercase letter (e.g. u1001 or u0001).
 * @param {string|number} code - Customer ID or code.
 * @returns {string} - Formatted customer ID.
 */
export const formatCustomerId = (code) => {
    if (!code) return '';
    const str = String(code);
    if (/^[A-Za-z]/.test(str)) {
        return str.toLowerCase();
    }
    return `u${str}`;
};


