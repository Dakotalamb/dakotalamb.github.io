# Forged Destiny Gaming website

This GitHub Pages site uses Jekyll includes for its shared navigation and footer.

## Common edits

- Header and navigation: `_includes/header.html`
- Footer links and copyright: `_includes/footer.html`
- Site-wide URLs, email, year, and tagline: `_config.yml`

Each public page retains its own content and design. Its YAML front matter sets
the `nav` value used to highlight the active navigation item.

GitHub Pages processes the includes automatically after a commit to the
configured publishing branch. Do not add a `.nojekyll` file.

