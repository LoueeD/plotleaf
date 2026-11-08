---
title: Product Performance
description: A fictional catalogue with embedded product images and weekly order sparklines.
---

# Product Performance

A fictional store's product performance over **eight weeks ending 1 November 2026**. All data, comparisons and product illustrations are synthetic and prepared for this example.

:::grid{columns="3"}
::metric{label="Orders" value="1477"}
::metric{label="Revenue" value="63740" format="currency:USD"}
::metric{label="Products" value="4"}
:::

## Product detail

Weekly order lines share the same vertical scale, so their heights are comparable. The lamp has one missing week, shown as a gap; its prepared total covers recorded weeks only. Expand **View values** to inspect the original samples.

:::table{data="./products.json" title="Performance by product"}
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

:::callout{title="Coverage"}
Every value and illustration is fictional. Sorting Weekly orders uses the declared final-week key; it does not compare arrays or recompute totals. No live filters or subtotal calculations are implied.
:::
