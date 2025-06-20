import { few, literal } from "./constructions.ts";
import { boo, yay } from "./lib.ts";
import { nat } from "./primitives.ts";

export const snowflake = nat.map((_, value) =>
  value <= 9223372036854775807n
    ? yay(value)
    : boo("custom", "Snowflake is out of bounds")
);

export const mentions = {
  user: few(literal("<@"), snowflake, literal(">")),
  channel: few(literal("<#"), snowflake, literal(">")),
};
