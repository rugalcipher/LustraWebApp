import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/api/queryKeys";
import { usePrincipal } from "@/auth/PrincipalContext";
import * as gradeService from "@/services/talentGradeService";
import type { CreateGradeInput, UpdateGradeInput } from "@/services/talentGradeService";

/** Admin talent-grade configuration hooks, gated on the grade permissions. */
export function useTalentGrades(includeArchived = true) {
  const { hasPermission } = usePrincipal();
  return useQuery({
    queryKey: [...queryKeys.admin.talentGrades(), includeArchived],
    queryFn: ({ signal }) => gradeService.listGrades(includeArchived, signal),
    enabled: hasPermission("TalentGrades.View"),
    staleTime: 30_000,
  });
}

function useGradeInvalidation() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.admin.talentGrades() });
}

export function useCreateGrade() {
  const invalidate = useGradeInvalidation();
  return useMutation({
    mutationFn: (input: CreateGradeInput) => gradeService.createGrade(input),
    retry: false,
    onSuccess: invalidate,
  });
}

export function useUpdateGrade() {
  const invalidate = useGradeInvalidation();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGradeInput }) => gradeService.updateGrade(id, input),
    retry: false,
    onSuccess: invalidate,
  });
}

export function useArchiveGrade() {
  const invalidate = useGradeInvalidation();
  return useMutation({
    mutationFn: (id: string) => gradeService.archiveGrade(id),
    retry: false,
    onSuccess: invalidate,
  });
}

export function useRestoreGrade() {
  const invalidate = useGradeInvalidation();
  return useMutation({
    mutationFn: (id: string) => gradeService.restoreGrade(id),
    retry: false,
    onSuccess: invalidate,
  });
}

/** Whether the caller can configure grades (Manage), vs merely view. */
export function useCanManageGrades(): boolean {
  const { hasPermission } = usePrincipal();
  return hasPermission("TalentGrades.Manage");
}
