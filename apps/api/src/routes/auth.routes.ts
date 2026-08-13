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

  const verificationToken = store.createVerificationToken(user.id);
  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ ...tokens.issue(user), user: safeUser, verificationToken });
});

authRouter.post("/verify-email", (req, res) => {
  const { token } = req.body;
  if (!token || typeof token !== "string")
    return res.status(400).json({ message: "Token is required", code: "INVALID_INPUT" });

  const result = store.verifyEmail(token);
  if (!result.success) {
    const message =
      result.error === "TOKEN_EXPIRED" ? "Verification token has expired" :
      result.error === "TOKEN_ALREADY_USED" ? "Token has already been used" :
      "Invalid verification token";
    return res.status(400).json({ message, code: result.error });
  }

  res.json({ message: "Email verified successfully" });
});

authRouter.post("/resend-verification", authenticate, (req, res) => {
  const user = store.findUserById(req.user!.id);
  if (!user) return res.status(404).json({ message: "User not found" });
  if (user.isVerified)
    return res.status(400).json({ message: "Email is already verified", code: "ALREADY_VERIFIED" });

  store.invalidateVerificationTokens(user.id);
  const verificationToken = store.createVerificationToken(user.id);
  res.json({ message: "Verification email resent", verificationToken });
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

// US-1.3: Forgot password — always returns 200 (no email enumeration)
authRouter.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string")
    return res.status(400).json({ message: "Email is required", code: "INVALID_INPUT" });

  const user = store.findUserByEmail(email);
  if (user) {
    store.invalidatePasswordResetTokens(user.id);
    const resetToken = store.createPasswordResetToken(user.id);
    // In production this would be emailed; for demo we return it
    return res.json({ message: "If that email exists, a reset link has been sent.", resetToken });
  }
  // Always return 200 to prevent email enumeration
  res.json({ message: "If that email exists, a reset link has been sent." });
});

// US-1.3: Reset password with token
const resetPasswordSchema = z.object({
  token: z.string().min(1, "Token is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

authRouter.post("/reset-password", (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Validation failed", code: "VALIDATION_ERROR", errors: parsed.error.issues.map(i => ({ field: i.path[0], message: i.message })) });

  const result = store.validatePasswordResetToken(parsed.data.token);
  if (!result.success) {
    const message =
      result.error === "TOKEN_EXPIRED" ? "Reset token has expired" :
      result.error === "TOKEN_ALREADY_USED" ? "Reset token has already been used" :
      "Invalid reset token";
    return res.status(400).json({ message, code: result.error });
  }

  const passwordHash = bcrypt.hashSync(parsed.data.newPassword, 10);
  store.updatePassword(result.userId!, passwordHash);
  store.usePasswordResetToken(parsed.data.token);
  res.json({ message: "Password has been reset successfully" });
});

// US-1.3: Change password (authenticated)
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

authRouter.post("/change-password", authenticate, (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Validation failed", code: "VALIDATION_ERROR", errors: parsed.error.issues.map(i => ({ field: i.path[0], message: i.message })) });

  const user = store.findUserByEmail(req.user!.email);
  if (!user) return res.status(404).json({ message: "User not found" });

  if (!bcrypt.compareSync(parsed.data.currentPassword, user.passwordHash))
    return res.status(401).json({ message: "Current password is incorrect", code: "WRONG_PASSWORD" });

  const passwordHash = bcrypt.hashSync(parsed.data.newPassword, 10);
  store.updatePassword(user.id, passwordHash);
  res.json({ message: "Password changed successfully" });
});
