import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "../db.js";
import { signSession, setSessionCookie, clearSessionCookie, requireAuth, requireRole } from "../auth.js";
import { toUser, type UserRow } from "../serialize.js";

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
});

authRouter.post("/register", (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  const { email, password, fullName } = parsed.data;

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    res.status(409).json({ error: "Пользователь с таким email уже существует" });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, 'student')")
    .run(email, passwordHash, fullName);

  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as UserRow;
  const token = signSession({ userId: row.id, role: row.role });
  setSessionCookie(res, token);
  res.status(201).json(toUser(row));
});

// Admin accounts are provisioned by an existing admin, never via public self-registration.
authRouter.post("/admins", requireAuth, requireRole("admin"), (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  const { email, password, fullName } = parsed.data;

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) {
    res.status(409).json({ error: "Пользователь с таким email уже существует" });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const info = db
    .prepare("INSERT INTO users (email, password_hash, full_name, role) VALUES (?, ?, ?, 'admin')")
    .run(email, passwordHash, fullName);

  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(info.lastInsertRowid) as UserRow;
  res.status(201).json(toUser(row));
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные" });
    return;
  }
  const { email, password } = parsed.data;
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as UserRow | undefined;
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: "Неверный email или пароль" });
    return;
  }
  const token = signSession({ userId: row.id, role: row.role });
  setSessionCookie(res, token);
  res.json(toUser(row));
});

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.status(204).end();
});

authRouter.get("/me", requireAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session!.userId) as UserRow | undefined;
  if (!row) {
    res.status(401).json({ error: "Не авторизован" });
    return;
  }
  res.json(toUser(row));
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(1),
  birthDate: z.string().min(1),
  branch: z.string().default(""),
});

authRouter.patch("/me", requireAuth, (req, res) => {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Некорректные данные", details: parsed.error.flatten() });
    return;
  }
  const { fullName, phone, birthDate, branch } = parsed.data;
  db.prepare("UPDATE users SET full_name = ?, phone = ?, birth_date = ?, branch = ? WHERE id = ?").run(
    fullName,
    phone,
    birthDate,
    branch || null,
    req.session!.userId
  );
  const row = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session!.userId) as UserRow;
  res.json(toUser(row));
});
