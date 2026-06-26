import { useEffect, useState } from "react";

// SSR-safe media query hook. Returns `false` on the server and on the first
// client render (so hydration matches), then updates after mount.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

// Desktop = larger screens (>= 1024px). Below that we treat it as mobile.
export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
