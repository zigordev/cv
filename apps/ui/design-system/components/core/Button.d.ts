import * as React from 'react';

export interface ButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /** Render as another element — e.g. next/link for an action that
   * navigates. Defaults to 'button'. */
  as?: React.ElementType;
  type?: string;
  /** Passed through when `as` is a link component. */
  href?: string;
  /** Anchor attributes, valid when `as` renders a link. The runtime already
   *  spreads unknown props onto the element; these make that usable from
   *  TypeScript instead of only by accident. */
  download?: string | boolean;
  target?: string;
  rel?: string;
  /** Visual treatment. `danger` for destructive actions. */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  /** `icon` is a square button — pair with a single glyph child. */
  size?: 'sm' | 'md' | 'lg' | 'icon';
  /** Swaps the leading icon for a spinner and disables the button. */
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export declare function Button(props: ButtonProps): JSX.Element;
