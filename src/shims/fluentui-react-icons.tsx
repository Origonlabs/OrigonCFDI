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
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z" />
    </svg>
  );
  Icon.displayName = name;
  return Icon;
}

export const ArrowLeftRegular = createIcon("ArrowLeftRegular");
export const ArrowRightRegular = createIcon("ArrowRightRegular");
export const FilterRegular = createIcon("FilterRegular");
export const ChevronDoubleLeftRegular = createIcon("ChevronDoubleLeftRegular");
export const ChevronDoubleRightRegular = createIcon("ChevronDoubleRightRegular");
export const ChevronLeftRegular = createIcon("ChevronLeftRegular");
export const ChevronRightRegular = createIcon("ChevronRightRegular");
export const ChevronDownRegular = createIcon("ChevronDownRegular");
export const AddCircleRegular = createIcon("AddCircleRegular");
export const MoreHorizontalRegular = createIcon("MoreHorizontalRegular");
export const ArrowClockwiseRegular = createIcon("ArrowClockwiseRegular");
export const DeleteRegular = createIcon("DeleteRegular");
export const DocumentRegular = createIcon("DocumentRegular");
export const QuestionCircleRegular = createIcon("QuestionCircleRegular");
export const EditRegular = createIcon("EditRegular");
export const ArrowDownloadRegular = createIcon("ArrowDownloadRegular");
export const MailRegular = createIcon("MailRegular");
export const AddRegular = createIcon("AddRegular");
export const DismissCircleRegular = createIcon("DismissCircleRegular");
export const EyeRegular = createIcon("EyeRegular");
export const ArchiveRegular = createIcon("ArchiveRegular");
export const StampRegular = createIcon("StampRegular");
export const CheckmarkCircleRegular = createIcon("CheckmarkCircleRegular");
export const CheckmarkRegular = createIcon("CheckmarkRegular");
export const ErrorCircleRegular = createIcon("ErrorCircleRegular");
export const CalendarRegular = createIcon("CalendarRegular");
export const CreditCardRegular = createIcon("CreditCardRegular");
export const WalletRegular = createIcon("WalletRegular");
export const BuildingBankRegular = createIcon("BuildingBankRegular");
export const CheckmarkCircleFilled = createIcon("CheckmarkCircleFilled");
export const InfoRegular = createIcon("InfoRegular");
export const ReceiptRegular = createIcon("ReceiptRegular");

export default {} as any;
