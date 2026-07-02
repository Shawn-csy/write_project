import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 767px)';

const subscribeToMobileViewport = (onStoreChange: () => void) => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
  const media = window.matchMedia(MOBILE_QUERY);
  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', onStoreChange);
    return () => media.removeEventListener('change', onStoreChange);
  }
  media.addListener?.(onStoreChange);
  return () => media.removeListener?.(onStoreChange);
};

const getMobileViewportSnapshot = () => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') return window.matchMedia(MOBILE_QUERY).matches;
  return window.innerWidth < 768;
};

/** Returns true when the viewport is below the 768px mobile breakpoint. */
export const useIsMobileViewport = (): boolean =>
  useSyncExternalStore(subscribeToMobileViewport, getMobileViewportSnapshot, () => false);
