# SuperChase Governance & Autonomy Framework

## Purpose
Defines permission tiers, autonomous operation boundaries, and safety guardrails for the multi-agent system.

---

## Agent Permission Tiers

### Tier 0: READ-ONLY (Lowest Risk)
**Agents:** Researcher, Reviewer, Strategist

Allowed:
- Read files, databases, APIs
- Search web and internal docs
- Analyze and report
- Generate recommendations

Blocked:
- Any write/create/delete operations
- Sending communications
- Modifying configurations
- Executing code

### Tier 1: DRAFT-ONLY (Low Risk)
**Agents:** Communicator

Allowed:
- Everything in Tier 0
- Create draft documents
- Compose unsent messages
- Generate code snippets

Blocked:
- Sending/publishing anything
- Modifying existing data
- Executing code
- System changes

### Tier 2: SCOPED-WRITE (Medium Risk)
**Agents:** Implementer (supervised mode)

Allowed:
- Everything in Tier 1
- Create/update tasks (Sheet, Asana)
- Create new files in approved directories
- Run read-only shell commands
- Make API calls to approved endpoints

Blocked:
- Delete operations
- Modify system files
- Access credentials/secrets
- Network configuration
- Install software

### Tier 3: FULL-WRITE (High Risk)
**Agents:** Implementer (elevated mode), Main Agent

Allowed:
- Everything in Tier 2
- Delete with backup
- Install packages (approved list)
- Modify configurations
- Execute arbitrary code (sandboxed)

Blocked:
- Access outside sandbox
- Network-level changes
- Credential modification
- Production deployments

### Tier 4: ADMIN (Highest Risk)
**Agents:** Human only (Chase)

Allowed:
- Everything
- Production deployments
- Credential management
- Delete without backup
- Override all guardrails

---

## Autonomous Operation Modes

### Mode: SUPERVISED (Default)
```
- Every action requires implicit approval
- Agent proposes → Human confirms → Agent executes
- Full audit trail
- Suitable for: New agents, risky operations, learning phase
```

### Mode: SEMI-AUTONOMOUS
```
- Low-risk actions auto-approved
- Medium/high-risk actions queued for approval
- Batch approval available
- Suitable for: Trusted agents, routine workflows
```

### Mode: AUTONOMOUS
```
- All Tier 0-2 actions auto-approved
- Tier 3 actions auto-approved if in whitelist
- Only Tier 4 actions require human
- Suitable for: Mature agents, time-sensitive workflows
```

### Mode: AUTO-CLAUDE (Persistent Loop)
```
- Agent runs continuously (hours/days)
- Self-plans task sequences
- Spawns subagents as needed
- Checkpoints every N minutes
- Human can interrupt anytime
- Suitable for: Long-running projects, overnight processing
```

---

## Auto-Claude Persistent Loop Protocol

### Initialization
```python
def start_auto_claude_session(goal, max_duration_hours=8):
    session = {
        "id": generate_session_id(),
        "goal": goal,
        "started": now(),
        "max_duration": max_duration_hours,
        "checkpoint_interval": 15,  # minutes
        "tasks_completed": [],
        "tasks_pending": [],
        "subagents_spawned": []
    }

    # Initial planning
    session["tasks_pending"] = main_agent.break_down_goal(goal)

    return session
```

### Main Loop
```python
while session.active and not timeout_reached():

    # 1. Check for human interrupts
    if interrupt_requested():
        pause_and_report()
        continue

    # 2. Get next task
    task = prioritize_next_task(session["tasks_pending"])

    # 3. Determine if needs subagent
    if task.requires_specialist:
        subagent = spawn_subagent(task.type)
        result = subagent.execute(task)
    else:
        result = main_agent.execute(task)

    # 4. Review result
    if task.risk_level >= MEDIUM:
        review = reviewer_agent.check(result, task.spec)
        if not review.passed:
            handle_failure(task, review.feedback)
            continue

    # 5. Update state
    session["tasks_completed"].append(task)
    session["tasks_pending"].remove(task)

    # 6. Checkpoint
    if checkpoint_due():
        save_checkpoint(session)
        log_progress(session)

    # 7. Discover new tasks
    new_tasks = analyze_for_new_tasks(result)
    session["tasks_pending"].extend(new_tasks)
```

