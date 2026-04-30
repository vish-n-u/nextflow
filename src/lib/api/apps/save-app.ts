import { prisma, type Prisma } from "@/lib/prisma";
import type { SaveAppInput } from "@/lib/zod/schemas/apps";

/**
 * Saves a workflow snapshot as a publicly accessible App.
 * Apps are readable by all users — no ownership check on reads.
 * Each call always creates a new App row (no update path, by design).
 */
export async function saveApp(
  input: SaveAppInput,
  userId: string,
): Promise<{ id: string }> {
  // Ensure the user exists in our DB (Clerk syncs lazily)
  await prisma.user.upsert({
    where:  { id: userId },
    update: {},
    create: { id: userId },
  });

  const app = await prisma.app.create({
    data: {
      name:      input.name,
      creatorId: userId,
      nodes:     input.nodes as Prisma.InputJsonValue,
      edges:     input.edges as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  return { id: app.id };
}
