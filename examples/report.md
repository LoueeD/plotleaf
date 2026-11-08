---
title: Storefront Overview
description: A cumulative plotleaf showcase with fictional metrics, charts, tables, images and sparklines.
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
::area{data="./storefront/orders.json" x="date" y="orders" xType="date" title="Orders by day" target="2000" targetLabel="Daily target"}
::bar{data="./storefront/returns.json" x="reason" y="count" title="Returns by reason"}
:::

## Sales by category

Apparel accounts for the largest share of this fictional week's **12,480 orders**. Each order belongs to one category.

::::grid{columns="2"}
::donut{data="./storefront/categories.json" category="category" value="orders" title="Order mix"}
:::table{data="./storefront/categories.json" title="Category performance"}
::column{field="category" label="Category"}
::column{field="orders" label="Orders" format="number"}
::column{field="revenue" label="Revenue" format="currency:USD"}
::column{field="change" label="Δ week" format="percent" sign="always" semantics="higher-is-better"}
:::
::::

### Key findings

- **Growth spans every category.** All four categories increased orders over the previous week.
- **Returns declined.** The return count and rate both improved.
- **Size guidance is the next opportunity.** Review fit descriptions before changing the return policy.

---

## Product onboarding

A separate fictional product example covers **6 April–28 June 2026**. Its prepared funnel uses **41,200 visitors** as the denominator for every stage; its statuses reflect the example author's operating targets. These team counts are independent of the store's orders above.

:::grid{columns="2"}
::line{data="./onboarding/signups.json" x="week" y="signups" xType="date" title="Signups by week" target="1600" targetLabel="Weekly target"}
::funnel{data="./onboarding/funnel.json" stage="stage" value="teams" total="baseline" share="share" status="status" title="Funnel by stage"}
:::

### Onboarding findings

Activation needs attention against the prepared target, and conversion is marked at risk. Expand the chart and funnel data disclosures to inspect the original values and denominators.

---

## Product catalogue

A fictional store's product performance over **eight weeks ending 1 November 2026**. All data, comparisons and product illustrations are synthetic and prepared for this example.

:::grid{columns="3"}
::metric{label="Orders" value="1477" comparison="18.2% vs previous eight weeks" direction="up" sentiment="positive"}
::metric{label="Revenue" value="63740" format="currency:USD" comparison="20% vs previous eight weeks" direction="up" sentiment="positive"}
::metric{label="Products" value="4" comparison="1 more than previous period" direction="up" sentiment="positive"}
:::

The fictional comparison period contains **1,250 orders**, **US$53,120 revenue** and **three products**. Changes above are prepared and rounded by the example author.

### Product detail

Weekly order lines share the same vertical scale, so their heights are comparable. The lamp has one missing week, shown as a gap; its prepared total covers recorded weeks only. Expand **View values** to inspect the original samples.

:::table{data="./catalog/showcase-products.json" title="Performance by product"}
::column{field="image" label="Preview" kind="image" alt="image_alt"}
::column{field="product" label="Product"}
::column{field="weekly_orders" label="Weekly orders" kind="sparkline" sortBy="last_week"}
::column{field="orders" label="Orders" format="number"}
::column{field="revenue" label="Revenue" format="currency:USD"}
::column{field="change" label="Δ period" format="percent" sign="always" semantics="higher-is-better"}
:::

### Reading this table

- **Linen tote leads relative growth.** Comparisons are prepared by the author, not calculated from the sparkline.
- **Notebooks lead order volume.** They also have the highest final-week value in this fictional set.
- **The natural tote reuses its image.** The portable report embeds each unique illustration once.

:::callout{title="About these examples"}
All datasets, comparisons, statuses, findings and product illustrations are fictional. Store totals cover 1–7 November 2026; the onboarding and catalogue sections identify their separate periods and populations. Comparisons are prepared by the author, not inferred by the renderer. No live filters, data connections or subtotal calculations are implied.
:::
