export function loadEnvironmentVariables<Ts extends readonly string[]>(
  ...keys: Ts
): Record<Ts[number], string> {
  const output = {} as Record<Ts[number], string>;
  keys.forEach((key) => {
    const value = Deno.env.get(key);
    if (!value) throw new Error(`env.${key as string} isn't defined`);
    output[key as Ts[number]] = value;
  });
  return output;
}

export default loadEnvironmentVariables(
  "DISCORD_BOT_TOKEN",
  "DISCORD_APPLICATION_ID",
);
