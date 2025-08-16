import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

const hashAdminKey = (adminKey: string) =>
  createHash("sha256").update(adminKey).digest("hex");

async function main() {
  await prisma.link.upsert({
    where: { code: "demo" },
    update: {},
    create: {
      code: "demo",
      targetUrl: "https://nextjs.org",
      title: "Next.js",
      description: "Seeded demo link for local development.",
      tags: ["demo", "nextjs"],
      adminKeyHash: hashAdminKey("demo-admin-key")
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
