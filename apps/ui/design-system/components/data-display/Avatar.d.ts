import * as React from 'react';

export interface AvatarProps {
  name?: string;
  src?: string;
  /** Named sizes or a raw px number. */
  size?: 'sm' | 'md' | 'lg' | number;
  className?: string;
  style?: React.CSSProperties;
}

export declare function Avatar(props: AvatarProps): JSX.Element;
