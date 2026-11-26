# XMedia

A Vencord plugin that adds `/x <link>`: it posts the video, GIF or images of a post on X as the
original files.

```
/x https://x.com/i/status/2125585555589407186
```

A video is posted in its highest quality. A GIF is converted back to a GIF file with ffmpeg, because X turns every GIF into an MP4
(without ffmpeg, or if the GIF would be over 10 MB, the MP4 is posted). Posts that X only shows to logged-in users (age-restricted, private accounts)
don't work.

## Setup

Copy `src` into a Vencord source checkout as `src/userplugins/xMedia`, build Vencord, and enable
**XMedia** in the plugin settings.
