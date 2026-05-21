export const Colors = {
  white: 0xffffffff,
  black: 0x000000ff,
} as const;

export type ColorValue = (typeof Colors)[keyof typeof Colors];
