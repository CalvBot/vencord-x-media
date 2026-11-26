# XMedia

A Vencord plugin that adds `/x <link>`: it posts the video, GIF or images of a post on X as the
original files.

```
/x https://x.com/i/status/2125585555589407186
```

A video is posted in its highest quality. A GIF is posted as an MP4, because X converts every GIF
and keeps no GIF file. Posts that X only shows to logged-in users (age-restricted, private accounts)
don't work.

## Setup

Copy `src` into a Vencord source checkout as `src/userplugins/xMedia`, build Vencord, and enable
**XMedia** in the plugin settings.
