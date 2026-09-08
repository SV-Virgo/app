import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { colors } from '../theme/tokens';

export function BellIcon({ size = 22, color = colors.ink700 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 3a6 6 0 00-6 6v3.5L4 16h16l-2-3.5V9a6 6 0 00-6-6z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9.5 19a2.5 2.5 0 005 0" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function LockIcon({ size = 12, color = colors.ink500 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5} y={11} width={14} height={9} rx={2} stroke={color} strokeWidth={2.2} />
      <Path d="M8.5 11V8a3.5 3.5 0 017 0v3" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function CommitteeIcon({ size = 15, color = colors.blue700 }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={8} r={3.2} stroke={color} strokeWidth={2} />
      <Path d="M3.5 19c1-3.2 3-4.8 5.5-4.8s4.5 1.6 5.5 4.8" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M17 9.5h4M19 7.5v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
