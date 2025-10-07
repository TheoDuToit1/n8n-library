# Automation Workflow Screenshots

Save your workflow screenshots in this folder.

Recommended:
- Use PNG or WebP for best quality.
- Aspect ratio ~16:9 for best card fit (e.g., 1280x720).
- Filenames: use the project id, e.g. `linkedin-profile-extract.png`.

How to reference in data/projects.json:

```json
{
  "id": "linkedin-profile-extract",
  "title": "LinkedIn Profile Data Extraction",
  "screenshot": "./assets/screenshots/linkedin-profile-extract.png"
}
```

Alternatively, you can provide an `images` array and the first item will be used on the card:

```json
{
  "id": "personalized-outbound",
  "images": ["./assets/screenshots/personalized-outbound-1.png", "./assets/screenshots/personalized-outbound-2.png"]
}
```
