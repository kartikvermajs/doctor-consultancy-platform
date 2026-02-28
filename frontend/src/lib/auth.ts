import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

export interface AuthUser {
  id: string;
  type: "doctor" | "patient";
}

export async function getUserFromRequest(): Promise<AuthUser | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) return null;

    return jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
  } catch {
    return null;
  }
}
