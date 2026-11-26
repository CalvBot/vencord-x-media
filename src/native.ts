/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Runs in Discord's main process, which may fetch from X's servers (the chat window may not).

import { execFile } from "child_process";
import { IpcMainInvokeEvent, net } from "electron";
import { existsSync } from "fs";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { tmpdir } from "os";
import { delimiter, join } from "path";
import { promisify } from "util";

export interface Media {
    url: string;
    /** File name to post it under */
    name: string;
    /** MIME type */
    type: string;
    /** A GIF on X, which X only has as an MP4 */
    gif: boolean;
}

/** X's own servers for media files. Nothing else is ever downloaded. */
const MEDIA_HOSTS = ["video.twimg.com", "pbs.twimg.com"];
/** Above this a file is refused: it would not fit in a Discord message anyway */
const MAX_BYTES = 500 * 1024 * 1024;
/** Free Discord's upload limit. A converted GIF over this is made smaller, or left as the MP4. */
const GIF_MAX_BYTES = 10 * 1024 * 1024;
const TYPES: Record<string, string> = { mp4: "video/mp4", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };

/** The key X's embed service expects next to a post id */
function token(id: string) {
    return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

function extension(url: string) {
    return /\.(\w{2,4})$/.exec(new URL(url).pathname)?.[1].toLowerCase() ?? "";
}

/**
 * The original files of a post's media, looked up through the service X runs for embedded posts
 * (no login needed). A video is its highest-quality version. A GIF comes as an MP4: X converts
 * every GIF when it is posted and keeps no GIF file; download() can convert it back.
 */
export async function findMedia(_: IpcMainInvokeEvent, id: string): Promise<Media[]> {
    if (!/^\d{1,20}$/.test(id)) throw new Error("That isn't a link to a post on X.");
    const res = await net.fetch(`https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=${token(id)}`);
    if (res.status === 404) throw new Error("X has no such post (deleted, or from a private account).");
    if (!res.ok) throw new Error(`X answered with error ${res.status}.`);
    const post = await res.json();
    if (post?.__typename === "TweetTombstone") throw new Error("X doesn't show this post without a login (age-restricted or removed).");

    // A post without media of its own may quote one that has some
    const details: any[] = post?.mediaDetails?.length ? post.mediaDetails : post?.quoted_tweet?.mediaDetails ?? [];
    const author: string = String(post?.user?.screen_name ?? "x").replace(/\W/g, "");
    const media: Media[] = [];
    for (const m of details) {
        let url: string | undefined;
        if (m.type === "photo") {
            // "orig" is the file as it was uploaded; the plain address gives a smaller copy
            const ext = extension(m.media_url_https) || "jpg";
            url = `${String(m.media_url_https).replace(/\.\w+$/, "")}?format=${ext}&name=orig`;
            media.push({ url, name: `${author}-${id}-${media.length + 1}.${ext}`, type: TYPES[ext] ?? "image/jpeg", gif: false });
        } else if (m.type === "video" || m.type === "animated_gif") {
            const best = (m.video_info?.variants ?? [])
                .filter((v: any) => v.content_type === "video/mp4")
                .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
            if (best?.url) media.push({ url: best.url, name: `${author}-${id}-${media.length + 1}.mp4`, type: "video/mp4", gif: m.type === "animated_gif" });
        }
    }
    return media;
}

/** ffmpeg where Windows package managers put it, or anywhere on PATH. Null without one. */
function findFfmpeg() {
    const exe = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
    const dirs = [
        join(process.env.LOCALAPPDATA ?? "", "Microsoft", "WinGet", "Links"),
        join(process.env.USERPROFILE ?? "", "scoop", "shims"),
        join(process.env.ProgramData ?? "C:/ProgramData", "chocolatey", "bin"),
        ...(process.env.PATH ?? "").split(delimiter),
    ];
    return dirs.filter(Boolean).map(d => join(d, exe)).find(existsSync) ?? null;
}

/**
 * X's MP4 of a GIF, turned back into a GIF file with ffmpeg, so Discord shows it as a GIF (looping,
 * no player). A GIF is many times larger than the MP4: one over Discord's free limit is made
 * again at half the width and frame rate. Null if there is no ffmpeg or it is still too large,
 * and then the MP4 is posted.
 */
async function toGif(mp4: Uint8Array): Promise<Uint8Array | null> {
    const ffmpeg = findFfmpeg();
    if (!ffmpeg) return null;
    const dir = await mkdtemp(join(tmpdir(), "xmedia-"));
    try {
        await writeFile(join(dir, "in.mp4"), mp4);
        // The quotes keep ffmpeg from reading the comma inside min() as the end of the filter
        for (const shape of ["fps='min(source_fps,30)'", "fps='min(source_fps,15)',scale=iw/2:-2:flags=lanczos"]) {
            // A palette made from this clip's own colours looks far better than GIF's default one
            const filter = `${shape},split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
            await promisify(execFile)(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", "-i", "in.mp4", "-filter_complex", filter, "-loop", "0", "out.gif"],
                { cwd: dir, windowsHide: true, timeout: 120_000 });
            const gif = await readFile(join(dir, "out.gif"));
            if (gif.length <= GIF_MAX_BYTES) return new Uint8Array(gif);
        }
        return null;
    } catch {
        return null;
    } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => { });
    }
}

/**
 * Downloads one media file found by findMedia. With `asGif`, an MP4 is converted to a GIF where
 * that is possible; `gif` in the answer says whether the data is one.
 */
export async function download(_: IpcMainInvokeEvent, url: string, asGif: boolean): Promise<{ data: Uint8Array; gif: boolean; }> {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" || !MEDIA_HOSTS.includes(hostname)) throw new Error("Not a media file on X.");
    const res = await net.fetch(url);
    if (!res.ok) throw new Error(`X answered with error ${res.status} for the file.`);
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("The file is over 500 MB.");
    const data = new Uint8Array(await res.arrayBuffer());
    if (data.length > MAX_BYTES) throw new Error("The file is over 500 MB.");
    const gif = asGif ? await toGif(data) : null;
    return gif ? { data: gif, gif: true } : { data, gif: false };
}
