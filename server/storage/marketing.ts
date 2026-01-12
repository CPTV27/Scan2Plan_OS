/**
 * Marketing Storage Operations
 * 
 * Domain-specific wrapper for marketing module operations:
 * - Case Studies (Proof Vault)
 * - Events (Education-Led Sales)
 * - Event Registrations
 * - Deal Attributions (Marketing Influence Tracker)
 * - Notifications
 */

import { storage } from "../storage";
import type { 
  InsertCaseStudy, 
  InsertEvent, 
  InsertEventRegistration,
  InsertDealAttribution,
  InsertNotification,
  InsertProposalEmailEvent
} from "@shared/schema";

export const caseStudyStorage = {
  getAll: () => storage.getCaseStudies(),
  getByTags: (tags: string[]) => storage.getCaseStudiesByTags(tags),
  getById: (id: number) => storage.getCaseStudy(id),
  create: (study: InsertCaseStudy) => storage.createCaseStudy(study),
  update: (id: number, updates: Partial<InsertCaseStudy>) => storage.updateCaseStudy(id, updates),
};

export const eventStorage = {
  getAll: () => storage.getEvents(),
  getById: (id: number) => storage.getEvent(id),
  create: (event: InsertEvent) => storage.createEvent(event),
  update: (id: number, updates: Partial<InsertEvent>) => storage.updateEvent(id, updates),
  delete: (id: number) => storage.deleteEvent(id),
};

export const eventRegistrationStorage = {
  getByEventId: (eventId: number) => storage.getEventRegistrations(eventId),
  getByLeadId: (leadId: number) => storage.getEventRegistrationsByLead(leadId),
  create: (registration: InsertEventRegistration) => storage.createEventRegistration(registration),
  updateStatus: (id: number, status: string, leadId: number) => 
    storage.updateEventRegistrationStatus(id, status, leadId),
  delete: (id: number) => storage.deleteEventRegistration(id),
};

export const dealAttributionStorage = {
  getByLeadId: (leadId: number) => storage.getDealAttributions(leadId),
  create: (attribution: InsertDealAttribution) => storage.createDealAttribution(attribution),
  delete: (id: number) => storage.deleteDealAttribution(id),
};

export const notificationStorage = {
  create: (notification: InsertNotification) => storage.createNotification(notification),
  getForUser: (userId: string) => storage.getNotificationsForUser(userId),
  markRead: (id: number) => storage.markNotificationRead(id),
};

export const proposalEmailStorage = {
  create: (event: InsertProposalEmailEvent) => storage.createProposalEmailEvent(event),
  getByToken: (token: string) => storage.getProposalEmailEventByToken(token),
  getByLeadId: (leadId: number) => storage.getProposalEmailEventsByLead(leadId),
  recordOpen: (token: string) => storage.recordProposalOpen(token),
  recordClick: (token: string) => storage.recordProposalClick(token),
};

export const abmAnalyticsStorage = {
  getTierAAccountPenetration: () => storage.getTierAAccountPenetration(),
};
