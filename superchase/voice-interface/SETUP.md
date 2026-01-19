# SuperChase Voice Interface Setup

## What You Need from ElevenLabs

### Step 1: Get Your API Key
1. Go to https://elevenlabs.io
2. Sign in to your account
3. Click your profile icon → **Profile + API key**
4. Copy your API key (starts with `sk_`)

### Step 2: Create a Conversational AI Agent (RECOMMENDED)
This gives you the full voice conversation experience:

1. Go to https://elevenlabs.io/conversational-ai
2. Click **Create Agent**
3. Configure the agent:
   - **Name:** SuperChase
   - **LLM:** Select **Claude** (Claude Sonnet 4 recommended)
   - **Voice:** Pick any voice you like (Rachel, Josh, etc.)
   - **System Prompt:** Copy/paste this:

```
You are SuperChase, an AI personal assistant for Chase Pierson at CPTV Inc.

SYSTEM CONTEXT:
- Database: Google Sheets
- Task Management: 5 Asana projects that sync every 10 minutes
  - SC: Tasks (daily tasks)
  - SC: Projects (larger initiatives)
  - SC: Leads (sales pipeline)
  - SC: Contracts (contract lifecycle)
  - SC: Expenses (expense tracking)

YOUR CAPABILITIES:
- Research (auto-execute)
- Code/automation (auto-execute)
- Document review (auto-execute)
- Email drafts (require approval to send)
- Strategic planning (auto-execute)

BEHAVIOR:
- Be concise in voice responses (1-2 sentences when possible)
- Confirm actions briefly
- Ask clarifying questions when needed
- For complex requests, break into steps

You're Chase's trusted assistant. Be helpful, direct, and conversational.
```

4. Click **Create Agent**
5. Copy the **Agent ID** from the agent dashboard

### Step 3: Enter Credentials in SuperChase Voice
1. Open `voice-interface/index.html` in your browser
2. Click the ⚙️ settings icon
3. Enter:
   - **ElevenLabs API Key:** Your `sk_...` key
   - **Agent ID:** The ID from Step 2
4. Click **Save & Connect**

---

## Alternative: Basic Mode (No Agent ID)
If you skip creating an Agent, the interface will use:
- ElevenLabs TTS for voice output
- Browser speech recognition for voice input
- Local response generation (limited)

This works but isn't as powerful as the full Conversational AI.

---

## Willow Voice / Whisper
If you have Willow Voice or use OpenAI Whisper for transcription, those are separate from ElevenLabs. ElevenLabs handles:
- Text-to-Speech (speaking)
- Conversational AI (full voice conversation with Claude)

---

## Limitless Pendant
The Limitless pendant records and transcribes conversations, but it's a separate system. You could potentially:
1. Export Limitless transcripts
2. Send them to SuperChase for analysis/action items
3. But there's no direct integration yet

---

## Pricing
- ElevenLabs Conversational AI: ~$0.08/minute
- Includes Claude AI reasoning
- First 10-15 minutes free on trial

---

## Quick Test
Once connected, try saying:
- "What's on my task list?"
- "Give me a status report"
- "Add a task: Follow up with client tomorrow"
