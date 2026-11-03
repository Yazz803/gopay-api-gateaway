'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { RiFileCopyLine, RiCheckLine } from 'react-icons/ri';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
}

export function CodeBlock({ code, language = 'bash', title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const markdownContent = code.trim().startsWith('```')
    ? code
    : `\`\`\`${language}\n${code}\n\`\`\``;

  return (
    <div className="rounded-[10px] overflow-hidden border border-white/10 bg-[#242831] text-[#EAE6DF] text-xs">
      <div className="flex items-center justify-between px-3.5 py-2 bg-[#2B303A] border-b border-white/10 text-[11px] text-[#9B9FA7]">
        <span className="font-semibold text-[#EAE6DF]">{title || language.toUpperCase()}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-1 rounded-[6px] hover:bg-white/10 text-[#EAE6DF] transition-colors cursor-pointer"
          title="Salin kode"
        >
          {copied ? (
            <>
              <RiCheckLine className="h-3.5 w-3.5 text-[#8EB89A]" />
              <span className="text-[#8EB89A] font-sans">Tersalin</span>
            </>
          ) : (
            <>
              <RiFileCopyLine className="h-3.5 w-3.5 text-[#9B9FA7]" />
              <span className="font-sans">Salin</span>
            </>
          )}
        </button>
      </div>
      <div className="overflow-x-auto selection:bg-[#4E6E58]/40">
        <ReactMarkdown
          components={{
            code({ className, children }) {
              const match = /language-(\w+)/.exec(className || '');
              const lang = match ? match[1] : language;
              return (
                <SyntaxHighlighter
                  style={oneDark}
                  language={lang}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '0.875rem 1rem',
                    background: 'transparent',
                    fontSize: '0.75rem',
                    lineHeight: '1.5',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    },
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              );
            },
          }}
        >
          {markdownContent}
        </ReactMarkdown>
      </div>
    </div>
  );
}
