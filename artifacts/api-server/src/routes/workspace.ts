import crypto from "node:crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { and, eq } from "drizzle-orm";
import { db, casesTable, sessionsTable, usersTable, workspacesTable } from "@workspace/db";

const router: IRouter = Router();
const SESSION_COOKIE = "llb_session";
const SESSION_TTL = 1000 * 60 * 60 * 24 * 30;

type SessionUser = { id: string; email: string; name: string };

function createId() {
  return crypto.randomBytes(16).toString("hex");
}

function setSession(res: Response, userId: string) {
  const sessionId = createId();
  db.insert(sessionsTable).values({ id: sessionId, userId, expiresAt: new Date(Date.now() + SESSION_TTL) }).catch(() => undefined);
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL,
    path: "/",
  });
}

async function getUser(req: Request): Promise<SessionUser | null> {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) return null;
  const [result] = await db.select({ user: usersTable, session: sessionsTable })
    .from(sessionsTable)
    .innerJoin(usersTable, eq(usersTable.id, sessionsTable.userId))
    .where(eq(sessionsTable.id, sessionId));
  if (!result || result.session.expiresAt < new Date()) return null;
  return result.user;
}

router.get("/workspace", async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in to continue" });
    return;
  }
  const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.userId, user.id));
  if (!workspace) {
    res.json({ user, workspace: null, cases: [] });
    return;
  }
  const cases = await db.select().from(casesTable).where(and(eq(casesTable.workspaceId, workspace.id), eq(casesTable.archived, false)));
  res.json({ user, workspace, cases });
});

router.post("/workspace", async (req, res) => {
  const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const workspaceName = typeof req.body?.workspaceName === "string" ? req.body.workspaceName.trim() : "";
  if (!name || !email.includes("@") || !workspaceName) {
    res.status(400).json({ error: "Name, work email, and workspace name are required." });
    return;
  }
  const userId = createId();
  const workspaceId = createId();
  const [user] = await db.insert(usersTable).values({ id: userId, email, name }).onConflictDoUpdate({
    target: usersTable.email,
    set: { name },
  }).returning();
  const ownerId = user.id;
  const existing = await db.select().from(workspacesTable).where(eq(workspacesTable.userId, ownerId));
  const [workspace] = existing.length
    ? existing
    : await db.insert(workspacesTable).values({ id: workspaceId, userId: ownerId, name: workspaceName }).returning();
  if (!existing.length) {
    await db.insert(casesTable).values([
      { workspaceId: workspace.id, title: "Welcome to your case desk", client: "Your first client", status: "Intake", priority: "High", nextDeadline: "Set a deadline", notes: "Start by adding the facts, people, and next action for this matter." },
      { workspaceId: workspace.id, title: "Build your first brief", client: "Internal matter", status: "Research", priority: "Normal", nextDeadline: "This week", notes: "Keep the authorities and working notes together as the argument takes shape." },
    ]);
  }
  setSession(res, ownerId);
  const cases = await db.select().from(casesTable).where(and(eq(casesTable.workspaceId, workspace.id), eq(casesTable.archived, false)));
  res.status(existing.length ? 200 : 201).json({ user, workspace, cases });
});

router.post("/workspace/cases", async (req, res) => {
  const user = await getUser(req);
  if (!user) {
    res.status(401).json({ error: "Sign in to continue" });
    return;
  }
  const [workspace] = await db.select().from(workspacesTable).where(eq(workspacesTable.userId, user.id));
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
  const client = typeof req.body?.client === "string" ? req.body.client.trim() : "";
  if (!workspace || !title || !client) {
    res.status(400).json({ error: "Case title and client are required." });
    return;
  }
  const [legalCase] = await db.insert(casesTable).values({ workspaceId: workspace.id, title, client, status: "Intake", priority: "Normal", nextDeadline: "Set a deadline" }).returning();
  res.status(201).json(legalCase);
});

router.post("/logout", async (req, res) => {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId) await db.delete(sessionsTable).where(eq(sessionsTable.id, sessionId));
  res.clearCookie(SESSION_COOKIE, { path: "/" });
  res.json({ success: true });
});

export default router;