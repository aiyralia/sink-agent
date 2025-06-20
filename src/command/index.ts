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
  whitespace,
} from "./constructions.ts";
import { Lexer, parser as construct, unexpectedSymbol, yay } from "./lib.ts";
import { alphanumeric } from "./primitives.ts";

export const skip = many(whitespace);

export const word = sequence((stream) => {
  const character = stream.advance();
  if (!character || !character.trim().length) {
    return unexpectedSymbol(stream, "non-whitespace character");
  }
  return yay(character);
}).map((_, chars) => yay(chars.join("")));

export const escape = few(literal("\\"), pick('"', "\\", "n", "t", "r")).map(
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
    literal('"'),
    many(pick(
      escape,
      construct((stream) => {
        const char = stream.advance();
        if (!char || char === delimiter) {
          return unexpectedSymbol(stream, "invalid sequence of characters");
        }
        return yay(char);
      }),
    )),
    literal('"'),
  ).map((_, [, chars]) => yay(chars.join("")));

export const quotedString = pick(quoted('"'), quoted("'"));

export const string = pick(quotedString, word);

export const greedyString = construct((stream) => {
  const content = stream.tail();
  for (let index = 0; index < content.length; index++) {
    stream.advance();
  }
  return yay(content);
});

export const identifier = sequence(
  pick(alphanumeric, literal("-"), literal("_")),
)
  .map((_, chars) => yay(chars.join("")));

///////////////////////////////////////////////////////////////////////////

export const flag = (name: Lexer<string>) =>
  few("-", name).map((_, [, flag]) => yay(flag));

export const positional = (name: string) =>
  few(whitespace, flag(name), whitespace, string)
    .map((_, [, key, , value]) =>
      yay({ type: "positional", key, value: value })
    );

export const prefix = pick(
  literal("/"),
  literal("$"),
  few(literal("<@1384657966061326406>"), optional(literal(" ")))
    .map((_, [prefix]) => yay(prefix)),
);

export interface Command<T extends any[]> {
  prefix: string;
  label: string;
  args: { [K in keyof T]: Lexer<T[K]> };
  remaining: string;
}

// FIXME: do not use permutations for this shit. it's not optimized
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];
  return arr.flatMap((item, i) =>
    permutations([...arr.slice(0, i), ...arr.slice(i + 1)]).map(
      (p) => [item, ...p],
    )
  );
}

export function command<T extends any[]>(
  aliases: string[],
  ...lexers: { [K in keyof T]: Lexer<T[K]> }
) {
  const args = permutations(lexers);

  return few(
    prefix,
    pick(...aliases.map(literal)),
    pick(
      ...args.map((permutation) =>
        few(
          ...permutation,
          optional(
            few(whitespace, greedyString).map((_, [, text]) => yay(text)),
          ),
        )
      ),
    ),
  ).map((_, [prefix, label, args]) => {
    const remaining = args.length <= 1
      ? args.join(" ")
      : args[args.length - 1] as string;
    if (args.length) args.pop();
    return yay({
      prefix,
      label,
      args,
      remaining,
    } as Command<T>);
  });
}
