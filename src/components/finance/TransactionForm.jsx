'use client';

import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createTransaction, updateTransaction } from '@/app/actions/finance';
import { Loader2 } from 'lucide-react';

export default function TransactionForm({ date, accounts, categories, defaultAccountId, onSuccess, initialData = null, onCancel }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    date: format(date, "yyyy-MM-dd'T'HH:mm"),
    accountId: defaultAccountId || (accounts.length > 0 ? accounts[0].id : ''),
    type: 'EXPENSE',
    amount: '',
    categoryId: '',
    destinationAccountId: '',
    exchangeRate: '1',
    note: ''
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        date: format(new Date(initialData.date), "yyyy-MM-dd'T'HH:mm"),
        accountId: initialData.accountId,
        type: initialData.type,
        amount: initialData.amount.toString(),
        categoryId: initialData.categoryId || '',
        destinationAccountId: initialData.destinationAccountId || '',
        exchangeRate: initialData.exchangeRate ? initialData.exchangeRate.toString() : '1',
        note: initialData.note || ''
      });
    } else {
      setFormData(prev => ({
        ...prev,
        date: format(date, "yyyy-MM-dd'T'HH:mm")
      }));
    }
  }, [initialData, date]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      if (!formData.accountId || !formData.amount || isNaN(formData.amount)) {
        throw new Error("Please fill out required fields correctly.");
      }

      if (initialData) {
        await updateTransaction(initialData.id, formData);
      } else {
        await createTransaction(formData);
      }

      if (onSuccess) onSuccess();
      
      if (!initialData) {
        // Reset form on success if creating new
        setFormData(prev => ({
          ...prev,
          amount: '',
          note: ''
        }));
      }
    } catch (err) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedAccount = accounts.find(a => a.id === formData.accountId);
  const destAccount = accounts.find(a => a.id === formData.destinationAccountId);
  const isCrossCurrency = formData.type === 'TRANSFER' && selectedAccount && destAccount && selectedAccount.currency !== destAccount.currency;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Type</Label>
          <select 
            id="type"
            name="type" 
            value={formData.type} 
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="EXPENSE">Expense</option>
            <option value="INCOME">Income</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date & Time</Label>
          <Input 
            type="datetime-local" 
            id="date" 
            name="date" 
            value={formData.date} 
            onChange={handleChange} 
            required 
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="accountId">Account</Label>
          <select 
            id="accountId"
            name="accountId" 
            value={formData.accountId} 
            onChange={handleChange}
            required
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select Account</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input 
            type="number" 
            id="amount" 
            name="amount" 
            value={formData.amount} 
            onChange={handleChange} 
            placeholder="0.00" 
            step="0.01" 
            min="0"
            required 
          />
        </div>
      </div>

      {formData.type === 'TRANSFER' && (
        <div className="space-y-2">
          <Label htmlFor="destinationAccountId">To Account</Label>
          <select 
            id="destinationAccountId"
            name="destinationAccountId" 
            value={formData.destinationAccountId} 
            onChange={handleChange}
            required={formData.type === 'TRANSFER'}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">Select Destination</option>
            {accounts.filter(a => a.id !== formData.accountId).map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name}</option>
            ))}
          </select>
        </div>
      )}

      {isCrossCurrency && (
        <div className="space-y-2 p-3 bg-muted rounded-md border">
          <Label htmlFor="exchangeRate">Exchange Rate ({selectedAccount.currency} to {destAccount.currency})</Label>
          <div className="flex gap-2 items-center">
            <span className="text-sm font-medium">1 {selectedAccount.currency} = </span>
            <Input 
              type="number" 
              id="exchangeRate" 
              name="exchangeRate" 
              value={formData.exchangeRate} 
              onChange={handleChange} 
              step="0.000001" 
              min="0.000001"
              required={isCrossCurrency} 
              className="flex-1"
            />
            <span className="text-sm font-medium">{destAccount.currency}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Recipient will receive: {formData.amount ? (parseFloat(formData.amount) * parseFloat(formData.exchangeRate || 0)).toFixed(2) : 0} {destAccount.currency}
          </p>
        </div>
      )}

      {formData.type !== 'TRANSFER' && (
        <div className="space-y-2">
          <Label htmlFor="categoryId">Category</Label>
          <select 
            id="categoryId"
            name="categoryId" 
            value={formData.categoryId} 
            onChange={handleChange}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">No Category</option>
            {categories.filter(c => c.type === formData.type).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="note">Note / Description</Label>
        <Input 
          type="text" 
          id="note" 
          name="note" 
          value={formData.note} 
          onChange={handleChange} 
          placeholder="What was this for?" 
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {initialData ? 'Update Transaction' : 'Save Transaction'}
        </Button>
        {initialData && onCancel && (
          <Button type="button" variant="outline" className="w-full" onClick={onCancel} disabled={isSubmitting}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
