/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Client } from "npm:oceanic.js";

// overengineered af cuz i felt like it
function createEnvLoader<Keys extends readonly string[]>(keys: Keys) {
  const proxy = new Proxy(Deno.env, {
    get: (target, key) =>
      target.get(key as string) ||
      (() => {
        throw new Error(`env.${key as string} isn't defined`);
      })(),
  }) as Record<Keys[number], string>;
  keys.map((k) => proxy[k as Keys[number]]);
  return proxy;
}

const env = createEnvLoader(["DISCORD_BOT_TOKEN", "DISCORD_APPLICATION_ID"]);

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
