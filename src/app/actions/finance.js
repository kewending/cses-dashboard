"use server";

import prisma from "@/lib/prisma";

// Helper function to safely revalidate if next/cache is available
import { revalidatePath } from "next/cache";

export async function getAccountsSummary() {
  try {
    const accounts = await prisma.financeAccount.findMany({
      orderBy: { name: 'asc' }
    });
    return accounts;
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return [];
  }
}

export async function createAccount(data) {
  try {
    const account = await prisma.financeAccount.create({
      data: {
        name: data.name,
        type: data.type,
        currency: data.currency,
        initialBalance: parseFloat(data.initialBalance || 0),
        currentBalance: parseFloat(data.initialBalance || 0),
        isLiability: data.isLiability || false,
      }
    });
    revalidatePath('/finance/accounts');
    revalidatePath('/finance/ledger');
    return account;
  } catch (error) {
    console.error("Error creating account:", error);
    throw new Error("Failed to create account");
  }
}

export async function getCategories() {
  try {
    const categories = await prisma.financeCategory.findMany({
      orderBy: { name: 'asc' }
    });
    return categories;
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export async function createCategory(data) {
  try {
    const category = await prisma.financeCategory.create({
      data: {
        name: data.name,
        type: data.type, // EXPENSE | INCOME
        color: data.color || '#cccccc'
      }
    });
    return category;
  } catch (error) {
    console.error("Error creating category:", error);
    throw new Error("Failed to create category");
  }
}

export async function getTransactions(startDate, endDate, accountId = null) {
  try {
    const whereClause = {};
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }
    if (accountId) {
      whereClause.OR = [
        { accountId },
        { destinationAccountId: accountId }
      ];
    }

    const transactions = await prisma.financeTransaction.findMany({
      where: whereClause,
      include: {
        account: true,
        destinationAccount: true,
        category: true,
      },
      orderBy: { date: 'desc' },
    });
    return transactions;
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return [];
  }
}

export async function createTransaction(data) {
  try {
    const amount = parseFloat(data.amount);
    
    // 1. Create the transaction
    const transaction = await prisma.financeTransaction.create({
      data: {
        accountId: data.accountId,
        date: new Date(data.date),
        amount: amount,
        type: data.type, // INCOME, EXPENSE, TRANSFER
        destinationAccountId: data.destinationAccountId || null,
        categoryId: data.categoryId || null,
        note: data.note || "",
        exchangeRate: data.exchangeRate ? parseFloat(data.exchangeRate) : null,
      }
    });

    // 2. Update account balances
    if (data.type === 'INCOME') {
      await prisma.financeAccount.update({
        where: { id: data.accountId },
        data: { currentBalance: { increment: amount } }
      });
    } else if (data.type === 'EXPENSE') {
      await prisma.financeAccount.update({
        where: { id: data.accountId },
        data: { currentBalance: { decrement: amount } }
      });
    } else if (data.type === 'TRANSFER' && data.destinationAccountId) {
      const rate = data.exchangeRate ? parseFloat(data.exchangeRate) : 1;
      const destAmount = amount * rate;
      await prisma.financeAccount.update({
        where: { id: data.accountId },
        data: { currentBalance: { decrement: amount } }
      });
      await prisma.financeAccount.update({
        where: { id: data.destinationAccountId },
        data: { currentBalance: { increment: destAmount } }
      });
    }

    revalidatePath('/finance/ledger');
    revalidatePath('/finance/accounts');
    
    return transaction;
  } catch (error) {
    console.error("Error creating transaction:", error);
    throw new Error("Failed to create transaction");
  }
}

export async function getExchangeRates() {
  try {
    return await prisma.exchangeRate.findMany();
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return [];
  }
}

export async function updateExchangeRate(sourceCurrency, targetCurrency, rate) {
  try {
    const er = await prisma.exchangeRate.upsert({
      where: {
        sourceCurrency_targetCurrency: {
          sourceCurrency,
          targetCurrency
        }
      },
      update: {
        rate: parseFloat(rate)
      },
      create: {
        sourceCurrency,
        targetCurrency,
        rate: parseFloat(rate)
      }
    });
    revalidatePath('/finance/accounts');
    return er;
  } catch (error) {
    console.error("Error updating exchange rate:", error);
    throw new Error("Failed to update exchange rate");
  }
}

// ──────────────────────────────────────────────────────────
// Update and Delete Actions
// ──────────────────────────────────────────────────────────

export async function updateAccount(id, data) {
  try {
    const updated = await prisma.financeAccount.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        currency: data.currency,
        currentBalance: parseFloat(data.currentBalance || 0),
        isLiability: data.isLiability || false,
      }
    });
    revalidatePath('/finance/accounts');
    revalidatePath('/finance/ledger');
    return updated;
  } catch (error) {
    console.error("Error updating account:", error);
    throw new Error("Failed to update account");
  }
}

