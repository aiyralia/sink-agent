/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { literal } from "./constructions.ts";
import { StringStream } from "./stream.ts";

export type Input = StringStream;

export type Tagged<Tag extends string, T> =
  & { kind: Tag }
  & (T extends never ? {} : { data: T });

export type Parse<T> = (input: Input) => ParsingResult<T>;

export type Parser<T> = Parse<T> & {
  map<U>(fn: (input: Input, value: T) => ParsingResult<U>): Parser<U>;
};

export type Lexer<T> = Parse<T> | Parser<T> | string;

export type ParsingResult<T> =
  | Tagged<"success", T>
  | Tagged<"error", ParsingError>;

export type ParsingError =
  | Tagged<"expected_eoi", [number, string]>
  | Tagged<"unexpected_eoi", [number, string]>
  | Tagged<"unexpected_symbol", [number, string, string]>;

export const yay = <T>(
  data: T,
): ParsingResult<T> => ({ kind: "success", data } as ParsingResult<T>);

export const boo = <K extends ParsingError["kind"]>(
  kind: K,
  data: Extract<ParsingError, { kind: K }> extends { data: infer D } ? D
    : never,
) =>
  ({
    kind: "error",
    data: { kind, data } as any as Extract<ParsingError, { kind: K }>,
  }) as ParsingResult<never>;

export function expectedEoi(
  rcv: Input,
) {
  return boo("expected_eoi", [
    rcv.position.offset,
    rcv.tail(),
  ]);
}

export function unexpectedEoi(
  rcv: Input,
  expected: string,
) {
  return boo("unexpected_eoi", [
    rcv.position.offset,
    expected,
  ]);
}

export function unexpectedSymbol(
  rcv: Input,
  expected: string,
) {
  return boo("unexpected_symbol", [
    rcv.position.offset,
    rcv.lookbehind(1) ?? "<unknown>",
    expected,
  ]);
}

export function parser<T extends string>(lex: T): Parser<T>;
export function parser<T>(lex: Lexer<T>): Parser<T>;

export function parser<T>(lex: Lexer<T>): Parser<T> {
  if (typeof lex === "string") return literal(lex) as Parser<T>;
  if ("map" in lex) return lex;

  const parent = lex as Parser<T>;
  parent.map = <U>(
    fn: (input: Input, value: T) => ParsingResult<U>,
  ): Parser<U> =>
    parser((src: Input) => {
      const result = parent(src);
      if (infer("success")(result)) {
        return fn(src, result.data as T);
      }
      return result as ParsingResult<U>;
    });

  return parent;
}

export function infer<K extends string, U>(
  kind: K,
): (value: Tagged<K, U> | Tagged<any, any>) => value is Tagged<K, U> {
  return (value): value is Tagged<K, U> => value.kind === kind;
}

export function prettify(err: ParsingError): string {
  if (infer("expected_eoi")(err)) {
    const [index, got] = err.data;
    return `Expected end of input at index ${index}, got ${got}`;
  }
  if (infer("unexpected_eoi")(err)) {
    const [index, expected] = err.data;
    return `Unexpected end of input at index ${index}, expected ${expected}`;
  }
  if (infer("unexpected_symbol")(err)) {
    const [index, got, expected] = err.data;
    return `Unexpected symbol '${got}' at index ${index}, expected ${expected}`;
  }
  return "unreachable // unknown";
}
