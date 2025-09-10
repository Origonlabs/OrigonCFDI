import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function createIcon(name: string) {
  const Icon: React.FC<IconProps> = ({ size = 24, className, ...props }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label={name}
      className={className}
      {...props}
    >
      <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" />
    </svg>
  );
  Icon.displayName = name;
  return Icon;
}

export const X = createIcon("X");
export const Check = createIcon("Check");
export const ChevronDown = createIcon("ChevronDown");
export const ChevronUp = createIcon("ChevronUp");
export const Circle = createIcon("Circle");
export const ChevronRight = createIcon("ChevronRight");
export const Sun = createIcon("Sun");
export const Moon = createIcon("Moon");

export default {} as any;
