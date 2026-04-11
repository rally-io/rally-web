# Rally Website

This repository contains the static marketing website for Rally, an Israeli padel platform featuring a consumer mobile app and a B2B CRM for clubs.

## Architecture

This is a pure static website built with:
- HTML5 / CSS3 / Vanilla JavaScript
- [Tailwind CSS](https://tailwindcss.com/) (loaded via CDN)
- [Lucide Icons](https://lucide.dev/) (loaded via CDN)
- Custom Vanilla JS i18n engine (`assets/js/i18n.js`)

## Internationalization (i18n)

The site is fully bilingual (Hebrew/English). 
Hebrew is the default language.
- Translations are stored in `/assets/locales/he.json` and `/assets/locales/en.json`.
- To add or modify text, edit the respective JSON files. Elements use the `data-i18n="key.subkey"` attribute to fetch their mapped strings.
- Layout switches seamlessly from LTR to RTL based on the selected language.

## Deployment Instructions

Since this setup requires no build step (`npm run build`, Webpack, Vite, etc.), it can be served directly.

### Recommended: AWS S3 + CloudFront

1. Create an AWS S3 bucket configured for **Static Website Hosting**.
   - Make sure public access is granted via Bucket Policy if required.
   - Set the index document to `index.html`.
2. Sync the directory contents to S3:
   ```bash
   aws s3 sync . s3://your-bucket-name --exclude ".git/*" --exclude "README.md"
   ```
3. Set up an AWS CloudFront distribution:
   - Point the origin to your S3 bucket website endpoint.
   - Set up an SSL certificate from AWS Certificate Manager (ACM).
   - Configure cache behavior to forward query strings based on caching needs.
4. Update your domain's DNS settings (Route53) to point an A record (Alias) to the CloudFront distribution domain name.

### Local Development

You can use any local static server to preview.
Using Python:
```bash
python3 -m http.server 8000
```
Then visit `http://localhost:8000`.

## File Structure
- `/*.html`: Core pages (index, app, crm, pricing, privacy, terms, contact).
- `/assets/css/style.css`: Custom overrides, RTL layout fixes, and animations.
- `/assets/js/i18n.js`: LocalStorage-based runtime translation engine.
- `/assets/js/nav.js` & `footer.js`: Shared components renderer.
- `/assets/js/main.js`: Setup logic for sticky navbar and AOS-like scroll observers.
- `/assets/locales/`: JSON maps for UI strings.

## Legal Notes
The privacy policy and terms of service files provided are samples but have been tailored according to the Israeli Privacy Protection Law (5741-1981) specifications. You should review them with a local legal counsel.
