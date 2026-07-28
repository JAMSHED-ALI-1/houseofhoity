"use client";

import { useEffect, useRef } from "react";
import lottie from "lottie-web";
import spinnerData from "../../../public/lottie/spinner.json";
import dotsData from "../../../public/lottie/dots.json";
import barsData from "../../../public/lottie/bars.json";

const variants = {
  spinner: spinnerData,
  dots: dotsData,
  bars: barsData,
};

export default function Loader({
  variant = "spinner",
  src,
  size = 80,
  loop = true,
  autoplay = true,
  speed = 1,
  label = "Loading...",
  overlay = false,
  className = "",
}) {
  const ref = useRef(null);
  const animation = useRef(null);

  useEffect(() => {
    if (!ref.current) return undefined;

    animation.current = lottie.loadAnimation({
      container: ref.current,
      renderer: "svg",
      loop,
      autoplay,
      animationData: src ?? variants[variant] ?? variants.spinner,
    });
    animation.current.setSpeed(speed);

    return () => {
      animation.current?.destroy();
      animation.current = null;
    };
  }, [variant, src, loop, autoplay, speed]);

  const inner = (
    <div
      ref={ref}
      role="status"
      aria-label={label}
      className={className}
      style={{ width: size, height: size, flexShrink: 0 }}
    />
  );

  if (!overlay) {
    return inner;
  }

  return (
    <div className="fixed inset-0 z-[9999] grid place-items-center bg-black/45">
      {inner}
    </div>
  );
}
