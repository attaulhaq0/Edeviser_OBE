// Feature: runtime deployment governance, function-directory ownership boundaries.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { relative, resolve } from "node:path";
import { declaredLocalSourceClosure } from "../../../scripts/runtime-source-parity.mjs";

const fixture = vi.hoisted(() => ({ files: new Map<string, string>() }));

// Exercise the actual source-closure implementation with virtual files only.
// No fake function directories or files are created in the application tree.
vi.mock("node:fs", () => {
  const virtualFs = {
    existsSync: (file: string) => fixture.files.has(resolve(file)),
    readFileSync: (file: string) => {
      const source = fixture.files.get(resolve(file));
      if (source === undefined)
        throw new Error(`Missing virtual fixture: ${file}`);
      return source;
    },
    statSync: (file: string) => ({
      isFile: () => fixture.files.has(resolve(file)),
    }),
    readdirSync: () => {
      throw new Error(
        "Local source closure must not enumerate fixture directories"
      );
    },
  };
  return { ...virtualFs, default: virtualFs };
});

const functionRoot = resolve(process.cwd(), "supabase/functions");
const entrypoint = resolve(functionRoot, "probe/index.ts");
const dependencySource = "export default 1;\n";
const seedImport = (specifier: string) => {
  const source = `import value from "${specifier}";\n`;
  const dependency = resolve(functionRoot, "probe", specifier);
  fixture.files.set(entrypoint, source);
  fixture.files.set(dependency, dependencySource);
  return {
    source,
    logicalDependency: `functions/${relative(functionRoot, dependency).replace(
      /\\/g,
      "/"
    )}`,
  };
};

beforeEach(() => fixture.files.clear());

describe("runtime source ownership uses a directory boundary, not a string prefix", () => {
  it.each([
    "../probe-extra/helper.ts",
    "../probe-extra.ts",
    "./nested/../../probe-extra/helper.ts",
    "../other/helper.ts",
  ])("rejects undeclared sibling dependency %s", (specifier) => {
    const { logicalDependency } = seedImport(specifier);
    expect(() => declaredLocalSourceClosure("probe", [])).toThrow(
      `probe imports undeclared runtime dependency ${logicalDependency}`
    );
  });

  it.each(["./nested/helper.ts", "./nested/../helper.ts"])(
    "retains same-function dependency %s",
    (specifier) => {
      const { source, logicalDependency } = seedImport(specifier);
      expect([...declaredLocalSourceClosure("probe", []).entries()]).toEqual([
        ["functions/probe/index.ts", source],
        [logicalDependency, dependencySource],
      ]);
    }
  );

  it.each([
    "supabase/functions/_shared/fixture.ts",
    "supabase/functions/_shared/**",
  ])(
    "retains an explicitly declared shared dependency via %s",
    (declaration) => {
      const { source, logicalDependency } = seedImport("../_shared/fixture.ts");
      expect([
        ...declaredLocalSourceClosure("probe", [declaration]).entries(),
      ]).toEqual([
        ["functions/probe/index.ts", source],
        [logicalDependency, dependencySource],
      ]);
    }
  );

  it("still rejects a shared dependency without its declaration", () => {
    seedImport("../_shared/fixture.ts");
    expect(() => declaredLocalSourceClosure("probe", [])).toThrow(
      "probe imports undeclared runtime dependency functions/_shared/fixture.ts"
    );
  });

  it("also checks a sibling-prefix import reached through an owned helper", () => {
    seedImport("./nested/helper.ts");
    fixture.files.set(
      resolve(functionRoot, "probe/nested/helper.ts"),
      'export { default } from "../../probe-extra/helper.ts";\n'
    );
    fixture.files.set(
      resolve(functionRoot, "probe-extra/helper.ts"),
      dependencySource
    );
    expect(() => declaredLocalSourceClosure("probe", [])).toThrow(
      "probe imports undeclared runtime dependency functions/probe-extra/helper.ts"
    );
  });
});
