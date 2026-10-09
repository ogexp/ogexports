import { router, type Href } from 'expo-router';

export function goBackOrReplace(fallbackHref: Href): void {
  try {
    if (router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // If the navigator has no usable back entry, continue to the fallback route.
  }

  router.replace(fallbackHref);
}
