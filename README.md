# Wishy Toolkit

A static-first utility dashboard themed around the supplied pink/magenta anime artwork.

## Included tools

- Sandbox/test payment card generator — documented test credentials only, not live card data
- Synthetic address generator with curated real postal/ZIP codes for US, UK, and Philippines
- Random email alias generator (edit `EMAIL_DOMAINS` in `app.js`)
- Refund calculator: `(amount / days purchased * remaining days) * service fee`
- Static same-site redirect link maker
- Email/password format fixer: `Number. Email|Password`
- Light / dark mode

## Run locally

Open `index.html` directly, or serve the folder with any static server.

## Netlify deployment

1. Create a new GitHub repository and push this folder.
2. In Netlify: **Add new site → Import an existing project → GitHub**.
3. Select the repository.
4. Build command: leave blank.
5. Publish directory: `.`
6. Deploy.

You can also drag-and-drop this folder/ZIP into Netlify's manual deploy page.

## GitHub Pages

This project is static and can be hosted on GitHub Pages. In the repository, enable **Settings → Pages → Deploy from branch**, select `main` and `/ (root)`.

For a custom domain, enter your domain in GitHub Pages settings, then add the DNS records GitHub shows you at your DNS provider. HTTPS can be enabled after DNS propagates.

## Email aliases

The email generator only creates alias strings. To actually receive messages at those aliases, configure the domains with your own mail-routing/provider backend.

## Shortlink note

The included static shortlink maker encodes a destination into the deployed site's query string. It works without a database, but it is not a true server-side shortener. A persistent `yourdomain.com/abc123` service requires storage (for example a database/KV) plus a serverless function.

## Postal-code note

Postal codes in this offline build are a curated sample set and are not live-verified against postal-service databases.
