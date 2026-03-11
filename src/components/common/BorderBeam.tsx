import { ReactNode } from "react";

interface BorderBeamProps {
  size: number;
  durationSeconds: number;
  colorFromToken: string;
  colorToToken: string;
  width?: number;
  radius?: number;
  anchor?: number;
  className?: string;
  children?: ReactNode;
}

const resolveColorToken = (value: string): string => {
  const trimmedValue = value.trim();
  const match = trimmedValue.match(/^([a-zA-Z][a-zA-Z0-9-]*?)(?:[-/](\d{1,3}))?$/);

  if (!match) {
    return "hsl(var(--primary))";
  }

  const [, colorToken, alphaToken] = match;
  if (!alphaToken) {
    return `hsl(var(--${colorToken}))`;
  }

  const alpha = Math.min(Math.max(Number(alphaToken), 0), 100) / 100;
  return `hsl(var(--${colorToken}) / ${alpha})`;
};

export const BorderBeam: React.FC<BorderBeamProps> = ({
  size,
  durationSeconds,
  colorFromToken,
  colorToToken,
  width = 1.5,
  radius = 8,
  anchor = 90,
  className,
  children,
}) => {
  const resolvedColorFrom = resolveColorToken(colorFromToken);
  const resolvedColorTo = resolveColorToken(colorToToken);

  return (
    <div style={{ position: "relative", borderRadius: `${radius}px`, overflow: "hidden" }}>
      {children}
      <>
        <style>{`
        .border-beam-style::after {
          content: "";
          position: absolute;
          aspect-ratio: 1/1;
          width: ${size}px;
          background: linear-gradient(to left, ${resolvedColorFrom}, ${resolvedColorTo}, transparent);
          offset-anchor: ${anchor}% 50%;
          offset-path: rect(0 auto auto 0 round ${size}px);
          animation: border-beam var(--duration) infinite linear;
          will-change: transform;
        }
      `}</style>
        <div
          className={`absolute inset-0 pointer-events-none rounded-[inherit] animate-border-beam border-beam-style ${className}`}
          style={
            {
              "--duration": `${durationSeconds}s`,
              border: `${width}px solid transparent`,
              WebkitMask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
              mask: "linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "source-out",
              maskComposite: "exclude",
            } as React.CSSProperties
          }
        />
      </>
    </div>
  );
};
