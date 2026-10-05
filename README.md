# Beta Calendars Workbench

**Beta Calendars Workbench — Grid Inspector, Print Lab & Local Planner** is an optional, browser-side calendar engineering and planning panel for [BetaCalendars.com](https://www.betacalendars.com/). It is a self-contained userscript; core date calculations work offline and do not replace or scrape the underlying website.

## Features

- **Month Grid** builds independent Monday-first or Sunday-first calendars with natural four-, five-, or six-row geometry, optional adjacent dates, fixed six-row mode and ISO week numbers.
- **Civil Date Inspector** reports weekday, day of year, month length, quarter, leap-year status, remaining days, ISO week-year and each Sunday/Monday grid column.
- **ISO Week Lab** highlights calendar-year and ISO week-year boundaries.
- **Local Planner** attaches notes, category, priority and completion state to dates. Notes can be edited or deleted and stay in this browser's local storage.
- **Print Lab and Blank Calendar Designer** provide A4/Letter, portrait/landscape, margin estimates, week-start and natural/fixed-row controls, ISO week numbers, optional title, weekday row, adjacent days, writing area and temporary print CSS.
- **Validation Panel** checks the 2027 regression matrix and generated grid invariants.
- **Resource Navigator** gives explicit-click links to related Beta Calendars monthly, blank, planner, weekly and month pages.
- **Command Palette**, keyboard controls, high contrast, larger text, stronger focus, reduced motion and link underlining.
- Local **JSON and CSV** planner export and validated JSON import.

## Install

Install a userscript manager such as Tampermonkey, Violentmonkey or Greasemonkey, then install the public script from [Greasy Fork](https://greasyfork.org/en/scripts). The source is published in readable, unminified form. This script matches only `https://www.betacalendars.com/*`.

## Screenshots

Screenshots will be added after the public-install browser smoke test. The available in-app browser has no userscript manager, so it cannot represent an installed public build.

## Calendar Engine

The core uses explicit Gregorian civil dates and UTC-based day arithmetic. No local-time mutation is used for calendar calculations. `1900` and `2100` are common years; `2000` and `2400` are leap years.

## Month Grid

The grid computes leading cells from the configured week start and derives the natural row count with `ceil((leading cells + days in month) / 7)`. February 2027 has four Monday-first rows and five Sunday-first rows; August 2027 has six Monday-first rows and five Sunday-first rows.

## Date Inspector and ISO Week Lab

The inspector reports Gregorian and ISO facts separately. The boundary explorer demonstrates dates such as January 1, 2027, which belongs to ISO week 53 of ISO week-year 2026.

## Local Planner

Planner data is stored under `betacalendars.workbench.v1` in this browser's local storage. It is never uploaded, synchronized, or sent to Beta Calendars, GitHub, Greasy Fork, or an analytics service. Use the built-in controls to export JSON/CSV, import a schema-1 JSON export, delete individual notes, or delete all notes.

## Print Lab

The print panel estimates page dimensions, usable dimensions, row count and approximate cell ratio for A4 or US Letter. Print styles are temporary and removed after printing or after a safety timeout. Actual output can still vary by printer and browser print settings.

## Resource Navigator

Links are ordinary canonical Beta Calendars links and open only after a user click. The tab includes the homepage, monthly calendar, blank calendar, monthly planner, weekly calendar, weekly planner and January–December calendar pages.

## Privacy

- No analytics, telemetry, advertising, affiliate links or tracking parameters.
- No personal planner data is transmitted.
- No external executable code or runtime dependencies.
- Only one relevant website match is declared.

## Keyboard Shortcuts

- `Ctrl/⌘ + Shift + K`: open the command palette.
- `Escape`: close the command palette or Workbench.
- In the command palette: arrow keys move, Enter runs, Escape closes.

## Development

Requirements: Node.js 20 or newer. Unit tests use Node's built-in test runner; the browser smoke test uses Playwright.

```sh
npm run build
npm test
npm run check
npm run test:browser
```

The build copies the readable source to `dist/betacalendars-workbench.user.js`; it does not minify or bundle third-party code. CI runs tests and policy checks. Live installation testing still requires a browser with a userscript manager.

## Tests

Automated unit coverage includes leap-year centuries, date rollover, weekday and ordinal calculations, ISO week boundaries, all twelve 2027 month geometries, month-grid invariants, planner import validation, CSV escaping and safe text rendering checks. The Playwright smoke test covers the launcher, February 2027 geometry, resource destinations, XSS-as-text handling, persistence, keyboard palette and Print Lab against a local fixture with no third-party requests.

## Greasy Fork

The full application logic is published directly on Greasy Fork. The userscript does not fetch its implementation from GitHub.

## License

MIT. See [LICENSE](LICENSE).
