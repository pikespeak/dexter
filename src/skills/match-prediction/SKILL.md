---
name: match-prediction
description: Analysiert ein Fußballspiel und erstellt eine detaillierte Vorhersage mit Wahrscheinlichkeiten für Heim/Unentschieden/Auswärts, Over/Under 2.5 und BTTS. Triggers when user asks for match prediction, who will win, match analysis, betting tips, or wants to predict the outcome of a football match.
---

# Match Prediction Skill

## Workflow Checklist

Copy and track progress:
```
Match Prediction Progress:
- [ ] Step 1: Resolve teams and fixture
- [ ] Step 2: Gather team form and statistics
- [ ] Step 3: Analyze head-to-head history
- [ ] Step 4: Check injuries and suspensions
- [ ] Step 5: Review league standings
- [ ] Step 6: Collect betting odds
- [ ] Step 7: Get API baseline predictions
- [ ] Step 8: Synthesize and present prediction
```

## Step 1: Resolve Teams and Fixture

Call `sports_search` to identify the teams and fixture:

### 1.1 Find Team IDs
**Query:** `"search team [HOME TEAM NAME]"` and `"search team [AWAY TEAM NAME]"`

**Extract:** `team.id`, `team.name`, `team.country`

### 1.2 Find Fixture
**Query:** `"upcoming matches for [TEAM] next 5"`

**Extract:** `fixture.id`, `fixture.date`, `fixture.venue`, `league.id`, `league.name`

## Step 2: Gather Team Form and Statistics

### 2.1 Home Team Stats
**Query:** `"team statistics for team [HOME_TEAM_ID] in league [LEAGUE_ID]"`

**Extract:**
- `form` (last 5-10 results as W/D/L string)
- `fixtures.wins/draws/loses` (home and away split)
- `goals.for/against` (average per game)
- `clean_sheet` count
- `biggest.streak.wins/loses`

### 2.2 Away Team Stats
**Query:** `"team statistics for team [AWAY_TEAM_ID] in league [LEAGUE_ID]"`

**Extract:** Same metrics as home team

### 2.3 Compare Key Metrics
Build comparison table:
- Goals scored per game (home vs away)
- Goals conceded per game
- Clean sheet percentage
- Win rate (home vs away)
- Current form (last 5 games)

## Step 3: Analyze Head-to-Head History

**Query:** `"head to head between team [HOME_ID] and team [AWAY_ID] last 10 matches"`

**Analyze:**
- Win/Draw/Loss distribution
- Average goals per match
- Home advantage effect
- Recent trend (are results changing?)
- Common scorelines

## Step 4: Check Injuries and Suspensions

### 4.1 Home Team Injuries
**Query:** `"injuries for team [HOME_TEAM_ID]"`

**Assess impact:** Rate each absent player:
- **Critical:** Key striker, creative midfielder, or goalkeeper missing → significant impact
- **Moderate:** Starting defender or rotation player
- **Minor:** Backup or squad player

### 4.2 Away Team Injuries
**Query:** `"injuries for team [AWAY_TEAM_ID]"`

**Apply same assessment**

## Step 5: Review League Standings

**Query:** `"standings for league [LEAGUE_ID]"`

**Extract:**
- Position and points for both teams
- Home/Away record splits
- Goal difference
- Points gap to teams above/below
- Motivation factors (title race, relegation fight, European qualification)

## Step 6: Collect Betting Odds

### 6.1 Bookmaker Odds
**Query:** `"odds for fixture [FIXTURE_ID]"` or `"comparative odds for soccer"`

**Extract:**
- 1X2 odds (Home/Draw/Away)
- Over/Under 2.5 goals
- BTTS (Both Teams To Score)
- Asian Handicap (if available)

### 6.2 Calculate Implied Probabilities
From decimal odds:
- Implied Probability = 1 / Decimal Odds
- Remove overround: Normalize to sum = 100%

Example: Home 2.10, Draw 3.40, Away 3.60
- Raw: 47.6% + 29.4% + 27.8% = 104.8% (4.8% margin)
- Normalized: 45.4% Home, 28.1% Draw, 26.5% Away

## Step 7: Get API Baseline Predictions

**Query:** `"predictions for fixture [FIXTURE_ID]"`

**Extract:**
- Winner prediction and confidence
- Win probabilities (home/draw/away)
- Goals prediction (over/under)
- Advice text
- Team comparison (attack, defense, form scores)

**Use as:** Cross-reference with our analysis, not as primary source

## Step 8: Synthesize and Present Prediction

Combine all gathered data to produce the final prediction:

### 8.1 Probability Calculation
Weight factors:
- **Team Form (25%):** Recent results, goals scored/conceded trend
- **Head-to-Head (15%):** Historical matchup results
- **Home Advantage (10%):** Home team's home record vs away team's away record
- **Squad Strength (15%):** Impact of injuries/suspensions
- **League Position (10%):** Table position and motivation
- **Bookmaker Odds (15%):** Market consensus (implied probabilities)
- **API Predictions (10%):** Statistical model baseline

### 8.2 Output Format

Present a structured prediction:

1. **Match Summary**: Teams, date, venue, league
2. **Prediction**: Most likely outcome with confidence level
3. **Probabilities Table**:

| Outcome | Our Prediction | Market Odds | Edge |
|---------|---------------|-------------|------|
| Home Win | X% | Y% | ±Z% |
| Draw | X% | Y% | ±Z% |
| Away Win | X% | Y% | ±Z% |

4. **Goals Prediction**:
   - Over/Under 2.5: Probability and recommendation
   - BTTS: Probability and recommendation
   - Most likely scoreline

5. **Key Factors**:
   - Top 3 factors favoring home team
   - Top 3 factors favoring away team

6. **Risk Assessment**: Low / Medium / High confidence rating with explanation

7. **Betting Recommendation**:
   - Best value bet(s) identified
   - Recommended stake level (based on confidence)
   - Warning: "This is analysis for entertainment purposes only. Always bet responsibly."
