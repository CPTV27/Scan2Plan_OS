# SuperChase QA Review Checklist

## Purpose
This checklist is used by the Main Agent (and Reviewer subagent) to verify that work completed by subagents meets quality standards before marking tasks complete.

---

## Universal Checks (Apply to ALL Tasks)

### Requirement Alignment
- [ ] Does the output directly address the original request?
- [ ] Are all stated requirements covered?
- [ ] Were any requirements missed or misinterpreted?
- [ ] Is the scope appropriate (not over-engineered, not under-delivered)?

### Quality Gate
- [ ] Is the output complete and usable?
- [ ] Are there obvious errors, bugs, or issues?
- [ ] Does it follow established patterns/conventions?
- [ ] Is it documented appropriately?

### Safety Check
- [ ] Any unintended side effects?
- [ ] Any security concerns introduced?
- [ ] Any data integrity risks?
- [ ] Any external exposure risks?

---

## Task-Specific Checklists

### Code/Implementation Review

```
CATEGORY: Code Quality
- [ ] Code runs without errors
- [ ] Code handles edge cases gracefully
- [ ] Error messages are helpful
- [ ] No hardcoded secrets or credentials
- [ ] Follows project coding standards

CATEGORY: Testing
- [ ] Basic functionality tested
- [ ] Edge cases considered
- [ ] No regressions introduced
- [ ] Test coverage adequate for risk level

CATEGORY: Documentation
- [ ] Comments explain "why" not just "what"
- [ ] README updated if needed
- [ ] API changes documented
```

### Research/Information Review

```
CATEGORY: Accuracy
- [ ] Information is factually correct
- [ ] Sources are cited and credible
- [ ] Confidence levels are stated
- [ ] Contradictory info is acknowledged

CATEGORY: Completeness
- [ ] Key questions answered
- [ ] Relevant context included
- [ ] Gaps in knowledge flagged
- [ ] Follow-up questions anticipated

CATEGORY: Usefulness
- [ ] Information is actionable
- [ ] Formatted for easy consumption
- [ ] Prioritized by relevance
```

### Communication Draft Review

```
CATEGORY: Content
- [ ] Purpose is clear
- [ ] Key message is accurate
- [ ] Call-to-action is specific
- [ ] No factual errors

CATEGORY: Tone
- [ ] Appropriate for recipient
- [ ] Matches Chase's voice
- [ ] Professional yet personable
- [ ] Not overly formal or casual

CATEGORY: Format
- [ ] Subject line is effective
- [ ] Length is appropriate
- [ ] Structure aids readability
- [ ] Sign-off matches relationship
```

### Strategic Analysis Review

```
CATEGORY: Logic
- [ ] Reasoning is sound
- [ ] Assumptions are stated
- [ ] Data supports conclusions
- [ ] Alternative views considered

CATEGORY: Actionability
- [ ] Options are clear and distinct
- [ ] Pros/cons are balanced
- [ ] Recommendation is justified
- [ ] Next steps are specific

CATEGORY: Risk Assessment
- [ ] Risks are identified
- [ ] Impact levels assessed
- [ ] Mitigation suggested
- [ ] Worst-case scenario considered
```

---

## Scoring System

Rate each task completion on this scale:

| Score | Meaning | Action |
|-------|---------|--------|
| **5** | Exceptional - Exceeds requirements | Approve, log as exemplar |
| **4** | Good - Meets all requirements | Approve |
| **3** | Acceptable - Meets core requirements, minor issues | Approve with notes |
| **2** | Needs Work - Missing requirements or has issues | Return for revision |
| **1** | Rejected - Fundamentally wrong or broken | Restart task |

**Minimum passing score: 3**

---

## Failure Classification

When a task fails review, categorize the failure:

### Retrieval Failures (Researcher)
- `R1`: Couldn't find relevant information
- `R2`: Found wrong information
- `R3`: Missed key sources
- `R4`: Over-relied on single source

**Auto-Fix:** Adjust search parameters, expand query terms, add source validation

### Context Failures (All Agents)
- `C1`: Misunderstood the request
- `C2`: Ignored relevant context
- `C3`: Made incorrect assumptions
- `C4`: Lost track of constraints

**Auto-Fix:** Add clarifying instructions to agent prompt, improve context injection

### Execution Failures (Implementer)
- `E1`: Code doesn't work
- `E2`: Incomplete implementation
- `E3`: Wrong approach taken
- `E4`: Introduced regressions

**Auto-Fix:** Add to error pattern database, enhance testing requirements

### Communication Failures (Communicator)
- `M1`: Wrong tone
- `M2`: Unclear message
- `M3`: Missing key info
- `M4`: Inappropriate for audience

**Auto-Fix:** Add examples to tone library, clarify audience profiles

### Strategy Failures (Strategist)
- `S1`: Flawed logic
- `S2`: Missed obvious option
- `S3`: Over/under-weighted risks
- `S4`: Not actionable

**Auto-Fix:** Add reasoning frameworks, improve option generation templates

---

## Review Workflow

```
1. RECEIVE task output from subagent
   ↓
2. APPLY universal checks
   ↓
3. APPLY task-specific checklist
   ↓
4. CALCULATE score
   ↓
5. IF score >= 3:
   → APPROVE
   → Log pattern (success)
   → Notify Main Agent

   ELSE:
   → CLASSIFY failure
   → DETERMINE if auto-fixable
   → IF auto-fixable:
      → APPLY fix
      → RETRY task
   → ELSE:
      → QUEUE for human review
      → Log pattern (failure)
```

---

## Continuous Improvement

### Weekly Pattern Review
- Which failure types are most common?
- Which agents need prompt refinement?
- What new patterns should be added to checklists?

### Monthly Quality Metrics
- Average task score by agent
- First-pass approval rate
- Time-to-completion trends
- User satisfaction (thumbs up/down ratio)

### Quarterly Prompt Updates
- Review accumulated failure patterns
- Update agent prompts with learnings
- Archive deprecated patterns
- Add new checklist items for emerging task types
