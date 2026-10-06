
import React, { useState, useEffect } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    AreaChart, Area
} from 'recharts';
import api from '../../services/api';

export const GrowthChart = () => {
    const [data, setData] = useState([]);
    const [period, setPeriod] = useState('30d');

    useEffect(() => {
        api.get(`/tenants/analytics/growth?period=${period}`)
            .then(res => setData(res.data));
    }, [period]);

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3>New Tenants Growth</h3>
                <select value={period} onChange={e => setPeriod(e.target.value)} className="chart-select">
                    <option value="30d">Last 30 Days</option>
                    <option value="12m">Last 12 Months</option>
                </select>
            </div>
            <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="value" stroke="#8884d8" fillOpacity={1} fill="url(#colorGrowth)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export const RevenueChart = () => {
    const [data, setData] = useState([]);
    const [period, setPeriod] = useState('30d');

    useEffect(() => {
        api.get(`/tenants/analytics/revenue?period=${period}`)
            .then(res => setData(res.data));
    }, [period]);

    return (
        <div className="chart-container">
            <div className="chart-header">
                <h3>Revenue Trend</h3>
                <select value={period} onChange={e => setPeriod(e.target.value)} className="chart-select">
                    <option value="30d">Last 30 Days</option>
                    <option value="12m">Last 12 Months</option>
                </select>
            </div>
            <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={(value) => `$${value}`} />
                        <Tooltip formatter={(value) => [`$${value}`, 'Revenue']} />
                        <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};
