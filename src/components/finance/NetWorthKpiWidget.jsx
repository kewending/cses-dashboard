'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Wallet, TrendingUp, PiggyBank, CreditCard, Umbrella } from 'lucide-react';
import { safeFormatCurrency } from '@/lib/formatters';

export default function NetWorthKpiWidget({ accounts = [], exchangeRates = [] }) {
  // Determine base currency, default to first account's currency or 'USD'
  const baseCurrency = 'AUD'; // Simplified for now, can be dynamically selected

  const getRate = (from, to) => {
    if (from === to) return 1;
    const rate = exchangeRates.find(r => r.sourceCurrency === from && r.targetCurrency === to);
    return rate ? rate.rate : 1; // Fallback to 1 if not found
  };

  let totalAssets = 0;
  let totalLiabilities = 0;
  let liquidCash = 0;
  let investments = 0;
  let superBalance = 0;

  accounts.forEach(acc => {
    const rate = getRate(acc.currency, baseCurrency);
    const convertedBalance = acc.currentBalance * rate;

    if (acc.isLiability) {
      totalLiabilities += convertedBalance;
    } else {
      totalAssets += convertedBalance;
      if (acc.type === 'CHECKING' || acc.type === 'SAVINGS') {
        liquidCash += convertedBalance;
      } else if (acc.type === 'INVESTMENT') {
        investments += convertedBalance;
      } else if (acc.type === 'SUPER') {
        superBalance += convertedBalance;
      }
    }
  });

  const netWorth = totalAssets - totalLiabilities;
  const exSuperNetWorth = netWorth - superBalance;

  const formatCurrency = (val) => safeFormatCurrency(val, baseCurrency);

  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
      <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Net Worth</CardTitle>
          <Wallet className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(netWorth)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            ex-Super: <span className="font-medium text-foreground">{formatCurrency(exSuperNetWorth)}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Liquid Cash</CardTitle>
          <PiggyBank className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(liquidCash)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Checking & Savings
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Investments</CardTitle>
          <TrendingUp className="h-4 w-4 text-purple-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(investments)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Brokerage & Crypto
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Superannuation</CardTitle>
          <Umbrella className="h-4 w-4 text-indigo-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(superBalance)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Preserved for retirement
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Liabilities</CardTitle>
          <CreditCard className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(totalLiabilities)}</div>
          <p className="text-xs text-muted-foreground mt-1">
            Credit & Loans
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
