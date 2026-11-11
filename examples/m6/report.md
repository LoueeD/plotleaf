---
title: Regional order summary
---

# Regional order summary

A fictional report using a reusable metric definition and agent-prepared subtotals. Values are illustrative.

:::grid{columns="2"}
::component{src="./summary.json" label="North orders" value="53"}
::component{src="./summary.json" label="South orders" value="65"}
:::

:::table{data="./prepared-subtotals.json" title="Orders by region" prepared="grouped"}
::column{field="product" label="Product"}
::column{field="orders" label="Orders" format="number"}
:::
