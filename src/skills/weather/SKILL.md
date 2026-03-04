---
name: weather-forecast
description: Provides weather forecasts, climate analysis, and weather-related predictions. Triggers when user asks about weather, temperature, rain, snow, storms, climate trends, best time to travel, outdoor event planning, or agricultural weather conditions.
---

# Weather Forecast Skill

## Workflow Checklist

Copy and track progress:
```
Weather Analysis Progress:
- [ ] Step 1: Identify location and time frame
- [ ] Step 2: Gather current weather data
- [ ] Step 3: Retrieve forecast data
- [ ] Step 4: Analyze historical patterns
- [ ] Step 5: Assess severe weather risks
- [ ] Step 6: Generate actionable recommendations
- [ ] Step 7: Present forecast with confidence levels
```

## Step 1: Identify Location & Time Frame

Determine:
- **Location:** City, ZIP, coordinates, or region
- **Time frame:** Today, this week, specific date, seasonal
- **Purpose:** General forecast, event planning, agriculture, travel

## Step 2: Current Weather Data

Use `web_search` to find:
**Search:** `"[LOCATION] current weather conditions temperature humidity wind"`
**Extract:** Temperature, humidity, wind speed/direction, conditions, pressure

## Step 3: Forecast Data

Use `web_search` and `web_fetch`:

### Short-term (1-3 days)
**Search:** `"[LOCATION] weather forecast next 3 days [DATE]"`
**Extract:** High/low temps, precipitation probability, conditions by day

### Medium-term (4-10 days)
**Search:** `"[LOCATION] 10-day weather forecast [DATE]"`
**Extract:** Temperature trends, precipitation outlook, general pattern

### Seasonal (if applicable)
**Search:** `"[LOCATION] seasonal weather outlook [SEASON] [YEAR]"`
**Extract:** Above/below normal temperature/precipitation, trend forecasts

## Step 4: Historical Patterns

**Search:** `"[LOCATION] average weather [MONTH] historical climate data"`
**Extract:** Historical averages, record highs/lows, typical conditions
**Use:** Compare forecast to normals for context

## Step 5: Severe Weather Assessment

Check for:
- Active watches/warnings
- Storm systems approaching
- Extreme temperature events
- Flooding or drought conditions

**Search:** `"[LOCATION] severe weather alerts warnings [DATE]"`

## Step 6: Actionable Recommendations

Based on user's purpose:
- **Event planning:** Best/worst days, backup plans
- **Agriculture:** Planting/harvest windows, frost risk, irrigation needs
- **Travel:** Packing suggestions, travel disruption risks
- **General:** Dress recommendations, activity suggestions

## Step 7: Output Format

Present:
1. **Current Conditions:** Temperature, conditions, "feels like"
2. **Forecast Table:** Day-by-day breakdown (temp high/low, precipitation %, conditions)
3. **Historical Context:** How forecast compares to averages
4. **Alerts:** Any active watches or warnings
5. **Recommendations:** Actionable advice based on user's needs
6. **Confidence:** High (1-3 days), Medium (4-7 days), Low (8+ days)
