<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/b098297e-4b7f-48e1-8092-f8e9ca0bd8a8

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## GitHub Pages

This repo is now configured to deploy automatically to GitHub Pages from the `main` branch.

1. In the repository settings, enable GitHub Pages and select `GitHub Actions` as the source.
2. Push to `main`, or run the `Deploy GitHub Pages` workflow manually from the Actions tab.
3. After the first successful deploy, the site will be available at:
   `https://ryuk94.github.io/FreelanceOS_2/`

The Vite build is already configured to use the repository subpath during production builds, so static assets load correctly on Pages without extra setup.
