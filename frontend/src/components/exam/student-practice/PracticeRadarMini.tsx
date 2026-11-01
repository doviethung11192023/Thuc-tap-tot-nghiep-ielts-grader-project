"use client";

import React from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import type { SkillScore } from "@/types/learning-profile";
import { RadarScoreTooltip } from "@/components/learning-profile/RadarScoreTooltip";

interface PracticeRadarMiniProps {
  radarData: SkillScore[];
  overallScore: number;
}

export function PracticeRadarMini({ radarData, overallScore }: PracticeRadarMiniProps) {
  // Chuẩn hóa đúng thứ tự 5 đỉnh theo Prep (Image 2): Overall (trên), Listening (phải), Reading (dưới phải), Speaking (dưới trái), Writing (trái)
  const scoreMap: Record<string, number> = {};
  for (const item of radarData) {
    scoreMap[item.skill.toLowerCase()] = item.score;
  }

  const chartData = [
    { skill: "Overall", score: overallScore },
    { skill: "Listening", score: scoreMap["listening"] ?? 5.5 },
    { skill: "Reading", score: scoreMap["reading"] ?? 5.5 },
    { skill: "Speaking", score: scoreMap["speaking"] ?? 5.0 },
    { skill: "Writing", score: scoreMap["writing"] ?? 5.0 },
  ];

  return (
    <div className="relative w-full flex flex-col items-center">
      {/* Overall Score Header */}
      <div className="text-center mb-1">
        <div className="text-2xl font-black text-[#2563eb] tracking-tight">{overallScore.toFixed(1)}</div>
        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Overall</div>
      </div>

      {/* Radar Graphic Area */}
      <div className="h-52 w-full max-w-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={chartData}>
            <PolarGrid stroke="#e4e4e7" strokeDasharray="3 3" />
            <PolarAngleAxis
              dataKey="skill"
              tick={(props: any) => {
                const { x, y, payload } = props;
                const skillName = payload.value;
                const found = chartData.find((d) => d.skill === skillName);
                const val = found?.score ?? 0;
                if (skillName === "Overall") return <g />; // Overall đã có ở header trên đỉnh

                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={0}
                      y={-6}
                      textAnchor="middle"
                      fill="#2563eb"
                      className="text-xs font-black"
                      fontSize={12}
                      fontWeight={800}
                    >
                      {val.toFixed(1)}
                    </text>
                    <text
                      x={0}
                      y={8}
                      textAnchor="middle"
                      fill="#71717a"
                      className="text-[10px] font-bold"
                      fontSize={10}
                      fontWeight={600}
                    >
                      {skillName}
                    </text>
                  </g>
                );
              }}
            />
            <PolarRadiusAxis domain={[0, 9]} tick={false} axisLine={false} />
            <Radar
              name="Band"
              dataKey="score"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="#3b82f6"
              fillOpacity={0.18}
            />
            <RechartsTooltip content={<RadarScoreTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
