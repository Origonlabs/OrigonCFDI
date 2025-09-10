import * as React from 'react';
import * as Raw from '@fluentui/react-icons';

type IconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

const Fallback: IconComponent = (props) => (
  <svg width={24} height={24} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <rect x="4" y="4" width="16" height="16" rx="3" />
  </svg>
);

const R: any = Raw as any;
function pick(name: string): IconComponent {
  const candidates = [
    name,
    `${name}Regular`,
    `${name}24Regular`,
    `${name}20Regular`,
    `${name}28Regular`,
    `${name}16Regular`,
    `${name}Filled`,
    `${name}24Filled`,
    `${name}20Filled`,
    `${name}28Filled`,
    `${name}16Filled`,
  ];
  for (const key of candidates) {
    if (R[key]) return R[key] as IconComponent;
  }
  return Fallback;
}

export const ArrowLeftRegular = pick('ArrowLeft');
export const ArrowRightRegular = pick('ArrowRight');
export const FilterRegular = pick('Filter');
export const ChevronDoubleLeftRegular = pick('ChevronDoubleLeft');
export const ChevronDoubleRightRegular = pick('ChevronDoubleRight');
export const ChevronLeftRegular = pick('ChevronLeft');
export const ChevronRightRegular = pick('ChevronRight');
export const ChevronDownRegular = pick('ChevronDown');
export const ChevronUpRegular = pick('ChevronUp');
export const AddCircleRegular = pick('AddCircle');
export const MoreHorizontalRegular = pick('MoreHorizontal');
export const ArrowClockwiseRegular = pick('ArrowClockwise');
export const DeleteRegular = pick('Delete');
export const DocumentRegular = pick('Document');
export const DocumentSettingsRegular = pick('DocumentSettings');
export const QuestionCircleRegular = pick('QuestionCircle');
export const EditRegular = pick('Edit');
export const ArrowDownloadRegular = pick('ArrowDownload');
export const MailRegular = pick('Mail');
export const AddRegular = pick('Add');
export const DismissCircleRegular = pick('DismissCircle');
export const DismissRegular = pick('Dismiss');
export const EyeRegular = pick('Eye');
export const EyeOffRegular = pick('EyeOff');
export const ArchiveRegular = pick('Archive');
export const StampRegular = pick('Stamp');
export const CheckmarkCircleRegular = pick('CheckmarkCircle');
export const CheckmarkRegular = pick('Checkmark');
export const ErrorCircleRegular = pick('ErrorCircle');
export const WarningRegular = pick('Warning');
export const CalendarRegular = pick('Calendar');
export const CreditCardRegular = pick('CreditCard');
export const WalletRegular = pick('Wallet');
export const BuildingBankRegular = pick('BuildingBank');
export const CheckmarkCircleFilled = pick('CheckmarkCircle');
export const InfoRegular = pick('Info');
export const ReceiptRegular = pick('Receipt');
export const HomeRegular = pick('Home');
export const PeopleRegular = pick('People');
export const DatabaseRegular = pick('Database');
export const ChatRegular = pick('Chat');
export const SettingsRegular = pick('Settings');
export const GlobeRegular = pick('Globe');
export const AlertRegular = pick('Alert');
export const ShoppingBagRegular = pick('ShoppingBag');
export const BotRegular = pick('Bot');
export const PersonRegular = pick('Person');
export const SignOutRegular = pick('SignOut');
export const RibbonStarRegular = pick('RibbonStar');
export const ClockRegular = pick('Clock');
export const AlertCircleRegular = pick('AlertCircle');
export const CircleRegular = pick('Circle');
export const WeatherSunnyRegular = pick('WeatherSunny');
export const WeatherMoonRegular = pick('WeatherMoon');

export default {} as any;

