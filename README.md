# n8n Projects Library

A lightweight static site to browse and view your n8n projects/templates. Includes search, filters, and light/dark theme (default: light). Project details open in a modal popup on the main page.

## Structure

- `index.html` — main gallery with search and filters (click a card to open the detail modal)
- `assets/css/style.css` — styles, including theming
- `assets/js/main.js` — logic for gallery page
- `data/projects.json` — your data source

## Data format (`data/projects.json`)

```json
{
  "projects": [
    {
      "id": "unique-id",
      "title": "Project Title",
      "description": "Short description",
      "useCases": ["Automation", "Sales"],
      "integrations": ["OpenAI", "Google Sheets"],
      "tags": ["ai", "email"],
      "overview": "<p>HTML or text for overview.</p>",
      "owner": "you",
      "version": "1.0.0",
      "created": "2025-09-01",
      "updated": "2025-09-10"
    }
  ]
}
```

- `id` uniquely identifies a project.
- You can embed basic HTML in `overview`.

## Run locally

Just open `index.html` in your browser. If you run into CORS issues, serve the folder with any static server.

### Example (PowerShell)

```powershell
# Python
python -m http.server 8080
# or Node (if installed)
npx serve -l 8080
```

Then visit `http://localhost:8080/index.html`.

## Theme

- Toggle in the sidebar switches between light/dark.
- Preference is saved in `localStorage` under `theme-preference`.

## Customization tips

- Update colors in `assets/css/style.css` CSS variables.
- Add your own logo by replacing `assets/img/logo.svg` and `assets/img/favicon.svg`.
- Add more filters (e.g., difficulty) by extending `projects.json` and updating `main.js` accordingly.

## Optional next steps

- Deep-linking: open a specific project modal via `?id=...` and sync browser back/forward.
