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
  }, "try");

export function pick<T extends string[]>(...lexers: T): Parser<T[number]>;
export function pick<T extends any[]>(
  ...lexers: { [K in keyof T]: Lexer<T[K]> }
): Parser<T[number]>;
export function pick(...lexers: any[]): any {
  return construct((stream) => {
    for (const lexer of lexers) {
      const attempt = try_(lexer)(stream);
      if (infer("success")(attempt)) {
        return yay(attempt.data);
      }
    }
    return unexpectedEoi(stream, "<pick>");
  }, "pick");
}

export function few<T extends string[]>(...lexers: T): Parser<T>;
export function few<T extends any[]>(
  ...lexers: { [K in keyof T]: Lexer<T[K]> }
): Parser<T>;
export function few(...lexers: any[]): any {
  return construct((stream) => {
    const output: unknown[] = [];
    for (const lexer of lexers) {
      if (!lexer) {
        console.log(lexers);
        break;
      }
    }
    for (const lexer of lexers) {
      if (!lexer) continue;
      const result = construct(lexer)(stream);
      if (!infer("success")(result)) {
        return result as ParsingResult<never>;
      }
      output.push(result.data);
    }
    return yay(output);
  }, "few");
}

export function unordered<T extends string[]>(...lexers: T): Parser<T>;
export function unordered<T extends any[]>(
  ...lexers: { [K in keyof T]: Lexer<T[K]> }
): Parser<T>;
export function unordered(...lexers: any[]): any {
  return construct((stream) => {
    const parsers = lexers.map((lx) => construct(lx));
    const output = new Array(parsers.length);
    const parsed = new Set<number>();

    stream.commit();

    outer: for (let attempt = 0; attempt < parsers.length; attempt++) {
      for (let index = 0; index < parsers.length; index++) {
        if (parsed.has(index)) continue;
        stream.commit();
        const result = construct(parsers[index])(stream);
        if (infer("success")(result)) {
          output[index] = result.data;
          parsed.add(index);
          stream.finish();
          continue outer;
        }
        stream.rollback();
      }
      stream.rollback();
      return unexpectedSymbol(
        stream,
        `expected one of the remaining patterns (unordered few)`,
      );
    }
    stream.finish();
    return yay(output);
  }, "unordered");
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
  }, "many");
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
  }, "only");
}

export function sequence<T>(lexer: Lexer<T>): Parser<T[]> {
  return few(lexer, many(lexer)).map("sequence", (_, [a, b]) => yay([a, ...b]));
}

export function literal<T extends string>(input: T): Parser<T> {
  return construct((stream) => {
    for (const char of input) {
      if (stream.advance() !== char) {
        return unexpectedSymbol(stream, `${char} (full string: ${input})`);
      }
    }
    return yay(input);
  }, input);
}

export function range(start: string, end: string): Parser<string> {
  return construct((stream) => {
    const input = stream.advance();
    if (!input || input < start[0] || input > end[0]) {
      return unexpectedSymbol(stream, `${input} [${start}-${end}]`);
    }
    return yay(input!);
  }, "range");
}

export function optional<T>(lexer: Lexer<T>): Parser<T | null> {
  const parser = construct((stream) => {
    const attempt = try_(lexer)(stream);
    if (infer("success")(attempt)) {
      return attempt as ParsingResult<T>;
    }
    return yay(null);
  }, "optional");
  parser.next = construct(lexer);
  return parser;
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
  }, "pattern");
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
  }, "capture");
}
