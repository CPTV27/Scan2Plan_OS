---
sidebar_position: 7
---

# Staleness Engine

The Staleness Engine automatically reduces win probability for leads that haven't been contacted recently.

## How It Works

1. System tracks "Days Since Last Contact"
2. After threshold, probability decays
3. Decay continues until lead is touched
4. Contacting the lead resets the timer

## Configuration

**Settings > Staleness Settings**:
- Days before decay begins
- Decay rate per stage
- Enable/disable per stage

## Stage-Specific Thresholds

Different stages may have different staleness rules. For example:
- Proposals should be followed up within 3 days
- Negotiations may tolerate 7 days

## Viewing Staleness

On the Sales Pipeline, stale leads show:
- Warning indicator
- Days stale count
- Reduced probability badge
