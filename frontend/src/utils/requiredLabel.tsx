import React from 'react';

export const requiredLabel = (text: string, className: string): React.ReactElement => (
  <span>
    {text}
    <span className={className} aria-hidden="true">
      *
    </span>
  </span>
);
