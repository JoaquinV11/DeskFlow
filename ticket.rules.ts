import { TicketStatus } from "@prisma/client";

export const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  OPEN: [TicketStatus.IN_PROGRESS, TicketStatus.CANCELLED],
  IN_PROGRESS: [TicketStatus.WAITING_USER, TicketStatus.CLOSED, TicketStatus.CANCELLED],
  WAITING_USER: [TicketStatus.IN_PROGRESS, TicketStatus.CLOSED, TicketStatus.CANCELLED],
  CLOSED: [],
  CANCELLED: [],
};

export function assertCanTransition(from: TicketStatus, to: TicketStatus) {
  const allowed = ALLOWED_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid transition: ${from} -> ${to}`);
  }
}

export function isFinalStatus(status: TicketStatus) {
  return status === TicketStatus.CLOSED || status === TicketStatus.CANCELLED;
}
