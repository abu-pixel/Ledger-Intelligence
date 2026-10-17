import { getAuth } from "@clerk/express";
import { GetFinanceWorkspaceResponse, SaveFinanceWorkspaceBody } from "@workspace/api-zod";
import { db, financeWorkspaces } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { Router, type IRouter } from "express";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.use(requireAuth);

router.get("/finance", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to access this account." });
    return;
  }

  const [workspace] = await db
    .select()
    .from(financeWorkspaces)
    .where(eq(financeWorkspaces.userId, userId))
    .limit(1);

  if (!workspace) {
    res.json(GetFinanceWorkspaceResponse.parse({
      state: null,
      revision: 0,
      updatedAt: null,
    }));
    return;
  }

  const state = SaveFinanceWorkspaceBody.safeParse({
    state: workspace.state,
    expectedRevision: workspace.revision,
  });
  if (!state.success) {
    req.log.error({ userId }, "Stored finance workspace failed validation");
    res.status(500).json({ error: "The saved workspace could not be loaded safely." });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.json(
    GetFinanceWorkspaceResponse.parse({
      state: state.data.state,
      revision: workspace.revision,
      updatedAt: workspace.updatedAt.toISOString(),
    }),
  );
});

router.put("/finance", async (req, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Sign in to access this account." });
    return;
  }

  const body = SaveFinanceWorkspaceBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "The finance workspace is invalid." });
    return;
  }

  const [current] = await db
    .select({ revision: financeWorkspaces.revision })
    .from(financeWorkspaces)
    .where(eq(financeWorkspaces.userId, userId))
    .limit(1);

  if (!current && body.data.expectedRevision !== 0) {
    res.status(409).json({ error: "The workspace changed on another device. Reload before saving." });
    return;
  }

  const [saved] = await db
    .insert(financeWorkspaces)
    .values({
      userId,
      state: body.data.state as unknown as Record<string, unknown>,
      revision: 1,
    })
    .onConflictDoUpdate({
      target: financeWorkspaces.userId,
      set: {
        state: body.data.state as unknown as Record<string, unknown>,
        revision: sql`${financeWorkspaces.revision} + 1`,
        updatedAt: new Date(),
      },
      where: sql`${financeWorkspaces.revision} = ${body.data.expectedRevision}`,
    })
    .returning();

  if (!saved) {
    res.status(409).json({ error: "The workspace changed on another device. Reload before saving." });
    return;
  }

  res.setHeader("Cache-Control", "no-store");
  res.json(
    GetFinanceWorkspaceResponse.parse({
      state: body.data.state,
      revision: saved.revision,
      updatedAt: saved.updatedAt.toISOString(),
    }),
  );
});

export default router;
