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
  parser,
  ParsingResult,
  unexpectedEoi,
  unexpectedSymbol,
  yay,
} from "./lib.ts";

export const consumeWhile = (predicate: (char: string) => boolean) =>
  parser((stream) => {
    while (true) {
      stream.commit();
      const input = stream.advance();
      if (!input || predicate(input)) {
        stream.rollback();
        break;
      }
      stream.finish();
    }
    return yay(null);
  });

export const skipWhitespaces = consumeWhile((x) => x.trim() !== "");

export const construct = <U>(
  fn: (input: Input) => ParsingResult<U>,
): Parser<U> => parser(skipWhitespaces.map(fn));

const try_ = <T>(lex: Lexer<T>) =>
  construct((stream) => {
    stream.commit();
    const result = parser(lex)(stream);
    if (infer("success")(result)) {
      stream.finish();
    } else {
      stream.rollback();
    }
    return result;
  });

export const pick = <T extends any[]>(
  ...lexers: { [K in keyof T]: Lexer<T[K]> }
): Parser<T[number]> =>
  construct((stream) => {
    for (const lexer of lexers) {
      const attempt = try_(lexer)(stream);
      if (infer("success")(attempt)) {
        return yay(attempt as T[number]);
      }
    }
    return unexpectedEoi(stream, "<pick>");
  });

export const few = <T extends any[]>(
  ...lexers: { [K in keyof T]: Lexer<T[K]> }
): Parser<T> =>
  construct((stream) => {
    const output: unknown[] = [];
    for (const lexer of lexers) {
      const result = parser(lexer)(stream);
      if (!infer("success")(result)) {
        return result as ParsingResult<never>;
      }
      output.push(result.data);
    }
    return yay(output as T);
  });

export const many = <T>(lexer: Lexer<T>): Parser<T[]> =>
  construct((stream) => {
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

export const only = <T>(lexer: Lexer<T>) =>
  construct((stream) => {
    const attempt = try_(lexer)(stream);
    if (!infer("success")(attempt)) {
      return attempt as ParsingResult<never>;
    }
    if (stream.tail()) {
      return expectedEoi(stream);
    }
    return yay(attempt.data);
  });

export const sequence = <T>(lexer: Lexer<T>): Parser<T[]> =>
  few(lexer, many(lexer)).map((_, [a, b]) => yay([a, ...b]));

export const literal = <T extends string>(input: T): Parser<T> =>
  construct((stream) => {
    for (const char of input) {
      if (stream.advance() !== char) {
        return unexpectedSymbol(stream, `${char} (full string: ${input})`);
      }
    }
    return yay(input);
  });

export const range = (start: string, end: string) =>
  construct((stream) => {
    const input = stream.advance();
    if (!input || input < start[0] || input > end[0]) {
      return unexpectedSymbol(stream, `${input} [${start}-${end}]`);
    }
    return yay(input!);
  });

export const optional = <T>(lexer: Lexer<T>): Parser<T | null> =>
  construct((stream) => {
    const attempt = try_(lexer)(stream);
    if (infer("success")(attempt)) {
      return attempt as ParsingResult<T>;
    }
    return yay(null);
  });
