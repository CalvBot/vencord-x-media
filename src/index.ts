/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Adds /x <link to a post on X>: posts that post's media as the original files (video, GIF or
// images), so they play in Discord itself and stay when the post is gone.

import { ApplicationCommandInputType, ApplicationCommandOptionType, findOption, sendBotMessage } from "@api/Commands";
import { definePluginSettings } from "@api/Settings";
import { Logger } from "@utils/Logger";
import definePlugin, { OptionType, PluginNative } from "@utils/types";
import { DraftType, UploadHandler } from "@webpack/common";

const logger = new Logger("XMedia");
const Native = VencordNative.pluginHelpers.XMedia as PluginNative<typeof import("./native")>;

const settings = definePluginSettings({
    sendRightAway: {
        type: OptionType.BOOLEAN,
        description: "Post the files at once. When off, they are added to your message for you to send.",
        default: true,
    },
    realGifs: {
        type: OptionType.BOOLEAN,
        description: "Post a GIF as a GIF file. X only has GIFs as MP4 videos, so this converts them (needs ffmpeg, and the file is larger). When off, the MP4 is posted.",
        default: true,
    },
});

/** The post id in a link to X (x.com, twitter.com and the embed-fixing copies), or a bare id */
function postId(link: string) {
    return /(?:^|\/status(?:es)?\/)(\d{5,20})(?:\D|$)/.exec(link.trim())?.[1];
}

export default definePlugin({
    name: "XMedia",
    description: "Adds /x <link>: posts the video, GIF or images of a post on X as the original files.",
    authors: [{ name: "CalvBot", id: 0n }],
    settings,

    commands: [{
        name: "x",
        description: "Post the video, GIF or images of a post on X as files",
        inputType: ApplicationCommandInputType.BUILT_IN,
        options: [{
            name: "link",
            description: "Link to the post, like https://x.com/i/status/123",
            type: ApplicationCommandOptionType.STRING,
            required: true,
        }],
        execute: async (opts, ctx) => {
            const say = (content: string) => sendBotMessage(ctx.channel.id, { content });
            try {
                const id = postId(findOption(opts, "link", ""));
                if (!id) return say("That isn't a link to a post on X.");
                const media = await Native.findMedia(id);
                if (!media.length) return say("That post has no video, GIF or image.");
                const files: File[] = [];
                for (const m of media) {
                    const got = await Native.download(m.url, m.gif && settings.store.realGifs);
                    files.push(got.gif
                        ? new File([got.data as Uint8Array<ArrayBuffer>], m.name.replace(/[.]mp4$/, ".gif"), { type: "image/gif" })
                        : new File([got.data as Uint8Array<ArrayBuffer>], m.name, { type: m.type }));
                }
                // After the command has finished: Discord clears the message box then, attachments included.
                // requireConfirm:false is Discord's instant-upload path, which sends with its own progress bar.
                setTimeout(() => (UploadHandler.promptToUpload as any)(files, ctx.channel, DraftType.ChannelMessage,
                    settings.store.sendRightAway ? { requireConfirm: false } : undefined), 10);
            } catch (e) {
                logger.error("Could not post the media", e);
                say(String((e as Error)?.message ?? e).replace(/^Error invoking remote method '[^']+': (Error: )?/, ""));
            }
        },
    }],
});
