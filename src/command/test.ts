/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { capture, many, only, pattern } from "./constructions.ts";
import { infer, parser, ParsingResult } from "./lib.ts";
import {
  $,
  alpha,
  alphanumeric,
  digit,
  lowercase,
  nat,
  uppercase,
} from "./primitives.ts";
import { assertEquals, assertNotEquals } from "jsr:@std/assert";

const assertSuccess = (res: ParsingResult<any>) => {
  if (res.kind !== "success") console.log(res);
  assertEquals(res.kind, "success");
};
const assertFail = (res: ParsingResult<any>) => {
  if (res.kind === "success") console.log(res);
  assertNotEquals(res.kind, "success");
};
const compare = <T>(res: ParsingResult<T>, data: T) => {
  assertSuccess(res);
  if (infer("success")(res)) {
    assertEquals(res.data, data);
  }
};
const assertSuccessAll = (res: ParsingResult<any>[]) => res.map(assertSuccess);
const assertFailAll = (res: ParsingResult<any>[]) => res.map(assertFail);

Deno.test("ident combinator", async (t) => {
  await t.step(
    "should not fail given congruent input",
    () => assertSuccess(parser("Hello")($`Hello`)),
  );
  await t.step(
    "should fail given incongruent input",
    () => assertFail(parser("Hallo")($`Hello`)),
  );
});

Deno.test("primitives", async (t) => {
  for (const input of [...Array(10).keys()]) {
    await t.step(
      "digit should succeed when given: " + input,
      () => assertSuccess(digit($`${input}`)),
    );
  }
  for (
    const input of [...Array(26)].map((_, i) => String.fromCharCode(97 + i))
  ) {
    await t.step(
      "lowercase should succeed when given: " + input,
      () => assertSuccess(lowercase($`${input}`)),
    );
  }
  for (
    const input of [...Array(26)].map((_, i) => String.fromCharCode(65 + i))
  ) {
    await t.step(
      "uppercase should succeed when given: " + input,
      () => assertSuccess(uppercase($`${input}`)),
    );
  }
  await t.step(
    "digit should fail when given out of bounds input",
    () => assertFail(digit($`e`)),
  );
  await t.step(
    "lowercase should fail when given out of bounds input",
    () => assertFail(lowercase($`A`)),
  );
  await t.step(
    "nat should accept any natural number, leading input should be discarded",
    () => {
      assertFail(nat($`-1000`));
      compare(nat($`10002 trash`), 10002);
    },
  );
  await t.step(
    "'only' but reject any leading input",
    () => {
      assertSuccess(only(nat)($`1000`));
      assertFail(only(nat)($`1000 :3`));
    },
  );
  await t.step("alpha should only accept a-Z", () => {
    assertSuccess(alpha($`a`));
    assertSuccess(alpha($`A`));
    assertFail(alpha($`0`));
    assertFail(alpha($`_`));
  });
  await t.step("alphanumeric should accept [a-Z0-9]", () => {
    assertSuccess(alphanumeric($`a`));
    assertSuccess(alphanumeric($`A`));
    assertSuccess(alphanumeric($`0`));
    assertFail(alphanumeric($`_`));
  });
  await t.step("greedy alphanumeric", () => {
    assertSuccess(many(alphanumeric)($`Hello420`));
    assertFail(only(many(alphanumeric))($`Hello!`));
  });
  await t.step("regex patterns", () => {
    compare(pattern(/[a-zA-Z_][a-zA-Z0-9_]*/)($`_World16`), "_World16");
    compare(capture(/(\d{4})-(\d{2})-(\d{2})/)($`1984-01-01`), {
      groups: ["1984", "01", "01"],
      match: "1984-01-01",
    });
    assertFail(only(capture(/(\d{4})-(\d{2})-(\d{2})/))($`1984-01-01 bruh`));
    assertFail(pattern(/[a-zA-Z_][a-zA-Z0-9_]*/)($`!_Wo.`));
    assertFail(only(pattern(/[a-zA-Z_][a-zA-Z0-9_]*/))($`_World16!`));
  });
});
