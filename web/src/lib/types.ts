export type Role = "USER" | "AGENT" | "ADMIN";
export type TicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING_USER" | "CLOSED" | "CANCELLED";
export type TicketPriority = "LOW" | "MEDIUM" | "HIGH";

export type TicketListItem = {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  createdAt: string;
  assignedToId: string | null;
  creator: { id: string; email: string; name: string; role: Role };
  assignedTo: { id: string; email: string; name: string; role: Role } | null;
  _count: { events: number };
};

export type PaginatedTickets = {
  items: TicketListItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

export type TicketEvent = {
  id: string;
  type: "CREATED" | "MESSAGE" | "ASSIGNED" | "STATUS_CHANGED";
  visibility: "PUBLIC" | "INTERNAL";
  message: string | null;
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus | null;
  createdAt: string;
  actor: { id: string; email: string; name: string; role: Role } | null;
};

export type PaginatedTicketEvents = {
  items: TicketEvent[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
