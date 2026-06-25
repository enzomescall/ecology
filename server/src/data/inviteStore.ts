import { v4 as uuid } from "uuid";
import { getInvites, saveInvites } from '../db/jsonStore.js';

export interface Invite {
  id: string;
  gameId: string;
  gameName: string;
  invitedEmail: string;
  invitedByName: string;
  createdAt: Date;
}

const invites = new Map<string, Invite>(getInvites().map((invite) => [invite.id, invite]));

function persist(): void {
  saveInvites(Array.from(invites.values()));
}

export function createInvite(gameId: string, gameName: string, email: string, invitedByName: string): Invite {
  const invite: Invite = { id: uuid(), gameId, gameName, invitedEmail: email, invitedByName, createdAt: new Date() };
  invites.set(invite.id, invite);
  persist();
  return invite;
}

export function getInvitesForEmail(email: string): Invite[] {
  return Array.from(invites.values()).filter(i => i.invitedEmail === email);
}

export function getInvitesForGame(gameId: string): Invite[] {
  return Array.from(invites.values()).filter(i => i.gameId === gameId);
}

export function getInvite(id: string): Invite | null {
  return invites.get(id) ?? null;
}

export function deleteInvite(id: string): void {
  invites.delete(id);
  persist();
}

export function deleteInviteForGameByEmail(gameId: string, email: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const invite = Array.from(invites.values()).find(
    i => i.gameId === gameId && i.invitedEmail.trim().toLowerCase() === normalizedEmail
  );
  if (!invite) return false;
  invites.delete(invite.id);
  persist();
  return true;
}
