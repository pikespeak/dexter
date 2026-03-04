---
name: value-bet-detection
description: Identifiziert Value Bets durch Vergleich eigener Wahrscheinlichkeitsberechnung mit Buchmacher-Quoten. Triggers when user asks for value bets, best bets, profitable odds, edge over bookmakers, or wants to find mispriced odds.
---

# Value Bet Detection Skill

## Workflow Checklist

Copy and track progress:
```
Value Bet Analysis Progress:
- [ ] Step 1: Identify target matches
- [ ] Step 2: Calculate own probabilities for each match
- [ ] Step 3: Collect odds from multiple bookmakers
- [ ] Step 4: Calculate implied probabilities from odds
- [ ] Step 5: Identify value bets (edge > 5%)
- [ ] Step 6: Apply Kelly Criterion for stake sizing
- [ ] Step 7: Present value bet recommendations
```

## Step 1: Identify Target Matches

Call `sports_search` to find upcoming matches:

**Query:** `"upcoming matches for league [LEAGUE_ID] next 10"` or `"upcoming matches date [DATE]"`

Select matches from major leagues:
- Premier League (39), La Liga (140), Bundesliga (78), Serie A (135), Ligue 1 (61)
- Champions League (2), Europa League (3)

## Step 2: Calculate Own Probabilities

For each match, run a simplified match analysis:

### 2.1 Quick Form Assessment
**Query:** `"team statistics for team [TEAM_ID] in league [LEAGUE_ID]"`

**Extract for each team:**
- Recent form (last 5 games: WWDLW format)
- Goals per game (home/away split)
- Win rate (home/away)

### 2.2 Estimate Raw Probabilities
Use simplified scoring model:

**Home Win Factors:**
- Base home advantage: +10% (average across leagues)
- Form differential: Compare last 5 results
- Goals scored/conceded ratio comparison
- League position differential

**Draw Factors:**
- Similar form between teams → higher draw probability
- Both teams defensive → higher draw probability
- Historical H2H draw frequency

**Away Win Factors:**
- Superior away form
- Better goal difference
- Higher league position

### 2.3 Normalize
Ensure Home% + Draw% + Away% = 100%

## Step 3: Collect Odds from Multiple Bookmakers

**Query:** `"comparative odds for soccer"` (uses The Odds API for 40+ bookmakers)

**Extract for each match:**
- Best available odds for Home/Draw/Away from each bookmaker
- Identify the highest odds available for each outcome

## Step 4: Calculate Implied Probabilities

For each bookmaker's odds:

```
Implied Probability = 1 / Decimal Odds × 100

Example: Odds of 2.50 → 1/2.50 = 40%
```

**Remove overround (margin):**
```
Total Raw Probability = Home% + Draw% + Away%
Fair Probability = Raw Probability / Total Raw Probability × 100
```

**Average across bookmakers** for market consensus probability.

## Step 5: Identify Value Bets

A value bet exists when:
```
Our Probability > Implied Probability from Odds
Edge = Our Probability - Implied Probability
```

**Thresholds:**
- **Strong Value:** Edge > 10% → High confidence
- **Moderate Value:** Edge 5-10% → Medium confidence
- **Marginal Value:** Edge 3-5% → Low confidence (consider skipping)
- **No Value:** Edge < 3% → Do not recommend

**Filter criteria:**
- Only recommend bets with Edge > 5%
- Minimum odds of 1.50 (avoid heavy favorites with thin margins)
- Maximum odds of 6.00 (avoid long shots with high variance)

## Step 6: Apply Kelly Criterion

For each value bet, calculate optimal stake:

```
Kelly % = (Edge × (Odds - 1) - (1 - Edge)) / (Odds - 1)
         = (bp - q) / b

Where:
  b = Decimal Odds - 1
  p = Our probability (as decimal)
  q = 1 - p
```

**Apply fractional Kelly (25% Kelly recommended):**
```
Recommended Stake = Kelly% × 0.25 × Bankroll
```

**Stake limits:**
- Maximum: 5% of bankroll per bet
- Minimum: 1% of bankroll
- Total daily exposure: Max 15% of bankroll

## Step 7: Present Value Bet Recommendations

### 7.1 Output Format

**Summary Table:**

| Match | Bet | Our Prob | Best Odds | Bookie | Edge | Stake |
|-------|-----|----------|-----------|--------|------|-------|
| Team A vs Team B | Home Win | 55% | 2.10 | Bet365 | 7.4% | 2.5% |
| Team C vs Team D | Over 2.5 | 62% | 1.95 | Unibet | 10.7% | 3.2% |

**For each recommended bet, include:**

1. **Match Details:** Teams, league, kickoff time
2. **Recommended Bet:** Outcome + best available odds + bookmaker
3. **Analysis Summary:** 2-3 key reasons supporting the bet
4. **Edge Calculation:** Our probability vs market probability
5. **Stake Recommendation:** Kelly-based stake as % of bankroll
6. **Risk Level:** Low / Medium / High

### 7.2 Portfolio Summary

At the end, provide:
- Total number of value bets identified
- Average edge across all bets
- Total recommended bankroll allocation
- Expected value if all bets played

### 7.3 Disclaimer

Always include:
> **Disclaimer:** These recommendations are based on statistical analysis and are for entertainment/educational purposes only. Past performance does not guarantee future results. Never bet more than you can afford to lose. Gambling can be addictive - please bet responsibly.
