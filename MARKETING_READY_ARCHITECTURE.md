# 🚀 SCAN2PLAN: MARKETING-READY ARCHITECTURE

**Business Context:**
- Pre-launch, preparing for marketing scale-up
- Marketing will significantly increase lead volume (10x+)
- Need to handle volume BEFORE turning on marketing tap
- Sales automation critical to prevent lead overflow

**Goal:** Build capacity now, ramp marketing later

---

## 📊 THE SCALING SCENARIO

### Phase 1: Pre-Launch (Now)
```
Leads: 5-10/week (manual outreach)
Quotes: 5-10/week
CEO capacity: Adequate
Marketing: Minimal
```

### Phase 2: Marketing Ramp (Month 2-3)
```
Leads: 50-100/week (SEO, content, ads)
Quotes needed: 50-100/week
CEO capacity: BOTTLENECK ⚠️
Marketing: Active campaigns
```

### Phase 3: Scale (Month 4-6)
```
Leads: 200+/week (full marketing engine)
Quotes needed: 200+/week
CEO capacity: IMPOSSIBLE without automation ❌
Marketing: Full scale
```

**Solution:** Build automation NOW, split marketing NOW

---

## 🎯 TWO-APP ARCHITECTURE (Optimized for Marketing Scale)

```
┌─────────────────────────────────────────────────────────────────┐
│              APP 1: SCAN2PLAN CORE (Revenue Engine)             │
│                     Main App (scan2plan.io)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🎯 HIGH-VOLUME SALES AUTOMATION                                │
│  ├─ Lead capture API (webhooks from marketing)                 │
│  ├─ AI lead qualification (score, filter, prioritize)          │
│  ├─ Auto-assignment to sales queue                             │
│  ├─ RFP analyzer (handle volume)                               │
│  ├─ AI quote suggestions (speed)                               │
│  ├─ One-click proposals (efficiency)                           │
│  ├─ Auto-follow-up sequences                                   │
│  └─ Margin protection (scale safely)                           │
│                                                                  │
│  🏭 PRODUCTION & DELIVERY                                       │
│  ├─ Production Kanban                                           │
│  ├─ Field operations                                            │
│  ├─ QC workflow                                                 │
│  └─ Client delivery                                             │
│                                                                  │
│  💰 FINANCIAL                                                   │
│  ├─ QuickBooks integration                                      │
│  ├─ Invoicing & collections                                     │
│  └─ Profitability tracking                                      │
│                                                                  │
│  👥 Users: CEO, Sales Team, Production, Field Techs             │
│  Focus: Handle high lead volume efficiently                     │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│          APP 2: SCAN2PLAN MARKETING HUB (Lead Generation)       │
│                   marketing.scan2plan.io                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📢 LEAD GENERATION                                             │
│  ├─ Landing pages (SEO-optimized)                              │
│  ├─ Contact forms (auto-create leads in Core)                  │
│  ├─ RFP opportunity tracking                                    │
│  ├─ Lead magnets (whitepapers, calculators)                    │
│  └─ Webinar registrations                                       │
│                                                                  │
│  📧 EMAIL MARKETING                                             │
│  ├─ Nurture sequences (for unqualified leads)                  │
│  ├─ Newsletter campaigns                                        │
│  ├─ Event promotions                                            │
│  └─ Re-engagement campaigns                                     │
│                                                                  │
│  📊 CONTENT MARKETING                                           │
│  ├─ Blog/article management                                     │
│  ├─ Case study showcase                                         │
│  ├─ Social media scheduling (LinkedIn, Twitter)                │
│  └─ Video content library                                       │
│                                                                  │
│  🎯 ABM (Account-Based Marketing)                               │
│  ├─ Target account lists                                        │
│  ├─ Personalized campaigns                                      │
│  ├─ Account research automation                                │
│  └─ Multi-touch attribution                                     │
│                                                                  │
│  📈 ANALYTICS & ATTRIBUTION                                     │
│  ├─ Lead source tracking                                        │
│  ├─ Campaign performance                                        │
│  ├─ ROI by channel                                              │
│  ├─ Conversion funnel analysis                                 │
│  └─ Marketing → Revenue attribution                             │
│                                                                  │
│  🤖 AI CONTENT GENERATION                                       │
│  ├─ Blog post generation                                        │
│  ├─ Social media content                                        │
│  ├─ Email copy suggestions                                      │
│  └─ Case study drafting                                         │
│                                                                  │
│  👥 Users: Marketing Team, Content Creators                     │
│  Focus: Generate qualified leads at scale                       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

                              ↓  ↑
                    API Integration (REST)
                              ↓  ↑

        Marketing generates leads → Core converts to revenue
        Core provides deal data → Marketing tracks attribution
```

