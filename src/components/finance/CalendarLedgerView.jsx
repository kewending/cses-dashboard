'use client';

import React, { useState, useMemo } from 'react';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import TransactionDrawer from './TransactionDrawer';

export default function CalendarLedgerView({ transactions = [], accounts = [], categories = [], selectedAccountId }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setIsDrawerOpen(true);
  };

  // Group transactions by date
  const txByDate = useMemo(() => {
    const grouped = {};
    transactions.forEach(tx => {
      const dateStr = format(new Date(tx.date), 'yyyy-MM-dd');
      if (!grouped[dateStr]) {
        grouped[dateStr] = { income: 0, expense: 0, count: 0, list: [] };
      }
      grouped[dateStr].list.push(tx);
      grouped[dateStr].count += 1;
      
      if (tx.type === 'INCOME') {
        grouped[dateStr].income += tx.amount;
      } else if (tx.type === 'EXPENSE') {
        grouped[dateStr].expense += tx.amount;
      }
    });
    return grouped;
  }, [transactions]);

  // Aggregate stats for the month
  const monthStats = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach(tx => {
      const txDate = new Date(tx.date);
      if (isSameMonth(txDate, monthStart)) {
        if (tx.type === 'INCOME') income += tx.amount;
        if (tx.type === 'EXPENSE') expense += tx.amount;
      }
    });
    return { income, expense, net: income - expense };
  }, [transactions, monthStart]);

  return (
    <div className="space-y-4">
      {/* Header & Stats */}
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-center justify-between space-y-2 md:space-y-0 pb-4">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <h2 className="text-xl font-bold w-48 text-center">{format(currentDate, dateFormat)}</h2>
            <Button variant="outline" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground">Inflow</span>
              <span className="text-green-500 font-semibold">+${monthStats.income.toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-muted-foreground">Outflow</span>
              <span className="text-red-500 font-semibold">-${monthStats.expense.toLocaleString()}</span>
            </div>
            <div className="flex flex-col items-end border-l pl-6">
              <span className="text-muted-foreground">Net Flow</span>
              <span className={`font-bold ${monthStats.net >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {monthStats.net >= 0 ? '+' : '-'}${Math.abs(monthStats.net).toLocaleString()}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar Grid */}
      <div className="border rounded-lg overflow-hidden bg-card">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b bg-muted/50">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="py-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-[120px] gap-px bg-border">
          {days.map((day, idx) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const dayData = txByDate[dateKey];
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isToday = isSameDay(day, new Date());

            return (
              <div 
                key={day.toString()} 
                onClick={() => handleDayClick(day)}
                className={`
                  relative bg-card p-2 hover:bg-muted/50 cursor-pointer transition-colors
                  ${!isCurrentMonth ? 'text-muted-foreground opacity-50 bg-muted/20' : ''}
                  ${isToday ? 'bg-primary/5' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-medium ${isToday ? 'bg-primary text-primary-foreground h-6 w-6 rounded-full flex items-center justify-center' : ''}`}>
                    {format(day, 'd')}
                  </span>
                  {dayData?.count > 0 && (
                    <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full">
                      {dayData.count}
                    </span>
                  )}
                </div>

                {/* Day Summary */}
                {dayData && (
                  <div className="mt-2 space-y-1 text-xs">
                    {dayData.income > 0 && (
                      <div className="text-green-500 font-medium truncate">
                        +{dayData.income.toLocaleString()}
                      </div>
                    )}
                    {dayData.expense > 0 && (
                      <div className="text-red-500 font-medium truncate">
                        -{dayData.expense.toLocaleString()}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Side Drawer for Transactions */}
      {selectedDay && (
        <TransactionDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)}
          date={selectedDay}
          transactions={txByDate[format(selectedDay, 'yyyy-MM-dd')]?.list || []}
          accounts={accounts}
          categories={categories}
          defaultAccountId={selectedAccountId}
        />
      )}
    </div>
  );
}
