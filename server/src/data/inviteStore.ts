import { v4 as uuid } from "uuid";

export interface Invite {
  id: string;
  gameId: string;
  gameName: string;
  invitedEmail: string;
  invitedByName: string;
  createdAt: Date;
}

const invites = new Map<string, Invite>();

export function createInvite(gameId: string, gameName: string, email: string, invitedByName: string): Invite {
  const invite: Invite = { id: uuid(), gameId, gameName, invitedEmail: email, invitedByName, createdAt: new Date() };
  invites.set(invite.id, invite);
  return invite;
}

export function getInvitesForEmail(email: string): Invite[] {
  return Array.from(invites.values()).filter(i => i.invitedEmail === email);
}

export function getInvite(id: string): Invite | null {
  return invites.get(id) ?? null;
}

export function deleteInvite(id: string): void {
  invites.delete(id);
}
