import prisma from "@/lib/prisma";
import SoakingClient from "./SoakingClient";

export const metadata = {
  title: "Brain Soaking Playlist | English Vault",
};

export default async function SoakingPage() {
  // Fetch up to 50 words to create the playlist. 
  // Ideally, order by lowest mastery or least recently reviewed.
  // For now, random or recent is fine. We take recent 50.
  const words = await prisma.vocabItem.findMany({
    select: { 
      id: true, 
      text: true, 
      meaning: true,
      explanation: true
    },
    take: 100, // Fetch more to shuffle
  });

  // Fisher-Yates shuffle
  for (let i = words.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
  
  // Take top 50 after shuffle
  const playlist = words.slice(0, 50);
  
  return <SoakingClient playlist={playlist} />;
}
