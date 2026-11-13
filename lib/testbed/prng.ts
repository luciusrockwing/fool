export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = (Math.trunc(seed) ^ 0x9e3779b9) >>> 0;
    if (this.state === 0) this.state = 0x6d2b79f5;
  }

  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) {
      throw new Error('Cannot pick from empty array');
    }
    return items[Math.floor(this.next() * items.length)];
  }

  digits(length: number): string {
    let out = '';
    for (let i = 0; i < length; i++) {
      out += String(this.int(0, 9));
    }
    return out;
  }

  hex(length: number): string {
    const chars = '0123456789abcdef';
    let out = '';
    for (let i = 0; i < length; i++) {
      out += chars[this.int(0, chars.length - 1)];
    }
    return out;
  }
}
