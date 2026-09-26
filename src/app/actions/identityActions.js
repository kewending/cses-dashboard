'use server';

import prisma from '../../lib/prisma';

export async function getIdentityData() {
  try {
    // Ensure Manifesto exists
    let manifesto = await prisma.identityManifesto.findFirst();
    if (!manifesto) {
      manifesto = await prisma.identityManifesto.create({
        data: {
          archetype: 'Sovereign Creator',
          statement: 'I am the type of person who executes without hesitation.',
          antiVision: 'I will never become someone who...',
          mvpVision: 'My ideal week consists of...',
          birthday: '2000-01-01',
          avatarUrl: '',
        },
      });
    }

    // Ensure LogOddsState exists
    let logOddsState = await prisma.logOddsState.findFirst();
    if (!logOddsState) {
      const today = new Date().toISOString().split('T')[0];
      logOddsState = await prisma.logOddsState.create({
        data: {
          currentLogOdds: -4.5,
          difficultyBeta0: 90,
          lastDecayDate: today,
        },
      });
    }

    // Run Daily Decay Check automatically on fetch
    const today = new Date().toISOString().split('T')[0];
    if (logOddsState.lastDecayDate && logOddsState.lastDecayDate !== today) {
      const lastDate = new Date(logOddsState.lastDecayDate);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays > 0) {
        const decayAmount = diffDays * -0.1;
        logOddsState = await prisma.logOddsState.update({
          where: { id: logOddsState.id },
          data: {
            currentLogOdds: logOddsState.currentLogOdds + decayAmount,
            lastDecayDate: today,
          },
        });
      }
    } else if (!logOddsState.lastDecayDate) {
      logOddsState = await prisma.logOddsState.update({
        where: { id: logOddsState.id },
        data: { lastDecayDate: today },
      });
    }

    // Fetch recent votes (last 100 for the feed)
    const recentVotes = await prisma.identityVote.findMany({
      take: 100,
      orderBy: { timestamp: 'desc' },
      include: {
        task: { select: { title: true } },
        dailyLog: { select: { date: true } },
      }
    });

    const activeEffects = await prisma.activeEffect.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, manifesto, logOddsState, frictionRules: [], recentVotes, activeEffects };
  } catch (error) {
    console.error('Error fetching identity data:', error);
    return { success: false, error: 'Failed to fetch identity data' };
  }
}

export async function updateManifesto(data) {
  try {
    const manifesto = await prisma.identityManifesto.findFirst();
    const updated = await prisma.identityManifesto.update({
      where: { id: manifesto.id },
      data,
    });
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error updating manifesto:', error);
    return { success: false, error: 'Failed to update manifesto' };
  }
}

export async function updateDifficulty(difficultyBeta0) {
  try {
    const logOddsState = await prisma.logOddsState.findFirst();
    
    // Calculate new initial LogOdds: ln(1 / beta0)
    const newLogOdds = Math.log(1 / difficultyBeta0);
    
    const updated = await prisma.logOddsState.update({
      where: { id: logOddsState.id },
      data: {
        difficultyBeta0,
        currentLogOdds: newLogOdds,
      },
    });
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error updating difficulty:', error);
    return { success: false, error: 'Failed to update difficulty' };
  }
}

export async function castVote({ logOddsValue, description, taskId, dailyLogId, interactionId }) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // 1. Create the vote
    const vote = await prisma.identityVote.create({
      data: {
        date: today,
        logOddsValue: parseFloat(logOddsValue),
        description,
        taskId,
        dailyLogId,
        interactionId,
      },
    });

    // 2. Update the LogOddsState
    const logOddsState = await prisma.logOddsState.findFirst();
    const updatedState = await prisma.logOddsState.update({
      where: { id: logOddsState.id },
      data: {
        currentLogOdds: logOddsState.currentLogOdds + parseFloat(logOddsValue),
      },
    });

    return { success: true, vote, updatedState };
  } catch (error) {
    console.error('Error casting vote:', error);
    return { success: false, error: 'Failed to cast vote' };
  }
}

export async function createActiveEffect(data) {
  try {
    const effect = await prisma.activeEffect.create({ data });
    return { success: true, effect };
  } catch (error) {
    return { success: false, error: 'Failed to create active effect' };
  }
}

export async function deleteActiveEffect(id) {
  try {
    await prisma.activeEffect.delete({ where: { id } });
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Failed to delete active effect' };
  }
}

// Removed manageFrictionRule function

export async function getCyberneticQuests() {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    const allMainProjects = await prisma.project.findMany({
      where: { parentProjectId: null },
      include: {
        subprojects: {
          select: { id: true, status: true }
        }
      }
    });
    
    const enrichProjects = (projects) => projects.map(p => {
      let totalSub = p.subprojects?.length || 0;
      let completedSub = p.subprojects?.filter(sp => sp.status === 'COMPLETED' || sp.status === 'DONE').length || 0;
      return { ...p, totalSubprojects: totalSub, completedSubprojects: completedSub };
    });
    
    const yearMissions = enrichProjects(allMainProjects.filter(p => {
      if (!p.endDate) return false;
      const endYear = new Date(p.endDate).getFullYear();
      return endYear === currentYear;
    }));
    
    const activeSubprojects = await prisma.project.findMany({
      where: { 
        status: { notIn: ['COMPLETED', 'DONE'] }
      },
      include: {
        tasks: { select: { id: true, isCompleted: true } }
      }
    });

    const monthBosses = activeSubprojects.filter(p => {
      if (!p.endDate) return false;
      const d = new Date(p.endDate);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).map(p => {
      const totalTasks = p.tasks?.length || 0;
      const completedTasks = p.tasks?.filter(t => t.isCompleted).length || 0;
      return { ...p, completedTasks, totalTasks };
    });
    
    const d = new Date();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const dayStr = d.getDate().toString().padStart(2, '0');
    const todayStr = `${d.getFullYear()}-${m}-${dayStr}`;

    const dailyLevers = await prisma.task.findMany({
      where: {
        priority: "High",
        isCompleted: false,
        OR: [
          { startDate: new Date(todayStr) },
          { status: todayStr }
        ]
      }
    });

    return { success: true, yearMissions, monthBosses, dailyLevers };
  } catch (error) {
    console.error('Error fetching quests:', error);
    return { success: false, error: 'Failed to fetch quests' };
  }
}

export async function getDashboardStats() {
  try {
    const netWorthResult = await prisma.financeAccount.aggregate({
      _sum: { currentBalance: true },
    });
    const netWorth = netWorthResult._sum.currentBalance || 0;

    const networkCount = await prisma.contact.count();

    return { success: true, netWorth, networkCount };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { success: false, error: 'Failed to fetch dashboard stats' };
  }
}
