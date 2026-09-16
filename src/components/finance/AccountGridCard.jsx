'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { PiggyBank, TrendingUp, CreditCard, Landmark, ArrowRight, Umbrella } from 'lucide-react';
import { safeFormatCurrency } from '@/lib/formatters';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AccountGridCard({ accounts = [], exchangeRates = [] }) {
  const baseCurrency = 'AUD';

  const getRate = (from, to) => {
    if (from === to) return 1;
    const rate = exchangeRates.find(r => r.sourceCurrency === from && r.targetCurrency === to);
    return rate ? rate.rate : 1;
  };

  const groupedAccounts = accounts.reduce((acc, account) => {
    if (!acc[account.type]) {
      acc[account.type] = [];
    }
    acc[account.type].push(account);
    return acc;
  }, {});

  const getIcon = (type) => {
    switch (type) {
      case 'CHECKING':
      case 'SAVINGS':
        return <PiggyBank className="w-5 h-5 text-green-500" />;
      case 'INVESTMENT':
        return <TrendingUp className="w-5 h-5 text-purple-500" />;
      case 'SUPER':
        return <Umbrella className="w-5 h-5 text-indigo-400" />;
      case 'CREDIT':
      case 'LOAN':
        return <CreditCard className="w-5 h-5 text-red-500" />;
      default:
        return <Landmark className="w-5 h-5 text-blue-500" />;
    }
  };


  return (
    <div className="space-y-6">
      {Object.entries(groupedAccounts).map(([type, accs]) => (
        <div key={type} className="space-y-3">
          <h3 className="text-lg font-semibold tracking-tight capitalize border-b pb-2">
            {type.replace('_', ' ')}
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accs.map(account => {
              const convertedValue = account.currentBalance * getRate(account.currency, baseCurrency);
              return (
                <Card key={account.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      {getIcon(account.type)}
                      {account.name}
                    </CardTitle>
                    <span className="text-xs font-semibold px-2 py-1 bg-secondary rounded-full">
                      {account.currency}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xl font-bold">
                      {safeFormatCurrency(account.currentBalance, account.currency)}
                    </div>
                    {account.currency !== baseCurrency && (
                      <p className="text-xs text-muted-foreground mt-1">
                        ≈ {safeFormatCurrency(convertedValue, baseCurrency)}
                      </p>
                    )}
                  </CardContent>
                  <CardFooter className="pt-1 pb-4">
                    <Button variant="ghost" size="sm" asChild className="w-full justify-between h-8">
                      <Link href={`/finance/ledger?account=${account.id}`}>
                        View Ledger <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
