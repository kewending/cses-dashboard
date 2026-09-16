'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { safeFormatCurrency } from '@/lib/formatters';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format, startOfMonth, subMonths } from 'date-fns';

export default function CashFlowChart({ transactions = [], exchangeRates = [] }) {
  const baseCurrency = 'AUD'; // Fixed for now

  const getRate = (from, to) => {
    if (from === to) return 1;
    const rate = exchangeRates.find(r => r.sourceCurrency === from && r.targetCurrency === to);
    return rate ? rate.rate : 1;
  };

  // Generate last 6 months of data
  const chartData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(startOfMonth(new Date()), i);
      const monthKey = format(monthDate, 'MMM yyyy');
      data.push({
        month: monthKey,
        date: monthDate,
        income: 0,
        expense: 0,
      });
    }

    transactions.forEach(tx => {
      if (tx.type === 'TRANSFER') return; // Transfers don't affect net cash flow typically

      const txDate = new Date(tx.date);
      const txMonthKey = format(txDate, 'MMM yyyy');

      const monthData = data.find(d => d.month === txMonthKey);
      if (monthData) {
        const rate = getRate(tx.account?.currency || baseCurrency, baseCurrency);
        const convertedAmount = tx.amount * rate;

        if (tx.type === 'INCOME') {
          monthData.income += convertedAmount;
        } else if (tx.type === 'EXPENSE') {
          monthData.expense += convertedAmount;
        }
      }
    });

    return data;
  }, [transactions, exchangeRates]);

  const formatCurrency = (value) => safeFormatCurrency(value, baseCurrency, { maximumFractionDigits: 0 });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Cash Flow (Last 6 Months)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dy={10} />
              <YAxis tickFormatter={formatCurrency} axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} dx={-10} />
              <Tooltip
                formatter={(value) => formatCurrency(value)}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} />
              <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expense" name="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
