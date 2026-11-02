"use client";

import React from 'react';

interface CleanExplanationStepsProps {
  explanation4Steps?: string;
}

// RD-07: Hỗ trợ parse Markdown in đậm **text** và in nghiêng _text_
function renderFormattedText(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g);
  return (
    <>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-bold text-zinc-900">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('_') && part.endsWith('_')) {
          return <em key={idx} className="italic text-zinc-600 font-medium">{part.slice(1, -1)}</em>;
        }
        return <span key={idx}>{part}</span>;
      })}
    </>
  );
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
                {renderFormattedText(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-zinc-100">
          {bodyRows.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-zinc-50/60 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="p-2.5 border-r border-zinc-200 last:border-r-0 align-top leading-relaxed">
                  {renderFormattedText(cell)}
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

        // LS-05: Tiền xử lý gộp các ký tự bullet • đứng riêng một dòng vào dòng nội dung phía sau
        const preprocessedLines: string[] = [];
        for (let i = 0; i < bodyLines.length; i++) {
          const cur = bodyLines[i].trim();
          if ((cur === '•' || cur === '-' || cur === '*') && i + 1 < bodyLines.length) {
            preprocessedLines.push(`• ${bodyLines[i + 1].trim()}`);
            i++;
          } else {
            preprocessedLines.push(bodyLines[i]);
          }
        }

        const elements: React.ReactNode[] = [];
        let tableBuffer: string[] = [];

        const flushTable = () => {
          if (tableBuffer.length > 0) {
            elements.push(renderTable(tableBuffer, elements.length));
            tableBuffer = [];
          }
        };

        preprocessedLines.forEach((line, lIdx) => {
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
                className="my-1.5 p-2.5 rounded-lg border-l-4 border-blue-500 bg-blue-50/60 text-blue-950 text-xs sm:text-sm"
              >
                {renderFormattedText(trimmed.replace(/^>\s*/, ''))}
              </div>
            );
          } else if (trimmed.startsWith('•') || trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            const bulletContent = trimmed.replace(/^([•\-*]\s*)/, '');
            elements.push(
              <div key={lIdx} className="flex items-start gap-1.5 pl-2 text-zinc-800 text-xs sm:text-sm">
                <span className="text-blue-500 font-bold shrink-0">•</span>
                <span>{renderFormattedText(bulletContent)}</span>
              </div>
            );
          } else if (trimmed.includes('✅') || trimmed.includes('Answer:')) {
            elements.push(
              <div
                key={lIdx}
                className="font-bold text-emerald-800 bg-emerald-50/80 border border-emerald-200 p-2.5 rounded-lg text-xs sm:text-sm leading-relaxed"
              >
                {renderFormattedText(trimmed)}
              </div>
            );
          } else {
            elements.push(
              <p key={lIdx} className="leading-relaxed text-xs sm:text-sm">
                {renderFormattedText(trimmed)}
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
