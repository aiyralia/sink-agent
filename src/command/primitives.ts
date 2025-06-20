/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { Parser, yay } from "./lib.ts";
import { few, optional, pick, range, sequence } from "./constructions.ts";

export { $ } from "./stream.ts";

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export const digit = range("0", "9") as Parser<`${Digit}`>;

export const nat = sequence(digit).map(
  "nat",
  (_, value) => yay(+value.join("")),
) as Parser<Digit>;

export const int = few(optional(pick("+", "-")), nat)
  .map("int", (_, [sign, value]) => yay(sign === "-" ? -value : value));

export const lowercase = range("a", "z") as Parser<Alphabet>;
export const uppercase = range("A", "Z") as Parser<Uppercase<Alphabet>>;
export const alpha = pick(lowercase, uppercase);
export const alphanumeric = pick(alpha, digit);

type Alphabet =
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z";
