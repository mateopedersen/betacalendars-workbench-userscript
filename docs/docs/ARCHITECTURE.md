# Architecture

The public artifact is a single userscript with no runtime dependencies. Its civil date helpers are pure functions. UI and persistence are isolated in a Shadow DOM. Planner text is inserted with `textContent`; imported note fields are normalized before storage. Only user-triggered downloads and navigation create browser actions. The only persistent data is namespaced local storage. Print Lab temporarily adds page-scoped print rules and removes them after the print dialog closes.

The source is kept readable and is copied verbatim by `scripts/build.mjs`. `scripts/check.mjs` checks metadata scope, size, dynamic-code patterns, unexpected runtime dependencies and common tracking markers. The check supplements, but does not replace, Greasy Fork moderation.
