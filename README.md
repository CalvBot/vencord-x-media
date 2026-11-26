# XMedia

A Vencord plugin that adds `/x <link>`: it posts the video, GIF or images of a post on X as the
original files.

```
/x https://x.com/i/status/1234567890123456789
```

## Setup

1. Install [Vencord](https://vencord.dev/download/) if you don't have it.
2. Quit Discord fully, then extract `XMedia.zip` from the
   [latest release](https://github.com/CalvBot/vencord-x-media/releases/latest) into
   `%APPDATA%\Vencord\dist`, replacing the files there.
3. Enable **XMedia** in Vencord's plugin settings.

Vencord's installer (Repair) puts plain Vencord back. To build it yourself, copy `src` into a
Vencord source checkout as `src/userplugins/xMedia` and build Vencord.

## What gets posted

- Videos in their highest quality, images at original size, and every file of a post with several.
- X turns every GIF into an MP4. With [ffmpeg](https://ffmpeg.org/) installed the plugin converts
  it back to a GIF file; without it, or if the GIF would be over 10 MB, it posts the MP4.
- Posts that X only shows to logged-in users (age-restricted, private accounts) don't work.
