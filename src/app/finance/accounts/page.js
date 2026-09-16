'use client';

import React, { useState, useEffect } from 'react';
import { getAccountsSummary, getExchangeRates, getCategories } from '@/app/actions/finance';
import NetWorthKpiWidget from '@/components/finance/NetWorthKpiWidget';
import AssetAllocationChart from '@/components/finance/AssetAllocationChart';
import AccountGridCard from '@/components/finance/AccountGridCard';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Settings } from 'lucide-react';
import AccountManagerModal from '@/components/finance/AccountManagerModal';
import CategoryManagerModal from '@/components/finance/CategoryManagerModal';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [exchangeRates, setExchangeRates] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // We fetch data in a useEffect here because we want to be able to refresh 
  // it on the client after closing the modals.
  const fetchData = async () => {
    const accs = await getAccountsSummary();
    const rates = await getExchangeRates();
    const cats = await getCategories();
    setAccounts(accs);
    setExchangeRates(rates);
    setCategories(cats);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAccountModalClose = () => {
    setIsAccountModalOpen(false);
    fetchData(); // Refresh data in case changes were made
  };

  const handleCategoryModalClose = () => {
    setIsCategoryModalOpen(false);
    fetchData(); // Refresh data in case changes were made
  };

  return (
    <div className="p-8 space-y-8 bg-background min-h-screen text-foreground">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Wealth Overview</h1>
          <p className="text-muted-foreground mt-2">
            Manage your accounts, track your net worth, and analyze your asset allocation.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setIsCategoryModalOpen(true)}>
            <Settings className="mr-2 h-4 w-4" /> Manage Categories
          </Button>
          <Button asChild variant="outline">
            <Link href="/finance/ledger">View Ledger</Link>
          </Button>
          <Button onClick={() => setIsAccountModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add / Manage Accounts
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-card border-dashed">
          <h2 className="text-xl font-semibold mb-2">No accounts found</h2>
          <p className="text-muted-foreground mb-6">Create an account to start tracking your net worth.</p>
          <Button onClick={() => setIsAccountModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create First Account
          </Button>
        </div>
      ) : (
        <>
          <NetWorthKpiWidget accounts={accounts} exchangeRates={exchangeRates} />
          
          <div className="pt-4">
            <h2 className="text-xl font-semibold mb-4 tracking-tight">Asset Allocation</h2>
            <AssetAllocationChart accounts={accounts} exchangeRates={exchangeRates} />
          </div>

          <div className="pt-4">
            <h2 className="text-xl font-semibold mb-4 tracking-tight">Your Accounts</h2>
            <AccountGridCard accounts={accounts} exchangeRates={exchangeRates} />
          </div>
        </>
      )}

      <AccountManagerModal 
        isOpen={isAccountModalOpen} 
        onClose={handleAccountModalClose} 
        accounts={accounts} 
      />
      
      <CategoryManagerModal 
        isOpen={isCategoryModalOpen} 
        onClose={handleCategoryModalClose} 
        categories={categories} 
      />
    </div>
  );
}
