"use client";

import React from 'react';

interface RadarDataPoint {
  label: string;
  score: number; // 0 to 9
}

interface SpeakingRadarChartProps {
  data: RadarDataPoint[];
}

export const SpeakingRadarChart: React.FC<SpeakingRadarChartProps> = ({ data }) => {
  // Center is (180, 180), radius is 110
  const cx = 180;
  const cy = 180;
  const maxRadius = 110;
  const numAxes = data.length; // 5

  // Calculate coordinates for an angle and radius
  // 0 angle is at the top (-90 degrees in standard SVG math)
  const getCoordinates = (index: number, radius: number) => {
    const angle = (Math.PI * 2 * index) / numAxes - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { x, y };
  };

  // Concentric levels (e.g. 2, 4, 6, 8, 9)
  const levels = [0.35, 0.6, 0.85, 1.0];

  // Polygon points string for a given scale factor (0 to 1)
  const getLevelPolygon = (factor: number) => {
    const pts = data.map((_, i) => {
      const { x, y } = getCoordinates(i, maxRadius * factor);
      return `${x},${y}`;
    });
    return pts.join(' ');
  };

  // Student Score Polygon
  const scorePolygon = data
    .map((d, i) => {
      const radius = (Math.min(d.score, 9) / 9) * maxRadius;
      const { x, y } = getCoordinates(i, radius);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="relative w-full max-w-sm mx-auto aspect-square flex items-center justify-center select-none py-2">
      <svg viewBox="0 0 360 360" className="w-full h-full overflow-visible">
        {/* Concentric Web Polygons */}
        {levels.map((lvl, idx) => (
          <polygon
            key={idx}
            points={getLevelPolygon(lvl)}
            fill="none"
            stroke="#dbeafe"
            strokeWidth={idx === levels.length - 1 ? '2' : '1.2'}
            strokeDasharray={idx < levels.length - 1 ? '3 3' : 'none'}
          />
        ))}

        {/* Axis Lines from Center to Vertices */}
        {data.map((_, i) => {
          const { x, y } = getCoordinates(i, maxRadius);
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="#e2e8f0"
              strokeWidth="1"
            />
          );
        })}

        {/* Student Score Filled Area */}
        <polygon
          points={scorePolygon}
          fill="rgba(59, 130, 246, 0.18)"
          stroke="#2563eb"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Score Vertex Dots */}
        {data.map((d, i) => {
          const radius = (Math.min(d.score, 9) / 9) * maxRadius;
          const { x, y } = getCoordinates(i, radius);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="4.5"
              fill="#2563eb"
              stroke="#ffffff"
              strokeWidth="2"
            />
          );
        })}

        {/* Labels at the Outer Edge of each Vertex */}
        {data.map((d, i) => {
          const labelDist = maxRadius + 36;
          const { x, y } = getCoordinates(i, labelDist);

          // Anchor adjustment based on position
          let textAnchor: 'start' | 'middle' | 'end' = 'middle';
          if (x < cx - 20) textAnchor = 'end';
          if (x > cx + 20) textAnchor = 'start';

          return (
            <g key={i}>
              <text
                x={x}
                y={y - 8}
                textAnchor={textAnchor}
                className="fill-blue-600 font-mono font-black text-xs"
              >
                {d.score.toFixed(1)}
              </text>
              <text
                x={x}
                y={y + 6}
                textAnchor={textAnchor}
                className="fill-slate-600 font-bold text-[10px]"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
