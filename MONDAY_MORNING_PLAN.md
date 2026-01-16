# ☕ Monday Morning Game Plan

If this was my project and I sat down Monday with coffee, here's exactly what I'd do:

## Hour 1: Audit Existing Automations (9am-10am)

Create a simple checklist of what works today:

```bash
# Test these workflows manually:

1. CPQ → Quote Creation
   [ ] Open CPQ calculator
   [ ] Configure quote
   [ ] Save quote
   [ ] Does it save to lead record? ✓ or ✗

2. Proposal Generation
   [ ] Click "Generate Proposal"
   [ ] Does PDF generate? ✓ or ✗
   [ ] Does it use quote data? ✓ or ✗

3. Signature Workflow
   [ ] Send proposal to test email
   [ ] Open signature page
   [ ] Sign proposal
   [ ] Does it update lead? ✓ or ✗

4. Closed Won Automation
   [ ] Move deal to "Closed Won"
   [ ] Does UPID generate? ✓ or ✗
   [ ] Do Drive folders create? ✓ or ✗
   [ ] Does project create? ✓ or ✗

5. Field Ops
   [ ] Record voice note
   [ ] Does it transcribe? ✓ or ✗
   [ ] Clock in/out
   [ ] Does time log save? ✓ or ✗

6. QuickBooks Sync
   [ ] Trigger QB sync
   [ ] Do expenses sync? ✓ or ✗
   [ ] Do they link to leads? ✓ or ✗
```

**Output:** Simple checklist of what works vs. what needs building

---

## Hour 2-3: Build Missing Critical Automation (10am-12pm)

Pick THE most impactful automation that's missing and build it.

My guess? **Auto-send proposal email**

```typescript
// File: server/routes/proposals/send.ts

import { sendEmail } from '../../lib/gmail';
import { db } from '../../../shared/db';
import { generatedProposals, leads } from '../../../shared/schema/db';
import { eq } from 'drizzle-orm';

router.post('/api/proposals/:id/send', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body; // Optional custom message

  // Get proposal
  const proposal = await db.query.generatedProposals.findFirst({
    where: eq(generatedProposals.id, parseInt(id)),
  });

  if (!proposal) {
    return res.status(404).json({ error: 'Proposal not found' });
  }

  // Get lead
  const lead = await db.query.leads.findFirst({
    where: eq(leads.id, proposal.leadId),
  });

  // Generate signature link
  const signatureToken = generateSecureToken();
  const signatureUrl = `${process.env.BASE_URL}/public/signature/${proposal.id}/${signatureToken}`;

  // Store token
  await db.update(generatedProposals)
    .set({ signatureToken })
    .where(eq(generatedProposals.id, proposal.id));

  // Send email
  await sendEmail({
    to: lead.contactEmail,
    subject: `Proposal for ${lead.projectName}`,
    html: `
      <p>Hi ${lead.contactName},</p>

      ${message || '<p>Please review our proposal for your project.</p>'}

      <p><strong><a href="${signatureUrl}">Click here to review and sign</a></strong></p>

      <p>If you have any questions, please don't hesitate to reach out.</p>

      <p>Best regards,<br>Your Scan2Plan Team</p>
    `,
    attachments: proposal.pdfUrl ? [
      {
        filename: `Proposal_${lead.projectCode}.pdf`,
        path: proposal.pdfUrl,
      }
    ] : [],
  });

  // Update proposal status
  await db.update(generatedProposals)
    .set({
      sentAt: new Date(),
      status: 'Sent',
    })
    .where(eq(generatedProposals.id, proposal.id));

  // Update lead stage to "Proposal"
  if (lead.dealStage === 'Contacted') {
    await db.update(leads)
      .set({
        dealStage: 'Proposal',
        lastContactedAt: new Date(),
      })
      .where(eq(leads.id, lead.id));
  }

  res.json({ success: true, signatureUrl });
});
```

**Time:** 2 hours to build + test
**Impact:** Huge - eliminates manual email sending

---

## Hour 4: Test End-to-End (1pm-2pm)

Run through the full workflow with a fake lead:

```
1. Create lead: "Test Client - Office Building"
2. Open CPQ, create quote ($50k)
3. Generate proposal
4. Send proposal (to your own email)
5. Open signature link
6. Sign proposal
7. Verify: Deal stage = "Proposal" ✓
8. Move to "Closed Won"
9. Verify: UPID created, Drive folders created, project created ✓
10. Create field note
11. Verify: Transcription works ✓
```

**Find:** What breaks? What's slow? What's confusing?

---

## Hour 5-6: Plan Tomorrow's Work (2pm-4pm)

Based on what you found, create tomorrow's task list.

Example:
```
Tuesday Tasks:
1. Fix: Proposal generation failing on quotes without X
2. Build: Payment reminder cron job
3. Build: Client progress email automation
4. Test: QB expense sync with real data
```

---

## Hour 7-8: Build One More Quick Win (4pm-6pm)

Pick something small that adds value:

**Option A: Stale Deal Notification (1 hour)**
```typescript
// Add to cron job
async function notifyStaleDeals() {
  const stale = await db.query.leads.findMany({
    where: and(
      notInArray(leads.dealStage, ['Closed Won', 'Closed Lost']),
      lt(leads.lastContactedAt, subDays(new Date(), 14))
    ),
  });

  if (stale.length > 0) {
    await sendEmail({
      to: 'sales@yourcompany.com',
      subject: `⚠️ ${stale.length} Stale Deals Need Attention`,
      html: stale.map(l =>
        `<li>${l.clientName} - ${l.value} - Last contact: ${l.lastContactedAt}</li>`
      ).join(''),
    });
  }
}
```

**Option B: Client Progress Email (1.5 hours)**
```typescript
// In project update route
async function onProjectStageChange(projectId, newStage) {
  const project = await getProject(projectId);
  const lead = await getLead(project.leadId);

  const messages = {
    'Scanning': `Good news! We've scheduled your site visit.`,
    'Registration': `Site capture complete. Processing data now.`,
    'Modeling': `Creating your BIM model.`,
    'QC': `Model complete, running quality checks.`,
    'Delivered': `🎉 Your project is ready!`,
  };

  await sendEmail({
    to: lead.contactEmail,
    subject: `Update: ${project.name}`,
    body: messages[newStage],
  });
}
```

---

## End of Day: Commit & Reflect

```bash
git add .
git commit -m "feat: Add proposal auto-send and client progress emails"
git push

# Write down:
# - What worked well today?
# - What's still missing?
# - What should I prioritize tomorrow?
```

---

## Tuesday-Thursday: Keep Building Automations

**Tuesday:** Payment reminders + tech assignment notifications
**Wednesday:** Closed Won enhancements (invoice, QB, notifications)
**Thursday:** Daily reports + QB expense linking

**Friday:** Test everything, make a demo video for the team

---

## Next Week: Polish & Launch Prep

**Monday-Tuesday:** Fix bugs found during testing
**Wednesday:** Write user documentation
**Thursday:** Train sales team
**Friday:** Soft launch with first client

---

## The Honest Truth

You have a **really solid foundation** already.

You don't need a massive architecture overhaul.

You need:
1. ✅ 8-10 key automations (2 weeks of work)
2. ✅ End-to-end testing (3-4 days)
3. ✅ Launch with real clients (learn what actually matters)

Then in Month 2-3, split marketing out when you have real data.

**That's what I'd actually do.** 🚀
