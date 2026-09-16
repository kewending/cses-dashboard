import React from 'react';
import { getAccountsSummary, getCategories, getTransactions } from '@/app/actions/finance';
import CalendarLedgerView from '@/components/finance/CalendarLedgerView';
import ListLedgerView from '@/components/finance/ListLedgerView';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import CashFlowChart from '@/components/finance/CashFlowChart';

export const metadata = {
  title: 'Ledger - Finance',
};

// Next.js passes searchParams as a prop to page components
export default async function LedgerPage({ searchParams }) {
  // Await the searchParams to safely access properties in Next.js 15+ or App Router
  const resolvedSearchParams = await searchParams;
  const accountId = resolvedSearchParams?.account || null;

  const accounts = await getAccountsSummary();
  const categories = await getCategories();
  
  // For the calendar, we fetch all transactions if no account is selected, or just for the selected account
  // We fetch a wide date range for now, but in a real app, this should be paginated or date-bound via API
  const transactions = await getTransactions(null, null, accountId);
  const view = resolvedSearchParams?.view || 'calendar';

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-foreground">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/finance/accounts">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ledger & Calendar</h1>
            <p className="text-muted-foreground mt-1">
              Track daily transactions and analyze cash flow.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex bg-muted p-1 rounded-md">
            <Button asChild variant={view === 'calendar' ? 'secondary' : 'ghost'} size="sm" className="h-8">
              <Link href={`/finance/ledger?view=calendar${accountId ? `&account=${accountId}` : ''}`}>Calendar</Link>
            </Button>
            <Button asChild variant={view === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-8">
              <Link href={`/finance/ledger?view=list${accountId ? `&account=${accountId}` : ''}`}>List</Link>
            </Button>
          </div>

          <form className="flex items-center gap-2" method="GET">
            <input type="hidden" name="view" value={view} />
            <label htmlFor="account-filter" className="text-sm font-medium">Filter:</label>
            <select 
              id="account-filter"
              name="account"
              defaultValue={accountId || ""}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            <Button type="submit" variant="secondary" size="sm" className="h-9">Filter</Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-6">
          {view === 'calendar' ? (
            <CalendarLedgerView 
              transactions={transactions} 
              accounts={accounts} 
              categories={categories}
              selectedAccountId={accountId}
            />
          ) : (
            <ListLedgerView 
              transactions={transactions} 
              accounts={accounts} 
              categories={categories}
            />
          )}
        </div>
        
        <div className="space-y-6">
          <CashFlowChart transactions={transactions} exchangeRates={[]} />
        </div>
      </div>
    </div>
  );
}
