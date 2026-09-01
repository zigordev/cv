import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** "This is wrong." Danger border plus aria-invalid, so it is announced. */
  invalid?: boolean;
  /** "This still needs you." Warning border for a required field that has
   *  not been filled — worth pointing at, but not an error yet, so it is
   *  deliberately not announced as one. Ignored when `invalid`. */
  attention?: boolean;
}

export declare function Textarea(props: TextareaProps): JSX.Element;