### Checkpoint Data
```json
{
  "session_id": "sc-2025-01-18-001",
  "timestamp": "2025-01-18T22:30:00Z",
  "goal": "Set up SuperChase Asana integration",
  "progress_pct": 65,
  "tasks_completed": [
    {"id": "t1", "name": "Create AsanaSync.gs", "status": "done"},
    {"id": "t2", "name": "Test API connection", "status": "done"}
  ],
  "tasks_pending": [
    {"id": "t3", "name": "Set up sync trigger", "priority": "high"},
    {"id": "t4", "name": "Test bidirectional sync", "priority": "medium"}
  ],
  "blockers": [],
  "next_action": "Executing t3 - setting up time-based trigger"
}
```

---

## Tiered Training Framework

### Level 1: Imitation Learning (SFT)
**For:** New agents, Implementer, Communicator

Method:
- Collect examples of successful task completions
- Fine-tune agent to imitate successful patterns
- Focus on correctness over creativity

Training Data:
```json
{
  "task": "Create a follow-up email for client meeting",
  "input_context": { ... },
  "ideal_output": "...",
  "quality_score": 5
}
```

### Level 2: Reinforcement Learning (PPO)
**For:** Strategist, Main Agent

Method:
- Define reward function based on outcomes
- Allow agent to explore different approaches
- Reinforce high-impact strategies

Reward Signals:
```python
def calculate_reward(action, outcome):
    rewards = {
        "task_completed_on_time": +10,
        "task_completed_late": +5,
        "task_failed_recoverable": -2,
        "task_failed_unrecoverable": -10,
        "user_positive_feedback": +15,
        "user_negative_feedback": -15,
        "discovered_efficiency": +20,
        "caused_extra_work": -5
    }
    return sum(rewards.get(signal, 0) for signal in outcome.signals)
```

### Level 3: Constitutional AI (Self-Critique)
**For:** All agents

Method:
- Agent critiques its own output before submitting
- Applies ethical and quality guidelines
- Revises if violations detected

Constitution Rules:
1. Never take irreversible actions without confirmation
2. Prefer minimal intervention (do less, not more)
3. When uncertain, ask rather than guess
4. Protect user data and privacy
5. Admit mistakes immediately

---

## Guardrail Definitions

### Hard Stops (Cannot Override)
```yaml
hard_stops:
  - pattern: "rm -rf /"
    reason: "Destructive system command"

  - pattern: "DROP TABLE|DELETE FROM .* WHERE 1=1"
    reason: "Mass data deletion"

  - pattern: "curl .* | bash"
    reason: "Remote code execution"

  - pattern: "send.*password|email.*credential"
    reason: "Credential exposure"

  - pattern: "git push.*--force.*main"
    reason: "Destructive git operation"
```

### Soft Stops (Require Confirmation)
```yaml
soft_stops:
  - pattern: "git push"
    prompt: "Push to remote repository?"

  - pattern: "send.*email|post.*message"
    prompt: "Send this communication?"

  - pattern: "delete|remove|archive"
    prompt: "Confirm deletion/removal?"

  - pattern: "install|npm|pip|brew"
    prompt: "Install this package?"

  - pattern: "payment|invoice|charge"
    prompt: "Financial action - confirm?"
```

### Rate Limits
```yaml
rate_limits:
  api_calls_per_minute: 60
  emails_per_hour: 10
  task_creations_per_hour: 50
  file_writes_per_hour: 100
  subagent_spawns_per_session: 20
```

---

## Escalation Protocol

### Level 1: Auto-Resolve
- Agent detects issue
- Applies standard fix from playbook
- Logs action
- Continues

### Level 2: Peer Review
- Agent detects issue outside playbook
- Requests Reviewer agent assessment
- Implements suggested fix if approved
- Logs and continues

### Level 3: Queue for Human
- Issue is novel or high-risk
- Agent documents issue fully
- Adds to human review queue
- Continues with other tasks OR pauses

### Level 4: Immediate Alert
- Critical failure or security issue
- Agent stops all operations
- Sends immediate notification
- Awaits human response

---

## Audit Trail Requirements

Every agent action must log:
```json
{
  "timestamp": "2025-01-18T22:45:00Z",
  "agent": "Implementer",
  "session_id": "sc-2025-01-18-001",
  "action_type": "file_write",
  "action_details": {
    "path": "/project/AsanaSync.gs",
    "operation": "create",
    "size_bytes": 2048
  },
  "permission_tier": 2,
  "auto_approved": true,
  "parent_task": "t1-create-asana-sync",
  "outcome": "success"
}
```

Retention: 90 days minimum
Access: Human (Chase) only
Review: Weekly summary generated automatically
