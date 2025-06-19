/**
 * sink-agent, a ~~kitchen~~ bathroom sink Discord bot
 * Copyright (c) 2025 aiyralia
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

export interface Position {
  row: number;
  column: number;
  offset: number;
}

export interface Stream<T> {
  readonly position: Position;

  advance(): T | null;

  lookbehind(offset: number): T | null;

  commit(): void;

  finish(): void;

  rollback(): void;
}

export class StringStream implements Stream<string> {
  position: Position = { row: 0, column: 0, offset: 0 };

  private readonly history: Position[] = [];

  constructor(private readonly input: string) {}

  advance(): string | null {
    if (this.position.offset === this.input.length) return null;
    const match = this.input[this.position.offset++];
    if (match == "\n") {
      this.position.row += 1;
      this.position.column = 1;
    } else {
      this.position.column++;
    }
    return match;
  }

  lookbehind(offset: number): string | null {
    return this.input[this.position.offset - offset];
  }

  commit(): void {
    this.history.push({ ...this.position });
  }

  finish(): void {
    this.history.pop();
  }

  rollback(): void {
    this.position = this.history.pop()!;
  }

  tail(): string {
    return this.input.slice(this.position.offset);
  }
}
