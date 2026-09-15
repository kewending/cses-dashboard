'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// ─── Helper ───────────────────────────────────────────────────────────────────

function formatContact(c) {
  return {
    ...c,
    createdAt: c.createdAt?.toISOString?.() ?? c.createdAt,
    updatedAt: c.updatedAt?.toISOString?.() ?? c.updatedAt,
    interactions: c.interactions?.map(i => ({
      ...i,
      createdAt: i.createdAt?.toISOString?.() ?? i.createdAt,
    })),
  };
}

// ─── Contacts ─────────────────────────────────────────────────────────────────

export async function getContacts() {
  try {
    const contacts = await prisma.contact.findMany({
      include: {
        contactMethods: true,
        backgroundHistory: { orderBy: { startDate: 'desc' } },
      },
      orderBy: { fullName: 'asc' },
    });
    return contacts.map(formatContact);
  } catch (e) {
    console.error('getContacts error:', e);
    return [];
  }
}

export async function getContactById(id) {
  try {
    const contact = await prisma.contact.findUnique({
      where: { id },
      include: {
        contactMethods: true,
        backgroundHistory: { orderBy: { startDate: 'desc' } },
        interactions: { orderBy: { date: 'desc' } },
        relatedTo: {
          include: { to: { select: { id: true, fullName: true, chineseName: true, avatarUrl: true, tier: true } } },
        },
        relatedFrom: {
          include: { from: { select: { id: true, fullName: true, chineseName: true, avatarUrl: true, tier: true } } },
        },
      },
    });
    if (!contact) return null;
    return formatContact(contact);
  } catch (e) {
    console.error('getContactById error:', e);
    return null;
  }
}

export async function createContact(data) {
  try {
    const contact = await prisma.contact.create({
      data: {
        fullName: data.fullName,
        chineseName: data.chineseName || null,
        displayName: data.displayName || null,
        tier: Number(data.tier ?? 3),
        status: 'active',
        gender: data.gender || null,
        birthday: data.birthday || null,
        city: data.city || null,
        nation: data.nation || null,
        occupation: data.occupation || null,
        relationshipStatus: data.relationshipStatus || null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        notes: data.notes || null,
      },
    });
    revalidatePath('/crm');
    return formatContact(contact);
  } catch (e) {
    console.error('createContact error:', e);
    throw new Error('Failed to create contact');
  }
}

export async function updateContact(id, data) {
  try {
    const contact = await prisma.contact.update({
      where: { id },
      data: {
        fullName: data.fullName,
        chineseName: data.chineseName ?? null,
        displayName: data.displayName ?? null,
        tier: data.tier !== undefined ? Number(data.tier) : undefined,
        status: data.status,
        gender: data.gender ?? null,
        birthday: data.birthday ?? null,
        city: data.city ?? null,
        nation: data.nation ?? null,
        occupation: data.occupation ?? null,
        relationshipStatus: data.relationshipStatus ?? null,
        tags: data.tags !== undefined ? (data.tags ? JSON.stringify(data.tags) : null) : undefined,
      },
    });
    revalidatePath('/crm');
    revalidatePath(`/crm/${id}`);
    return formatContact(contact);
  } catch (e) {
    console.error('updateContact error:', e);
    throw new Error('Failed to update contact');
  }
}

export async function deleteContact(id) {
  try {
    await prisma.contact.delete({ where: { id } });
    revalidatePath('/crm');
  } catch (e) {
    console.error('deleteContact error:', e);
    throw new Error('Failed to delete contact');
  }
}

export async function updateContactNotes(id, notes) {
  try {
    await prisma.contact.update({ where: { id }, data: { notes } });
    revalidatePath(`/crm/${id}`);
  } catch (e) {
    console.error('updateContactNotes error:', e);
    throw new Error('Failed to update notes');
  }
}

// ─── Contact Methods ──────────────────────────────────────────────────────────

export async function createContactMethod(data) {
  try {
    const method = await prisma.contactMethod.create({
      data: {
        contactId: data.contactId,
        type: data.type,
        label: data.label || null,
        value: data.value,
      },
    });
    revalidatePath(`/crm/${data.contactId}`);
    return method;
  } catch (e) {
    console.error('createContactMethod error:', e);
    throw new Error('Failed to create contact method');
  }
}

