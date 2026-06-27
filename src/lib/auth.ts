import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";

const SECRET = process.env.SECRET_KEY || "fallback-unsafe-secret";
const TOKEN_EXPIRY = "30d";

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, SECRET) as { userId: string };
    if (payload && typeof payload.userId === "string") {
      return { userId: payload.userId };
    }
    return null;
  } catch {
    return null;
  }
}

export function getUserFromRequest(request: NextRequest): { userId: string } {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    throw new Error("Authentication required");
  }
  const token = auth.slice(7);
  const result = verifyToken(token);
  if (!result) {
    throw new Error("Invalid or expired token");
  }
  return result;
}

export function tryGetUserFromRequest(request: NextRequest): { userId: string } | null {
  try {
    return getUserFromRequest(request);
  } catch {
    return null;
  }
}
