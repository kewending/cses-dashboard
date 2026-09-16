'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { ArrowUp, ArrowDown, ArrowRight, Edit2, Trash2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { safeFormatCurrency } from '@/lib/formatters';
import TransactionForm from './TransactionForm';
import { deleteTransaction } from '@/app/actions/finance';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function ListLedgerView({ transactions = [], accounts = [], categories = [] }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTxId, setEditingTxId] = useState(null);

  const filteredTransactions = transactions.filter(tx => {
    const searchLower = searchTerm.toLowerCase();
    return (
      tx.note?.toLowerCase().includes(searchLower) ||
      tx.account?.name.toLowerCase().includes(searchLower) ||
      tx.category?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this transaction? This will revert the account balance.")) {
      try {
        await deleteTransaction(id);
      } catch (err) {
        console.error(err);
        alert("Failed to delete transaction.");
      }
    }
  };

  const editingTx = editingTxId ? transactions.find(t => t.id === editingTxId) : null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>All Transactions</CardTitle>
        <CardDescription>A list view of your historical transactions.</CardDescription>
        <div className="relative mt-4">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search notes, accounts, or categories..."
            className="pl-8 max-w-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {editingTx && (
          <div className="bg-card border rounded-lg p-6 mb-6 shadow-sm">
            <h3 className="font-medium mb-4">Edit Transaction</h3>
            <TransactionForm
              date={new Date(editingTx.date)}
              accounts={accounts}
              categories={categories}
              initialData={editingTx}
              onSuccess={() => setEditingTxId(null)}
              onCancel={() => setEditingTxId(null)}
            />
          </div>
        )}

        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 transition-colors">
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground w-[120px]">Date</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Type</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Account</th>
                <th className="h-10 px-4 text-left align-middle font-medium text-muted-foreground">Category/Note</th>
                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground">Amount</th>
                <th className="h-10 px-4 text-right align-middle font-medium text-muted-foreground w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground">
                    No results found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <td className="p-4 align-middle whitespace-nowrap">
                      {format(new Date(tx.date), 'MMM d, yyyy')}
                      <div className="text-xs text-muted-foreground">{format(new Date(tx.date), 'h:mm a')}</div>
                    </td>
                    <td className="p-4 align-middle">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${tx.type === 'INCOME' ? 'bg-green-500/10 text-green-500' :
                          tx.type === 'EXPENSE' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                        {tx.type === 'INCOME' ? <ArrowUp className="h-3 w-3" /> :
                          tx.type === 'EXPENSE' ? <ArrowDown className="h-3 w-3" /> : <ArrowRight className="h-3 w-3" />}
                        {tx.type}
                      </div>
                    </td>
                    <td className="p-4 align-middle font-medium">
                      {tx.account?.name}
                      {tx.type === 'TRANSFER' && tx.destinationAccount && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <ArrowRight className="h-3 w-3" /> {tx.destinationAccount.name}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-middle">
                      <div className="font-medium">
                        {tx.category?.name || (tx.type === 'TRANSFER' ? 'Transfer' : 'Uncategorized')}
                      </div>
                      {tx.note && <div className="text-xs text-muted-foreground truncate max-w-[200px]">{tx.note}</div>}
                    </td>
                    <td className={`p-4 align-middle text-right font-semibold ${tx.type === 'INCOME' ? 'text-green-500' :
                        tx.type === 'EXPENSE' ? 'text-red-500' : 'text-blue-500'
                      }`}>
                      {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                      {safeFormatCurrency(tx.amount, tx.account?.currency || 'AUD')}
                      {tx.type === 'TRANSFER' && tx.exchangeRate && tx.exchangeRate !== 1 && (
                        <div className="text-xs text-muted-foreground font-normal mt-1">
                          Rate: {tx.exchangeRate}
                        </div>
                      )}
                    </td>
                    <td className="p-4 align-middle text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingTxId(tx.id)}>
                          <Edit2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50" onClick={() => handleDelete(tx.id)}>
                          <Trash2 className="h-4 w-4 text-red-500 hover:text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
