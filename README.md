# XMedia

A Vencord plugin. `/x <link>` posts the video, GIF or images from a post on X as files.

```
/x https://x.com/i/status/1234567890123456789
```

## Install

Get it with the
[Vencord Plugin Installer](https://github.com/CalvBot/vencord-plugin-installer/releases/latest).

## Good to know

- GIFs need [ffmpeg](https://ffmpeg.org/) (`winget install Gyan.FFmpeg`). Without it, or if the
  GIF would be over 10 MB, the plugin posts an MP4 instead.
- Posts you can only see when logged in to X don't work.
