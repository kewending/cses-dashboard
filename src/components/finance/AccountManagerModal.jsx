'use client';

import React, { useState } from 'react';
import { createAccount, updateAccount, deleteAccount } from '@/app/actions/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Edit2, Trash2, Plus, Loader2 } from 'lucide-react';
import { safeFormatCurrency } from '@/lib/formatters';

export default function AccountManagerModal({ isOpen, onClose, accounts = [] }) {
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'CHECKING',
    currency: 'AUD',
    initialBalance: '',
    isLiability: false
  });

  if (!isOpen) return null;

  const handleEdit = (acc) => {
    setEditingId(acc.id);
    setFormData({
      name: acc.name,
      type: acc.type,
      currency: acc.currency,
      initialBalance: acc.currentBalance, // using initialBalance field for currentBalance edit
      isLiability: acc.isLiability
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'CHECKING',
      currency: 'AUD',
      initialBalance: '',
      isLiability: false
    });
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure? This will delete all transactions associated with this account!")) {
      await deleteAccount(id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateAccount(editingId, { ...formData, currentBalance: formData.initialBalance });
      } else {
        await createAccount(formData);
      }
      handleCancel();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-background w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Manage Accounts</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-muted/30 p-4 rounded-lg border">
            <h3 className="font-semibold">{editingId ? 'Edit Account' : 'Add New Account'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required placeholder="e.g. Chase Checking" />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formData.type}
                  onChange={e => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="CHECKING">Checking</option>
                  <option value="SAVINGS">Savings</option>
                  <option value="INVESTMENT">Investment</option>
                  <option value="SUPER">Superannuation</option>
                  <option value="CREDIT">Credit Card</option>
                  <option value="LOAN">Loan</option>
                  <option value="PHYSICAL_ASSET">Physical Asset</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={formData.currency} onChange={e => setFormData({ ...formData, currency: e.target.value.toUpperCase() })} required maxLength={3} placeholder="AUD" />
              </div>
              <div className="space-y-2">
                <Label>{editingId ? 'Current Balance' : 'Initial Balance'}</Label>
                <Input type="number" step="0.01" value={formData.initialBalance} onChange={e => setFormData({ ...formData, initialBalance: e.target.value })} required />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input type="checkbox" id="isLiability" checked={formData.isLiability} onChange={e => setFormData({ ...formData, isLiability: e.target.checked })} />
              <Label htmlFor="isLiability">This is a liability (debt)</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Account'}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>}
            </div>
          </form>

          {/* List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Existing Accounts</h3>
            {accounts.length === 0 && <p className="text-sm text-muted-foreground">No accounts found.</p>}
            <div className="space-y-2">
              {accounts.map(acc => (
                <div key={acc.id} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                  <div>
                    <p className="font-medium">{acc.name} <span className="text-xs text-muted-foreground ml-2 px-2 py-0.5 bg-muted rounded-full">{acc.type}</span></p>
                    <p className="text-sm text-muted-foreground">{safeFormatCurrency(acc.currentBalance, acc.currency)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(acc)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(acc.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
