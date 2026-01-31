# Deploy BlogHub on Render (fixes /blog.css MIME error)

Your deployed URL is currently returning **404 HTML** for `/` and `/blog.css`, which means Render is not running the Express server from `signuppage&blog`.

## Option A (recommended): Use Blueprint
1. Push this repo with `render.yaml` to GitHub.
2. In Render: **New** → **Blueprint** → select your repo.
3. Render will create a Node Web Service using:
   - Root Directory: `signuppage&blog`
   - Build Command: `npm install`
   - Start Command: `npm start`

Then deploy.

## Option B: Fix existing service manually
In Render → your service → **Settings**:
- If it’s a **Static Site**, create a **New Web Service** instead.
- Set:
  - **Root Directory**: `signuppage&blog`
  - **Build Command**: `npm install`
  - **Start Command**: `npm start` (or `node server.js`)

## Verify after deploy
Open these URLs:
- `/health` → must return JSON
- `/blog.css` → must return CSS with `Content-Type: text/css`
- `/blog.html` → should load without MIME errors

If `/health` is still 404, the service is still not pointing at the Node app.
