# maleekskies: Portfolio

Personal portfolio site for **maleekskies**, a product manager and content writer working at the intersection of Web3, AI, and practical problem solving.

**Live site:** [maleekskies.vercel.app](https://maleekskies.vercel.app)

## About

This is a static HTML portfolio, no build step, no framework, no dependencies. All markup, styles, and scripts live in `index.html`.

The site covers:

- **About**: background, current focus, and core stats
- **What I Do**: 6 core skill areas, from web development to content writing
- **My Work**: a hub with five in-page views:
  - **Content Writing**: published threads and articles
  - **AI Video Content**: produced video work
  - **Live Sites**: shipped projects with live previews, tech stack, and repo links
  - **Research & Docs**: sourced research documents
  - **Ambassador Work**: content collaborations with VIZO Exchange, Ozak AI, and MegPrimePay
- **Contact**: email, X, Telegram, LinkedIn, and Discord

## Features

- Light/dark theme toggle (preference saved locally)
- In-page navigation between sections without full page reloads
- CV download link, in the header on desktop and in the mobile menu on smaller screens
- Fully responsive, including a dedicated mobile menu
- Scroll-triggered animations, respecting the "reduce motion" accessibility setting for larger entrance effects

## Tech Stack

- HTML5, CSS3, vanilla JavaScript
- Google Fonts (Space Grotesk, IBM Plex Mono, Inter)
- No build tools, no package manager required

## Files

- `index.html`: the site itself
- `cv.pdf`: linked from the CV button in the nav
- `README.md`: this file

## Deployment

This is a static site, so it can be deployed anywhere that serves static files. Upload `index.html` and `cv.pdf` together, in the same folder, since the CV button links to `cv.pdf` by a relative path and will break if it's missing.

- **Netlify Drop**: drag and drop the folder at [app.netlify.com/drop](https://app.netlify.com/drop)
- **Vercel**: create a project and upload the folder
- **GitHub Pages**: push the files to this repo, then enable Pages in Settings > Pages, pointing to the main branch

No build command or install step is needed. `index.html` just needs to stay named that so it's served as the homepage.

## Local Preview

Open `index.html` directly in any browser. No server required.

## Contact

- Email: maleekskies@gmail.com
- X: [@maleekskies](https://x.com/maleekskies)
- Telegram: [@maleekskies](https://t.me/maleekskies)
- LinkedIn: [maleekskies](https://www.linkedin.com/in/maleekskies/)
- Discord: @maleekskies (copy the handle from the site, Discord doesn't support a direct profile link by username alone)
