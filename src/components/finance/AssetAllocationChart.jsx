'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { safeFormatCurrency } from '@/lib/formatters';
import { useSettings } from '@/lib/SettingsContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#64748b'];

export default function AssetAllocationChart({ accounts = [], exchangeRates = [] }) {
  const { settings } = useSettings();
  const baseCurrency = settings.finance.baseCurrency;

  const getRate = (from, to) => {
    if (from === to) return 1;
    const rate = exchangeRates.find(r => r.sourceCurrency === from && r.targetCurrency === to);
    return rate ? rate.rate : 1;
  };

  const accountData = [];
  const typeData = {};

  accounts.forEach(acc => {
    if (acc.isLiability) return; // Usually asset allocation only counts positive assets

    const rate = getRate(acc.currency, baseCurrency);
    const convertedBalance = acc.currentBalance * rate;

    if (convertedBalance > 0) {
      accountData.push({ name: acc.name, value: convertedBalance });

      if (!typeData[acc.type]) typeData[acc.type] = 0;
      typeData[acc.type] += convertedBalance;
    }
  });

  const typeChartData = Object.keys(typeData).map(key => ({
    name: key.replace('_', ' '),
    value: typeData[key]
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">By Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={accountData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {accountData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => safeFormatCurrency(value, baseCurrency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">By Asset Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={typeChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {typeChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => safeFormatCurrency(value, baseCurrency)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
