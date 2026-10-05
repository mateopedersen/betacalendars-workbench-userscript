# Security and Privacy

The userscript performs calendar calculations locally and persists preferences and planner notes in browser `localStorage` under namespaced keys. It makes no network requests for application data, has no analytics, and loads no executable code from third parties. Planner JSON imports are schema-checked, date-validated and size-limited; note text is rendered as text, not HTML.

Please report security issues through [GitHub Issues](https://github.com/mateopedersen/betacalendars-workbench-userscript/issues).