export async function updateContactMethod(id, data) {
  try {
    const method = await prisma.contactMethod.update({
      where: { id },
      data: {
        type: data.type,
        label: data.label ?? null,
        value: data.value,
      },
    });
    revalidatePath(`/crm/${data.contactId}`);
    return method;
  } catch (e) {
    console.error('updateContactMethod error:', e);
    throw new Error('Failed to update contact method');
  }
}

export async function deleteContactMethod(id, contactId) {
  try {
    await prisma.contactMethod.delete({ where: { id } });
    revalidatePath(`/crm/${contactId}`);
  } catch (e) {
    console.error('deleteContactMethod error:', e);
    throw new Error('Failed to delete contact method');
  }
}

// ─── Background History ───────────────────────────────────────────────────────

export async function createBackgroundHistory(data) {
  try {
    const entry = await prisma.backgroundHistory.create({
      data: {
        contactId: data.contactId,
        category: data.category,
        organization: data.organization,
        titleOrMajor: data.titleOrMajor || null,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
        description: data.description || null,
      },
    });
    revalidatePath(`/crm/${data.contactId}`);
    return entry;
  } catch (e) {
    console.error('createBackgroundHistory error:', e);
    throw new Error('Failed to create history entry');
  }
}

export async function updateBackgroundHistory(id, data) {
  try {
    const entry = await prisma.backgroundHistory.update({
      where: { id },
      data: {
        category: data.category,
        organization: data.organization,
        titleOrMajor: data.titleOrMajor ?? null,
        startDate: data.startDate ?? null,
        endDate: data.endDate ?? null,
        description: data.description ?? null,
      },
    });
    revalidatePath(`/crm/${data.contactId}`);
    return entry;
  } catch (e) {
    console.error('updateBackgroundHistory error:', e);
    throw new Error('Failed to update history entry');
  }
}

export async function deleteBackgroundHistory(id, contactId) {
  try {
    await prisma.backgroundHistory.delete({ where: { id } });
    revalidatePath(`/crm/${contactId}`);
  } catch (e) {
    console.error('deleteBackgroundHistory error:', e);
    throw new Error('Failed to delete history entry');
  }
}

// ─── Interactions ─────────────────────────────────────────────────────────────

export async function createInteraction(data) {
  try {
    const interaction = await prisma.interaction.create({
      data: {
        contactId: data.contactId,
        date: data.date,
        type: data.type || null,
        summary: data.summary,
        sourceModule: data.sourceModule || 'manual',
      },
    });
    revalidatePath(`/crm/${data.contactId}`);
    return {
      ...interaction,
      createdAt: interaction.createdAt.toISOString(),
    };
  } catch (e) {
    console.error('createInteraction error:', e);
    throw new Error('Failed to create interaction');
  }
}

export async function deleteInteraction(id, contactId) {
  try {
    await prisma.interaction.delete({ where: { id } });
    revalidatePath(`/crm/${contactId}`);
  } catch (e) {
    console.error('deleteInteraction error:', e);
    throw new Error('Failed to delete interaction');
  }
}

// ─── Contact Relations ────────────────────────────────────────────────────────

export async function addContactRelation(fromId, toId, label) {
  try {
    // Create both directions
    await prisma.contactRelation.upsert({
      where: { fromId_toId: { fromId, toId } },
      update: { label: label || null },
      create: { fromId, toId, label: label || null },
    });
    revalidatePath(`/crm/${fromId}`);
    revalidatePath(`/crm/${toId}`);
  } catch (e) {
    console.error('addContactRelation error:', e);
    throw new Error('Failed to add relation');
  }
}

export async function removeContactRelation(id, contactId) {
  try {
    await prisma.contactRelation.delete({ where: { id } });
    revalidatePath(`/crm/${contactId}`);
  } catch (e) {
    console.error('removeContactRelation error:', e);
    throw new Error('Failed to remove relation');
  }
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export async function searchContacts(query) {
  try {
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [
          { fullName: { contains: query } },
          { chineseName: { contains: query } },
          { displayName: { contains: query } },
          { city: { contains: query } },
          { backgroundHistory: { some: { organization: { contains: query } } } },
        ],
        status: 'active',
      },
      include: { contactMethods: true },
      orderBy: { fullName: 'asc' },
    });
    return contacts.map(formatContact);
  } catch (e) {
    console.error('searchContacts error:', e);
    return [];
  }
}
