import { useState, useCallback } from "react";
import { useSaveAnnotationMutation, useGetAnnotationQuery } from "../annotationApi";
import type { AnnotationData } from "../types";

export function useAnnotationState(uploadId: string) {
  const { data, isLoading, isError } = useGetAnnotationQuery(uploadId, {
    // Skip if no uploadId yet (e.g. component rendered before upload completes)
    skip: !uploadId,
  });

  const [saveAnnotation, { isLoading: isSaving }] = useSaveAnnotationMutation();
  const [isDirty, setIsDirty] = useState(false);

  const markDirty = useCallback(() => setIsDirty(true), []);

  const save = useCallback(
    async (annotationData: AnnotationData) => {
      if (!uploadId) return;
      await saveAnnotation({ uploadId, data: annotationData }).unwrap();
      setIsDirty(false);
    },
    [uploadId, saveAnnotation],
  );

  return {
    savedData:  data?.data?.annotation?.data ?? null,
    isLoading,
    isError,
    isDirty,
    isSaving,
    markDirty,
    save,
  };
}
