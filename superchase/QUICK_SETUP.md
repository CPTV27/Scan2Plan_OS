# SuperChase Voice - 5 Minute Setup

## When You Pull Over - Do This:

### Step 1: Desktop - Pull Latest (30 seconds)
```bash
cd ~/Scan2Plan_OS
git pull origin claude/ai-email-triage-system-2loD0
```

### Step 2: Desktop - Start Server (10 seconds)
```bash
cd superchase/voice-interface
npx serve -p 3000
```
This will show a local URL like `http://localhost:3000`

### Step 3: Get Your Desktop's IP (10 seconds)
In a new terminal:
```bash
# Mac:
ipconfig getifaddr en0

# Linux:
hostname -I | awk '{print $1}'

# Windows:
ipconfig | findstr IPv4
```
Note the IP (like `192.168.1.100`)

### Step 4: Phone - Connect & Open (30 seconds)
1. Make sure phone is on **same WiFi** as laptop
2. Open Chrome on phone
3. Go to: `http://[YOUR-IP]:3000/superchase-voice.html`
   - Example: `http://192.168.1.100:3000/superchase-voice.html`

### Step 5: Test It (30 seconds)
1. Page should say "Ready - tap to talk"
2. Tap the microphone
3. Say "Hello"
4. It should respond with ElevenLabs voice!

---

## If Phone Can't Connect:
- Check both devices are on same WiFi
- Try disabling laptop firewall temporarily
- Or use ngrok: `npx ngrok http 3000` (gives public URL)

---

## Files Ready:
- `superchase-voice.html` - Pre-configured with your ElevenLabs key
- Voice: George (ElevenLabs)
- Model: Turbo v2.5 (fastest)

---

## That's It!
Once working, you can talk to SuperChase from your phone.
Tap mic → Speak → Get voice response.
