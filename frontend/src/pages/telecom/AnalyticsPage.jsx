import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

const AnalyticsPage = () => {
    // Mock Data
    const dailyUsage = [
        { name: 'Mon', inbound: 400, outbound: 240 },
        { name: 'Tue', inbound: 300, outbound: 139 },
        { name: 'Wed', inbound: 200, outbound: 980 },
        { name: 'Thu', inbound: 278, outbound: 390 },
        { name: 'Fri', inbound: 189, outbound: 480 },
        { name: 'Sat', inbound: 239, outbound: 380 },
        { name: 'Sun', inbound: 349, outbound: 430 },
    ];

    const walletBurndown = [
        { name: 'Jan 1', balance: 200 },
        { name: 'Jan 5', balance: 190 },
        { name: 'Jan 10', balance: 175 },
        { name: 'Jan 15', balance: 160 },
        { name: 'Jan 20', balance: 120 },
        { name: 'Jan 25', balance: 110 },
        { name: 'Jan 30', balance: 90 },
    ];

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Call Volume Chart */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Call Volume (Minutes)</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={dailyUsage}
                                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="inbound" stackId="a" fill="#0ea5e9" name="Inbound" />
                                <Bar dataKey="outbound" stackId="a" fill="#f97316" name="Outbound" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Wallet Burndown */}
                <div className="bg-white p-6 rounded-lg shadow">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Wallet Burndown</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart
                                data={walletBurndown}
                                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip formatter={(value) => `$${value}`} />
                                <Area type="monotone" dataKey="balance" stroke="#10b981" fill="#d1fae5" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Traffic Distribution by Country</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded text-center">
                        <p className="text-2xl font-bold text-gray-900">85%</p>
                        <p className="text-sm text-gray-500">United States</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded text-center">
                        <p className="text-2xl font-bold text-gray-900">10%</p>
                        <p className="text-sm text-gray-500">Canada</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded text-center">
                        <p className="text-2xl font-bold text-gray-900">3%</p>
                        <p className="text-sm text-gray-500">United Kingdom</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded text-center">
                        <p className="text-2xl font-bold text-gray-900">2%</p>
                        <p className="text-sm text-gray-500">Other</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;
