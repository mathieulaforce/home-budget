# Default Benchmark Data

Average monthly household spending in Belgium (source: Statbel HBS, reference year 2023).

These are approximate values for an average Belgian household. Update with the latest Statbel publication when available.

## Belgium National Average (Monthly, EUR)

| Category Group | Average Monthly (EUR) | Cents Value |
|---------------|----------------------|-------------|
| Housing | 850 | 85000 |
| Food | 450 | 45000 |
| Transport | 350 | 35000 |
| Health | 120 | 12000 |
| Entertainment | 200 | 20000 |
| Shopping (Clothing) | 100 | 10000 |
| Shopping (Home & Garden) | 150 | 15000 |
| Financial (Insurance) | 180 | 18000 |
| Communication | 60 | 6000 |
| Education | 40 | 4000 |

**Total average monthly expenditure**: ~2,500 EUR

## Regional Variations

| Region | Multiplier vs National |
|--------|----------------------|
| Brussels | 1.10x |
| Flanders | 1.02x |
| Wallonia | 0.92x |

## Household Size Scaling

| Composition | Multiplier |
|------------|-----------|
| Single person | 0.60x |
| Couple, no children | 0.85x |
| Couple + 1 child | 1.00x |
| Couple + 2 children | 1.15x |
| Couple + 3+ children | 1.30x |
| Single parent + children | 0.75x |

## How to Update

1. Visit [Statbel HBS](https://statbel.fgov.be/en/themes/households/household-budget)
2. Download the latest household budget survey results
3. Map their COICOP categories to the app's category groups
4. Update the table above and the `benchmarks` table/JSON in the app
5. Update the `referenceYear` field

## COICOP Category Mapping

Statbel uses the COICOP (Classification of Individual Consumption According to Purpose) system:

| COICOP Code | COICOP Name | App Category Group |
|-------------|-------------|-------------------|
| CP01 | Food and non-alcoholic beverages | Food |
| CP02 | Alcoholic beverages, tobacco | Entertainment |
| CP03 | Clothing and footwear | Shopping |
| CP04 | Housing, water, electricity, gas | Housing |
| CP05 | Furnishings, household equipment | Shopping |
| CP06 | Health | Health |
| CP07 | Transport | Transport |
| CP08 | Communication | Communication |
| CP09 | Recreation and culture | Entertainment |
| CP10 | Education | Education |
| CP11 | Restaurants and hotels | Food |
| CP12 | Miscellaneous goods and services | Other |
