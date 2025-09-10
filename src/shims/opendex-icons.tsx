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
      <circle cx="12" cy="12" r="10" fill="currentColor" />
    </svg>
  );
  Icon.displayName = name;
  return Icon;
}

export const MailRegular = createIcon("MailRegular");
export const WeatherSunnyRegular = createIcon("WeatherSunnyRegular");
export const WeatherMoonRegular = createIcon("WeatherMoonRegular");
export const DismissRegular = createIcon("DismissRegular");
export const CheckmarkRegular = createIcon("CheckmarkRegular");
export const ChevronRightRegular = createIcon("ChevronRightRegular");
export const CircleRegular = createIcon("CircleRegular");
export const ChevronLeftRegular = createIcon("ChevronLeftRegular");
export const ChevronDownRegular = createIcon("ChevronDownRegular");
export const AddCircleRegular = createIcon("AddCircleRegular");
export const ArrowClockwiseRegular = createIcon("ArrowClockwiseRegular");
export const DeleteRegular = createIcon("DeleteRegular");
export const EditRegular = createIcon("EditRegular");
export const CheckmarkCircleRegular = createIcon("CheckmarkCircleRegular");
export const DismissCircleRegular = createIcon("DismissCircleRegular");
export const WarningRegular = createIcon("WarningRegular");
export const ArrowDownloadRegular = createIcon("ArrowDownloadRegular");
export const AlertCircleRegular = createIcon("AlertCircleRegular");
export const InfoRegular = createIcon("InfoRegular");
export const MoreHorizontalRegular = createIcon("MoreHorizontalRegular");
export const ClockRegular = createIcon("ClockRegular");
export const HomeRegular = createIcon("HomeRegular");
export const DocumentRegular = createIcon("DocumentRegular");
export const CreditCardRegular = createIcon("CreditCardRegular");
export const PeopleRegular = createIcon("PeopleRegular");
export const DocumentSettingsRegular = createIcon("DocumentSettingsRegular");
export const DatabaseRegular = createIcon("DatabaseRegular");
export const ChatRegular = createIcon("ChatRegular");
export const SettingsRegular = createIcon("SettingsRegular");
export const GlobeRegular = createIcon("GlobeRegular");
export const AlertRegular = createIcon("AlertRegular");
export const ShoppingBagRegular = createIcon("ShoppingBagRegular");
export const BotRegular = createIcon("BotRegular");
export const PersonRegular = createIcon("PersonRegular");
export const SignOutRegular = createIcon("SignOutRegular");
export const RibbonStarRegular = createIcon("RibbonStarRegular");
export const EyeRegular = createIcon("EyeRegular");
export const EyeOffRegular = createIcon("EyeOffRegular");

// Export a default IconBase placeholder for compatibility if ever imported
const IconBase = ({ children }: { children?: React.ReactNode }) => <>{children}</>;
export default IconBase;

