const HEADER = `/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */\n\n`;

const encoder = new TextEncoder();
const PATTERN = /^\/\*\*[\s\S]*?\*\/\n*/;

function has(content: string): boolean {
  return content.trim().startsWith("/**");
}

function shouldReplace(text: string): boolean {
  const match = text.match(PATTERN);
  if (!match) return false;
  const header = match[0];
  return header.includes("SPDX-License-Identifier") &&
    header.toLowerCase().includes("aiyralia");
}

async function apply(filePath: string) {
  const text = await Deno.readTextFile(filePath);
  if (!has(text)) {
    const newText = HEADER + text;
    await Deno.writeFile(filePath, encoder.encode(newText));
    console.log(`+ ${filePath} (header added)`);
  }
  if (shouldReplace(text)) {
    const replaced = text.replace(PATTERN, HEADER);
    await Deno.writeFile(filePath, encoder.encode(replaced));
    console.log(`~ ${filePath} (replaced header)`);
    return;
  }
  console.log(`✓ ${filePath} (preserved)`);
}

async function walk(loc: string) {
  for await (const entry of Deno.readDir(loc)) {
    const fullPath = `${loc}/${entry.name}`;
    if (entry.isDirectory) {
      await walk(fullPath);
    } else if (entry.isFile && entry.name.endsWith(".ts")) {
      await apply(fullPath);
    }
  }
}

await walk("./src");
