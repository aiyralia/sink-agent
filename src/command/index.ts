/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  few,
  literal,
  many,
  optional,
  pick,
  sequence,
  unordered,
  whitespace,
} from "./constructions.ts";
import {
  Lexer,
  Parser,
  parser as construct,
  unexpectedSymbol,
  yay,
} from "./lib.ts";
import { alphanumeric, greedyString } from "./primitives.ts";

export const skip = many(whitespace);

export const word = sequence((stream) => {
  const character = stream.advance();
  if (!character || !character.trim().length) {
    return unexpectedSymbol(stream, "non-whitespace character");
  }
  return yay(character);
}).map("word", (_, chars) => yay(chars.join("")));

export const escape = few(literal("\\"), pick('"', "\\", "n", "t", "r")).map(
  "escape",
  (_, [, char]) => {
    switch (char) {
      case "n":
        return yay("\n");
      case "t":
        return yay("\t");
      case "r":
        return yay("\r");
      default:
        return yay(char);
    }
  },
);

export const quoted = (delimiter: string) =>
  few(
    literal(delimiter),
    many(pick(
      escape,
      construct((stream) => {
        const char = stream.advance();
        if (!char || char === delimiter) {
          return unexpectedSymbol(stream, "invalid sequence of characters");
        }
        return yay(char);
      }, "quoted_inner"),
    )),
    literal(delimiter),
  ).map("quoted", (_, [, chars]) => yay(chars.join("")));

export const quotedString = pick(quoted('"'), quoted("'"));

export const string = pick(quotedString, word);

export const identifier = sequence(
  pick(alphanumeric, literal("-"), literal("_")),
).map("identifier", (_, chars) => yay(chars.join("")));

///////////////////////////////////////////////////////////////////////////

export const flag = (name: Lexer<string>) =>
  few("-", name).map("flag", (_, [, flag]) => yay(flag));

export const positional = <T>(name: string, kind: Lexer<T>) =>
  few(skip, flag(name), skip, kind)
    .map(
      "positional",
      (_, [, , , value]) => yay(value),
    );

export const prefix = pick(
  literal("/"),
  literal("$"),
  few(literal("<@1384657966061326406>"), optional(literal(" ")))
    .map("prefix", (_, [prefix]) => yay(prefix + " ")),
);

export interface Command<T extends Record<string, any>> {
  prefix: string;
  label: string;
  args: T;
  remaining: string;
}

export function command<L extends Record<string, Parser<any>>>(
  aliases: string[],
  lexers: L,
) {
  const keys = Object.keys(lexers) as (keyof L)[];

  return few(
    prefix,
    pick(...aliases.map(literal)),
    unordered(
      ...Object.entries(lexers)
        .map(([name, lx]) =>
          lx.tag === "optional"
            ? optional(positional(name, lx.next!))
            : positional(name, lx)
        ),
    ),
    optional(
      few(skip, greedyString).map(
        "ws_greedy_string",
        (_, [, text]) => yay(text),
      ),
    ),
  ).map("command", (_, [prefix, label, args, remaining]) => {
    const namedArgs = Object.fromEntries(
      keys.map((k, i) => [k, args[i]]),
    ) as { [K in keyof L]: L[K] extends Lexer<infer U> ? U : never };
    return yay({
      prefix,
      label,
      args: namedArgs,
      remaining,
    } as Command<{ [K in keyof L]: L[K] extends Lexer<infer U> ? U : never }>);
  });
}
