import React from "react";
import Svg, { Circle, Line, Path } from "react-native-svg";

type IconProps = { size?: number; color?: string; strokeWidth?: number };

export function CheckIcon({ size = 28, color = "#fff", strokeWidth = 3.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 13l4.5 4.5L19 7"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CrossIcon({ size = 28, color = "#fff", strokeWidth = 3.4 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
    </Svg>
  );
}

export function PinIcon({ size = 18, color = "#fff" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 22s7-7.58 7-12.5A7 7 0 0 0 5 9.5C5 14.42 12 22 12 22Z"
        stroke={color}
        strokeWidth={1.8}
        fill="none"
      />
      <Circle cx="12" cy="9.5" r="2.4" fill={color} />
    </Svg>
  );
}

export function SearchIcon({ size = 18, color = "#9b9ba1" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="6.5" stroke={color} strokeWidth={2} />
      <Line x1="16" y1="16" x2="21" y2="21" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function MenuIcon({ size = 20, color = "#1a1a1a" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Line x1="3.5" y1="6.5" x2="20.5" y2="6.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1="3.5" y1="12" x2="15.5" y2="12" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Line x1="3.5" y1="17.5" x2="20.5" y2="17.5" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function ChevronIcon({ size = 16, color = "#c0c0c5" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 6l6 6-6 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function RefreshIcon({ size = 16, color = "#fff" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 4v5h5M20 20v-5h-5"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M5.5 9A7 7 0 0 1 19 11M18.5 15A7 7 0 0 1 5 13"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CloseIcon({ size = 14, color = "#1a1a1a" }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 6l12 12M18 6L6 18" stroke={color} strokeWidth={2.4} strokeLinecap="round" />
    </Svg>
  );
}
