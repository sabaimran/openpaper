import React, { useEffect, useState, useRef } from 'react';

import {
	PaperHighlight,
	PaperHighlightAnnotation
} from '@/lib/schema';

import { Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardFooter } from './ui/card';

export interface AnnotationButtonProps {
	highlightId: string;
	// Make addAnnotation optional as it might not be needed in readonly
	addAnnotation?: (highlightId: string, content: string) => Promise<PaperHighlightAnnotation>;
}

export function AnnotationButton({ highlightId, addAnnotation }: AnnotationButtonProps) {
	const [content, setContent] = useState("");
	const [isTyping, setIsTyping] = useState(false);

	const handleSave = async () => {
		if (content.trim() && addAnnotation) { // Check if addAnnotation exists
			await addAnnotation(highlightId, content);
			setContent("");
			setIsTyping(false);
		}
	};

	const handleCancel = () => {
		setContent("");
		setIsTyping(false);
	};

	// Don't render if addAnnotation is not provided
	if (!addAnnotation) return null;

	return (
		<div className="space-y-2 w-full">
			<Textarea
				value={content}
				onChange={(e) => {
					setContent(e.target.value);
					if (!isTyping) setIsTyping(true);
				}}
				placeholder="Add annotation..."
				className="text-sm w-full"
				autoFocus
			/>
			{isTyping && (
				<div className="flex justify-end gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleCancel}
					>
						Cancel
					</Button>
					<Button
						size="sm"
						onClick={handleSave}
					>
						Save
					</Button>
				</div>
			)}
		</div>
	);
}

interface AnnotationCardProps {
	annotation: PaperHighlightAnnotation;
	removeAnnotation?: (annotationId: string) => void;
	updateAnnotation?: (annotationId: string, content: string) => void;
	readonly?: boolean;
}

function AnnotationCard({ annotation, removeAnnotation, updateAnnotation, readonly = false }: AnnotationCardProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editedContent, setEditedContent] = useState(annotation.content);

	const handleSave = async (e: React.MouseEvent) => {
		e.stopPropagation();
		// Check if updateAnnotation exists before calling
		if (editedContent.trim() !== annotation.content && updateAnnotation) {
			await updateAnnotation(annotation.id, editedContent);
		}
		setIsEditing(false);
	};

	// Prevent entering edit mode if readonly
	if (isEditing && !readonly) {
		return (
			<Card className='group border-x-0 border-b-0 border-t shadow-none rounded-none py-2'>
				<CardContent className="space-y-2 text-sm">
					<Textarea
						value={editedContent}
						onChange={(e) => setEditedContent(e.target.value)}
						className="min-h-[100px] text-sm"
						onClick={(e) => e.stopPropagation()}
						autoFocus
					/>
					<div className="flex justify-end gap-2">
						<Button
							variant="ghost"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								setIsEditing(false);
								setEditedContent(annotation.content);
							}}
						>
							Cancel
						</Button>
						<Button
							size="sm"
							onClick={handleSave}
						>
							Save
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Base classes
	const cardClasses = 'group border-x-0 border-b-0 border-t border-l-2 border-transparent shadow-none rounded-none py-2';
	// Conditional classes for interactive mode
	const interactiveClasses = !readonly ? 'hover:bg-secondary/50 hover:shadow-sm hover:border-l-primary transition-all duration-200 ease-in-out cursor-pointer' : 'cursor-default';

	return (
		<Card className={`${cardClasses} ${interactiveClasses}`}>
			<CardContent className='text-sm pl-2'>
				{annotation.content}
			</CardContent>
			<CardFooter className="flex justify-between items-center pl-2 min-h-[28px]"> {/* Added min-height */}
				{/* Always show date in readonly mode, otherwise show on hover */}
				<p className={`text-xs text-muted-foreground transition-opacity duration-200 ease-in-out opacity-0 group-hover:opacity-100`}>
					{new Date(annotation.created_at).toLocaleDateString()}
				</p>
				{/* Only show buttons if not readonly and functions are provided */}
				{!readonly && removeAnnotation && updateAnnotation && (
					<div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out flex gap-2">
						<Button
							variant="ghost"
							className="h-6 w-6 p-0"
							onClick={(e) => {
								e.stopPropagation();
								removeAnnotation(annotation.id);
							}}
						>
							<Trash2 size={14} className="text-muted-foreground hover:text-destructive transition-colors" />
						</Button>
						<Button
							variant="ghost"
							className="h-6 w-6 p-0"
							onClick={(e) => {
								e.stopPropagation();
								setIsEditing(true);
							}}
						>
							<Pencil size={14} className="text-muted-foreground hover:text-primary transition-colors" />
						</Button>
					</div>
				)}
			</CardFooter>
		</Card>
	);
}

