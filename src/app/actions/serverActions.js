'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function getTasks() {
  const tasks = await prisma.task.findMany({
    include: {
      subtasks: true,
      sessions: true,
    }
  });
  return tasks;
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
  const { startDate, dueDate, ...rest } = data;
  
  const task = await prisma.task.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  revalidatePath('/actions');
  return task;
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

export async function createSubtask(parentId, data) {
  const subtask = await prisma.task.create({
    data: {
      ...data,
      parentTaskId: parentId,
    }
  });
  revalidatePath('/actions');
  return subtask;
}
