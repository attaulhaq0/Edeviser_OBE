import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { captureAnalyticsEvent } from "@/lib/analyticsConsent";
import {
  CourseFileClientError,
  courseFileErrorKeys,
  courseFileInvocationError,
  parseCourseFileResponse,
} from "@/lib/courseFile";

export interface GenerateCourseFileInput {
  course_id: string;
  semester_id: string;
}
export interface GenerateCourseFileResult {
  success: boolean;
  download_url: string;
  file_type: "pdf";
  course_name: string;
  course_code: string;
  semester: string;
  generated_at: string;
}

export const useGenerateCourseFile = () => {
  const { t } = useTranslation("coordinator");
  const url = useRef<string | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
    };
  }, []);
  return useMutation({
    retry: false,
    mutationFn: async (
      input: GenerateCourseFileInput
    ): Promise<GenerateCourseFileResult> => {
      if (url.current) URL.revokeObjectURL(url.current);
      url.current = null;
      try {
        const { data, error } = await supabase.functions.invoke(
          "generate-course-file",
          { body: input }
        );
        if (error) throw await courseFileInvocationError(error, data);
        if (data?.success === false)
          throw await courseFileInvocationError(null, data);
        const parsed = parseCourseFileResponse(data);
        if (!mounted.current)
          throw new CourseFileClientError("GENERATION_FAILED");
        // If concurrent requests resolve, dispose the previous result as well.
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = URL.createObjectURL(parsed.blob);
        return { ...parsed.metadata, download_url: url.current };
      } catch (error) {
        const safe =
          error instanceof CourseFileClientError
            ? error
            : await courseFileInvocationError(error, null);
        const localized = new Error(t(courseFileErrorKeys[safe.code]));
        Object.assign(localized, { code: safe.code, status: safe.status });
        throw localized;
      }
    },
    onSuccess: (_result, variables) => {
      captureAnalyticsEvent("course_file_snapshot_generated", {
        course_id: variables.course_id,
        semester_id: variables.semester_id,
      });
    },
  });
};
