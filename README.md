# Yellowstone From Home

An English-language virtual tour of eight Yellowstone National Park places. The map and video pages are static; the guide uses a Vercel server function to call DeepSeek. The API key is never included in the browser files.

## Deploy to Vercel

1. Import this project into Vercel. If you import the enclosing `YellowstoneFromHome` folder, set **Root Directory** to `site`.
2. Use the **Other** framework preset. `vercel.json` sets the static output directory to `dist`; the `/api/guide` function is discovered from `api/guide.mjs`.
3. In **Project → Settings → Environment Variables**, add `DEEPSEEK_API_KEY` with the key you created in [DeepSeek Platform](https://platform.deepseek.com/). Select Production and Preview as needed. Do not add the key to `dist/app.js`, `vercel.json`, or Git.
4. Redeploy after adding the variable. The badge in the guide changes from **OFFLINE** to **AI GUIDE** when the server detects the key. This checks that a key exists; it does not verify the key or account balance until a question is sent.

The default model is `deepseek-flash`. To choose another compatible DeepSeek chat model, set the optional `DEEPSEEK_MODEL` environment variable. The default requires no model setting.

## Replace the landmark videos

Edit [dist/videos.json](dist/videos.json). This is the single list of video links for all eight places. Each entry uses the place ID, `type`, `url`, and `credit`; YouTube entries can also set `startSeconds`. Keep the place IDs unchanged so each film stays attached to the right map location.

To use your own video, put an MP4 file in `dist/videos/` and replace that place's entry, for example:

```json
"fountain": {
  "type": "file",
  "url": "/videos/fountain-paint-pot.mp4",
  "poster": "/videos/fountain-paint-pot.jpg",
  "credit": "4K film · Yellowstone From Home"
}
```

`poster` is optional. You can also use a direct HTTPS MP4 URL in `url` if the file is hosted separately. The page will show a built-in video player for `file` entries and a YouTube player for `youtube` entries. Redeploy after editing the catalog or uploading a video. Only publish footage you have permission to use.

## Local development and checks

Use Node.js 24. Add `DEEPSEEK_API_KEY` to an untracked `.env.local` for `vercel dev`, or configure the Development environment in Vercel. Run `npx vercel dev` from this `site` directory to exercise both the website and `/api/guide`. `npm test` runs the server tests without making paid API calls.

Do not open `dist/index.html` directly with a `file://` URL. Browsers restrict local-file requests, so the video catalog, map tiles, and API can fail. For a quick visual preview on macOS, open Terminal in this `site` directory, run `npm run preview`, then visit `http://127.0.0.1:4174/`. This serves the map and video catalog over HTTP; the AI guide remains offline in this static preview. Use `npx vercel dev` or the deployed Vercel URL to test the guide.

Without a key, the website still loads its map and films; the guide reports that setup is needed. The voice input and speech playback use browser features and may not be supported by every browser.

If the guide shows **AI GUIDE** but a question returns an unavailable message, check the function logs and verify the key, DeepSeek account balance, and model name.

## Scope and cost controls

The server restricts each question to 500 characters, caps each model response, and instructs DeepSeek to answer only Yellowstone topics. When the model labels a question off topic, the server replaces its text with a fixed Yellowstone redirect. Model-based scope checks can make mistakes, so review real questions after launch. A public site should also use Vercel's request-rate protection and a DeepSeek spending limit to control usage.
