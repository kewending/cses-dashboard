'use server';

import prisma from '../../lib/prisma';
import { castVote } from './identityActions';

export async function getHabits() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const dateLimit = thirtyDaysAgo.toISOString().split('T')[0];

    const habits = await prisma.habit.findMany({
      include: {
        logs: {
          where: {
            date: { gte: dateLimit }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    return { success: true, habits };
  } catch (error) {
    console.error('Error fetching habits:', error);
    return { success: false, error: 'Failed to fetch habits' };
  }
}

export async function createHabit(data) {
  try {
    const habit = await prisma.habit.create({ data });
    return { success: true, habit };
  } catch (error) {
    console.error('Error creating habit:', error);
    return { success: false, error: 'Failed to create habit' };
  }
}

export async function updateHabit(id, data) {
  try {
    const habit = await prisma.habit.update({
      where: { id },
      data
    });
    return { success: true, habit };
  } catch (error) {
    console.error('Error updating habit:', error);
    return { success: false, error: 'Failed to update habit' };
  }
}

export async function deleteHabit(id) {
  try {
    await prisma.habit.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    console.error('Error deleting habit:', error);
    return { success: false, error: 'Failed to delete habit' };
  }
}

export async function logHabit(habitId, type) { // type: 'positive' | 'negative'
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const habit = await prisma.habit.findUnique({ where: { id: habitId } });
    if (!habit) throw new Error('Habit not found');

    let log = await prisma.habitLog.findUnique({
      where: { habitId_date: { habitId, date: today } }
    });

    if (!log) {
      log = await prisma.habitLog.create({
        data: { habitId, date: today }
      });
    }

    let incrementField = type === 'positive' ? 'countPositive' : 'countNegative';
    log = await prisma.habitLog.update({
      where: { id: log.id },
      data: { [incrementField]: { increment: 1 } }
    });

    // Determine Log-Odds value
    let baseValue = 0;
    switch(habit.difficulty) {
      case 'Trivial': baseValue = 0.1; break;
      case 'Easy': baseValue = 0.25; break;
      case 'Medium': baseValue = 0.5; break;
      case 'Hard': baseValue = 1.0; break;
      case 'Very Hard': baseValue = 2.0; break;
      default: baseValue = 0.5;
    }

    let logOddsValue = type === 'positive' ? baseValue : -(baseValue * 2);
    let descPrefix = type === 'positive' ? 'Habit:' : 'Habit failure:';

    await castVote({
      logOddsValue,
      description: `${descPrefix} ${habit.title}`
    });

    return { success: true, log };
  } catch (error) {
    console.error('Error logging habit:', error);
    return { success: false, error: 'Failed to log habit' };
  }
}
