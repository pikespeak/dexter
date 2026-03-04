---
name: energy-forecast
description: Provides energy and commodity price predictions and market analysis. Triggers when user asks about oil prices, gas prices, electricity costs, energy market trends, commodity forecasts, renewable energy production, or "what will energy prices do".
---

# Energy & Commodity Forecast Skill

## Workflow Checklist

Copy and track progress:
```
Energy Forecast Progress:
- [ ] Step 1: Identify commodity/energy type and region
- [ ] Step 2: Gather current price data
- [ ] Step 3: Analyze supply & demand fundamentals
- [ ] Step 4: Assess geopolitical and regulatory factors
- [ ] Step 5: Review historical patterns and seasonality
- [ ] Step 6: Generate price forecast with scenarios
- [ ] Step 7: Present analysis with confidence levels
```

## Step 1: Identify Context

Determine:
- **Commodity:** Crude oil (WTI/Brent), natural gas, electricity, coal, uranium
- **Region:** US, EU, Asia, specific country/state
- **Time frame:** Short-term (days/weeks), medium (months), long (years)
- **Purpose:** Consumer planning, investment, business decision

## Step 2: Current Price Data

Use `web_search`:
**Search:** `"[COMMODITY] current price today [YEAR]"`
**Extract:** Spot price, futures prices, recent price action

### Key Benchmarks
- **Oil:** WTI, Brent crude ($/barrel)
- **Natural Gas:** Henry Hub ($/MMBtu)
- **Electricity:** Regional wholesale prices ($/MWh)
- **Coal:** Newcastle benchmark ($/ton)

## Step 3: Supply & Demand Fundamentals

### Supply Side
**Search:** `"[COMMODITY] production levels OPEC output supply forecast [YEAR]"`
**Extract:** Production volumes, capacity changes, inventory levels

### Demand Side
**Search:** `"[COMMODITY] demand forecast consumption trends [YEAR]"`
**Extract:** Consumption trends, industrial demand, seasonal patterns

### Key Indicators
- Inventory levels vs. 5-year average
- Production capacity utilization
- Import/export balances
- Refinery utilization (for oil)

## Step 4: Geopolitical & Regulatory Factors

**Search:** `"energy market geopolitical risks sanctions policy [YEAR]"`
Evaluate:
- OPEC+ decisions and compliance
- Sanctions and trade restrictions
- Climate policy and carbon pricing
- Infrastructure disruptions (pipelines, ports)
- Conflict zones affecting supply routes

## Step 5: Historical Patterns & Seasonality

**Search:** `"[COMMODITY] seasonal price patterns historical average [MONTH]"`
Analyze:
- **Oil:** Driving season (summer), heating season (winter)
- **Natural Gas:** Winter heating demand, summer cooling demand
- **Electricity:** Seasonal load patterns, peak demand periods
- **Renewables:** Solar/wind generation seasonal variation

## Step 6: Price Forecast

Provide three scenarios:
- **Bull case (25% probability):** Favorable conditions, price drivers
- **Base case (50% probability):** Most likely outcome
- **Bear case (25% probability):** Downside risks, price suppressors

Include:
- 30-day price target range
- 90-day price target range
- Key inflection points to watch

## Step 7: Output Format

Present:
1. **Price Summary:** Current price, 30/90-day forecast ranges
2. **Scenario Table:** Bull/Base/Bear with probabilities and price targets
3. **Supply-Demand Balance:** Key metrics and trends
4. **Seasonal Context:** Where we are in the seasonal cycle
5. **Geopolitical Risk Assessment:** Key risks and their potential impact
6. **Key Catalysts:** Events that could move prices (OPEC meetings, data releases)
7. **Consumer Impact:** What it means for fuel/electricity bills
8. **Confidence:** Based on data quality, market volatility, geopolitical uncertainty
