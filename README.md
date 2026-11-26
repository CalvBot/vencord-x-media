# XMedia

A Vencord plugin that adds `/x <link>`: it posts the video, GIF or images of a post on X as the
original files.

```
/x https://x.com/i/status/1234567890123456789
```

## Setup

Vencord has no way to load a plugin file, so the plugin is built into your own copy of Vencord.
You need [git](https://git-scm.com/), [Node.js](https://nodejs.org/) and [pnpm](https://pnpm.io/installation).

```sh
git clone https://github.com/Vendicated/Vencord
git clone https://github.com/CalvBot/vencord-x-media
cd Vencord
mkdir -p src/userplugins
cp -r ../vencord-x-media/src src/userplugins/xMedia
pnpm install --frozen-lockfile
pnpm build
pnpm inject
```

Quit Discord fully before `pnpm inject`, then open it and enable **XMedia** in Vencord's plugin
settings. To update, pull both folders, copy `src` again and run `pnpm build`.

## What gets posted

- Videos in their highest quality, images at original size, and every file of a post with several.
- X turns every GIF into an MP4. With [ffmpeg](https://ffmpeg.org/) installed the plugin converts
  it back to a GIF file; without it, or if the GIF would be over 10 MB, it posts the MP4.
- Posts that X only shows to logged-in users (age-restricted, private accounts) don't work.
