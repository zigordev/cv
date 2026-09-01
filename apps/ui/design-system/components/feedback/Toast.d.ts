import * as React from 'react';

export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  kind?: 'info' | 'success' | 'warning' | 'danger';
  children: React.ReactNode;
  onDismiss?: () => void;
}

export interface ToastRegionProps {
  children: React.ReactNode;
}

export declare function Toast(props: ToastProps): JSX.Element;
/** Fixed bottom-right stack container — render your Toast list inside it once, at the app root. */
export declare function ToastRegion(props: ToastRegionProps): JSX.Element;
