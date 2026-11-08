---
title: Storefront Overview
description: A fictional weekly retail report demonstrating plotleaf components.
---

# Storefront Overview

A fictional store's weekly performance, using synthetic data for demonstration. Orders grew **18.2%**, while returns fell **12%** from the previous period.

:::grid{columns="4"}
::metric{label="Orders" value="12480" comparison="18.2% vs previous week" direction="up" sentiment="positive"}
::metric{label="Revenue" value="824160" format="currency:USD" comparison="24.1% vs previous week" direction="up" sentiment="positive"}
::metric{label="Returns" value="384" comparison="12% vs previous week" direction="down" sentiment="positive"}
::metric{label="Return rate" value="0.03076923076923077" format="percent" comparison="0.4 pt vs previous week" direction="down" sentiment="positive"}
:::

## Sales and returns

The store received **12,480 orders** over seven days. Size-related returns made up most of the **384 returns**, suggesting a useful area for clearer product guidance.

:::grid{columns="2"}
::area{data="./orders.json" x="date" y="orders" xType="date" title="Orders by day" target="2000" targetLabel="Daily target"}
::bar{data="./returns.json" x="reason" y="count" title="Returns by reason"}
:::

## Sales by category

Apparel accounts for the largest share of orders. Accessories showed the strongest relative growth.

:::table{data="./categories.json" title="Category performance"}
::column{field="category" label="Category"}
::column{field="orders" label="Orders" format="number"}
::column{field="revenue" label="Revenue" format="currency:USD"}
::column{field="change" label="Δ week" format="percent" sign="always" semantics="higher-is-better"}
:::

### Key findings

- **Growth spans every category.** All four categories increased orders over the previous week.
- **Returns declined.** The return count and rate both improved.
- **Size guidance is the next opportunity.** Review fit descriptions before changing the return policy.

:::callout{title="About this example"}
All data, comparisons and findings are fictional. This example covers 1–7 November 2026 and contains no customer or organization data. An author prepares the analysis; plotleaf renders it.
:::
