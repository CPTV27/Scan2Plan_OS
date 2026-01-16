# 🤖 AGENT COORDINATION HUB

**Purpose:** Coordinate between development agent (me) and personal assistant agent
**Project:** Scan2Plan (scan2plan.io) - BIM scanning & modeling business
**Last Updated:** 2026-01-16

---

## 📋 CURRENT PROJECT STATUS

### **Mission:** Prepare for Marketing Scale-Up

**Context:**
- Pre-launch BIM scanning business
- About to ramp up marketing significantly (10x+ lead volume expected)
- Need to build capacity BEFORE marketing turns on the tap
- CEO does all sales personally, needs automation to handle volume

**Goal:** Build sales automation + split marketing app (parallel tracks)
**Timeline:** 3 weeks to marketing-ready
**Priority:** Sales automation (handle high volume) + Marketing independence

---

## 🎯 ACTIVE WORKSTREAMS

### **Workstream A: Sales Automation** (Week 1-3)
**Owner:** Development Agent (Claude)
**Status:** 🟡 In Progress - Starting with audit and RFP analyzer

**Tasks:**
1. ✅ Architecture analysis (COMPLETED)
2. 🔄 Database audit (IN PROGRESS)
3. ⏳ Build RFP PDF analyzer (NEXT - Highest Priority)
4. ⏳ Build AI quote suggestions
5. ⏳ Build AI lead qualification
6. ⏳ Enhance margin guardrails
7. ⏳ Build auto-proposal workflow

**Deliverables:**
- RFP response time: 2 hours → 15 min
- Quote creation time: 30 min → 5 min
- Lead processing capacity: 10x increase
- Margin protection: 40% floor enforced

---

### **Workstream B: Marketing App Split** (Week 1-3)
**Owner:** TBD (Marketing team or contractor)
**Status:** ⏳ Not Started - Needs prioritization decision

**Tasks:**
1. ⏳ Create separate Next.js app
2. ⏳ Move marketing features
3. ⏳ Build landing pages
4. ⏳ Set up lead capture forms
5. ⏳ Build email sequences
6. ⏳ Set up analytics/attribution

**Deliverables:**
- Independent marketing application
- Lead generation at scale
- Attribution tracking
- SEO-optimized content platform

---

## 📊 KEY DECISIONS NEEDED

### **Decision 1: Build Order** (URGENT)
**Question:** Should we build sales automation first, or split marketing app first?

**Option A:** Sales automation first (Current plan)
- ✅ Immediate value (CEO can quote faster)
- ✅ Prepare for volume before it arrives
- ⚠️ Marketing team waits for their platform

**Option B:** Marketing split first
- ✅ Marketing can start building campaigns
- ✅ Independent iteration
- ⚠️ Sales not ready for volume yet

**Option C:** Both in parallel (RECOMMENDED in MARKETING_READY_ARCHITECTURE.md)
- ✅ Fastest path to marketing-ready
- ✅ No blocking dependencies
- ⚠️ Requires 2 developers or split focus

**Personal Assistant:** Please get CEO decision on this

---

### **Decision 2: Marketing App Tech Stack**
**Question:** Next.js (modern, SEO-first) or same stack (React+Express)?

**Option A:** Next.js + PostgreSQL
- ✅ Built for SEO (critical for marketing)
- ✅ Fast page loads = better conversions
- ✅ Easy content management
- ✅ Vercel deployment (scalable)
- ⚠️ Different from current stack

**Option B:** React + Express (same as Core)
- ✅ Team familiarity
- ✅ Shared components
- ✅ Easier maintenance
- ⚠️ More setup for SEO

**Personal Assistant:** Please get CEO preference

---

### **Decision 3: When to Ramp Marketing?**
**Question:** When should marketing start generating high volume?

**Criteria for "Go" Decision:**
- ✅ Sales automation handling 50 leads/week smoothly
- ✅ Quote time <10 min average
- ✅ Margin protection working
- ✅ Marketing app generating test leads successfully

**Personal Assistant:** Track these metrics and advise on timing

---

## 🔧 TECHNICAL DETAILS

### **Current Architecture**
```
Monolithic App (scan2plan.io)
├─ Sales Pipeline & CRM
├─ CPQ & Quoting
├─ Production Kanban
├─ Field Operations
├─ Financial (QuickBooks integration)
└─ Marketing (half-baked, to be extracted)
```

### **Target Architecture**
```
Core App (scan2plan.io)
├─ Sales (with AI automation)
├─ CPQ (with AI suggestions)
├─ Production
├─ Field Ops
└─ Financial

Marketing App (marketing.scan2plan.io)
├─ Lead Generation
├─ Content Management
├─ Email Campaigns
├─ Analytics
└─ Attribution
    ↕ API Integration ↕
```

---

## 📈 SUCCESS METRICS

### **Sales Automation Metrics** (Track Weekly)
- [ ] Leads received (target: handle 50-100/week)
- [ ] AI qualification accuracy (target: >80%)
- [ ] Quote creation time (target: <10 min avg)
- [ ] Proposal send rate (target: >90%)
- [ ] Close rate (target: maintain 25%+)
- [ ] CEO satisfaction score (qualitative)

