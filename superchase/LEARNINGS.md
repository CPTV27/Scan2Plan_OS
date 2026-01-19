# SuperChase Session Learnings

This file tracks what works and what doesn't across sessions.

---

### Session: 2025-01-19

**What was attempted:**
- Build voice interface for hands-free SuperChase interaction while driving
- Deploy to Vercel for mobile access
- Set up ElevenLabs Conversational AI

**Outcome:** partial

**What worked:**
- ElevenLabs TTS API works reliably
- Vercel deployment from GitHub works
- ElevenLabs Conversational AI agent created and published
- Basic web interface renders correctly

**What didn't work:**
- Web Speech API unreliable on mobile browsers
- iOS Safari: "service-not-allowed" error
- Chrome mobile: works once then errors
- Browser-based speech recognition not suitable for hands-free driving use

**Lessons learned:**
- Don't use Web Speech API for critical mobile voice features
- ElevenLabs Conversational AI is the right solution (handles both STT and TTS server-side)
- Mobile browser APIs are too inconsistent for production voice apps
- Always test on actual mobile device, not just desktop

**Patterns to reinforce:**
- Use dedicated voice AI services (ElevenLabs, Vapi) instead of browser APIs
- Deploy early and test on real devices
- Have fallback options ready

**Patterns to avoid:**
- Relying on navigator.mediaDevices.getUserMedia + SpeechRecognition on mobile
- Building complex browser-based voice UIs for mobile
- Assuming desktop behavior matches mobile

---

### Session Template

Copy this for new sessions:

```
### Session: [DATE]

**What was attempted:**
-

**Outcome:** [success | partial | failure]

**What worked:**
-

**What didn't work:**
-

**Lessons learned:**
-

**Patterns to reinforce:**
-

**Patterns to avoid:**
-
```
