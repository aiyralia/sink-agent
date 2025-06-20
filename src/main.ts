/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Client } from "npm:oceanic.js";
import env from "./env.ts";

const credentials = {
  discord: {
    token: env.DISCORD_BOT_TOKEN,
    applicationId: env.DISCORD_APPLICATION_ID,
  },
};

const client = new Client({ auth: `Bot ${credentials.discord.token}` });

client.on("ready", () => console.log("meowing as", client.user.tag));
client.on("error", console.error);
client.connect();
