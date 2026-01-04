"use client";

import * as React from "react";

export interface IconProps {
  name: string;
  className?: string;
  fill?: boolean;
}

export const Icon: React.FC<IconProps> = ({
  name,
  className = "",
  fill = false,
}) => {
  return (
    <span
      className={className}
      aria-hidden="true"
      style={{
        fontFamily: '"Material Symbols Outlined"',
        fontWeight: 400,
        fontStyle: "normal",
        fontSize: 24,
        lineHeight: 1,
        display: "inline-block",
        whiteSpace: "nowrap",
        wordWrap: "normal",
        direction: "ltr",
        WebkitFontSmoothing: "antialiased",
        fontVariationSettings: fill
          ? '"FILL" 1, "wght" 400, "GRAD" 0, "opsz" 24'
          : '"FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24',
      }}
    >
      {name}
    </span>
  );
};

