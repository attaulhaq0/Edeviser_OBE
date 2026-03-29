-- Atomic department deletion: only deletes if no programs reference the department.
-- Returns TRUE if the department was deleted, FALSE if programs exist.
CREATE OR REPLACE FUNCTION public.delete_department_if_no_programs(dept_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_id uuid;
BEGIN
  DELETE FROM departments
  WHERE id = dept_id
    AND NOT EXISTS (
      SELECT 1 FROM programs WHERE department_id = dept_id
    )
  RETURNING id INTO deleted_id;

  RETURN deleted_id IS NOT NULL;
END;
$$;
