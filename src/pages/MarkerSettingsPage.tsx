import React from "react";
import { Navigate } from "react-router-dom";

/** Keep old marker-settings URLs working while rendering the marker editor as a normal settings tab. */
export default function MarkerSettingsPage(): React.JSX.Element {
  return <Navigate to="/settings?tab=markers" replace />;
}
