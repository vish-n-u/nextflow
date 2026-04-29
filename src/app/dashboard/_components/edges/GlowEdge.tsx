"use client";

import { getBezierPath, type EdgeProps } from "@xyflow/react";
import { useEffect, useRef, useState } from "react";

/**
 * GlowEdge
 *
 * Uses data.glow (never animated=true) so ReactFlow's built-in
 * dash/dashdraw CSS never fires.
 *
 * Idle:    single dim solid line
 * Glowing: 3 overlapping strokes — wide dim halo + medium mid + bright thin core —
 *          producing a neon / fiber-optic appearance with no CSS filters.
 * Pulse:   when glow transitions to true, a traveling pulse sweeps from source
 *          to target using SVG SMIL stroke-dashoffset animation + animateMotion dot.
 *          The pulse plays once (~0.75s) then disappears.
 */
export function GlowEdge({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  style,
  data,
  markerEnd,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const color = (style?.stroke as string | undefined) ?? "#888";
  const glow  = (data as Record<string, unknown> | undefined)?.glow === true;

  // Each time glow rises to true, increment pulseKey to remount the animation <g>,
  // which restarts all SMIL animations from their `from` values.
  const prevGlowRef = useRef<boolean | null>(null);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (glow && prevGlowRef.current !== true) {
      setPulseKey((k) => k + 1);
    }
    prevGlowRef.current = glow;
  }, [glow]);

  /* Invisible wide path — only purpose is ReactFlow hit-testing / selection */
  const hitPath = (
    <path
      id={id}
      className="react-flow__edge-path"
      d={edgePath}
      stroke="transparent"
      strokeWidth={16}
      fill="none"
      markerEnd={markerEnd}
    />
  );

  if (!glow) {
    return (
      <>
        {hitPath}
        <path
          d={edgePath}
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.45}
          strokeLinecap="round"
          fill="none"
        />
      </>
    );
  }

  /* Glow: 4 concentric strokes give a neon-tube look without CSS blur */
  return (
    <>
      {hitPath}

      {/* Outermost wide halo */}
      <path
        d={edgePath}
        stroke={color}
        strokeWidth={10}
        strokeOpacity={0.08}
        strokeLinecap="round"
        fill="none"
      />
      {/* Mid glow */}
      <path
        d={edgePath}
        stroke={color}
        strokeWidth={5}
        strokeOpacity={0.22}
        strokeLinecap="round"
        fill="none"
      />
      {/* Inner bright ring */}
      <path
        d={edgePath}
        stroke={color}
        strokeWidth={2.5}
        strokeOpacity={0.7}
        strokeLinecap="round"
        fill="none"
      />
      {/* Bright core */}
      <path
        d={edgePath}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={1}
        strokeLinecap="round"
        fill="none"
      />
      {/* Thin white specular center */}
      <path
        d={edgePath}
        stroke="white"
        strokeWidth={0.5}
        strokeOpacity={0.5}
        strokeLinecap="round"
        fill="none"
      />

      {/* ── Traveling pulse ──────────────────────────────────────────────────
          key={pulseKey} causes React to remount this <g> every time glow
          turns on, restarting all SMIL animations from scratch.
          strokeOpacity={0} / fillOpacity={0} are the resting values so that
          fill="remove" on each <animate> restores them to invisible after
          the animation completes.
      ──────────────────────────────────────────────────────────────────── */}
      {pulseKey > 0 && (
        <g key={pulseKey}>
          {/* Wide outer halo of the pulse */}
          <path
            d={edgePath}
            stroke={color}
            strokeWidth={14}
            strokeOpacity={0}
            strokeLinecap="round"
            fill="none"
            strokeDasharray="0.2 0.8"
            pathLength="1"
          >
            {/* dashoffset 1→-1 moves the dash from before the source to past the target */}
            <animate attributeName="stroke-dashoffset" from="1" to="-1" dur="0.75s" fill="remove" />
            <animate attributeName="stroke-opacity" values="0;0.2;0.2;0" keyTimes="0;0.1;0.85;1" dur="0.75s" fill="remove" />
          </path>

          {/* Bright colored core of the pulse */}
          <path
            d={edgePath}
            stroke={color}
            strokeWidth={4}
            strokeOpacity={0}
            strokeLinecap="round"
            fill="none"
            strokeDasharray="0.15 0.85"
            pathLength="1"
          >
            <animate attributeName="stroke-dashoffset" from="1" to="-1" dur="0.75s" fill="remove" />
            <animate attributeName="stroke-opacity" values="0;0.95;0.95;0" keyTimes="0;0.1;0.85;1" dur="0.75s" fill="remove" />
          </path>

          {/* White specular highlight on the pulse */}
          <path
            d={edgePath}
            stroke="white"
            strokeWidth={1.5}
            strokeOpacity={0}
            strokeLinecap="round"
            fill="none"
            strokeDasharray="0.08 0.92"
            pathLength="1"
          >
            <animate attributeName="stroke-dashoffset" from="1" to="-1" dur="0.75s" fill="remove" />
            <animate attributeName="stroke-opacity" values="0;0.8;0.8;0" keyTimes="0;0.1;0.85;1" dur="0.75s" fill="remove" />
          </path>

          {/* Moving dot — outer glow halo */}
          <circle r={6} fill={color} fillOpacity={0}>
            <animate attributeName="fill-opacity" values="0;0.3;0.3;0" keyTimes="0;0.1;0.85;1" dur="0.75s" fill="freeze" />
            <animateMotion dur="0.75s" fill="freeze" rotate="auto">
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>

          {/* Moving dot — colored core */}
          <circle r={3.5} fill={color} fillOpacity={0}>
            <animate attributeName="fill-opacity" values="0;1;1;0" keyTimes="0;0.1;0.85;1" dur="0.75s" fill="freeze" />
            <animateMotion dur="0.75s" fill="freeze" rotate="auto">
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>

          {/* Moving dot — white specular center */}
          <circle r={1.5} fill="white" fillOpacity={0}>
            <animate attributeName="fill-opacity" values="0;0.9;0.9;0" keyTimes="0;0.1;0.85;1" dur="0.75s" fill="freeze" />
            <animateMotion dur="0.75s" fill="freeze" rotate="auto">
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        </g>
      )}
    </>
  );
}
