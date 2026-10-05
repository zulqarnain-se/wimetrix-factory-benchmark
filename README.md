# WiMetrix AI Factory Benchmark Tool

> A diagnostic and ROI estimation tool for apparel and garment manufacturing plants.

## Executive Summary

The WiMetrix AI Factory Benchmark Tool lets factory managers, general managers, and Industrial Engineering (IE) teams benchmark a plant in four questions and under a minute.

**Inputs**

- Primary product category: Knitwear, Woven / Bottoms, Workwear, or Home Textile
- Monthly production volume
- Active machine count
- Current profit margin

**Outputs**

- **Benchmark score** with a gap tier, from *Critical Gap* to *Optimal*
- **Predicted machine baseline** for the stated category and volume, compared against the actual count
- **Estimated efficiency gain** and overtime exposure
- **Automation maturity level**

The tool runs entirely in the browser. It has no backend and no build step.

## Pre-Production Research

The scoring model is grounded in research on apparel cost structures, done before any code was written.

**Read the research: [Cost Elements in Textile & Apparel Manufacturing](docs/apparel-cost-breakdown.md)**

It covers:

- **FOB cost allocation** across five categories, as a share of sales
- **Shell fabric waste**, the largest single cost line at 35–42% of sales
- **Direct labor**, driven by Standard Allowed Minutes (SAM), line balancing, and overtime
- **Utility overheads**, including boiler energy, electrical power, and Effluent Treatment Plant (ETP) costs
- **Industry benchmarks** from twelve published studies and sourcing guides

## Repository Structure

```text
wimetrix-factory-benchmark/
├── index.html                      # Page markup and entry point
├── css/
│   └── styles.css                  # Layout, responsive rules, animations
├── js/
│   ├── config.js                   # Questions, category cards, machine parameters
│   ├── formulas.js                 # Scoring and ROI calculations (pure functions)
│   └── app.js                      # Wizard UI, charts, modal controller
├── docs/
│   └── apparel-cost-breakdown.md   # Cost research and industry benchmarks
└── README.md
```

The scripts load in the order `config.js`, `formulas.js`, `app.js`, and share state through a single `window.WiMetrix` namespace.

## Tech Stack

| Layer     | Technology                                      |
| :-------- | :---------------------------------------------- |
| Markup    | HTML5                                           |
| Styling   | Tailwind CSS (Play CDN) plus custom CSS         |
| Logic     | Vanilla JavaScript, no framework or bundler     |
| Charts    | Inline SVG, rendered by hand                    |
| Typeface  | Inter, served by Google Fonts                   |

## Quick Setup Guide

No dependencies to install. You need a modern browser and an internet connection, because Tailwind CSS and the Inter typeface load from CDNs.

1. Clone the repository.

   ```bash
   git clone https://github.com/<your-username>/wimetrix-factory-benchmark.git
   cd wimetrix-factory-benchmark
   ```

2. Open `index.html` in a browser, or serve the folder locally.

   ```bash
   python -m http.server 8000
   ```

3. Visit <http://localhost:8000>.

To change the questions or machine parameters, edit `js/config.js`. To change the scoring logic, edit `js/formulas.js`.
