/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { yay } from "./lib.ts";
import { few, optional, pick, range, sequence } from "./constructions.ts";

export { $ } from "./stream.ts";

export const digit = range("0", "9");

export const nat = sequence(digit).map((_, value) => yay(+value.join("")));

export const int = few(optional(pick("+", "-")), nat)
  .map((_, [sign, value]) => yay(sign === "-" ? -value : value));

export const lowercase = range("a", "z");
export const uppercase = range("A", "Z");
export const alpha = pick(lowercase, uppercase);
export const alphanumeric = pick(alpha, digit);