export async function deleteAccount(id) {
  try {
    await prisma.financeAccount.delete({
      where: { id }
    });
    revalidatePath('/finance/accounts');
    revalidatePath('/finance/ledger');
    return true;
  } catch (error) {
    console.error("Error deleting account:", error);
    throw new Error("Failed to delete account");
  }
}

export async function updateCategory(id, data) {
  try {
    const updated = await prisma.financeCategory.update({
      where: { id },
      data: {
        name: data.name,
        type: data.type,
        color: data.color || '#cccccc'
      }
    });
    revalidatePath('/finance/ledger');
    return updated;
  } catch (error) {
    console.error("Error updating category:", error);
    throw new Error("Failed to update category");
  }
}

export async function deleteCategory(id) {
  try {
    await prisma.financeCategory.delete({
      where: { id }
    });
    revalidatePath('/finance/ledger');
    return true;
  } catch (error) {
    console.error("Error deleting category:", error);
    throw new Error("Failed to delete category");
  }
}

export async function updateTransaction(id, data) {
  try {
    // We must reverse the original transaction's effect on balances,
    // update the transaction, and then apply the new effect.
    // For simplicity and safety, we do this in a transaction block.
    
    return await prisma.$transaction(async (tx) => {
      const original = await tx.financeTransaction.findUnique({
        where: { id }
      });

      if (!original) throw new Error("Transaction not found");

      // 1. Reverse original effect
      if (original.type === 'INCOME') {
        await tx.financeAccount.update({
          where: { id: original.accountId },
          data: { currentBalance: { decrement: original.amount } }
        });
      } else if (original.type === 'EXPENSE') {
        await tx.financeAccount.update({
          where: { id: original.accountId },
          data: { currentBalance: { increment: original.amount } }
        });
      } else if (original.type === 'TRANSFER' && original.destinationAccountId) {
        const rate = original.exchangeRate || 1;
        const destAmount = original.amount * rate;
        await tx.financeAccount.update({
          where: { id: original.accountId },
          data: { currentBalance: { increment: original.amount } }
        });
        await tx.financeAccount.update({
          where: { id: original.destinationAccountId },
          data: { currentBalance: { decrement: destAmount } }
        });
      }

      const newAmount = parseFloat(data.amount);

      // 2. Update transaction record
      const updatedTx = await tx.financeTransaction.update({
        where: { id },
        data: {
          accountId: data.accountId,
          date: new Date(data.date),
          amount: newAmount,
          type: data.type,
          destinationAccountId: data.destinationAccountId || null,
          categoryId: data.categoryId || null,
          note: data.note || "",
          exchangeRate: data.exchangeRate ? parseFloat(data.exchangeRate) : null,
        }
      });

      // 3. Apply new effect
      if (data.type === 'INCOME') {
        await tx.financeAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: { increment: newAmount } }
        });
      } else if (data.type === 'EXPENSE') {
        await tx.financeAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: newAmount } }
        });
      } else if (data.type === 'TRANSFER' && data.destinationAccountId) {
        const rate = data.exchangeRate ? parseFloat(data.exchangeRate) : 1;
        const destAmount = newAmount * rate;
        await tx.financeAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: newAmount } }
        });
        await tx.financeAccount.update({
          where: { id: data.destinationAccountId },
          data: { currentBalance: { increment: destAmount } }
        });
      }

      return updatedTx;
    });
  } catch (error) {
    console.error("Error updating transaction:", error);
    throw new Error("Failed to update transaction");
  } finally {
    revalidatePath('/finance/ledger');
    revalidatePath('/finance/accounts');
  }
}

export async function deleteTransaction(id) {
  try {
    return await prisma.$transaction(async (tx) => {
      const original = await tx.financeTransaction.findUnique({
        where: { id }
      });

      if (!original) throw new Error("Transaction not found");

      // 1. Reverse original effect
      if (original.type === 'INCOME') {
        await tx.financeAccount.update({
          where: { id: original.accountId },
          data: { currentBalance: { decrement: original.amount } }
        });
      } else if (original.type === 'EXPENSE') {
        await tx.financeAccount.update({
          where: { id: original.accountId },
          data: { currentBalance: { increment: original.amount } }
        });
      } else if (original.type === 'TRANSFER' && original.destinationAccountId) {
        const rate = original.exchangeRate || 1;
        const destAmount = original.amount * rate;
        await tx.financeAccount.update({
          where: { id: original.accountId },
          data: { currentBalance: { increment: original.amount } }
        });
        await tx.financeAccount.update({
          where: { id: original.destinationAccountId },
          data: { currentBalance: { decrement: destAmount } }
        });
      }

      // 2. Delete transaction record
      await tx.financeTransaction.delete({
        where: { id }
      });

      return true;
    });
  } catch (error) {
    console.error("Error deleting transaction:", error);
    throw new Error("Failed to delete transaction");
  } finally {
    revalidatePath('/finance/ledger');
    revalidatePath('/finance/accounts');
  }
}
