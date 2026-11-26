/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Runs in Discord's main process, which may fetch from X's servers (the chat window may not).

import { IpcMainInvokeEvent, net } from "electron";

export interface Media {
    url: string;
    /** File name to post it under */
    name: string;
    /** MIME type */
    type: string;
}

/** X's own servers for media files. Nothing else is ever downloaded. */
const MEDIA_HOSTS = ["video.twimg.com", "pbs.twimg.com"];
/** Above this a file is refused: it would not fit in a Discord message anyway */
const MAX_BYTES = 500 * 1024 * 1024;
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
 * every GIF when it is posted and keeps no GIF file.
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
            media.push({ url, name: `${author}-${id}-${media.length + 1}.${ext}`, type: TYPES[ext] ?? "image/jpeg" });
        } else if (m.type === "video" || m.type === "animated_gif") {
            const best = (m.video_info?.variants ?? [])
                .filter((v: any) => v.content_type === "video/mp4")
                .sort((a: any, b: any) => (b.bitrate ?? 0) - (a.bitrate ?? 0))[0];
            if (best?.url) media.push({ url: best.url, name: `${author}-${id}-${media.length + 1}.mp4`, type: "video/mp4" });
        }
    }
    return media;
}

/** Downloads one media file found by findMedia. */
export async function download(_: IpcMainInvokeEvent, url: string): Promise<Uint8Array> {
    const { protocol, hostname } = new URL(url);
    if (protocol !== "https:" || !MEDIA_HOSTS.includes(hostname)) throw new Error("Not a media file on X.");
    const res = await net.fetch(url);
    if (!res.ok) throw new Error(`X answered with error ${res.status} for the file.`);
    if (Number(res.headers.get("content-length") ?? 0) > MAX_BYTES) throw new Error("The file is over 500 MB.");
    const data = new Uint8Array(await res.arrayBuffer());
    if (data.length > MAX_BYTES) throw new Error("The file is over 500 MB.");
    return data;
}
