import React from 'react';
import { BaseRendererProps } from './shared';
import { QUESTION_RENDERER_REGISTRY } from './index';
import { InlineFillBlankRenderer } from './InlineFillBlankRenderer';

export const QuestionGroupRenderer: React.FC<BaseRendererProps> = ({ group, mode, ...props }) => {
  const Renderer = QUESTION_RENDERER_REGISTRY[group.question_type] || InlineFillBlankRenderer;
  
  const startNum = group.questions[0]?.question_number || '';
  const endNum = group.questions[group.questions.length - 1]?.question_number || '';
  
  return (
    <div className="mb-8 rounded-lg border border-zinc-200 p-6 bg-white shadow-sm">
      <div className="mb-6 bg-zinc-50 p-4 rounded-md border border-zinc-100">
        <h3 className="font-semibold text-zinc-900 mb-1">
          Questions {startNum} - {endNum}
        </h3>
        <p className="text-sm text-zinc-600 font-medium italic">{group.instruction}</p>
      </div>

      <Renderer group={group} mode={mode} {...props} />
    </div>
  );
};
