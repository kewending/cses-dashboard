import prisma from "@/lib/prisma";
import DrillClient from "./DrillClient";

export const metadata = {
  title: "Pattern Drill Simulator | English Vault",
};

export default async function DrillsPage() {
  // Fetch up to 100 recent vocabulary words for the generator
  const words = await prisma.vocabItem.findMany({
    select: { text: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  
  const vocabList = words.map(w => w.text);
  
  return <DrillClient initialVocab={vocabList} />;
}