### **Marketing Metrics** (Post-Launch)
- [ ] Website traffic
- [ ] Form submissions (leads generated)
- [ ] Cost per lead
- [ ] Lead → Deal conversion
- [ ] ROI by channel

### **System Health**
- [ ] Lead queue backlog (target: <5 leads waiting)
- [ ] Avg time in queue (target: <24 hours)
- [ ] System errors (target: <1%)
- [ ] API response time (target: <500ms)

**Personal Assistant:** Please set up tracking for these metrics

---

## 🚧 BLOCKERS & DEPENDENCIES

### **Current Blockers:**
1. ⚠️ Database audit script needs fix (import path issue)
2. ⚠️ Need CEO decision on build order (parallel vs sequential)
3. ⚠️ Need marketing app tech stack decision

### **Dependencies:**
- OpenAI API access (for AI automation)
- Google Workspace API (Gmail, Drive, Calendar)
- QuickBooks Online integration (existing)
- Stripe/payment gateway (for invoices) - TBD

**Personal Assistant:** Please track blockers and escalate to CEO

---

## 📁 KEY DOCUMENTS

### **Architecture & Planning**
- `MARKETING_READY_ARCHITECTURE.md` - Full architecture plan (marketing-focused)
- `CEO_SALES_AUTOMATION.md` - CEO workflow automation details
- `AUTOMATION_FIRST_PLAN.md` - 13 key automations prioritized
- `MY_ACTUAL_PLAN.md` - Original split plan (before marketing context)
- `MONDAY_MORNING_PLAN.md` - Tactical day-by-day guide

### **Technical**
- `scripts/audit-database.ts` - Database usage audit (needs fix)
- `shared/schema/db.ts` - Database schema (2500+ lines)
- Various route and component files

**Personal Assistant:** Familiarize yourself with these documents

---

## 💬 COMMUNICATION PROTOCOL

### **For Personal Assistant Agent:**

**Daily Updates:**
- Read this file for current status
- Check TODO items in code
- Review git commits for progress

**When to Escalate to CEO:**
- Decision needed (see "KEY DECISIONS NEEDED" above)
- Blocker can't be resolved
- Timeline slipping
- Budget implications

**How to Coordinate with Dev Agent:**
- Update this file with decisions/priorities
- Add notes in "MESSAGES" section below
- Create issues in git if needed

### **For Development Agent (me):**

**Daily Updates:**
- Update TODO status in this file
- Commit code with clear messages
- Document blockers
- Log decisions made

---

## 📨 MESSAGES BETWEEN AGENTS

### From Personal Assistant:
```
[No messages yet]
```

### From Development Agent:
```
2026-01-16 10:00 AM:
- Created coordination document
- Architecture analysis complete (4 detailed plans)
- Starting with sales automation
- Blocker: Database audit script needs path fix
- Need decisions on: Build order, marketing tech stack
- Next: Fix audit script, then start RFP analyzer
```

---

## 🎯 NEXT ACTIONS

### **Immediate (Today):**
1. 🔄 Dev Agent: Fix database audit script
2. ⏳ Personal Assistant: Get CEO decision on build order
3. ⏳ Personal Assistant: Get CEO decision on marketing tech stack
4. ⏳ Personal Assistant: Set up metrics tracking

### **This Week:**
1. ⏳ Dev Agent: Build RFP PDF analyzer
2. ⏳ Dev Agent: Build AI quote suggestions
3. ⏳ Dev Agent: Build lead qualification
4. ⏳ Personal Assistant: Coordinate with marketing team (if parallel build)

### **Next Week:**
1. ⏳ Dev Agent: Proposal automation
2. ⏳ Dev Agent: Margin guardrails
3. ⏳ Dev Agent: End-to-end testing

---

## 📞 ESCALATION PATH

**For Quick Questions:**
- Update this document
- Other agent checks daily

**For Urgent Issues:**
- Tag CEO in git issue
- Update "BLOCKERS" section above
- Set priority flag

**For Strategic Decisions:**
- Personal Assistant schedules CEO review
- Present options with pros/cons
- Document decision in this file

---

## 🔄 UPDATE FREQUENCY

**This Document:**
- Development Agent: Update after each major task
- Personal Assistant: Update with CEO decisions/priorities
- Both: Check daily for coordination

**Status Updates to CEO:**
- Personal Assistant: Daily summary
- Development Agent: Weekly progress report
- Both: Immediate escalation for blockers

---

## 📊 PROGRESS TRACKER

### Week 1 Goals:
- [ ] Database audit complete
- [ ] RFP analyzer built and tested
- [ ] AI quote suggestions built
- [ ] Lead qualification built
- [ ] Marketing app decision made
- [ ] Marketing app setup started (if parallel)

### Week 2 Goals:
- [ ] Proposal automation complete
- [ ] Margin guardrails enhanced
- [ ] Follow-up sequences built
- [ ] Marketing app core features done (if parallel)

### Week 3 Goals:
- [ ] End-to-end testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Ready for marketing ramp

---

**Last Updated By:** Development Agent (Claude)
**Next Update:** After completing database audit and starting RFP analyzer
**Coordination Status:** 🟢 Active - Waiting for CEO decisions on build order and tech stack
