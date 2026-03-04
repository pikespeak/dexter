---
name: real-estate-valuation
description: Performs real estate property valuation and market analysis. Triggers when user asks about property values, house prices, rent estimates, real estate market trends, neighborhood comparisons, or "what is this property worth".
---

# Real Estate Valuation Skill

## Workflow Checklist

Copy and track progress:
```
Real Estate Analysis Progress:
- [ ] Step 1: Gather property & market data
- [ ] Step 2: Comparable sales analysis (Comps)
- [ ] Step 3: Income approach (for rental properties)
- [ ] Step 4: Market trend analysis
- [ ] Step 5: Location & demographics assessment
- [ ] Step 6: Calculate estimated value range
- [ ] Step 7: Present results with confidence intervals
```

## Step 1: Gather Property & Market Data

Use `web_search` and `web_fetch` to collect:

### 1.1 Property Details
**Search:** `"[ADDRESS or AREA] property listing details square footage bedrooms"`
**Extract:** Square footage, bedrooms, bathrooms, lot size, year built, condition

### 1.2 Recent Comparable Sales
**Search:** `"[AREA/ZIP] recent home sales comparable properties [YEAR]"`
**Extract:** Sale prices, dates, property characteristics for 3-5 comparable properties

### 1.3 Market Conditions
**Search:** `"[CITY/AREA] real estate market trends median home price [YEAR]"`
**Extract:** Median price, price trends, days on market, inventory levels

### 1.4 Rental Market (if applicable)
**Search:** `"[AREA] average rent [BEDROOMS]-bedroom [YEAR]"`
**Extract:** Average rents, vacancy rates, rental yield benchmarks

## Step 2: Comparable Sales Analysis

Adjust comp prices for differences:
- **Size:** ±$100-200 per sq ft difference (market-dependent)
- **Age:** ±1-2% per decade difference
- **Condition:** ±5-15% for condition differences
- **Lot size:** ±$10-50 per sq ft (varies by market)

Calculate adjusted average from 3-5 comps.

## Step 3: Income Approach (Rental Properties)

Calculate:
- **Gross Rental Income** = Monthly Rent × 12
- **Net Operating Income (NOI)** = Gross Income - Operating Expenses (typically 35-45% of gross)
- **Value** = NOI / Cap Rate (use market cap rate, typically 4-8%)

## Step 4: Market Trend Analysis

Assess:
- Year-over-year price changes
- Supply/demand dynamics (months of inventory)
- Interest rate environment impact
- Local economic factors (employment, population growth)

## Step 5: Location Assessment

Evaluate:
- School district ratings
- Crime statistics
- Walkability/transit scores
- Proximity to amenities
- Future development plans

## Step 6: Value Estimation

Combine approaches:
- **Primary residence:** Weight comps analysis 70%, market trends 30%
- **Investment property:** Weight income approach 50%, comps 30%, trends 20%

Provide a **value range** (low/mid/high) rather than a single point estimate.

## Step 7: Output Format

Present:
1. **Valuation Summary:** Estimated value range (low/mid/high)
2. **Comparable Sales Table:** Adjusted comp details
3. **Market Context:** Current market conditions and trends
4. **Income Analysis:** (if rental property) NOI, cap rate, rental yield
5. **Risk Factors:** Market-specific risks and considerations
6. **Confidence Level:** Low/Medium/High based on data quality and comp availability
