'use client';

import React, { useState } from 'react';
import { createCategory, updateCategory, deleteCategory } from '@/app/actions/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Edit2, Trash2, Loader2 } from 'lucide-react';

export default function CategoryManagerModal({ isOpen, onClose, categories = [] }) {
  const [editingId, setEditingId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'EXPENSE',
    color: '#3b82f6'
  });

  if (!isOpen) return null;

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      type: cat.type,
      color: cat.color || '#cccccc'
    });
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      type: 'EXPENSE',
      color: '#3b82f6'
    });
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this category? Associated transactions will become uncategorized.")) {
      await deleteCategory(id);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateCategory(editingId, formData);
      } else {
        await createCategory(formData);
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
      <div className="bg-background w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Manage Categories</h2>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-8 flex-1">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 bg-muted/30 p-4 rounded-lg border">
            <h3 className="font-semibold">{editingId ? 'Edit Category' : 'Add New Category'}</h3>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="e.g. Groceries" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <select 
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={formData.type} 
                  onChange={e => setFormData({...formData, type: e.target.value})}
                >
                  <option value="EXPENSE">Expense</option>
                  <option value="INCOME">Income</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2">
                  <input 
                    type="color" 
                    value={formData.color} 
                    onChange={e => setFormData({...formData, color: e.target.value})}
                    className="h-9 w-12 cursor-pointer border-0 p-0"
                  />
                  <Input value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} />
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingId ? 'Save Changes' : 'Create Category'}
              </Button>
              {editingId && <Button type="button" variant="outline" onClick={handleCancel}>Cancel</Button>}
            </div>
          </form>

          {/* List */}
          <div className="space-y-4">
            <h3 className="font-semibold">Existing Categories</h3>
            {categories.length === 0 && <p className="text-sm text-muted-foreground">No categories found.</p>}
            <div className="space-y-2">
              {categories.map(cat => (
                <div key={cat.id} className="flex items-center justify-between p-2 border rounded-lg bg-card">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color }}></div>
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{cat.type}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(cat)}><Edit2 className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(cat.id)}><Trash2 className="h-4 w-4" /></Button>
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
