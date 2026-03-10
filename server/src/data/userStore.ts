import { v4 as uuid } from "uuid";

export interface StoredUser {
  userId: string;
  email: string;
  name: string;
  createdAt: Date;
}

const users = new Map<string, StoredUser>();

export function getOrCreateUser(email: string, name: string): StoredUser {
  const existing = getUserByEmail(email);
  if (existing) return existing;

  const user: StoredUser = { userId: uuid(), email, name, createdAt: new Date() };
  users.set(email, user);
  return user;
}

export function getUserByEmail(email: string): StoredUser | null {
  return users.get(email) ?? null;
}