interface AnnotationsViewProps {
	highlights: PaperHighlight[];
	annotations: PaperHighlightAnnotation[];
	onHighlightClick: (highlight: PaperHighlight) => void;
	activeHighlight?: PaperHighlight | null;
	// Make action functions optional
	addAnnotation?: (highlightId: string, content: string) => Promise<PaperHighlightAnnotation>;
	removeAnnotation?: (annotationId: string) => void;
	updateAnnotation?: (annotationId: string, content: string) => void;
	readonly?: boolean; // Keep readonly prop
}

// Default readonly to false if not provided
export function AnnotationsView({ highlights, annotations, onHighlightClick, addAnnotation, activeHighlight, removeAnnotation, updateAnnotation, readonly = false }: AnnotationsViewProps) {
	const [sortedHighlights, setSortedHighlights] = React.useState<PaperHighlight[]>([]);
	const [highlightAnnotationMap, setHighlightAnnotationMap] = React.useState<Map<string, PaperHighlightAnnotation[] | null>>(new Map());
	const highlightRefs = useRef(new Map<string, React.RefObject<HTMLDivElement | null>>());

	// ... (useEffect hooks remain the same) ...
	useEffect(() => {
		if (activeHighlight?.id) {
			const ref = highlightRefs.current.get(activeHighlight.id);
			if (ref?.current) {
				ref.current.scrollIntoView({
					behavior: 'smooth',
					block: 'center'
				});
			}
		}
	}, [activeHighlight]);

	useEffect(() => {
		const sorted = [...highlights].sort((a, b) => {
			if (a.start_offset === b.start_offset) {
				return a.end_offset - b.end_offset;
			}
			return a.start_offset - b.start_offset;
		});
		setSortedHighlights(sorted);

		const annotationMap = new Map<string, PaperHighlightAnnotation[]>();

		annotations.forEach((annotation) => {
			const highlightId = annotation.highlight_id;
			const existingAnnotations = annotationMap.get(highlightId) || [];
			existingAnnotations.push(annotation);
			annotationMap.set(highlightId, existingAnnotations);
		});

		setHighlightAnnotationMap(annotationMap);
	}, [highlights, annotations]);


	return (
		<div className="flex flex-col gap-4 p-4">
			{highlights.length === 0 ? (
				<p className="text-secondary-foreground text-sm">
					{readonly ? "No annotations for this paper." : "No annotations yet. Highlight some text to get started."}
				</p>
			) : (
				<div className="space-y-4">
					{sortedHighlights.map((highlight) => {
						if (highlight.id && !highlightRefs.current.has(highlight.id)) {
							const ref = React.createRef<HTMLDivElement>();
							if (ref && ref !== null) {
								highlightRefs.current.set(highlight.id, ref);
							}
						}
						// Conditional classes for the main highlight card
						const cardBaseClasses = "border rounded-lg p-4 transition-colors px-0";
						const cardInteractiveClasses = "hover:bg-secondary/50 cursor-pointer";
						const cardActiveClasses = activeHighlight?.id === highlight.id ? "bg-secondary/80" : "";

						return (
							<Card
								key={highlight.id}
								ref={highlight.id ? highlightRefs.current.get(highlight.id) : undefined}
								className={`${cardBaseClasses} ${cardInteractiveClasses} ${cardActiveClasses}`}
								onClick={() => onHighlightClick(highlight)}
							>
								<CardContent>
									<p className="text-sm font-normal mb-2">
										&ldquo;{highlight.raw_text}&rdquo;
									</p>
									{
										highlight.id &&
										highlightAnnotationMap.has(highlight.id) && (
											<>
												{
													highlightAnnotationMap.get(highlight.id)?.map((annotation) => (
														<AnnotationCard
															key={annotation.id}
															annotation={annotation}
															// Pass down optional functions and readonly status
															removeAnnotation={removeAnnotation}
															updateAnnotation={updateAnnotation}
															readonly={readonly}
														/>
													))
												}
												{
													highlightAnnotationMap.get(highlight.id)?.length === 0 && <p className="text-sm text-muted-foreground">No annotation yet.</p>
												}
											</>
										)
									}
									{/* Only show AnnotationButton if not readonly, highlight is active, and addAnnotation is provided */}
									{
										highlight.id && activeHighlight?.id === highlight.id && !readonly && addAnnotation && (
											<div className="flex justify-between items-center mt-2 pt-2 border-t"> {/* Added margin/padding/border */}
												<AnnotationButton
													highlightId={highlight.id}
													addAnnotation={addAnnotation}
												/>
											</div>
										)
									}
								</CardContent>
							</Card>
						);
					})}
				</div>
			)}
		</div>
	);
}
