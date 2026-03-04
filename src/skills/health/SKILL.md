---
name: health-forecast
description: Provides health and wellness predictions and analysis. Triggers when user asks about fitness goals, weight loss projections, nutrition optimization, sleep quality prediction, health risk assessment, or "how long to reach my fitness goal".
---

# Health & Wellness Forecast Skill

## Workflow Checklist

Copy and track progress:
```
Health Forecast Progress:
- [ ] Step 1: Gather user health context
- [ ] Step 2: Research evidence-based benchmarks
- [ ] Step 3: Calculate personalized projections
- [ ] Step 4: Identify risk factors
- [ ] Step 5: Create actionable recommendations
- [ ] Step 6: Present forecast with timeline
```

## Step 1: Gather User Context

Ask for (as needed):
- **Goal:** Weight loss/gain, fitness milestone, health improvement
- **Current state:** Weight, activity level, diet, sleep habits
- **Constraints:** Time available, dietary restrictions, health conditions
- **Timeline:** Target date or open-ended

**Important:** Always include medical disclaimer — this is for informational purposes only, not medical advice.

## Step 2: Research Evidence-Based Benchmarks

Use `web_search` for:

### Weight Management
**Search:** `"evidence-based weight loss rate sustainable per week research"`
**Extract:** Safe rates (0.5-1kg/week), metabolic adaptation factors, plateau patterns

### Fitness Goals
**Search:** `"[GOAL] typical timeline beginner intermediate research"`
**Extract:** Typical progression curves, beginner gains, diminishing returns

### Nutrition
**Search:** `"[DIETARY GOAL] recommended daily intake macros research"`
**Extract:** Caloric needs (TDEE), macro ratios, micronutrient targets

## Step 3: Calculate Projections

### Weight Trajectory
- **TDEE estimation:** Mifflin-St Jeor equation × activity multiplier
- **Deficit/surplus:** Target 500-750 kcal/day for sustainable change
- **Timeline:** Account for metabolic adaptation (slow by ~5% per 10% weight lost)
- **Milestones:** Weekly/monthly checkpoints

### Fitness Progression
- **Strength:** Approximate logarithmic progression curve
- **Endurance:** ~10% weekly improvement cap (injury prevention)
- **Flexibility:** Gradual improvement over 8-12 weeks

## Step 4: Risk Factors

Assess:
- Plateaus and how to break through
- Overtraining risk based on intensity
- Nutritional deficiency risks
- Seasonal/motivational factors

## Step 5: Recommendations

Provide:
- **Nutrition plan outline:** Daily calorie and macro targets
- **Activity suggestions:** Aligned with goals and constraints
- **Sleep optimization:** Evidence-based sleep hygiene tips
- **Tracking advice:** What to measure and how often

## Step 6: Output Format

Present:
1. **Projection Summary:** Goal, estimated timeline, key milestones
2. **Weekly/Monthly Trajectory:** Expected progress over time
3. **Nutrition Targets:** Daily calories, protein, carbs, fat
4. **Activity Plan:** Recommended exercise type and frequency
5. **Risk Factors:** Plateaus, overtraining, deficiency risks
6. **Adjustments:** When and how to modify the plan
7. **Disclaimer:** Not medical advice, consult healthcare provider

**Important:** Always emphasize this is an estimation tool, not a medical diagnosis or prescription.
