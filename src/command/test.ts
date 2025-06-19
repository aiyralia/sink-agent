/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { parser } from "./lib.ts";
import { stream } from "./primitives.ts";
import { assertEquals, assertNotEquals } from "jsr:@std/assert";

Deno.test("ident combinator success", () => {
  const input = stream("id34833gty");
  const parse = parser("id34833gty");
  assertEquals(parse(input).kind, "success");
});

Deno.test("ident combinator fail", () => {
  const input = stream("id34833gty");
  const parse = parser("id34832gty");
  assertNotEquals(parse(input).kind, "success");
});
