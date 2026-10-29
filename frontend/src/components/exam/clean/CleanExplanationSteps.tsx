"use client";

import React from 'react';

interface CleanExplanationStepsProps {
  explanation4Steps?: string;
}

function renderTable(tableLines: string[], keyPrefix: number) {
  const parsedRows = tableLines
    .map((line) => line.split('|').map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1))
    .filter((row) => row.length > 0 && !row.every((c) => /^[-:]+$/.test(c)));

  if (parsedRows.length === 0) return null;
  const headers = parsedRows[0];
  const bodyRows = parsedRows.slice(1);

  return (
    <div key={`table-${keyPrefix}`} className="my-2.5 overflow-x-auto rounded-lg border border-zinc-200 shadow-2xs">
      <table className="w-full border-collapse text-xs">
        <thead className="bg-zinc-100 text-zinc-900 font-bold border-b border-zinc-200">
          <tr>
            {headers.map((h, i) => (
              <th key={i} className="p-2.5 text-left border-r border-zinc-200 last:border-r-0">
                {h.replace(/\*\*/g, '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-zinc-100">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-zinc-50/60 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="p-2.5 border-r border-zinc-200 last:border-r-0 align-top leading-relaxed">
                  {cell.replace(/\*\*/g, '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CleanExplanationSteps({ explanation4Steps }: CleanExplanationStepsProps) {
  if (!explanation4Steps) {
    return <div className="text-zinc-500 italic text-xs">Không có dữ liệu lời giải chi tiết cho câu hỏi này.</div>;
  }

  const chunks = explanation4Steps.split(/###\s+/).filter(Boolean);

  return (
    <div className="prose prose-sm max-w-none text-zinc-800 space-y-3">
      {chunks.map((chunk, cIdx) => {
        const lines = chunk.trim().split('\n');
        const title = lines[0] || '';
        const bodyLines = lines.slice(1);

        // Group lines into table blocks and normal lines
        const elements: React.ReactNode[] = [];
        let tableBuffer: string[] = [];

        const flushTable = () => {
          if (tableBuffer.length > 0) {
            elements.push(renderTable(tableBuffer, elements.length));
            tableBuffer = [];
          }
        };

        bodyLines.forEach((line, lIdx) => {
          const trimmed = line.trim();
          if (!trimmed) {
            flushTable();
            return;
          }

          if (trimmed.startsWith('|')) {
            tableBuffer.push(trimmed);
            return;
          }

          flushTable();

          if (trimmed.startsWith('>')) {
            elements.push(
              <div
                key={lIdx}
                className="my-1.5 p-2.5 rounded-lg border-l-4 border-blue-500 bg-blue-50/60 text-blue-950 italic text-xs sm:text-sm"
              >
                {trimmed.replace(/^>\s*/, '').replace(/\*\*/g, '')}
              </div>
            );
          } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            elements.push(
              <div key={lIdx} className="flex items-start gap-1.5 pl-2 text-zinc-800 text-xs sm:text-sm">
                <span className="text-blue-500 font-bold">•</span>
                <span>{trimmed.replace(/^[-*]\s*/, '').replace(/\*\*/g, '')}</span>
              </div>
            );
          } else if (trimmed.includes('✅') || trimmed.includes('Answer:')) {
            elements.push(
              <div
                key={lIdx}
                className="font-bold text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-2 rounded-lg text-xs sm:text-sm"
              >
                {trimmed.replace(/\*\*/g, '')}
              </div>
            );
          } else {
            elements.push(
              <p key={lIdx} className="leading-normal text-xs sm:text-sm">
                {trimmed.replace(/\*\*/g, '')}
              </p>
            );
          }
        });

        flushTable();

        return (
          <div key={cIdx} className="space-y-1.5">
            <div className="font-bold text-zinc-900 text-sm flex items-center gap-1.5 text-blue-950">
              <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
              <span>{title}</span>
            </div>
            <div className="pl-3.5 space-y-2 text-zinc-700">{elements}</div>
          </div>
        );
      })}
    </div>
  );
}
