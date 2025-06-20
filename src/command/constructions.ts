/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  expectedEoi,
  infer,
  Input,
  Lexer,
  Parser,
  parser as construct,
  ParsingResult,
  unexpectedEoi,
  unexpectedSymbol,
  yay,
} from "./lib.ts";

export const whitespace = pick(" ", "\t", "\r", "\n");

const try_ = <T>(lex: Lexer<T>) =>
  construct((stream) => {
    stream.commit();
    const result = construct(lex)(stream);
    if (infer("success")(result)) {
      stream.finish();
    } else {
      stream.rollback();
    }
    return result;
  });

export function pick<T extends string[]>(...lexers: T): Parser<T[number]>;
export function pick<T extends any[]>(
  ...lexers: { [K in keyof T]: Lexer<T[K]> }
): Parser<T[number]>;
export function pick(...lexers: any[]): any {
  return construct((stream) => {
    for (const lexer of lexers) {
      const attempt = try_(lexer)(stream);
      if (infer("success")(attempt)) {
        return yay(attempt);
      }
    }
    return unexpectedEoi(stream, "<pick>");
  });
}

export function few<T extends string[]>(...lexers: T): Parser<T>;
export function few<T extends any[]>(
  ...lexers: { [K in keyof T]: Lexer<T[K]> }
): Parser<T>;
export function few(...lexers: any[]): any {
  return construct((stream) => {
    const output: unknown[] = [];
    for (const lexer of lexers) {
      const result = construct(lexer)(stream);
      if (!infer("success")(result)) {
        return result as ParsingResult<never>;
      }
      output.push(result.data);
    }
    return yay(output);
  });
}

export function many<T>(lexer: Lexer<T>): Parser<T[]> {
  return construct((stream) => {
    const output: T[] = [];
    while (true) {
      const attempt = try_(lexer)(stream);
      if (!infer("success")(attempt)) {
        break;
      }
      output.push(attempt.data as T);
    }
    return yay(output);
  });
}

export function only<T>(lexer: Lexer<T>): Parser<T> {
  return construct((stream) => {
    const attempt = try_(lexer)(stream);
    if (!infer("success")(attempt)) {
      return attempt as ParsingResult<never>;
    }
    if (stream.tail()) {
      return expectedEoi(stream);
    }
    return yay(attempt.data as T);
  });
}

export function sequence<T>(lexer: Lexer<T>): Parser<T[]> {
  return few(lexer, many(lexer)).map((_, [a, b]) => yay([a, ...b]));
}

export function literal<T extends string>(input: T): Parser<T> {
  return construct((stream) => {
    for (const char of input) {
      if (stream.advance() !== char) {
        return unexpectedSymbol(stream, `${char} (full string: ${input})`);
      }
    }
    return yay(input);
  });
}

export function range(start: string, end: string): Parser<string> {
  return construct((stream) => {
    const input = stream.advance();
    if (!input || input < start[0] || input > end[0]) {
      return unexpectedSymbol(stream, `${input} [${start}-${end}]`);
    }
    return yay(input!);
  });
}

export function optional<T>(lexer: Lexer<T>): Parser<T | null> {
  return construct((stream) => {
    const attempt = try_(lexer)(stream);
    if (infer("success")(attempt)) {
      return attempt as ParsingResult<T>;
    }
    return yay(null);
  });
}

export function pattern(pattern: RegExp): Parser<string> {
  return construct((stream: Input) => {
    const remaining = stream.tail();
    const anchoredPattern = new RegExp(`^(${pattern.source})`, pattern.flags);
    const match = remaining.match(anchoredPattern);

    if (!match) {
      return unexpectedSymbol(
        stream,
        `pattern /${pattern.source}/${pattern.flags}, got ${remaining}`,
      );
    }
    for (let i = 0; i < match[0].length; i++) stream.advance();

    return yay(match[0]);
  });
}

export function capture(
  pattern: RegExp,
): Parser<{ match: string; groups: string[] }> {
  return construct((stream: Input) => {
    const remaining = stream.tail();
    const anchoredPattern = new RegExp(`^(?:${pattern.source})`, pattern.flags);
    const object = remaining.match(anchoredPattern);

    if (!object) {
      return unexpectedSymbol(
        stream,
        `pattern /${pattern.source}/${pattern.flags}, got ${remaining}`,
      );
    }

    const [match, ...groups] = object;
    for (let i = 0; i < match[0].length; i++) stream.advance();

    return yay({ match, groups });
  });
}
