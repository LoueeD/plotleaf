---
title: PLG Onboarding
description: A fictional product onboarding report with prepared funnel and plan data.
---

# PLG Onboarding

A fictional product's onboarding performance, **6 April–28 June 2026**. All values and comparisons are synthetic, prepared by the example author.

:::grid{columns="4"}
::metric{label="Signups" value="12480" comparison="18.2% vs previous quarter" direction="up" sentiment="positive"}
::metric{label="Activated teams" value="7612" comparison="24.1% vs previous quarter" direction="up" sentiment="positive"}
::metric{label="Converted" value="1284" comparison="11.4% vs previous quarter" direction="up" sentiment="positive"}
::metric{label="Conversion rate" value="0.10288461538461538" format="percent" comparison="0.8 pt vs previous quarter" direction="up" sentiment="positive"}
:::

:::grid{columns="2"}
::area{data="./signups.json" x="week" y="signups" xType="date" title="Signups by week"}
::funnel{data="./funnel.json" stage="stage" value="teams" total="baseline" share="share" status="status" title="Funnel by stage"}
:::

## Activation mix

**7,612 teams** activated. Pro accounts for the largest share; each category below is mutually exclusive. Funnel percentages use **41,200 visitors** as the explicit denominator. The KPI conversion rate uses **12,480 signups**, so it answers a different question.

::::grid{columns="2"}
::donut{data="./plans.json" category="plan" value="teams" title="Activated teams by plan"}
:::table{data="./plans.json" title="Activated teams"}
::column{field="plan" label="Plan"}
::column{field="teams" label="Teams" format="number"}
:::
::::

### Key findings

- **Activation is the next opportunity.** Its below-target status is supplied by the author; the renderer does not infer it from the rate.
- **Conversion needs attention.** The author marked this stage at risk against the fictional team's own operating targets.
- **Pro leads the mix.** Plan counts add to the same 7,612 activated teams shown in the KPI and funnel.

:::callout{title="About this example"}
All data, comparisons, statuses and findings are fictional. This report has no live filters or data connections. The funnel preserves the prepared stage order and never guesses a denominator or business status.
:::
