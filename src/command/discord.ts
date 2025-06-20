/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { few, literal } from "./constructions.ts";
import { boo, yay } from "./lib.ts";
import { nat } from "./primitives.ts";

export const snowflake = nat.map(
  "snowflake",
  (_, value) =>
    value <= 9223372036854775807n
      ? yay(value)
      : boo("custom", "Snowflake is out of bounds"),
);

export const mentions = {
  user: few(literal("<@"), snowflake, literal(">")),
  channel: few(literal("<#"), snowflake, literal(">")),
};
