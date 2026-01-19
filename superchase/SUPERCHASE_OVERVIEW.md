# SuperChase: AI Executive Assistant System

## Executive Summary

SuperChase is an AI-powered executive assistant built for Chase Pierson, founder of CPTV Inc (a video production and real estate media company). It's designed to handle the cognitive overhead of running a solo business—triaging emails, managing tasks, tracking leads, and providing hands-free voice interaction while driving between shoots.

---

## The Problem

### Context: Solo Entrepreneur Challenges

Chase runs CPTV Inc primarily solo, handling:
- Video production shoots across multiple locations
- Real estate photography/videography clients
- Contract negotiations and invoicing
- Lead generation and sales pipeline
- Day-to-day task management

### Specific Pain Points

1. **Email Overload**: 50-100+ emails daily, mixing urgent client requests with newsletters and spam. No time to properly triage while driving between jobs.

2. **Context Switching**: Moving between shoots, client calls, and admin work causes important tasks to fall through cracks.

3. **No Executive Support**: Can't afford a human assistant, but needs the cognitive offload of one.

4. **Mobile-First Reality**: Spends significant time driving. Needs hands-free interaction—can't be looking at screens.

5. **Fragmented Systems**: Information scattered across email, Asana, spreadsheets, and mental notes. No unified view.

6. **Reactive Mode**: Always responding to the loudest request rather than strategically prioritizing.

---

## The Solution: SuperChase Architecture

SuperChase is a multi-component system that acts as a persistent AI executive assistant with memory, learning capabilities, and multi-modal interaction.

### Core Design Principles

1. **Autonomous but Bounded**: Can act independently on safe operations, but always asks before sending emails, spending money, or deleting data.

2. **Learning from Mistakes**: Tracks what works and what doesn't, adjusting behavior over time.

3. **Hands-Free First**: Voice interaction is primary interface, not an afterthought.

4. **Google-Native**: Built on Google Workspace (Sheets, Apps Script, Gmail) for seamless integration with existing tools.

5. **Cost-Conscious**: Uses efficient AI models (Gemini 2.0 Flash for analysis, ElevenLabs for voice) to keep costs under $5/month for typical usage.

---

## System Components

### 1. Email Triage System

**Purpose**: Automatically analyze and categorize incoming emails, surfacing urgent items and filtering noise.

**How It Works**:
- Apps Script runs every 5 minutes via time-based trigger
- Fetches unread emails from Gmail
- Sends email content to Gemini 2.0 Flash for analysis
- Gemini returns structured JSON with:
  - Category (client, lead, vendor, personal, spam, newsletter)
  - Priority (urgent, high, normal, low)
  - Suggested action (respond, schedule, delegate, archive, delete)
  - Brief summary
- Results logged to Google Sheets "Email Log" tab
- High-priority items can trigger notifications

**Problems Solved**:
- No more missing urgent client emails buried in newsletters
- Can glance at prioritized list instead of reading every email
- Historical record of all email decisions for pattern analysis

### 2. Google Sheets Database

**Purpose**: Central data store that's human-readable, easily editable, and doesn't require infrastructure.

**Structure**:
| Tab | Purpose | Key Columns |
|-----|---------|-------------|
| Tasks | Daily to-dos | Task, Status, Priority, Due, Assignee |
| Projects | Larger initiatives | Name, Status, Client, Budget, Timeline |
| Leads | Sales pipeline | Name, Company, Stage, Value, Next Action |
| Contracts | Contract lifecycle | Client, Type, Status, Value, Dates |
| Expenses | Expense tracking | Date, Vendor, Amount, Category, Status |
| Email Log | Triage results | Timestamp, From, Subject, Category, Priority, Action |
| Feedback | User corrections | Request, Response, Rating, Notes |
| Patterns | Learned behaviors | Request Type, Approach, Outcome, Score |
| Sessions | Session learnings | Date, Summary, Wins, Lessons |

**Why Sheets**:
- No database to maintain
- Chase can view/edit on phone
- Apps Script has native access
- Easy to share with future team members
- Natural backup via Google

### 3. Asana Integration

**Purpose**: Sync task/project data bidirectionally with Asana for richer project management UI.

