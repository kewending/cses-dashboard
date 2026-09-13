'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

function formatTask(t) {
  return {
    ...t,
    startDate: t.startDate ? t.startDate.toISOString().split('T')[0] : '',
    dueDate: t.dueDate ? t.dueDate.toISOString().split('T')[0] : '',
    subtasks: t.subtasks ? t.subtasks.map(formatTask) : undefined
  };
}

export async function getTasks() {
  const tasks = await prisma.task.findMany({
    include: {
      subtasks: {
        orderBy: { order: 'asc' }
      },
      sessions: true,
    }
  });
  return tasks.map(formatTask);
}

export async function getSessions() {
  const sessions = await prisma.session.findMany();
  return sessions;
}

export async function getObjectives() {
  const objectives = await prisma.objective.findMany();
  return objectives;
}

export async function createTask(data) {
  const { startDate, dueDate, subtasks, sessions, id, ...rest } = data;
  
  try {
    const task = await prisma.task.create({
      data: {
        ...rest,
        id: id || undefined,
        startDate: startDate ? new Date(startDate) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
      },
    });
    revalidatePath('/actions');
    return formatTask(task);
  } catch (err) {
    const fs = require('fs');
    fs.appendFileSync('C:/Users/30313357/.gemini/antigravity-ide/brain/b90c2e57-8f83-4651-a19e-38a32356a2b2/scratch/log.txt', '\\nError in createTask: ' + err.stack + '\\nData: ' + JSON.stringify(data));
    throw err;
  }
}

export async function updateTask(id, data) {
  const { startDate, dueDate, subtasks, sessions, ...rest } = data;
  
  let updateData = { ...rest };
  if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
  if (dueDate !== undefined) updateData.dueDate = dueDate ? new Date(dueDate) : null;

  const task = await prisma.task.update({
    where: { id },
    data: updateData,
  });
  revalidatePath('/actions');
  return task;
}

export async function toggleTaskComplete(id, isCompleted) {
  const task = await prisma.task.update({
    where: { id },
    data: { isCompleted },
  });
  revalidatePath('/actions');
  return task;
}

export async function createSession(data) {
  // Prevent duplicates by deleting any existing session for this task
  await prisma.session.deleteMany({
    where: { taskId: data.taskId }
  });

  const session = await prisma.session.create({
    data: {
      taskId: data.taskId,
      startMinutes: data.startMinutes,
      date: new Date(data.date),
    },
  });
  revalidatePath('/actions');
  return session;
}

export async function updateSession(id, data) {
  const session = await prisma.session.update({
    where: { id },
    data: {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    },
  });
  revalidatePath('/actions');
  return session;
}

export async function deleteSession(id) {
  await prisma.session.delete({
    where: { id }
  });
  revalidatePath('/actions');
}

export async function deleteTask(id) {
  await prisma.task.delete({
    where: { id }
  });
  revalidatePath('/actions');
}

export async function createSubtask(parentId, data) {
  const { startDate, dueDate, ...rest } = data;
  const subtask = await prisma.task.create({
    data: {
      ...rest,
      parentTaskId: parentId,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    }
  });
  revalidatePath('/actions');
  return formatTask(subtask);
}

export async function reorderSubtasks(taskOrders) {
  // taskOrders is an array of { id: string, order: number }
  const updates = taskOrders.map((t) => 
    prisma.task.update({
      where: { id: t.id },
      data: { order: t.order },
    })
  );
  
  await prisma.$transaction(updates);
  revalidatePath('/actions');
}
