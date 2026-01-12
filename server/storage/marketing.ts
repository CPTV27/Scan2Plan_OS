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
  CaseStudy, InsertCaseStudy, 
  Event, InsertEvent, 
  EventRegistration, InsertEventRegistration,
  DealAttribution, InsertDealAttribution,
  Notification, InsertNotification,
  ProposalEmailEvent, InsertProposalEmailEvent
} from "@shared/schema";

export const caseStudyStorage = {
  getAll: (): Promise<CaseStudy[]> => storage.getCaseStudies(),
  getByTags: (tags: string[]): Promise<CaseStudy[]> => storage.getCaseStudiesByTags(tags),
  getById: (id: number): Promise<CaseStudy | undefined> => storage.getCaseStudy(id),
  create: (study: InsertCaseStudy): Promise<CaseStudy> => storage.createCaseStudy(study),
  update: (id: number, updates: Partial<InsertCaseStudy>): Promise<CaseStudy | undefined> => storage.updateCaseStudy(id, updates),
};

export const eventStorage = {
  getAll: (): Promise<Event[]> => storage.getEvents(),
  getById: (id: number): Promise<Event | undefined> => storage.getEvent(id),
  create: (event: InsertEvent): Promise<Event> => storage.createEvent(event),
  update: (id: number, updates: Partial<InsertEvent>): Promise<Event> => storage.updateEvent(id, updates),
  delete: (id: number): Promise<void> => storage.deleteEvent(id),
};

export const eventRegistrationStorage = {
  getByEventId: (eventId: number): Promise<EventRegistration[]> => storage.getEventRegistrations(eventId),
  getByLeadId: (leadId: number): Promise<EventRegistration[]> => storage.getEventRegistrationsByLead(leadId),
  create: (registration: InsertEventRegistration): Promise<EventRegistration> => storage.createEventRegistration(registration),
  updateStatus: (id: number, status: string, leadId: number): Promise<EventRegistration> => 
    storage.updateEventRegistrationStatus(id, status, leadId),
  delete: (id: number): Promise<void> => storage.deleteEventRegistration(id),
};

export const dealAttributionStorage = {
  getByLeadId: (leadId: number): Promise<DealAttribution[]> => storage.getDealAttributions(leadId),
  create: (attribution: InsertDealAttribution): Promise<DealAttribution> => storage.createDealAttribution(attribution),
  delete: (id: number): Promise<void> => storage.deleteDealAttribution(id),
};

export const notificationStorage = {
  create: (notification: InsertNotification): Promise<Notification> => storage.createNotification(notification),
  getForUser: (userId: string): Promise<Notification[]> => storage.getNotificationsForUser(userId),
  markRead: (id: number): Promise<void> => storage.markNotificationRead(id),
};

export const proposalEmailStorage = {
  create: (event: InsertProposalEmailEvent): Promise<ProposalEmailEvent> => storage.createProposalEmailEvent(event),
  getByToken: (token: string): Promise<ProposalEmailEvent | undefined> => storage.getProposalEmailEventByToken(token),
  getByLeadId: (leadId: number): Promise<ProposalEmailEvent[]> => storage.getProposalEmailEventsByLead(leadId),
  recordOpen: (token: string): Promise<ProposalEmailEvent | undefined> => storage.recordProposalOpen(token),
  recordClick: (token: string): Promise<ProposalEmailEvent | undefined> => storage.recordProposalClick(token),
};

export const abmAnalyticsStorage = {
  getTierAAccountPenetration: (): Promise<{ total: number; engaged: number; percentage: number }> => 
    storage.getTierAAccountPenetration(),
};
