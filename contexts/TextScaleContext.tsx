import React, { createContext, useContext, useEffect, useState } from "react";
import { getTextScale, setTextScale } from "../storage/textScale";

type Ctx = { scale: number; increase: () => void; decrease: () => void };

const TextScaleContext = createContext<Ctx>({ scale: 1, increase: () => {}, decrease: () => {} });

const MIN = 0.85;
const MAX = 1.3;
const STEP = 0.15;

export function TextScaleProvider({ children }: { children: React.ReactNode }) {
  const [scale, setScale] = useState(1);

  useEffect(() => {
    getTextScale().then(setScale);
  }, []);

  const apply = (next: number) => {
    const clamped = Math.round(Math.min(MAX, Math.max(MIN, next)) * 100) / 100;
    setScale(clamped);
    setTextScale(clamped);
  };

  return (
    <TextScaleContext.Provider
      value={{ scale, increase: () => apply(scale + STEP), decrease: () => apply(scale - STEP) }}
    >
      {children}
    </TextScaleContext.Provider>
  );
}

export function useTextScale() {
  return useContext(TextScaleContext);
}
