import { Ruler } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Shimmer from "@/components/shared/Shimmer";
import { InlineEmpty } from "@/components/shared/EmptyState";
import RubricPreview from "@/components/shared/RubricPreview";
import { useRubric } from "@/hooks/useRubrics";

interface RubricPreviewDialogProps {
  /**
   * The id of the rubric to preview. When `null` the query stays disabled and
   * the dialog content renders nothing meaningful — pair this with `open` so
   * the dialog only mounts content for a real rubric.
   */
  rubricId: string | null;
  /** Controlled open state. */
  open: boolean;
  /** Controlled open-change handler (also wired to the dialog close button). */
  onOpenChange: (open: boolean) => void;
}

/**
 * Read-only rubric preview surfaced from the rubric list "Preview" action
 * (Req 14.2). It loads the rubric's criteria and levels via `useRubric` and
 * renders them through the presentational `RubricPreview` table with **no edit
 * controls** (Req 14.3). Loading shows a shimmer; a missing rubric and a query
 * error each get a distinct empty state.
 */
const RubricPreviewDialog = ({
  rubricId,
  open,
  onOpenChange,
}: RubricPreviewDialogProps) => {
  const { data: rubric, isLoading, isError } = useRubric(rubricId ?? undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rubric Preview</DialogTitle>
          <DialogDescription>
            Read-only view of the rubric criteria and performance levels.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3" data-testid="rubric-preview-loading">
            <Shimmer className="h-6 w-1/3" />
            <Shimmer className="h-40 w-full" />
          </div>
        ) : isError ? (
          <InlineEmpty
            icon={<Ruler className="h-6 w-6 text-gray-400" />}
            title="Unable to load rubric"
            description="Something went wrong while loading this rubric. Please try again."
          />
        ) : rubric ? (
          <RubricPreview rubric={rubric} />
        ) : (
          <InlineEmpty
            icon={<Ruler className="h-6 w-6 text-gray-400" />}
            title="Rubric not found"
            description="This rubric may have been deleted."
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default RubricPreviewDialog;
