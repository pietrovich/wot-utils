export const Colors = {
  white: 0xffffffff,
  black: 0x000000ff,
  beige: 0xF8BA72ff,
  yellow: 0xEBD705ff,
} as const;

export type ColorValue = (typeof Colors)[keyof typeof Colors];