**Structure** (5 Asana Projects):
- **SC: Tasks** - Daily to-dos (sections: To Do, In Progress, Done)
- **SC: Projects** - Larger initiatives (sections: Active, On Hold, Completed)
- **SC: Leads** - Sales pipeline (sections: New, Contacted, Qualified, Won, Lost)
- **SC: Contracts** - Contract lifecycle (sections: Draft, Sent, Signed)
- **SC: Expenses** - Expense tracking (sections: Pending, Approved, Paid)

**Sync Mechanism**:
- Apps Script runs every 10 minutes
- Compares Sheets rows to Asana tasks via custom ID field
- Creates/updates/completes tasks in both directions
- Handles conflicts by preferring most recent update

**Problems Solved**:
- Can use Asana's mobile app and board views
- Tasks created anywhere appear everywhere
- Don't lose context when switching tools

### 4. Voice Interface (ElevenLabs Conversational AI)

**Purpose**: Enable hands-free interaction while driving—ask questions, add tasks, get briefings.

**Implementation**:
- ElevenLabs Conversational AI agent (agent_6601kfc80k2qftha80gdxca6ym0m)
- Voice: George (professional, clear)
- LLM: Gemini 2.5 Flash (or Claude)
- Handles both speech-to-text and text-to-speech server-side

**Why ElevenLabs vs Browser APIs**:
- Web Speech API is unreliable on mobile (iOS Safari blocks it, Chrome mobile is inconsistent)
- ElevenLabs handles audio capture, transcription, LLM call, and speech synthesis in one flow
- Works consistently across devices
- Low latency for conversational feel

**Capabilities**:
- "What's my priority for today?"
- "Add a task to follow up with [client]"
- "Any urgent emails?"
- "Remind me about the Smith contract"

**Backup**: Web interface at superchase.vercel.app (browser-based, less reliable on mobile)

### 5. Learning System

**Purpose**: Enable SuperChase to improve over time by tracking what works and what doesn't.

**Components**:

**a) Session Logging (LEARNINGS.md)**
After each development/interaction session, document:
- What was attempted
- What worked / what didn't
- Lessons learned
- Patterns to reinforce or avoid

**b) Feedback Loop (Sheets: Feedback tab)**
- User can rate responses (thumbs up/down)
- Corrections logged with context
- Patterns extracted for future behavior

**c) Pattern Storage (Sheets: Patterns tab)**
- Request types mapped to successful approaches
- Scores track effectiveness over time
- Reinforcement threshold: 3 successes = default behavior
- Deprecation threshold: 3 failures = stop doing

**d) Failure Classification**
| Type | Description | Auto-Fix |
|------|-------------|----------|
| BAD_RETRIEVAL | Couldn't find info | Adjust search params |
| BAD_CONTEXT | Misunderstood situation | Add clarifying context |
| WRONG_PRIORITY | Mis-prioritized | Update priority rules |
| EXECUTION_ERROR | Implementation failed | Log pattern, add to checklist |
| PERMISSION_ISSUE | Acted outside scope | Reinforce boundaries |
| DATA_CORRUPTION | Modified data wrong | HUMAN APPROVAL required |

**e) Permission Levels**
```
Always OK (no approval): create_task, update_status, read_data, generate_draft, log_activity, sync_to_asana

Always Ask: send_email, send_message, delete_data, financial_commitment, share_externally
```

### 6. Self-Improvement Configuration

**File**: `superchase/config/self_improvement.json`

Defines runtime behavior for different "subagent" modes:

| Agent | Purpose | Key Settings |
|-------|---------|--------------|
| Researcher | Find information | Max 3 queries, 0.7 confidence threshold |
| Implementer | Execute tasks | Review required for destructive ops, auto-backup |
| Reviewer | Check work | Block on security/data-loss, warn on style |
| Communicator | Draft messages | 200 word max, professional tone, approval required |
| Strategist | Plan/analyze | Thorough analysis, 12-week horizon |

---

## Data Flow Example: "Urgent Email from Client"

1. **Email arrives** in Gmail
2. **Apps Script trigger** fires (5-min interval)
3. **Gemini analyzes** email content
4. **Returns**: Category=client, Priority=urgent, Action=respond
5. **Logged to Sheets** Email Log tab
6. **If voice active**, SuperChase announces: "Urgent email from [client] about [topic]. Want me to draft a response?"
7. **User approves** draft via voice
8. **Draft created** in Gmail (not sent—requires explicit approval)
9. **Task created** in Sheets/Asana: "Follow up with [client]"
10. **Pattern logged**: "Client emails about [topic] → draft response" (positive outcome)

