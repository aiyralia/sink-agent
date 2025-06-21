/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import {
  all,
  capture,
  few,
  literal,
  many,
  only,
  optional,
  pattern,
  pick,
  range,
  unordered,
} from "~command/constructions.ts";
import {
  command,
  escape,
  identifier,
  quoted,
  string,
  word,
} from "~command/index.ts";
import { infer, ParsingResult, prettify, yay } from "~command/lib.ts";
import {
  $,
  alpha,
  alphanumeric,
  digit,
  greedyString,
  lowercase,
  nat,
  uppercase,
} from "~command/primitives.ts";
import { assertEquals, assertNotEquals } from "jsr:@std/assert";
import { StringStream } from "~root/command/stream.ts";

const assertSuccess = (res: ParsingResult<any>) => {
  if (res.kind === "error") console.log(prettify(res.data));
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

Deno.test("basic literals and identifiers", async (t) => {
  await t.step("empty literal always succeeds", () => {
    compare(literal("")($`anything`), "");
  });

  await t.step(
    "should not fail given congruent input",
    () => assertSuccess(literal("Hello")($`Hello`)),
  );

  await t.step(
    "should fail given incongruent input",
    () => assertFail(literal("Hallo")($`Hello`)),
  );

  await t.step("range works within bounds", () => {
    compare(range("a", "f")($`b`), "b");
    assertFail(range("a", "f")($`z`));
  });

  await t.step("word fails on whitespace", () => {
    assertFail(word($` \t`));
  });

  await t.step("identifier parses valid names", () => {
    compare(identifier($`hello-123_world`), "hello-123_world");
  });
});

Deno.test("few, pick, unordered, optional, many combinators", async (t) => {
  await t.step("few fails if any parser fails", () => {
    assertFail(few("a", "b")($`a c`));
  });

  await t.step("pick backtracks correctly", () => {
    const parser = pick("x", "xabc", "abc");
    compare(parser($`abc`), "abc");
  });

  await t.step("optional succeeds with null on failure", () => {
    compare(optional("nop")($`yop`), null);
  });

  await t.step("many consumes all matches", () => {
    compare(many("a")($`aaaaab`), ["a", "a", "a", "a", "a"]);
  });

  await t.step("unordered succeeds in any order", () => {
    const parser = unordered(literal("a"), literal("b"));
    compare(parser($`ba`), ["a", "b"]);
  });
});

Deno.test("parser.map and next chaining", () => {
  const base = literal("hello");
  const mapped = base.map("mapped", (_, value) => yay(value + "!"));
  compare(mapped($`hello`), "hello!");
  const opt = optional(literal("mayhaps"));
  assertEquals(opt.next?.tag, "mayhaps");
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
  await t.step("greedyString consumes all", () => {
    compare(greedyString($`eat everything`), "eat everything");
  });
});

Deno.test("quoted strings and escapes", async (t) => {
  await t.step("valid escapes", () => {
    compare(escape($`\\n`), "\n");
    compare(escape($`\\t`), "\t");
    compare(escape($`\\r`), "\r");
    compare(escape($`\\"`), `"`);
  });

  await t.step("quoted with escape", () => {
    const q = quoted('"');
    compare(q($`"hello\\nworld"`), "hello\nworld");
  });

  await t.step("mismatched quotes fail", () => {
    assertFail(quoted('"')($`"bad'`));
  });

  await t.step("unescaped quote fails", () => {
    assertFail(all(quoted('"'))($`"bad"stuff"`));
  });

  await t.step("empty quoted string", () => {
    compare(quoted('"')($`""`), "");
  });
});

Deno.test("only", async (t) => {
  await t.step("only fails on leftovers", () => {
    assertFail(only("a")($`a b`));
  });
});

Deno.test("pattern and capture", async (t) => {
  await t.step("pattern matches prefix only", () => {
    compare(pattern(/[a-z]+/)($`abc123`), "abc");
  });

  await t.step("capture gets groups", () => {
    compare(capture(/(\d+)-(\d+)/)($`12-34`), {
      match: "12-34",
      groups: ["12", "34"],
    });
  });

  await t.step("capture fails if no match", () => {
    assertFail(capture(/(\d+)-(\d+)/)($`oops`));
  });
});

Deno.test("StringStream core behavior", async (t) => {
  await t.step("advance and rollback works", () => {
    const s = new StringStream("abc");
    assertEquals(s.advance(), "a");
    s.commit();
    assertEquals(s.advance(), "b");
    s.rollback();
    assertEquals(s.advance(), "b");
  });
  await t.step("lookbehind returns previous", () => {
    const s = new StringStream("abc");
    s.advance();
    s.advance();
    assertEquals(s.lookbehind(1), "b");
    assertEquals(s.lookbehind(2), "a");
  });
});

Deno.test("command parser", async (t) => {
  const cmd = command(
    ["ping", "pong"],
    {
      user: string,
      reason: optional(string),
    },
  );

  await t.step("parses required and optional args", () => {
    const result = cmd($`/ping -user hm -reason "heh" tailing content`);
    compare(result, {
      prefix: "/",
      label: "ping",
      args: {
        user: "hm",
        reason: "heh",
      },
      remaining: "tailing content",
    });
  });

  await t.step("parses only required args", () => {
    const result = cmd($`/ping -user john`);
    compare(result, {
      prefix: "/",
      label: "ping",
      args: {
        user: "john",
        reason: null,
      },
      remaining: "",
    });
  });

  await t.step(
    "fails if required arg missing",
    () => assertFail(cmd($`/ping -reason "uh"`)),
  );

  await t.step("parses other prefix variants", () => {
    for (
      const prefix of ["$", "<@1384657966061326406> "]
    ) {
      const result = cmd($`${prefix}ping -user bleh`);
      compare(result, {
        prefix,
        label: "ping",
        args: {
          user: "bleh",
          reason: null,
        },
        remaining: "",
      });
    }
  });

  await t.step("quoted string values", () => {
    const result = cmd($`/ping -user "john doe" -reason 'foo bar'`);
    compare(result, {
      prefix: "/",
      label: "ping",
      args: {
        user: "john doe",
        reason: "foo bar",
      },
      remaining: "",
    });
  });

  await t.step("trailing unparsed content appears in 'remaining'", () => {
    const result = cmd($`/ping -user meow leftover text`);
    assertSuccess(result);
    compare(result, {
      prefix: "/",
      label: "ping",
      args: {
        user: "meow",
        reason: null,
      },
      remaining: "leftover text",
    });
  });

  await t.step("alias command labels accepted", () => {
    assertSuccess(cmd($`/pong -user meow`));
    assertSuccess(cmd($`/ping -user mrrp`));
  });
});
