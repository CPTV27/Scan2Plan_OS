# 🤖 AUTOMATION-FIRST LAUNCH PLAN

**Goal:** Maximum automation so you can focus on growth, not admin work
**Timeline:** 3-4 weeks to launch-ready
**Philosophy:** If a computer can do it, a computer SHOULD do it

---

## The Automation Checklist

### ✅ SALES AUTOMATION (Week 1-2)

#### 1. AI Quote Suggestion Engine
**What:** When creating a quote, AI analyzes similar past projects and suggests pricing

**How:**
```typescript
// When user opens CPQ for a new lead:
async function suggestQuote(lead: Lead) {
  // Find similar projects
  const similar = await findSimilarProjects({
    buildingType: lead.buildingType,
    sqft: lead.sqft,
    scope: lead.scope,
  });

  // Calculate median pricing
  const suggested = {
    clientPrice: median(similar.map(p => p.totalClientPrice)),
    margin: median(similar.map(p => p.grossMargin)),
    travelRate: mode(similar.map(p => p.travelRate)),
  };

  // Show in UI: "Based on 5 similar projects, suggested quote: $X"
  return suggested;
}
```

**User Experience:**
- User opens CPQ calculator
- Sees: "💡 Based on 3 similar projects (avg $45K, 35% margin) - Autofill?"
- Clicks "Autofill" → CPQ pre-populated, user tweaks as needed
- **Time saved:** 10-15 minutes per quote

**Status:** ⚠️ Need to check if this exists

---

#### 2. One-Click Proposal Generation
**What:** Click "Generate Proposal" → PDF instantly created from quote

**How:**
```typescript
// In DealWorkspace or CPQ:
<Button onClick={async () => {
  // 1. Take CPQ data
  // 2. Select proposal template (or use default)
  // 3. Generate PDF with all pricing, scope, terms
  // 4. Save to generated_proposals table
  // 5. Upload to Google Drive
  // 6. Show "Send to Client" dialog
  const proposal = await generateProposal(lead.id, cpqData);
  navigate(`/proposals/${proposal.id}`);
}}>
  Generate Proposal
</Button>
```

**User Experience:**
- Quote complete → "Generate Proposal" → PDF ready in 3 seconds
- Review → "Send to Client" → Email sent with signature link
- **Time saved:** 30-45 minutes per proposal (no manual Word doc editing)

**Status:** ⚠️ Need to check if this is fully automated

---

#### 3. Auto-Send Proposal + Signature Workflow
**What:** Send proposal email → Client clicks link → Signs → Auto-updates deal stage

**How:**
```typescript
// SendProposalDialog component:
async function sendProposal(proposalId, clientEmail) {
  // 1. Generate signature link
  const signatureUrl = `${baseUrl}/public/signature/${proposalId}/${token}`;

  // 2. Send email via Gmail
  await sendEmail({
    to: clientEmail,
    subject: `Proposal for ${projectName}`,
    html: `
      <p>Hi ${contactName},</p>
      <p>Please review and sign our proposal:</p>
      <a href="${signatureUrl}">View & Sign Proposal</a>
    `,
    attachments: [{ filename: 'proposal.pdf', path: proposalPdfUrl }],
  });

  // 3. Track sent
  await db.update(leads).set({ dealStage: 'Proposal' });
}

// When client signs (ClientSignaturePage):
async function onSignatureComplete(signature) {
  // Auto-update deal stage
  await db.update(leads).set({
    dealStage: 'Negotiation', // or back to sales for review
    signatureImage: signature,
    signedAt: new Date(),
  });

  // Notify sales rep
  await sendNotification(salesRep, 'Client signed proposal!');
}
```

**User Experience:**
- Sales: "Send Proposal" → Done
- Client: Receives email → Reviews → Signs online → Done
- Sales: Gets notification → Moves to next step
- **Time saved:** 2-3 hours of back-and-forth per deal

**Status:** ✅ Signature capture exists, verify auto-send works

---

#### 4. Stale Deal Automation
**What:** If deal hasn't been touched in 14 days, auto-notify sales rep