---

## Technical Stack

| Component | Technology | Cost |
|-----------|------------|------|
| Database | Google Sheets | Free |
| Automation | Google Apps Script | Free |
| Email Analysis | Gemini 2.0 Flash API | ~$0.50/1000 emails |
| Voice Interface | ElevenLabs Conversational AI | ~$0.08/min |
| Web Backup | Vercel + HTML/JS | Free |
| Task Management | Asana API | Free tier |
| Code Repository | GitHub | Free |

**Estimated Monthly Cost**: $1-5 for typical usage

---

## Current Status (as of 2025-01-19)

### Working (65-70% Complete)
- Email triage with 5-minute triggers
- Gemini analysis returning structured decisions
- Google Sheets database with core tabs
- Asana sync code complete (needs verification)
- ElevenLabs voice agent published (needs share link)
- Learning system code complete (needs tabs created)
- Documentation and context files

### Needs Manual Setup
- Get ElevenLabs public share link (requires login)
- Verify Asana connection
- Create Feedback/Patterns/Sessions tabs in Sheets
- Test email triage end-to-end

### Future Phases

**Phase 2: Multi-Agent System**
- Claude Project with orchestrating Main Agent
- MCP (Model Context Protocol) integrations for Sheets, Asana, Drive
- Local folder sync for offline context

**Phase 3: Proactive Intelligence**
- Calendar integration (meeting prep, scheduling)
- Proactive monitoring ("You haven't followed up with [lead] in 5 days")
- Financial dashboards and alerts

---

## Key Design Decisions

### Why Google Sheets over a "Real" Database?
- Zero infrastructure to maintain
- Chase can view/edit on phone without special app
- Apps Script has native, authenticated access
- Easy to debug—just look at the spreadsheet
- Natural version history via Google

### Why Gemini over GPT-4/Claude for Email Analysis?
- Cost: Gemini 2.0 Flash is significantly cheaper for high-volume analysis
- Speed: Sub-second responses for simple classification
- Integration: Works well with Google ecosystem
- Quality: More than sufficient for email triage

### Why ElevenLabs over Building Custom Voice?
- Browser speech APIs are unreliable on mobile
- ElevenLabs handles full pipeline (STT → LLM → TTS)
- Consistent quality across devices
- Low latency for conversational use
- Reasonable cost (~$0.08/min)

### Why Asana + Sheets instead of Just One?
- Sheets: Source of truth, programmatic access, simple queries
- Asana: Rich UI, mobile app, board views, subtasks, comments
- Bidirectional sync gives best of both worlds

### Why Learning System?
- Solo AI assistant needs to adapt to user preferences
- Can't retrain the model, but can adjust prompts and patterns
- Explicit feedback loop builds trust
- Session logging enables debugging across conversations

---

## Security Considerations

1. **API Keys**: Stored in Apps Script properties (not in code)
2. **Asana Token**: Personal access token, limited to SuperChase workspace
3. **Email Access**: Apps Script runs as authenticated user, no external access
4. **Voice**: ElevenLabs processes audio server-side, doesn't store conversations
5. **Permission Levels**: Dangerous operations always require explicit approval

---

## Files Reference

| File | Purpose |
|------|---------|
| `superchase/CLAUDE.md` | Main AI context for Claude sessions |
| `superchase/LEARNINGS.md` | Session-by-session learning log |
| `superchase/HOTEL_TODO.md` | Setup checklist |
| `superchase/SHEETS_SETUP.md` | Google Sheets tab creation guide |
| `superchase/config/self_improvement.json` | Learning system configuration |
| `apps-script/EmailTriage.gs` | Email analysis automation |
| `apps-script/AsanaSync.gs` | Bidirectional Asana sync |
| `apps-script/SuperChaseCore.gs` | Shared utilities |

---

## Summary

SuperChase transforms a fragmented, reactive workflow into a coherent, AI-augmented system. It's not trying to replace human judgment—it's trying to surface the right information at the right time, handle routine triage automatically, and free up cognitive bandwidth for the work that actually matters.

The key insight is that most executive assistant tasks are actually pattern-matching and prioritization—exactly what AI excels at—while the "always ask" safeguards ensure humans stay in control of consequential decisions.

Built on free/cheap infrastructure (Google Sheets, Apps Script, Vercel), it proves you don't need enterprise budgets to have enterprise-level AI assistance.
