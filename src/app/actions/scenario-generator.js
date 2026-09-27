"use server";

import prisma from "@/lib/prisma";
import fs from "fs/promises";
import path from "path";

/**
 * Generates a high-pressure scenario for a specific vocabulary item.
 * Removes older scenarios and their audio files to save space.
 */
export async function generateScenario(vocabItemId) {
  try {
    // 1. Fetch the vocabulary item
    const vocabItem = await prisma.vocabItem.findUnique({
      where: { id: vocabItemId }
    });

    if (!vocabItem) {
      return { success: false, error: "Vocabulary item not found." };
    }

    // 2. Call local LLM to generate the scenario
    const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434/v1";
    
    const prompt = `You are designing a realistic, everyday high-pressure scenario to test English vocabulary.
The target word is: "${vocabItem.text}" (${vocabItem.partOfSpeech})
Meaning: "${vocabItem.explanation || vocabItem.meaning}"

Create a tense, realistic situation where this word would be used under pressure (e.g., a stressful workplace meeting, missing a flight, a heated argument, or an urgent daily life problem).
Output a JSON object exactly like this:
{
  "setting": "Short 2-4 word setting (e.g. Boardroom Presentation, Airport Terminal, Hospital ER)",
  "sentence": "A tense, realistic sentence spoken by someone in a rush or under pressure, containing the target word.",
  "pressureLevel": "HIGH", // choose LOW, MEDIUM, or HIGH based on tension
  "expectedResponse": "${vocabItem.text}"
}
Constraints: 
1. The "sentence" must sound natural for everyday life but convey urgency or stress.
2. The target word must be exactly "${vocabItem.text}".`;

    const llmRes = await fetch(`${OLLAMA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "qwen2.5:7b",
        messages: [{ role: "system", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.6
      })
    });

    if (!llmRes.ok) {
      throw new Error(`LLM generation failed: ${llmRes.status}`);
    }

    const llmData = await llmRes.json();
    const scenarioData = JSON.parse(llmData.choices[0].message.content);

    // 3. Call local TTS to generate audio
    const TTS_URL = "http://localhost:8000/api/tts";
    
    // Mask the target word for TTS with a pause so it doesn't spoil the answer
    const regex = new RegExp(`\\b${vocabItem.text}\\b`, "gi");
    let ttsSentence = scenarioData.sentence.replace(regex, " ... ");
    // Fallback if the word boundary \b didn't match
    if (ttsSentence === scenarioData.sentence) {
      const fallbackRegex = new RegExp(vocabItem.text, "gi");
      ttsSentence = scenarioData.sentence.replace(fallbackRegex, " ... ");
    }

    const ttsRes = await fetch(TTS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: ttsSentence,
        speed: 1.0
      })
    });

    let audioUrl = null;

    if (ttsRes.ok) {
      const ttsData = await ttsRes.json();
      const b64_audio = ttsData.audio_base64;
      
      if (b64_audio) {
        // Prepare to save file
        const publicDir = path.join(process.cwd(), "public", "scenarios");
        await fs.mkdir(publicDir, { recursive: true });
        
        const fileName = `scenario_${vocabItemId}_${Date.now()}.wav`;
        const filePath = path.join(publicDir, fileName);
        
        // Write the base64 data to a file
        await fs.writeFile(filePath, Buffer.from(b64_audio, "base64"));
        audioUrl = `/scenarios/${fileName}`;
      }
    } else {
      console.warn("TTS generation failed or not available, proceeding without audio.");
    }

    // 4. Cleanup old scenarios to save storage
    const oldScenarios = await prisma.scenario.findMany({
      where: { vocabItems: { some: { id: vocabItemId } } }
    });

    for (const old of oldScenarios) {
      // Delete old audio files
      if (old.audioUrl) {
        try {
          const oldFilePath = path.join(process.cwd(), "public", old.audioUrl);
          await fs.unlink(oldFilePath);
        } catch (e) {
          console.warn("Could not delete old audio file:", e.message);
        }
      }
    }

    // Delete from DB
    await prisma.scenario.deleteMany({
      where: { vocabItems: { some: { id: vocabItemId } } }
    });

    // 5. Save the new Scenario to the database
    const newScenario = await prisma.scenario.create({
      data: {
        setting: scenarioData.setting,
        sentence: scenarioData.sentence,
        pressureLevel: scenarioData.pressureLevel || "HIGH",
        expectedResponse: scenarioData.expectedResponse || vocabItem.text,
        audioUrl: audioUrl,
        vocabItems: {
          connect: [{ id: vocabItemId }]
        }
      }
    });

    return { success: true, scenario: newScenario };

  } catch (error) {
    console.error("Scenario generation error:", error);
    return { success: false, error: error.message };
  }
}