**How:**
```typescript
// Cron job (runs daily at 9am):
async function detectStaleDeals() {
  const stale = await db.query.leads.findMany({
    where: and(
      notInArray(leads.dealStage, ['Closed Won', 'Closed Lost']),
      lt(leads.lastContactedAt, subDays(new Date(), 14))
    ),
  });

  for (const lead of stale) {
    // Reduce probability (you already have this)
    await db.update(leads)
      .set({ probability: Math.max(0, lead.probability - 10) });

    // Notify sales rep
    await sendEmail({
      to: lead.salesRep.email,
      subject: `⚠️ Stale Deal: ${lead.clientName}`,
      body: `Deal hasn't been updated in 14 days. Time to follow up!`,
    });

    // OR: Auto-send follow-up to client (if enabled)
    if (lead.autoFollowup) {
      await sendFollowUpEmail(lead);
    }
  }
}
```

**User Experience:**
- Sales rep gets email: "You have 3 stale deals"
- Clicks link → Goes to deal → Follows up
- **Time saved:** Prevents lost deals ($$$ value)

**Status:** ⚠️ Staleness detection exists, add notification

---

### ✅ PRODUCTION AUTOMATION (Week 2)

#### 5. Closed Won → Full Project Setup
**What:** Deal moves to "Closed Won" → Everything auto-creates

**How:**
```typescript
// This partially exists - enhance it:
async function onClosedWon(leadId: number) {
  // 1. Generate UPID (you have this)
  const upid = await generateUPID(lead);

  // 2. Create Google Drive folders (you have this)
  const driveFolder = await createDriveFolders(upid);

  // 3. Create QuickBooks customer (NEW)
  const qbCustomer = await createQBCustomer({
    name: lead.clientName,
    email: lead.contactEmail,
    phone: lead.contactPhone,
  });

  // 4. Create project in production (you have this)
  const project = await db.insert(projects).values({
    leadId,
    universalProjectId: upid,
    status: 'Scheduling',
    driveFolderId: driveFolder.id,
  });

  // 5. Create retainer invoice (NEW - AUTO)
  const invoice = await db.insert(invoices).values({
    leadId,
    projectId: project.id,
    amount: lead.retainerAmount,
    status: 'Pending',
    dueDate: addDays(new Date(), 7),
  });

  // 6. Send retainer invoice email (NEW - AUTO)
  await sendEmail({
    to: lead.billingContactEmail,
    subject: `Invoice for ${lead.projectName}`,
    html: `
      <p>Thank you for choosing Scan2Plan!</p>
      <p>Retainer: $${lead.retainerAmount}</p>
      <p><a href="${paymentLink}">Pay Now</a></p>
    `,
  });

  // 7. Notify production team (NEW)
  await sendGoogleChatNotification({
    channel: 'production',
    message: `🎉 New project: ${upid} - ${lead.projectName}`,
  });

  // 8. Create calendar event for kickoff (NEW)
  await createCalendarEvent({
    title: `Kickoff: ${lead.projectName}`,
    date: addDays(new Date(), 7),
    attendees: [lead.contactEmail, productionLead.email],
  });
}
```

**User Experience:**
- Sales: Moves deal to "Closed Won"
- System: Creates UPID, Drive folders, QB customer, invoice, project
- Client: Receives retainer invoice email with payment link
- Production: Gets notification with project details
- **Time saved:** 45-60 minutes of manual setup per project

**Status:** ⚠️ Partial - enhance with invoice, QB, notifications

---

#### 6. Client Progress Update Automation
**What:** When project stage changes, auto-email client with update

**How:**
```typescript
// In project stage change handler:
async function onProjectStageChange(projectId, newStage) {
  const project = await getProject(projectId);
  const lead = await getLead(project.leadId);

  // Email templates for each stage
  const messages = {
    'Scanning': `We've scheduled your site visit for [date]. Our tech will arrive at [time].`,
    'Registration': `Field capture complete! We're now processing the scan data.`,
    'Modeling': `Data processing complete. Our team is creating your BIM model.`,
    'QC': `Modeling complete! Our QC team is reviewing for accuracy.`,
    'Delivered': `🎉 Your project is complete! Access your deliverables: [link]`,
  };

  await sendEmail({
    to: lead.contactEmail,
    subject: `Project Update: ${project.name} - ${newStage}`,
    body: messages[newStage],
  });

  // Log communication
  await db.insert(emailMessages).values({
    leadId: lead.id,
    subject: `Project Update: ${newStage}`,
    sentAt: new Date(),
  });
}
```

**User Experience:**
- Production: Moves project from "Scanning" → "Registration"
- Client: Receives email update automatically
- Sales doesn't have to manually update client
- **Time saved:** 15-20 minutes per stage change × 6 stages = 2 hours per project

**Status:** 🆕 Need to build

---

#### 7. Tech Assignment Auto-Notification
**What:** Assign tech to project → Tech gets email/text with mission brief

**How:**
```typescript
async function assignTech(projectId, techId) {
  const tech = await getScanTech(techId);
  const project = await getProject(projectId);
  const lead = await getLead(project.leadId);

  // Update assignment
  await db.update(projects).set({ assignedTechId: techId });

  // Send email to tech
  await sendEmail({
    to: tech.email,
    subject: `New Assignment: ${project.name}`,
    html: `
      <h2>Mission Brief</h2>
      <p><strong>Project:</strong> ${project.name}</p>
      <p><strong>Address:</strong> ${lead.projectAddress}</p>
      <p><strong>Date:</strong> ${project.scanDate}</p>
      <p><strong>Scope:</strong> ${lead.scope}</p>
      <p><a href="${missionBriefUrl}">View Full Brief</a></p>
    `,
  });

  // Optional: SMS notification
  if (tech.phone) {
    await sendSMS(tech.phone, `New scan assignment: ${project.name} on ${project.scanDate}`);
  }
}
```

**User Experience:**
- Production: Assigns tech in UI
- Tech: Gets email + SMS instantly
- Opens link → Sees full mission brief with address, scope, notes
- **Time saved:** 10-15 minutes per assignment

**Status:** ⚠️ Assignment exists, add auto-notification

---

### ✅ FINANCIAL AUTOMATION (Week 3)

#### 8. Payment Reminder Sequence
**What:** Invoice overdue → Auto-send reminders at 3, 7, 14, 30 days

**How:**
```typescript
// Cron job (runs daily):
async function sendPaymentReminders() {
  const overdue = await db.query.invoices.findMany({
    where: and(
      eq(invoices.status, 'Pending'),
      lt(invoices.dueDate, new Date())
    ),
  });

  for (const invoice of overdue) {
    const daysOverdue = differenceInDays(new Date(), invoice.dueDate);

    // Reminder schedule
    const shouldSend = [3, 7, 14, 30].includes(daysOverdue);

    if (shouldSend) {
      const lead = await getLead(invoice.leadId);

      await sendEmail({
        to: lead.billingContactEmail,
        subject: `Payment Reminder: Invoice ${invoice.id}`,
        html: `
          <p>Hi ${lead.contactName},</p>
          <p>This is a friendly reminder that invoice ${invoice.id} is ${daysOverdue} days overdue.</p>
          <p>Amount due: $${invoice.amount}</p>
          <p><a href="${paymentLink}">Pay Now</a></p>
        `,
      });

      // Escalate at 30 days
      if (daysOverdue === 30) {
        await sendNotification(accountingTeam, `Invoice ${invoice.id} is 30 days overdue`);
      }
    }
  }
}
```

**User Experience:**
- Accounting: Does nothing (system handles it)
- Client: Gets reminders automatically
- If still unpaid at 30 days: Accounting gets notification to call
- **Time saved:** 1-2 hours per week of manual follow-up

**Status:** ⚠️ Collections exist, add auto-reminder emails

---

#### 9. Payment Webhook Auto-Update
**What:** Client pays invoice → Webhook updates status → Unlocks workflow gates

**How:**
```typescript
// Stripe webhook endpoint:
app.post('/api/webhooks/stripe', async (req, res) => {
  const event = req.body;

  if (event.type === 'payment_intent.succeeded') {
    const invoiceId = event.data.object.metadata.invoiceId;

    // Mark invoice paid
    await db.update(invoices)
      .set({
        status: 'Paid',
        paidDate: new Date(),
      })
      .where(eq(invoices.id, invoiceId));

    // If retainer invoice, update lead
    const invoice = await getInvoice(invoiceId);
    if (invoice.amount === lead.retainerAmount) {
      await db.update(leads).set({ retainerPaid: true });

      // Unlock scanning gate!
      await sendNotification(productionTeam, `Retainer paid for ${lead.projectName} - ready to scan!`);
    }
  }

  res.json({ received: true });
});
```

**User Experience:**
- Client: Pays via Stripe link
- Webhook: Updates invoice status instantly
- Production: Gets notification that they can proceed
- **Time saved:** No manual invoice marking, instant workflow unlock

**Status:** 🆕 Need to add payment gateway + webhooks

---

#### 10. QuickBooks Expense Auto-Linking
**What:** QB expenses sync → Auto-link to projects → Profitability updates

**How:**
```typescript
// You have QB sync - enhance it:
async function onQBExpenseSync(expense: QBExpense) {
  // Auto-match to project based on:
  // 1. Vendor name matching client name
  // 2. Date matching project dates
  // 3. Description keywords (UPID, project name)

  const matchedProject = await findMatchingProject(expense);

  if (matchedProject) {
    await db.insert(expenses).values({
      qbExpenseId: expense.id,
      projectId: matchedProject.id,
      leadId: matchedProject.leadId,
      amount: expense.amount,
      category: expense.category,
    });

    // Recalculate profitability
    await updateProjectProfitability(matchedProject.id);
  } else {
    // Manual review needed
    await sendNotification(accounting, `Expense needs manual linking: ${expense.description}`);
  }
}
```

**User Experience:**
- Accounting: Enters expense in QuickBooks
- System: Syncs, auto-links to project
- Dashboard: Profitability updates in real-time
- **Time saved:** 5-10 minutes per expense

**Status:** ⚠️ QB sync exists, add auto-linking logic

---

### ✅ FIELD AUTOMATION (Week 3)

#### 11. Voice Notes → Auto-Transcribed SOW
**What:** Tech records voice note → Whisper transcribes → AI converts to scope

**How:**
```typescript
// You have this - verify it works:
async function processVoiceNote(audioFile) {
  // 1. Transcribe with Whisper
  const transcript = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
  });

  // 2. AI translation to scope
  const scope = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'system',
      content: 'Convert field tech notes to professional scope of work',
    }, {
      role: 'user',
      content: transcript.text,
    }],
  });

  // 3. Save as field note
  await db.insert(fieldNotes).values({
    projectId,
    rawContent: transcript.text,
    processedScope: scope.choices[0].message.content,
    status: 'Processed',
  });

  return scope;
}
```

**User Experience:**
- Tech: Records 2-minute voice note at job site
- System: Transcribes + converts to scope in 10 seconds
- Production: Reads clean, professional scope notes
- **Time saved:** 20-30 minutes of note-writing per job

**Status:** ✅ Already exists - just verify it works

---

#### 12. Daily Report Auto-Generation
**What:** End of day → System compiles time log, notes, photos → Sends to client

**How:**
```typescript
// Cron job (runs at 6pm daily):
async function generateDailyReports() {
  // Find active projects with today's activity
  const activeProjects = await db.query.projects.findMany({
    where: eq(projects.status, 'Scanning'),
  });

  for (const project of activeProjects) {
    const today = startOfDay(new Date());

    // Get today's data
    const timeLogs = await getTimeLogs(project.id, today);
    const fieldNotes = await getFieldNotes(project.id, today);
    const photos = await getPhotos(project.id, today);

    if (timeLogs.length === 0) continue; // No activity today

    // Generate report
    const report = {
      projectName: project.name,
      date: today,
      hours: sumHours(timeLogs),
      notes: fieldNotes.map(n => n.processedScope),
      photos: photos.map(p => p.fileUrl),
    };

    // Send to client
    const lead = await getLead(project.leadId);
    await sendEmail({
      to: lead.contactEmail,
      subject: `Daily Report: ${project.name} - ${formatDate(today)}`,
      html: renderDailyReportEmail(report),
    });
  }
}
```

**User Experience:**
- Tech: Does work, tracks time, takes notes
- 6pm: Client receives daily report automatically
- Client: Sees progress without asking
- **Time saved:** 15-20 minutes per project per day

**Status:** 🆕 Need to build

---

#### 13. GPS Geofence Auto-Clock-In
**What:** Tech arrives at job site → GPS detects → Auto-prompts clock-in

**How:**
```typescript
// In Field App (client-side):
useEffect(() => {
  // Watch GPS position
  const watchId = navigator.geolocation.watchPosition((position) => {
    const { latitude, longitude } = position.coords;

    // Check if near job site
    const distance = calculateDistance(
      latitude, longitude,
      project.siteLatitude, project.siteLongitude
    );

    // Within 100m = geofence triggered
    if (distance < 0.1 && !clockedIn) {
      showNotification('You're at the job site. Clock in?');
    }
  });

  return () => navigator.geolocation.clearWatch(watchId);
}, [project, clockedIn]);
```

**User Experience:**
- Tech: Arrives at job site
- Phone: "You're at the job site. Clock in?" → Tap "Yes"
- Time log: Auto-created with GPS coordinates
- **Time saved:** Prevents forgotten clock-ins, accurate time tracking

**Status:** ⚠️ GPS tracking exists, add geofence prompt

---

## 🎯 PRIORITY ORDER (What to Build First)

Based on **maximum automation per hour of dev work**:

### Week 1: Sales Automation (Highest ROI)
1. ✅ One-click proposal generation (2-3 days)
2. ✅ Auto-send proposal + signature workflow (1-2 days)
3. ✅ Stale deal notifications (1 day)
4. ⚠️ AI quote suggestions (3-4 days, high value)

### Week 2: Production Automation
5. ✅ Enhanced Closed Won automation (2 days)
   - Auto-create retainer invoice
   - QB customer creation
   - Team notifications
6. ✅ Client progress update emails (2 days)
7. ✅ Tech assignment notifications (1 day)

### Week 3: Financial Automation
8. ✅ Payment reminder sequence (2 days)
9. ⚠️ Payment webhook integration (3-4 days, need Stripe)
10. ✅ QB expense auto-linking (2-3 days)

### Week 4: Field Automation + Polish
11. ✅ Daily report auto-generation (2-3 days)
12. ✅ GPS geofence prompt (1-2 days)
13. 🧪 Test everything end-to-end (3-4 days)

---

## 📊 EXPECTED TIME SAVINGS (Per Month)

| Task | Manual Time | Automated | Time Saved | Monthly Savings |
|------|-------------|-----------|------------|-----------------|
| Quote creation | 15 min | 2 min | 13 min | **~4 hours** (20 quotes) |
| Proposal generation | 45 min | 3 min | 42 min | **~14 hours** (20 proposals) |
| Send + track proposals | 30 min | 1 min | 29 min | **~10 hours** (20) |
| Project setup | 60 min | 2 min | 58 min | **~10 hours** (10 projects) |
| Client updates | 20 min | 0 min | 20 min | **~10 hours** (30 updates) |
| Payment follow-up | 15 min | 0 min | 15 min | **~4 hours** (15 reminders) |
| Daily reports | 20 min | 0 min | 20 min | **~7 hours** (20 projects) |
| Invoice tracking | 10 min | 0 min | 10 min | **~3 hours** (20 invoices) |
| **TOTAL** | | | | **~62 hours/month** |

**That's 1.5 full-time employees worth of admin work eliminated.**

---

## 🚀 LAUNCH CHECKLIST

Before you launch, verify these automations work:

### Critical (Must Work)
- [ ] One-click proposal generation
- [ ] Proposal email + signature workflow
- [ ] Closed Won → Project + Drive + Invoice automation
- [ ] Payment reminders (at least manual, auto later)
- [ ] Client progress emails
- [ ] Field notes transcription
- [ ] Time tracking

### Important (Should Work)
- [ ] AI quote suggestions
- [ ] Stale deal notifications
- [ ] Tech assignment notifications
- [ ] QB expense linking
- [ ] Daily reports

### Nice-to-Have (Can Wait)
- [ ] Payment webhooks (can mark paid manually initially)
- [ ] GPS geofence prompts
- [ ] Advanced AI features

---

## 🎯 MY RECOMMENDATION

1. **Week 1-2:** Build the 8 critical automations above
2. **Week 3:** Test end-to-end with real scenarios
3. **Week 4:** Launch with core team, get feedback
4. **Month 2:** Add nice-to-have automations based on what's painful

Then once you're running smoothly:
- **Month 3:** Extract marketing to separate app (it won't block you)
- **Month 4+:** Build marketing automation features

**Bottom line:** Get the revenue machine automated first. Marketing can wait.

---

## What do you want me to do?

1. **Audit existing automations** - Check what already works
2. **Build missing automations** - Start with top priority ones
3. **Create end-to-end test scenarios** - Verify the whole flow works
4. **Something else?**

Let me know and I'll get started! 🚀
