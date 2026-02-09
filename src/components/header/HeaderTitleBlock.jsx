import React from "react";
import BackButton from "./BackButton";
import SidebarToggleButton from "./SidebarToggleButton";

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
}) {
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
