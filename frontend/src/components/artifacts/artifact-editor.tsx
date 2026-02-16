'use client';

/**
 * Artifact Editor
 * Line-by-line editable view of LLM-generated content
 * Supports inline editing and commenting on individual lines
 */

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StepArtifact, ArtifactComment } from '@/types/api';
import { HighlightText } from '../ui/highlight-text';
import { FloatingChatbot } from './floating-chatbot';

interface ArtifactEditorProps {
    artifact: StepArtifact;
    onEditLine: (lineIndex: number, content: string) => void;
    onComment: (lineIndex: number, text: string) => void;
}

export function ArtifactEditor({ artifact, onEditLine, onComment }: ArtifactEditorProps) {
    const [editingLine, setEditingLine] = useState<number | null>(null);
    const [editValue, setEditValue] = useState('');
    const [commentingLine, setCommentingLine] = useState<number | null>(null);
    const [commentValue, setCommentValue] = useState('');
    const [hoveredLine, setHoveredLine] = useState<number | null>(null);
    const [selection, setSelection] = useState('');
    const [chatbotPosition, setChatbotPosition] = useState<{ x: number; y: number } | null>(null);

    const editedLineIndexes = new Set(artifact.edits.map(e => e.lineIndex));

    const getLineComments = useCallback((lineIndex: number): ArtifactComment[] => {
        return artifact.comments.filter(c => c.lineIndex === lineIndex);
    }, [artifact.comments]);

    const startEdit = (lineIndex: number) => {
        setEditingLine(lineIndex);
        setEditValue(artifact.lines[lineIndex]);
        setCommentingLine(null);
    };

    const submitEdit = () => {
        if (editingLine !== null && editValue !== artifact.lines[editingLine]) {
            onEditLine(editingLine, editValue);
        }
        setEditingLine(null);
        setEditValue('');
    };

    const cancelEdit = () => {
        setEditingLine(null);
        setEditValue('');
    };

    const startComment = (lineIndex: number) => {
        setCommentingLine(lineIndex);
        setCommentValue('');
        setEditingLine(null);
    };

    const submitComment = () => {
        if (commentingLine !== null && commentValue.trim()) {
            onComment(commentingLine, commentValue.trim());
        }
        setCommentingLine(null);
        setCommentValue('');
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        const text = window.getSelection()?.toString().trim();
        if (text && text.length > 0) {
            setSelection(text);
            setChatbotPosition({ x: e.clientX, y: e.clientY });
        } else {
            // Only clear selection if we didn't click inside the chatbot
            if (!(e.target as HTMLElement).closest('.artifact-chatbot')) {
                setSelection('');
                setChatbotPosition(null);
            }
        }
    };

    return (
        <div 
            className="rounded-lg bg-background/30 overflow-hidden shadow-inner relative"
            onMouseUp={handleMouseUp}
        >
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 bg-muted/20 text-[10px] text-muted-foreground">
                <span>Click any line to edit • Hover for actions</span>
                <div className="flex items-center gap-2">
                    {artifact.edits.length > 0 && (
                        <Badge variant="secondary" className="text-[9px] py-0 tabular-nums">
                            {artifact.edits.length} edit{artifact.edits.length > 1 ? 's' : ''}
                        </Badge>
                    )}
                    {artifact.comments.length > 0 && (
                        <Badge variant="secondary" className="text-[9px] py-0 tabular-nums">
                            {artifact.comments.length} comment{artifact.comments.length > 1 ? 's' : ''}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Lines */}
            <div className="max-h-[500px] overflow-y-auto">
                {artifact.lines.map((line, index) => {
                    const isEditing = editingLine === index;
                    const isCommenting = commentingLine === index;
                    const isEdited = editedLineIndexes.has(index);
                    const lineComments = getLineComments(index);
                    const isHovered = hoveredLine === index;
                    const isEmpty = line.trim() === '';

                    return (
                        <div key={index}>
                            <div
                                className={cn(
                                    'group flex items-stretch border-b border-border/10 transition-[background-color] duration-150',
                                    isEditing && 'bg-primary/5',
                                    isEdited && !isEditing && 'bg-amber-500/5',
                                    !isEditing && !isEdited && 'hover:bg-muted/20',
                                )}
                                onMouseEnter={() => setHoveredLine(index)}
                                onMouseLeave={() => setHoveredLine(null)}
                            >
                                {/* Line number gutter */}
                                <div className="w-10 flex-shrink-0 flex items-center justify-center text-[10px] text-muted-foreground/40 bg-muted/10 select-none tabular-nums">
                                    {index + 1}
                                </div>

                                {/* Line content */}
                                {isEditing ? (
                                        <div className="flex-1 flex items-center gap-1 px-2 py-1">
                                            <Input
                                                value={editValue}
                                                name={`line-edit-${index}`}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') submitEdit();
                                                    if (e.key === 'Escape') cancelEdit();
                                                }}
                                                className="h-7 text-xs bg-transparent border-primary/30 focus-visible:ring-1 focus-visible:ring-primary"
                                                autoFocus
                                            />
                                            <Button size="sm" onClick={submitEdit} className="h-7 px-2 text-[10px]">
                                                Save Changes
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={cancelEdit} aria-label="Cancel editing" className="h-7 px-2 text-[10px]">
                                                ✕
                                            </Button>
                                        </div>
                                ) : (
                                        <div
                                            className="flex-1 px-3 py-1 cursor-pointer min-h-[28px] flex items-center"
                                            onClick={() => startEdit(index)}
                                            aria-label={`Edit line ${index + 1}`}
                                        >
                                            <HighlightText
                                                text={isEmpty ? ' ' : line}
                                                className={cn(
                                                    'text-xs font-mono whitespace-pre-wrap break-all',
                                                    isEmpty ? 'text-transparent' : 'text-foreground/80',
                                                    isEdited && 'text-amber-300/90'
                                                )}
                                            />
                                        </div>
                                )}

                                {/* Action buttons (visible on hover) */}
                                    {!isEditing && isHovered && (
                                        <div className="flex items-center gap-0.5 px-1 flex-shrink-0">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); startComment(index); }}
                                                className="text-[10px] text-muted-foreground hover:text-primary px-1.5 py-0.5 rounded hover:bg-muted/30 transition-colors"
                                                aria-label="Add comment to this line"
                                                title="Add comment"
                                            >
                                                💬
                                            </button>
                                        </div>
                                    )}

                                    {/* Edited indicator */}
                                    {isEdited && !isEditing && (
                                        <div className="flex items-center px-1.5 flex-shrink-0">
                                            <span className="text-[8px] text-amber-400/60 lowercase italic">edited</span>
                                        </div>
                                    )}
                            </div>

                            {/* Comment input */}
                                    {isCommenting && (
                                        <div className="flex items-center gap-1 px-3 py-2 bg-primary/5 border-b border-border/10">
                                            <span className="text-xs" aria-hidden="true">💬</span>
                                            <Input
                                                value={commentValue}
                                                name={`line-comment-${index}`}
                                                onChange={(e) => setCommentValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') submitComment();
                                                    if (e.key === 'Escape') setCommentingLine(null);
                                                }}
                                                placeholder="Add a comment…"
                                                className="h-7 text-xs flex-1 bg-transparent border-primary/30 focus-visible:ring-1 focus-visible:ring-primary"
                                                autoFocus
                                            />
                                            <Button size="sm" onClick={submitComment} disabled={!commentValue.trim()} className="h-7 px-2 text-[10px]">
                                                Post Comment
                                            </Button>
                                            <Button size="sm" variant="ghost" onClick={() => setCommentingLine(null)} aria-label="Cancel commenting" className="h-7 px-1 text-[10px]">
                                                ✕
                                            </Button>
                                        </div>
                                    )}

                                    {/* Existing comments */}
                                    {lineComments.length > 0 && (
                                        <div className="ml-10 border-b border-border/10 bg-blue-500/5">
                                            {lineComments.map((comment) => (
                                                <div key={comment.id} className="flex items-start gap-2 px-3 py-1.5 text-xs">
                                                    <span className="text-blue-400/60 mt-0.5" aria-hidden="true">💬</span>
                                                    <div>
                                                        <span className="font-medium text-blue-300/80">{comment.author}</span>
                                                        <span className="text-muted-foreground/60 mx-1" aria-hidden="true">·</span>
                                                        <span className="text-muted-foreground/40 tabular-nums">
                                                            {new Date(comment.createdAt).toLocaleTimeString()}
                                                        </span>
                                                        <p className="text-foreground/70 mt-0.5">{comment.text}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                        </div>
                    );
                })}
            </div>

            {selection && chatbotPosition && (
                <FloatingChatbot
                    selection={selection}
                    position={chatbotPosition}
                    onClose={() => {
                        setSelection('');
                        setChatbotPosition(null);
                        window.getSelection()?.removeAllRanges();
                    }}
                />
            )}
        </div>
    );
}
