const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.noteLink.deleteMany();
  await prisma.dailyLogLink.deleteMany();
  await prisma.note.deleteMany();
  console.log('Notes wiped successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
