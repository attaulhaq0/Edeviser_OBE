const FUNCTION_PREFIX = "supabase/functions/";
const SHARED_PREFIX = `${FUNCTION_PREFIX}_shared/`;

export const normalizeRuntimeDependencyPath = (value) =>
  typeof value === "string"
    ? value.replaceAll("\\", "/").replace(/^\.\//, "")
    : "";

export const isRuntimeDependencyPath = (value) => {
  const path = normalizeRuntimeDependencyPath(value);
  if (!path.startsWith(FUNCTION_PREFIX) || path.includes("//")) return false;
  const suffix = path.slice(FUNCTION_PREFIX.length);
  if (
    !suffix ||
    suffix.split("/").some((part) => part === "." || part === "..")
  )
    return false;
  const hasGlob = path.includes("*");
  if (!hasGlob) return true;
  return (
    path.startsWith(SHARED_PREFIX) &&
    path.endsWith("/**") &&
    path.indexOf("*") === path.length - 2
  );
};

export const matchesRuntimeDependencyPath = (candidate, declaration) => {
  const path = normalizeRuntimeDependencyPath(candidate);
  const declared = normalizeRuntimeDependencyPath(declaration);
  if (!isRuntimeDependencyPath(declared)) return false;
  if (!declared.endsWith("/**")) return path === declared;
  const directory = declared.slice(0, -3);
  return path.startsWith(`${directory}/`);
};
