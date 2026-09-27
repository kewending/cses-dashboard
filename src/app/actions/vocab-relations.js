"use server";

import prisma from "@/lib/prisma";

/**
 * Manually links two specific vocabulary senses (meanings) together.
 */
export async function createVocabRelation(fromId, toId, relationType) {
  try {
    if (fromId === toId) {
      return { success: false, error: "Cannot link a meaning to itself." };
    }

    // Check if relation already exists (Prisma has a unique constraint, but we check gracefully)
    const existing = await prisma.vocabRelation.findFirst({
      where: {
        fromId,
        toId,
        relationType
      }
    });

    if (existing) {
      return { success: true, message: "Relation already exists." };
    }

    // Create the relation
    await prisma.vocabRelation.create({
      data: {
        fromId,
        toId,
        relationType
      }
    });

    // Optionally create the inverse relation for symmetry if it's Synonym or Antonym
    if (relationType === "Synonym" || relationType === "Antonym") {
      const inverseExists = await prisma.vocabRelation.findFirst({
        where: { fromId: toId, toId: fromId, relationType }
      });
      if (!inverseExists) {
        await prisma.vocabRelation.create({
          data: {
            fromId: toId,
            toId: fromId,
            relationType
          }
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to create relation:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Removes a specific relationship between two senses, including its symmetric inverse.
 */
export async function deleteVocabRelation(fromId, toId, relationType) {
  try {
    // Delete forward relation
    await prisma.vocabRelation.deleteMany({
      where: {
        fromId,
        toId,
        relationType
      }
    });

    // Delete inverse relation if it exists
    if (relationType === "Synonym" || relationType === "Antonym") {
      await prisma.vocabRelation.deleteMany({
        where: {
          fromId: toId,
          toId: fromId,
          relationType
        }
      });
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete relation:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Searches the database for existing vocabulary items to link manually.
 */
export async function searchVocabForLinking(query) {
  if (!query || query.length < 2) return [];

  try {
    const items = await prisma.vocabItem.findMany({
      where: {
        text: {
          contains: query.toLowerCase()
        }
      },
      take: 10,
    });
    return items;
  } catch (error) {
    console.error("Search error:", error);
    return [];
  }
}

/**
 * Asks the local LLM (cses-agent/Ollama) to suggest relations based on a specific meaning.
 * It also checks the DB to see if the suggestions already exist.
 */
export async function aiSuggestRelations(wordText, meaning, partOfSpeech) {
  try {
    const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
    
    const prompt = `You are an expert etymologist and linguist.
I am learning the English word "${wordText}".
Part of Speech: ${partOfSpeech}
Specific meaning: "${meaning}"

Please provide exactly 3 Synonyms, 2 Antonyms, and 1 Root word (or etymological origin) specifically for this meaning.
Return ONLY a valid JSON object in this exact format:
{
  "synonyms": ["word1", "word2", "word3"],
  "antonyms": ["word4", "word5"],
  "roots": ["word6"]
}`;

    const res = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "qwen2.5:7b",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2
      })
    });

    if (!res.ok) {
      return { success: false, error: "Failed to communicate with LLM" };
    }

    const data = await res.json();
    const content = JSON.parse(data.choices[0].message.content);

    // Now we need to check which of these words exist in our database
    const allSuggestedWords = [
      ...(content.synonyms || []).map(w => ({ text: w.toLowerCase(), type: "Synonym" })),
      ...(content.antonyms || []).map(w => ({ text: w.toLowerCase(), type: "Antonym" })),
      ...(content.roots || []).map(w => ({ text: w.toLowerCase(), type: "Root" }))
    ];

    const results = [];

    for (const item of allSuggestedWords) {
      if (!item.text) continue;
      
      // Check if it exists in DB
      const existingItems = await prisma.vocabItem.findMany({
        where: { text: item.text },
        select: { id: true, meaning: true, explanation: true, partOfSpeech: true }
      });

      results.push({
        text: item.text,
        relationType: item.type,
        exists: existingItems.length > 0,
        dbMatches: existingItems // We pass this so the user can choose which meaning to link to if they want to
      });
    }

    return { success: true, suggestions: results };
  } catch (error) {
    console.error("AI Suggestion error:", error);
    return { success: false, error: error.message };
  }
}
