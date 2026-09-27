import prisma from "@/lib/prisma";
import ParentRoomClient from "./ParentRoomClient";

export async function generateMetadata() {
  return { title: "Language Parent Room | English Vault" };
}

export default async function ParentRoomPage() {
  // Fetch up to 300 of the user's most recently interacted/created words to inject into the LLM
  const words = await prisma.vocabItem.findMany({
    select: { text: true },
    orderBy: { createdAt: "desc" },
    take: 300,
  });
  
  const wordStrings = words.map(w => w.text);
  
  return <ParentRoomClient initialWords={wordStrings} />;
}
