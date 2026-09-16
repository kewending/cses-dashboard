'use client';

import React, { useState } from 'react';
import { format } from 'date-fns';
import { X, ArrowRight, ArrowDown, ArrowUp, Edit2, Trash2 } from 'lucide-react';
import TransactionForm from './TransactionForm';
import { deleteTransaction } from '@/app/actions/finance';
import { Button } from '@/components/ui/button';
import { safeFormatCurrency } from '@/lib/formatters';

export default function TransactionDrawer({ isOpen, onClose, date, transactions = [], accounts = [], categories = [], defaultAccountId }) {
  const [editingTxId, setEditingTxId] = useState(null);

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-background h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">
            {format(date, 'EEEE, MMMM d, yyyy')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* New / Edit Transaction Form */}
          <div className="bg-card border rounded-lg p-4 shadow-sm">
            <h3 className="font-medium mb-4">{editingTx ? 'Edit Transaction' : 'Add Transaction'}</h3>
            <TransactionForm
              date={date}
              accounts={accounts}
              categories={categories}
              defaultAccountId={defaultAccountId}
              initialData={editingTx}
              onSuccess={() => {
                setEditingTxId(null);
              }}
              onCancel={() => {
                setEditingTxId(null);
              }}
            />
          </div>

          {/* Transaction List */}
          <div className="space-y-4">
            <h3 className="font-medium text-muted-foreground uppercase text-xs tracking-wider">
              Transactions ({transactions.length})
            </h3>

            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No transactions for this day.
              </p>
            ) : (
              <div className="space-y-2">
                {transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className={`p-2 rounded-full ${tx.type === 'INCOME' ? 'bg-green-500/10 text-green-500' :
                          tx.type === 'EXPENSE' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                        }`}>
                        {tx.type === 'INCOME' ? <ArrowUp className="h-4 w-4" /> :
                          tx.type === 'EXPENSE' ? <ArrowDown className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
                      </div>
                      <div className="truncate">
                        <div className="font-medium text-sm truncate">
                          {tx.category?.name || (tx.type === 'TRANSFER' ? 'Transfer' : 'Uncategorized')}
                        </div>
                        <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          {tx.account?.name}
                          {tx.type === 'TRANSFER' && tx.destinationAccount && (
                            <>
                              <ArrowRight className="h-3 w-3" />
                              {tx.destinationAccount.name}
                            </>
                          )}
                          {tx.note && <span className="ml-2 text-muted-foreground/70">- {tx.note}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <div className={`font-semibold whitespace-nowrap pl-4 ${tx.type === 'INCOME' ? 'text-green-500' :
                          tx.type === 'EXPENSE' ? 'text-red-500' : 'text-blue-500'
                        }`}>
                        {tx.type === 'INCOME' ? '+' : tx.type === 'EXPENSE' ? '-' : ''}
                        {safeFormatCurrency(tx.amount, tx.account?.currency || 'AUD')}
                      </div>
                      {tx.type === 'TRANSFER' && tx.exchangeRate && tx.exchangeRate !== 1 && (
                        <div className="text-xs text-muted-foreground font-normal">
                          Rate: {tx.exchangeRate}
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditingTxId(tx.id)}>
                          <Edit2 className="h-3 w-3 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-red-50" onClick={() => handleDelete(tx.id)}>
                          <Trash2 className="h-3 w-3 text-red-500 hover:text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
