# Legacy homepage

Presentation snapshot from `9e10f84` (before the Fable redesign). Only presentation modules and their import adapters are isolated here; data loading, filtering, navigation rules and API clients remain shared with the current application. Imports point to the current implementation whenever no legacy presentation is needed.

Keep fixes to data/security behavior in shared modules. This snapshot is intentionally isolated so changing current public UI cannot silently restyle the legacy homepage. `legacy.css` applies only while the homepage switcher marks the document as legacy, including portalled dialogs.
