"use client";

import { getBezierPath, type EdgeProps } from "@xyflow/react";

/**
 * GlowEdge
 *
 * Uses data.glow (never animated=true) so ReactFlow's built-in
 * dash/dashdraw CSS never fires.
 *
 * Idle:    single dim solid line
 * Glowing: 3 overlapping strokes — wide dim halo + medium mid + bright thin core —
 *          producing a neon / fiber-optic appearance with no CSS filters.
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
    </>
  );
}
