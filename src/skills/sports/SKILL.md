---
name: sports-prediction
description: Performs sports predictions and statistical analysis. Triggers when user asks about game outcomes, match predictions, team performance, player stats, season forecasts, fantasy sports advice, or "who will win".
---

# Sports Prediction Skill

## Workflow Checklist

Copy and track progress:
```
Sports Prediction Progress:
- [ ] Step 1: Identify sport, teams/players, and event
- [ ] Step 2: Gather team/player statistics
- [ ] Step 3: Analyze head-to-head history
- [ ] Step 4: Evaluate current form & momentum
- [ ] Step 5: Assess contextual factors
- [ ] Step 6: Calculate prediction with probability
- [ ] Step 7: Present analysis with confidence rating
```

## Step 1: Identify Context

Determine:
- **Sport:** Football, basketball, soccer, tennis, etc.
- **Event:** Specific match, tournament, season outcome
- **Teams/Players:** Exact participants
- **Time frame:** Upcoming game, season, playoff bracket

## Step 2: Gather Statistics

Use `web_search` and `web_fetch`:

### Team Stats
**Search:** `"[TEAM] [SEASON] stats record wins losses points scored allowed"`
**Extract:** Win/loss record, offensive/defensive rankings, key metrics

### Player Stats
**Search:** `"[PLAYER] [SEASON] stats performance"`
**Extract:** Key performance metrics (sport-specific)

### Rankings & Ratings
**Search:** `"[SPORT] [LEAGUE] current standings power rankings [DATE]"`
**Extract:** League position, ELO/power ratings, strength of schedule

## Step 3: Head-to-Head History

**Search:** `"[TEAM A] vs [TEAM B] head to head record history"`
**Extract:** All-time record, recent meetings, home/away splits, margin of victory

## Step 4: Current Form & Momentum

**Search:** `"[TEAM/PLAYER] last 5 games results form"`
**Extract:** Recent results, scoring trends, winning/losing streaks

Check for:
- Injuries to key players
- Suspensions
- Recent roster changes/trades

## Step 5: Contextual Factors

Evaluate:
- **Home/Away advantage:** Historical home win % for venue
- **Rest days:** Schedule density, travel fatigue
- **Motivation:** Playoff implications, rivalry, elimination games
- **Weather:** (for outdoor sports) Impact on game style
- **Referee/Official trends:** (if notable)

## Step 6: Calculate Prediction

Combine factors using weighted analysis:
- **Season stats:** 30% weight
- **Recent form (last 5):** 25% weight
- **Head-to-head:** 15% weight
- **Home advantage:** 15% weight
- **Contextual factors:** 15% weight

Provide:
- **Win probability** for each side (must sum to ~100%)
- **Predicted score/margin** (where applicable)
- **Over/under estimate** (where applicable)

## Step 7: Output Format

Present:
1. **Prediction Summary:** Winner, predicted score/margin, win probability
2. **Key Stats Comparison:** Side-by-side team/player metrics
3. **Form Guide:** Last 5 results for each side
4. **Head-to-Head:** Recent meeting results
5. **Key Factors:** What tilts the prediction (injuries, home advantage, etc.)
6. **Risk Factors:** Upsets scenarios, what could go wrong
7. **Confidence:** Low/Medium/High based on data availability and predictability
