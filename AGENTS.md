# Mumbai AirSense AI — UI/UX Design System & Architectural Rules

Based on open design skills from `https://www.skills.sh/` (`anthropics/skills/frontend-design` and `vercel-labs/agent-skills/web-design-guidelines`):

1. **Aesthetic Direction**:
   - Environmental intelligence theme: Deep obsidian/navy background (`#070a13`, `#0d1527`), atmospheric slate cards (`#0e172a`), subtle hairline borders (`#1e293b`), and scientific high-contrast accents (Phosphor Cyan `#06b6d4`, Emerald `#10b981`, Amber `#f59e0b`, Crimson `#ef4444`).
   - Distinctive visual hierarchy: Avoid generic AI template look (no repetitive identical cards, no cheesy violet gradients).
   - Use `tabular-nums` for all quantitative measurements and dates.

2. **Accessibility & Web Interface Standards**:
   - Icon buttons have explicit `aria-label`.
   - Focus states: `focus-visible:ring-2 focus-visible:ring-cyan-500`.
   - Compositor-only animations (`opacity`, `transform`).
   - Sentence case for labels.

3. **Data Integrity & Scientific Communication**:
   - Always clearly distinguish:
     - 🟢 **Live Real-Time Telemetry** (Observed today via Open-Meteo & CAAQMS coordinates)
     - 📁 **CPCB Archive Data** (Official historical observations)
     - 🧠 **Model Predictions** (Derived via ARIMA, Prophet, LSTM)
   - Indian CPCB NAQI standard breakpoints and formulas are strictly preserved.
