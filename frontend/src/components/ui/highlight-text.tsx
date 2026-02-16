import React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

interface HighlightTextProps {
    text: string;
    className?: string;
}

const KEYWORDS = [
    'ROI', 'Risk', 'Risks', 'Growth', 'Technical', 'Market', 'Scale', 'Efficiency', 
    'Strategy', 'Impact', 'Feasibility', 'Experience', 'Ideation', 'Business',
    'Profit', 'Loss', 'Advantage', 'Challenge', 'Challenges', 'Goal', 'Goals',
    'Milestone', 'Milestones', 'Risk Assessment', 'Technical Risk', 'Market Risk',
    'User Experience', 'Business Model', 'Strategic', 'Execution', 'Pipeline'
];

/**
 * Helper component to highlight keywords within a piece of text
 */
function KeywordHighlighter({ text }: { text: string }) {
    if (!text) return null;
    
    const sortedKeywords = [...KEYWORDS].sort((a, b) => b.length - a.length);
    const regex = new RegExp(`\\b(${sortedKeywords.join('|')})\\b`, 'gi');
    const parts = text.split(regex);

    return (
        <>
            {parts.map((part, i) => {
                const isMatch = sortedKeywords.some(kw => kw.toLowerCase() === part.toLowerCase());
                if (isMatch) {
                    return (
                        <strong key={i} className="text-primary font-bold">
                            {part}
                        </strong>
                    );
                }
                return part;
            })}
        </>
    );
}

export function HighlightText({ text, className }: HighlightTextProps) {
    if (!text) return null;

    // Check if the text looks like it has markdown (bullets or bold)
    // If it doesn't, we can fall back to the simple keyword highlighter for better performance
    const hasMarkdown = /[*_#-]/.test(text);

    if (!hasMarkdown) {
        return (
            <span className={cn("inline-block", className)}>
                <KeywordHighlighter text={text} />
            </span>
        );
    }

    return (
        <div className={cn("inline-block chatbot-prose w-full", className)}>
            <ReactMarkdown
                components={{
                    p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-primary">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1.5">{children}</ol>,
                    li: ({ children }) => <li className="leading-relaxed text-foreground/90">{children}</li>,
                    h1: ({ children }) => <h1 className="text-xl font-bold mb-3 mt-4 text-foreground tracking-tight border-b border-border/50 pb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-bold mb-2 mt-3 text-foreground tracking-tight">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-bold mb-2 mt-2 text-foreground tracking-tight">{children}</h3>,
                    blockquote: ({ children }) => (
                        <blockquote className="border-l-4 border-primary/30 pl-4 italic my-4 bg-primary/5 py-2 rounded-r-lg">{children}</blockquote>
                    ),
                    code: ({ children }) => (
                        <code className="bg-muted px-1.5 py-0.5 rounded text-[0.9em] font-mono text-primary">{children}</code>
                    ),
                }}
            >
                {text}
            </ReactMarkdown>
        </div>
    );
}
