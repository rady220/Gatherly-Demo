import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { store } from "../db/store.js";
import { tokens } from "../auth/tokens.js";
import { authenticate } from "../middleware/auth.js";
export const authRouter = Router();
const login = z.object({ email: z.email(), password: z.string().min(8) });

const register = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().refine((v) => v.includes("@"), { message: "Invalid email format" }),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

authRouter.post("/register", (req, res) => {
  const parsed = register.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({
        message: "Validation failed",
        errors: parsed.error.issues.map((i) => ({ field: i.path[0], message: i.message })),
      });

  const existing = store.findUserByEmail(parsed.data.email);
  if (existing)
    return res
      .status(409)
      .json({ message: "Email already registered", code: "EMAIL_EXISTS" });

  const passwordHash = bcrypt.hashSync(parsed.data.password, 10);
  const user = store.createUser({
    name: parsed.data.name,
    email: parsed.data.email,
    passwordHash,
    role: "ATTENDEE",
  });

  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ ...tokens.issue(user), user: safeUser });
});

authRouter.post("/login", (req, res) => {
  const parsed = login.safeParse(req.body);
  if (!parsed.success)
    return res
      .status(400)
      .json({
        message: "Enter a valid email and password",
        issues: parsed.error.issues,
      });
  const u = store.findUserByEmail(parsed.data.email);
  if (
    !u ||
    !u.active ||
    !bcrypt.compareSync(parsed.data.password, u.passwordHash)
  )
    return res
      .status(401)
      .json({
        message: "Email or password is incorrect",
        code: "INVALID_CREDENTIALS",
      });
  const { passwordHash, ...user } = u;
  res.json({ ...tokens.issue(u), user });
});
authRouter.post("/refresh", (req, res) => {
  try {
    const p = tokens.verifyRefresh(req.body.refreshToken);
    const u = store.findUserById(Number(p.sub));
    if (!u?.active) throw Error();
    res.json(tokens.issue(u));
  } catch {
    res
      .status(401)
      .json({
        message: "Refresh token is invalid",
        code: "INVALID_REFRESH_TOKEN",
      });
  }
});
authRouter.get("/me", authenticate, (req, res) => res.json(req.user));
