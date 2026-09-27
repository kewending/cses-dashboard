"use server";

import prisma from "@/lib/prisma";
import * as cheerio from "cheerio";

export async function magicImportVocab(wordText) {
  if (!wordText || typeof wordText !== "string") {
    return { success: false, error: "Invalid word" };
  }

  const word = wordText.trim().toLowerCase();
  const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(word)}`;

  try {
    // 1. Fetch Cambridge Dictionary
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      next: { revalidate: 0 } // ensure fresh fetch
    });

    if (!response.ok) {
      return { success: false, error: `Cambridge Dictionary fetch failed: ${response.status}` };
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const existingItems = await prisma.vocabItem.findMany({
      where: { text: word }
    });

    const newItems = [];
    let processedSenses = 0;

    // The Cambridge dictionary usually groups a distinct meaning block inside `.pr.entry-body__el` or `.def-block`
    const blocks = $('.def-block.ddef_block').toArray();

    if (blocks.length === 0) {
      return { success: false, error: "Word not found in Cambridge Dictionary." };
    }

    for (const el of blocks) {
      if (processedSenses >= 10) break; // Increase limit to 10 senses

      // Explanation (remove any trailing colons)
      let explanation = $(el).find('.def.ddef_d').text().trim();
      if (explanation.endsWith(':')) explanation = explanation.slice(0, -1);

      if (!explanation) continue;

      // Prevent duplicate imports: skip if this exact meaning is already in the database
      if (existingItems.some(item => item.explanation === explanation)) {
        continue;
      }

      // Part of Speech
      const pos = $(el).closest('.entry-body__el').find('.pos.dpos').first().text().trim() || "unknown";

      // Examples
      let examples = [];
      $(el).find('.examp.dexamp').each((j, exEl) => {
        examples.push($(exEl).text().trim());
      });

      // If no examples, fallback to LLM
      if (examples.length === 0) {
        console.log(`No examples found for "${word}" (${explanation}). Falling back to LLM...`);
        try {
          const llmRes = await fetch("http://localhost:8000/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [
                {
                  role: "system",
                  content: `You are an English teacher. The user is learning the word "${word}" (${pos}) meaning "${explanation}". 
Provide exactly two distinct, highly realistic, everyday example sentences using this word. 
Output ONLY a JSON array of strings, nothing else. e.g. ["Sentence 1.", "Sentence 2."]`
                }
              ]
            })
          });

          if (llmRes.ok) {
            // Because the agent returns SSE event stream by default in /api/chat, 
            // parsing it dynamically here might be tricky if it streams.
            // Wait, we can use our new dictionary endpoint or a standard completion endpoint!
            // For now, let's just make a quick raw fetch to Ollama to be safe.
            const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
            const ollamaRes = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                model: process.env.OLLAMA_MODEL || "qwen2.5:7b",
                messages: [
                  {
                    role: "system",
                    content: `You are an English teacher. Provide exactly two distinct, highly realistic example sentences for the word "${word}" (meaning: ${explanation}). Output ONLY a valid JSON array of strings. e.g. ["Sentence 1.", "Sentence 2."]`
                  }
                ],
                response_format: { type: "json_object" },
                temperature: 0.3
              })
            });

            if (ollamaRes.ok) {
              const ollamaData = await ollamaRes.json();
              const content = ollamaData.choices[0].message.content;
              const parsed = JSON.parse(content);
              // Extract the array if wrapped in an object
              if (Array.isArray(parsed)) {
                examples = parsed;
              } else {
                for (const val of Object.values(parsed)) {
                  if (Array.isArray(val)) {
                    examples = val;
                    break;
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error("LLM fallback failed:", e);
        }
      }

      // Audio (Prefer US, fallback to UK)
      let audioUrl = "";
      const usAudio = $(el).closest('.entry-body__el').find('.us.dpron-i source[type="audio/mpeg"]').attr('src');
      const ukAudio = $(el).closest('.entry-body__el').find('.uk.dpron-i source[type="audio/mpeg"]').attr('src');

      if (ukAudio) {
        audioUrl = `https://dictionary.cambridge.org${ukAudio}`;
      } else if (usAudio) {
        audioUrl = `https://dictionary.cambridge.org${usAudio}`;
      }

      // Save to Database
      const meaningShort = explanation.split(" ").slice(0, 5).join(" ") + (explanation.split(" ").length > 5 ? "..." : "");

      const newItem = await prisma.vocabItem.create({
        data: {
          text: word,
          type: "word",
          partOfSpeech: pos,
          audioUrl: audioUrl || null,
          meaning: meaningShort,
          explanation: explanation,
          exampleSentences: JSON.stringify(examples),
          tags: JSON.stringify(["Auto-Imported"]),
          progress: {
            create: {
              masteryLevel: 0,
              interval: 0,
            },
          },
        },
      });

      newItems.push(newItem);
      processedSenses++;
    }

    return {
      success: true,
      items: newItems,
      message: newItems.length > 0 
        ? `Successfully imported ${newItems.length} new meaning(s) for "${word}"!`
        : `All meanings for "${word}" are already in your vault.`,
    };
  } catch (error) {
    console.error("Magic Import Error:", error);
    return { success: false, error: error.message || "Failed to process import" };
  }
}