---

## 🔌 INTEGRATION LAYER

### Marketing → Core (Lead Creation)

```typescript
// Marketing app contact form submit:
async function submitContactForm(formData) {
  // Send to Core API
  const lead = await fetch('https://scan2plan.io/api/leads/from-marketing', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${MARKETING_API_KEY}` },
    body: JSON.stringify({
      source: 'Website Contact Form',
      campaign: 'SEO - Office Buildings',
      clientName: formData.companyName,
      contactName: formData.name,
      contactEmail: formData.email,
      contactPhone: formData.phone,
      projectAddress: formData.address,
      sqft: formData.sqft,
      buildingType: formData.buildingType,
      message: formData.message,

      // Marketing attribution
      utmSource: formData.utmSource,
      utmMedium: formData.utmMedium,
      utmCampaign: formData.utmCampaign,
    }),
  });

  // Track in marketing system
  await trackLeadCreated({
    leadId: lead.id,
    campaign: 'SEO - Office Buildings',
    source: 'Website',
  });

  return lead;
}
```

### Core → Marketing (Attribution Data)

```typescript
// Core app: When deal closes
async function onDealClosed(leadId: number) {
  // Update Core
  await db.update(leads).set({ dealStage: 'Closed Won' });

  // Send attribution to Marketing
  const lead = await getLead(leadId);
  await fetch('https://marketing.scan2plan.io/api/attribution', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${CORE_API_KEY}` },
    body: JSON.stringify({
      leadId: lead.id,
      dealValue: lead.value,
      closedDate: new Date(),
      source: lead.source,
      campaign: lead.campaign,
      utmData: lead.utmData,
    }),
  });
}
```

---

## 🚀 IMPLEMENTATION PLAN (Parallel Tracks)

### **Track A: Sales Automation** (Week 1-3)

**Owner:** Main development team
**Focus:** Handle high lead volume

#### Week 1: Lead Processing Automation
```
Day 1-2: Lead capture API
  - Webhook endpoints for marketing forms
  - Auto-create leads from email (Gmail integration)
  - CSV/bulk import for RFP lists

Day 3-5: AI Lead Qualification
  - Score leads (hot/warm/cold)
  - Auto-filter spam/unqualified
  - Prioritize high-value opportunities
  - Route to CEO queue
```

#### Week 2: Quote Automation
```
Day 1-3: RFP Analyzer
  - PDF upload → Extract requirements
  - Auto-create lead + pre-fill CPQ
  - 2 hours → 15 min per RFP

Day 4-5: AI Quote Suggestions
  - Analyze similar projects
  - Pre-fill CPQ with suggestions
  - 30 min → 5 min per quote
```

#### Week 3: Proposal Automation
```
Day 1-2: One-click proposal generation
  - Quote → PDF in 3 seconds
  - Auto-send via email
  - Signature tracking

Day 3-5: Follow-up Sequences
  - Auto-remind unsigned proposals
  - Stale deal detection
  - Payment reminders
```

**Deliverable:** CEO can handle 10x lead volume

---

### **Track B: Marketing App** (Week 1-3, parallel)

**Owner:** Marketing team or contractor
**Focus:** Lead generation at scale

#### Week 1: Marketing App Setup
```
Day 1-2: Next.js app setup
  - Basic structure
  - Database schema (marketing tables)
  - API integration with Core

Day 3-5: Landing Pages
  - Homepage (SEO-optimized)
  - Service pages (by building type)
  - Contact forms (webhook to Core)
  - Lead magnets (BIM calculator, etc.)
```

#### Week 2: Content Management
```
Day 1-3: Blog/Content System
  - Article management
  - SEO optimization
  - Case study showcase

Day 4-5: Email Sequences
  - Nurture campaign builder
  - Newsletter system
  - Event promotions
```

#### Week 3: Analytics & Attribution
```
Day 1-3: Tracking Setup
  - UTM tracking
  - Conversion pixels
  - Lead source attribution

Day 4-5: Dashboards
  - Campaign performance
  - Lead → Deal tracking
  - ROI reporting
```

**Deliverable:** Marketing can generate leads independently

---

## 📊 CAPACITY PLANNING

### Current CEO Capacity (Without Automation)
```
Available time for sales: 20 hours/week
Time per lead: 30 min (research + quote)
Max leads/week: 40 leads

But realistically:
- 30% unqualified leads = waste 12 hours
- Actual qualified leads handled: 15-20/week
```

### With Sales Automation
```
Available time: 20 hours/week
AI filters leads: Only qualified leads in queue
Time per qualified lead: 5 min (AI pre-fills everything)
Max leads/week: 240 leads

Realistically:
- AI filters 100 leads → 30 qualified
- CEO handles: 30 qualified leads/week
- Time spent: 2.5 hours (vs 20 hours without automation)
```

**Result:** 10x capacity with same effort

---

## 🎯 MARKETING READINESS CHECKLIST

Before ramping marketing, verify these work:

### ✅ Sales Automation (Core App)
- [ ] Lead capture API (webhook from marketing forms)
- [ ] AI lead qualification (score, filter, prioritize)
- [ ] Auto-assignment to sales queue
- [ ] RFP analyzer (PDF → quote in 15 min)
- [ ] AI quote suggestions (similar projects)
- [ ] One-click proposal generation
- [ ] Auto-send proposals + signature
- [ ] Follow-up sequences (stale deals, unsigned proposals)
- [ ] Margin protection (guardrails + override tracking)

### ✅ Marketing App
- [ ] Landing pages (SEO-optimized)
- [ ] Contact forms (auto-create leads in Core)
- [ ] UTM tracking (attribution)
- [ ] Email sequences (nurture campaigns)
- [ ] Blog/content management
- [ ] Case study showcase
- [ ] Analytics dashboard (lead → revenue)

### ✅ Integration
- [ ] Marketing form → Core lead (webhook works)
- [ ] Core deal closed → Marketing attribution (tracking works)
- [ ] Shared authentication (SSO)
- [ ] API rate limiting (handle volume)

---

## 📈 EXPECTED OUTCOMES

### Month 1 (Build Phase)
```
Leads: 5-10/week (manual)
Quotes: 5-10/week
Marketing: Building app
Sales: Building automation
```

### Month 2 (Soft Launch)
```
Leads: 20-30/week (initial marketing)
Quotes: 20-30/week (automated)
Marketing: First campaigns live
Sales: Handling volume easily
```

### Month 3 (Ramp Up)
```
Leads: 50-100/week (full marketing)
Quotes: 40-60/week (qualified subset)
Marketing: Scaling campaigns
Sales: Processing efficiently
```

### Month 4-6 (Scale)
```
Leads: 100-200/week (SEO + ads + content)
Quotes: 60-80/week (filtered & qualified)
Marketing: Full engine running
Sales: Sustainable at scale
```

**Key Metric:** Lead → Quote conversion time
- Target: <24 hours from lead to quote
- Automation makes this possible at scale

---

## 💰 BUSINESS IMPACT

### Without Split + Automation
```
Marketing generates: 100 leads/week
CEO can handle: 15 leads/week
Result: 85% of leads ignored ❌
Lost opportunity: Huge
```

### With Split + Automation
```
Marketing generates: 100 leads/week
AI qualifies: 35 qualified leads/week
CEO handles: 35 qualified leads/week ✅
Close rate: 25% = 8-9 wins/week
Monthly revenue: ~$1.4M (at $40K avg)
```

**ROI Calculation:**
- Development cost: 3 weeks × 2 developers = ~$30K
- Monthly revenue increase: ~$1M+ (from handling more volume)
- **Payback:** Immediate

---

## 🚦 GO/NO-GO DECISION POINTS

### Week 3 Checkpoint: Ready for Marketing?

**Green Light Criteria:**
- ✅ Sales automation handles 50 leads/week smoothly
- ✅ Quote time: <10 min average
- ✅ Margin protection working (no accidental low quotes)
- ✅ Marketing app generating test leads successfully
- ✅ Attribution tracking works

**If YES:** Ramp marketing to 25 leads/week

**If NO:** Fix bottlenecks, delay marketing 1-2 weeks

### Month 2 Checkpoint: Scale Marketing?

**Green Light Criteria:**
- ✅ Handling 25-30 leads/week without stress
- ✅ Close rate maintaining (no quality drop)
- ✅ CEO satisfaction with automation
- ✅ No major bugs in workflow

**If YES:** Scale marketing to 50-75 leads/week

**If NO:** Optimize automation, hold at 25/week

---

## 🔧 TECH STACK RECOMMENDATIONS

### Core App (Sales/Production)
```
Current stack: React + Express + PostgreSQL ✅
Keep as-is, add:
- OpenAI API (for automation)
- Webhook infrastructure
- Job queue (Bull/BullMQ for background processing)
```

### Marketing App
```
Recommended: Next.js + PostgreSQL
Why:
- SEO-optimized (critical for marketing)
- Fast page loads (conversions)
- Easy content management
- Vercel deployment (scalable)

Alternative: Keep same stack (React + Express)
Why:
- Team familiarity
- Shared components
- Easier maintenance
```

**My recommendation:** Next.js for marketing (built for SEO/content)

---

## 🎯 SUCCESS METRICS

Track these weekly:

### Sales Automation Metrics
- Leads received (total)
- Leads qualified (AI filtered)
- Quotes generated
- Time to quote (avg)
- Proposal send rate
- Signature rate
- Close rate
- Revenue per lead

### Marketing Metrics
- Website traffic
- Form submissions
- Lead quality score
- Cost per lead
- Lead → Deal conversion
- ROI by channel
- Attribution accuracy

### Bottleneck Detection
- Lead queue backlog (should be <5)
- Avg time in queue (should be <24 hours)
- CEO quote capacity used (should be <80%)
- System errors (should be <1%)

---

## 🚀 WHAT TO BUILD FIRST

**Week 1 Priority Order:**

### Days 1-2: Foundation
1. ✅ Split marketing to separate repo/app
2. ✅ Set up API integration layer (webhooks)
3. ✅ Create lead capture API in Core

### Days 3-4: AI Layer
4. ✅ Build AI lead qualification
5. ✅ Build RFP analyzer

### Day 5: Test
6. ✅ End-to-end test: Marketing form → Core lead → Quote
7. ✅ Verify automation speeds

**Week 2:** Quote automation (AI suggestions, proposal generation)
**Week 3:** Follow-up automation + polish

---

## 💡 FINAL RECOMMENDATION

**Do BOTH in parallel:**

1. **Extract Marketing App** (Week 1) ← Start NOW
   - Separate Next.js app
   - Marketing can build while you focus on sales
   - Ready to scale when you are

2. **Build Sales Automation** (Week 1-3) ← Also start NOW
   - Handle high volume
   - AI qualification + suggestions
   - CEO can process 10x more leads

**Why both?** Marketing will ramp FAST. You need to be ready. Building them separately means:
- Marketing can iterate on campaigns without touching sales
- Sales automation can handle the flood
- No bottlenecks when marketing scales

**Timeline:** 3 weeks to marketing-ready, then ramp gradually.

---

Ready to build? 🚀
