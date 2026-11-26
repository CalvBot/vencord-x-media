# XMedia

A Vencord plugin that adds `/x <link>`: it posts the video, GIF or images of a post on X as the
original files.

```
/x https://x.com/i/status/1234567890123456789
```

## Setup

1. Install [Vencord](https://vencord.dev/download/) and open Discord once.
2. Download and run the
   [Vencord Plugin Installer](https://github.com/CalvBot/vencord-plugin-installer/releases/latest),
   tick **XMedia** and click Install.

It builds Vencord with the plugin on your own PC and switches it on. Run it again to update.

To build it yourself, copy `src` into a Vencord source checkout as `src/userplugins/xMedia` and
build Vencord.

## What gets posted

- Videos in their highest quality, images at original size, and every file of a post with several.
- X turns every GIF into an MP4. With [ffmpeg](https://ffmpeg.org/) installed the plugin converts
  it back to a GIF file; without it, or if the GIF would be over 10 MB, it posts the MP4.
- Posts that X only shows to logged-in users (age-restricted, private accounts) don't work.
