"use client";

import { useEffect, useRef, useState } from "react";

/** True while the element is on screen: polling only what someone is looking at. */
export function useInView<T extends Element>() {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inView };
}
