import React from "react";
import BackButton from "./BackButton";
import SidebarToggleButton from "./SidebarToggleButton";

interface HeaderTitleBlockProps {
  onBack?: () => void;
  backButtonClassName?: string;
  backIconClassName?: string;
  backTitle?: string;
  backAriaLabel?: string;
  onOpenSidebar?: () => void;
  sidebarButtonClassName?: string;
  sidebarIconClassName?: string;
  sidebarTitle?: string;
  sidebarAriaLabel?: string;
  containerClassName?: string;
  titleWrapperClassName?: string;
  titleNode?: React.ReactNode;
  metaNode?: React.ReactNode;
}

export default function HeaderTitleBlock({
  onBack,
  backButtonClassName,
  backIconClassName,
  backTitle,
  backAriaLabel,
  onOpenSidebar,
  sidebarButtonClassName,
  sidebarIconClassName,
  sidebarTitle,
  sidebarAriaLabel,
  containerClassName,
  titleWrapperClassName,
  titleNode,
  metaNode
}: HeaderTitleBlockProps): React.JSX.Element {
  return (
    <div className={containerClassName}>
      {onBack && (
        <BackButton
          onClick={onBack}
          className={backButtonClassName}
          iconClassName={backIconClassName}
          title={backTitle}
          ariaLabel={backAriaLabel}
        />
      )}
      {onOpenSidebar && (
        <SidebarToggleButton
          onOpen={onOpenSidebar}
          className={sidebarButtonClassName}
          iconClassName={sidebarIconClassName}
          title={sidebarTitle}
          ariaLabel={sidebarAriaLabel}
        />
      )}
      <div className={titleWrapperClassName}>
        {titleNode}
        {metaNode}
      </div>
    </div>
  );
}
