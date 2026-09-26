// @vitest-environment node
// Build candidates at runtime: negative fixtures must not seed production
// Tailwind utilities merely because this test file lives under src/.
import { describe, expect, it } from "vitest";
import { analyzeSources, compareFindings, fingerprintFinding, type DesignFinding } from "../../../scripts/design-policy/analyze.mjs";

const palette = (family = "bg", color = "red", shade = "500") => [family, color, shade].join("-");
const utility = (family: string, value: string | number) => [family, value].join("-");
const arbitrary = (family: string, value: string) => `${family}-[${value}]`;
const hex = "#" + "123456";
const quote = (value: string) => JSON.stringify(value);
const analyze = (source: string, file = "src/Fixture.tsx") => analyzeSources([{ file, source }]);
const component = (classes: string, owner = "Card") => `export const ${owner}=()=> <div className=${quote(classes)} />;`;
const identities = (findings: DesignFinding[]) => findings.map(({ rule, token, owner }) => ({ rule, token, owner }));

describe("source-aware styling sinks", () => {
  it("classifies variants, important markers, negative spacing and fixed pixel text", () => {
    const tokens = [
      `hover:!${palette()}`, `${palette("text", "slate", "900")}!`,
      `rtl:-${utility("ml", 3)}`, arbitrary("text", "13px"),
      arbitrary("bg", hex), utility("border", "white"),
    ];
    const result = analyze(component(tokens.join(" ")));
    expect(identities(result.findings)).toEqual(expect.arrayContaining([
      { rule: "numbered-palette", token: tokens[0], owner: "Card" },
      { rule: "numbered-palette", token: tokens[1], owner: "Card" },
      { rule: "physical-spacing", token: tokens[2], owner: "Card" },
      { rule: "fixed-text-px", token: tokens[3], owner: "Card" },
      { rule: "literal-color-class", token: tokens[4], owner: "Card" },
      { rule: "literal-color-class", token: tokens[5], owner: "Card" },
    ]));
    expect(result.findings).toHaveLength(6);
    expect(result.findings.every((finding) => finding.line === 1 && finding.column > 1)).toBe(true);
  });

  it("ignores comments, ordinary copy, non-styling data and opaque identifiers", () => {
    const bad = palette();
    const result = analyze(`// ${bad}\nconst copy=${quote(bad)}; const record={color:${quote(hex)}}; export const Card=()=> <><p title=${quote(bad)}>${bad}</p><Widget data={record}/><div className={copy}/></>;`);
    expect(result.findings).toEqual([]);
    expect(result.limitations.join(" ")).toContain("runtime dataflow");
    expect(result.limitations.join(" ")).toContain("not computed styles");
  });

  it("allows semantic tokens, currentColor, transparent, URL fragments and geometry", () => {
    const classes = [utility("bg", "card"), utility("text", "foreground"), utility("fill", "current"), arbitrary("bg", "var(--surface)"), arbitrary("text", "clamp(1rem,2vw,2rem)")];
    const result = analyze(`export const Card=()=> <svg className=${quote(classes.join(" "))} fill="currentColor" stroke="transparent" style={{width:42,height:dynamicWidth,transform:'translateX(2px)',color:'var(--foreground)',background:'url(#red)'}} />;`);
    expect(result.findings).toEqual([]);
  });

  it("inspects literal conditional/logical class branches and complete template tokens", () => {
    const first = palette(), second = utility("pr", 4), partial = ["bg", "red", ""].join("-");
    const result = analyze(`export const Card=()=> <><div className={flag ? ${quote(first)} : (other && ${quote(second)})}/><div className={\`${partial}\${shade} ${first}\`}/><div className={\`\${prefix}${first}\`}/></>;`);
    expect(result.findings.filter((finding) => finding.token === first)).toHaveLength(2);
    expect(result.findings.filter((finding) => finding.token === second)).toHaveLength(1);
  });

  it("follows whole-token template interpolations without treating concatenated fragments as utilities", () => {
    const first = palette(), second = palette("bg", "blue");
    const choice = `active ? ${quote(first)} : ${quote(second)}`;
    const interpolation = "${" + choice + "}";
    const source = "export const Card=()=> <>" +
      "<div className={`" + interpolation + " " + utility("p", 4) + "`}/>" +
      "<div className={`x" + interpolation + "`}/>" +
      "<div className={`" + interpolation + "-suffix`}/></>;";
    expect(analyze(source).findings.map((finding) => finding.token)).toEqual([first, second].sort());
  });

  it("inspects literal JSX spreads and computed literal style keys but not opaque spread data", () => {
    const bad = palette();
    const source = `export const Card=()=> <><div {...{className:${quote(bad)},style:{['backgroundColor']:${quote(hex)},width:30},title:${quote(bad)}}}/><div {...externalProps}/></>;`;
    const result = analyze(source);
    expect(identities(result.findings)).toEqual(expect.arrayContaining([
      { rule: "numbered-palette", token: bad, owner: "Card" },
      { rule: "literal-paint", token: `background-color:${hex}`, owner: "Card" },
    ]));
    expect(result.findings).toHaveLength(2);
  });

  it("supports static concatenation/templates but does not evaluate arbitrary calls", () => {
    const token = palette();
    const source = `export const Card=()=> <><div className={${quote("bg-")}+${quote("red-500")}}/><div className={\`bg-\${'red'}-500\`}/><div className={unknown(${quote(token)})}/></>;`;
    expect(analyze(source).findings.map((finding) => finding.token)).toEqual([token, token]);
  });

  it.each([
    ["import {cn as join} from '@/lib/utils';", "join"],
    ["import join from 'clsx';", "join"],
    ["import {clsx as join} from 'clsx';", "join"],
    ["import * as join from 'clsx';", "join.clsx"],
    ["import {twMerge as join} from 'tailwind-merge';", "join"],
  ])("recognizes imported helper bindings: %s", (imports, call) => {
    const token = palette();
    const result = analyze(`${imports} export const Card=()=> <div className={${call}(${quote(token)}, [flag && ${quote(utility("mr", 2))}], {${quote(arbitrary("text", "12px"))}: selected})}/>;`);
    expect(result.findings).toHaveLength(3); // no duplicate counting from JSX + producer traversal
  });

  it("does not mistake shadowed, unrelated or arbitrary helper members for imported sinks", () => {
    const bad = palette();
    const result = analyze(`import {cn} from '@/lib/utils'; import {clsx} from 'elsewhere'; export function Card(cn: (...parts:string[])=>string){return <div className={cn(${quote(bad)})}/>;} const copy=clsx(${quote(bad)}); const other=cn.unrelated(${quote(bad)});`);
    expect(result.findings).toEqual([]);
  });

  it("recognizes CVA styling values without treating variant/default labels as classes", () => {
    const bad = palette(), spaced = utility("pl", 2);
    const config = { variants: { tone: { [bad]: utility("bg", "card") }, size: { small: spaced } }, defaultVariants: { tone: bad }, compoundVariants: [{ tone: bad, className: bad }] };
    const result = analyze(`import {cva as recipe} from 'class-variance-authority'; const cardRecipe=recipe(${quote(bad)},${JSON.stringify(config)});`);
    expect(result.findings.filter((finding) => finding.token === bad)).toHaveLength(2);
    expect(result.findings.filter((finding) => finding.token === spaced)).toHaveLength(1);
    expect(result.findings.every((finding) => finding.owner === "cardRecipe")).toBe(true);
  });

  it("inspects known custom class/style props and SVG paint, not geometry", () => {
    const bad = palette();
    const result = analyze(`export const Chart=()=> <><Widget iconBgClass=${quote(bad)} valueClassName=${quote(arbitrary("text", "14px"))} contentStyle={active?{color:${quote(hex)},width:20}:{color:'var(--foreground)'}} tick={{fill:'red',fontSize:12}}/><svg><rect fill=${quote(hex)} stroke="currentColor" width={dynamic}/></svg></>;`);
    expect(result.findings).toHaveLength(5);
    expect(result.findings.filter((finding) => finding.rule === "literal-paint").map((finding) => finding.token).sort()).toEqual([`color:${hex}`, `fill:${hex}`, "fill:red"].sort());
    expect(result.findings.every((finding) => finding.owner === "Chart")).toBe(true);
  });

  it("handles CSS color functions/fallbacks, arbitrary variants and literal property paint", () => {
    const colorFunction = "rgb(1 2 3 / 0.5)";
    const candidate = `[&:nth-child(2)]:${arbitrary("bg", "rgb(1_2_3)")}`;
    const propertyClass = "[" + "color:" + hex + "]";
    const result = analyze(`export const Card=()=> <div className=${quote(`${candidate} ${propertyClass}`)} style={{background:${quote(`linear-gradient(var(--start), ${hex})`)},borderColor:${quote(`var(--edge, ${hex})`)},color:${quote(colorFunction)},fill:'rgb(var(--channels) / 0.4)',stroke:'url(#red)'}}/>;`);
    expect(result.findings.filter((finding) => finding.rule === "literal-color-class").map((finding) => finding.token)).toEqual([candidate, propertyClass].sort());
    expect(result.findings.filter((finding) => finding.rule === "literal-paint").map((finding) => finding.token)).toEqual([`background:${hex}`, `border-color:${hex}`, "color:rgb(1 2 3/0.5)"].sort());
  });

  it("decodes arbitrary-value whitespace for real-style shadows and gradients while retaining original tokens", () => {
    const shadow = arbitrary("shadow", "0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)");
    const hover = "hover:" + arbitrary("shadow", "0_18px_38px_rgba(16,24,40,0.11)");
    const gradient = arbitrary("bg", "linear-gradient(to_right,_var(--from_blue),_rgba(1,2,3,0.5))");
    const property = "[" + "box-shadow:0_2px_4px_" + hex + "]";
    const fallback = arbitrary("shadow", "0_1px_2px_var(--shadow_color,_rgb(1_2_3))");
    const tokens = [shadow, hover, gradient, property, fallback];
    const result = analyze(component(tokens.join(" ")));
    expect(result.findings).toHaveLength(tokens.length);
    expect(result.findings.every((finding) => finding.rule === "literal-color-class")).toBe(true);
    expect(result.findings.map((finding) => finding.token)).toEqual([...tokens].sort());
    expect(result.findings.every((finding) => finding.fingerprint === fingerprintFinding(finding))).toBe(true);
  });

  it("preserves underscore semantics in variables, URLs and escaped identifiers without decoding inline CSS", () => {
    const escaped = "red" + String.raw`\_` + "blue";
    const tokens = [
      arbitrary("shadow", "0_1px_2px_var(--shadow_red)"),
      arbitrary("bg", "linear-gradient(to_right,_var(--start_blue),_currentColor)"),
      arbitrary("bg", "url('/assets/red_blue.svg')"),
      arbitrary("shadow", "0_1px_2px_" + escaped),
    ];
    // The final unknown identifier is not approved CSS; it must not be split
    // into two invented named-color findings. JSX expression preserves escapes.
    const result = analyze(`export const Card=()=> <div className={${quote(tokens.join(" "))}} style={{color:'red_blue',fill:'var(--red_blue)',boxShadow:'0_1px_2px_rgba(1,2,3,0.4)'}}/>;`);
    expect(result.findings).toEqual([]);
  });

  it("does not silently exclude generated primitives, tests or example snapshots", () => {
    const source = component(palette());
    const result = analyzeSources(["src/components/ui/Generated.tsx", "src/__tests__/Example.test.tsx", "docs/examples/Example.tsx"].map((file) => ({ file, source })));
    expect(result.findings).toHaveLength(3);
    expect(result.limitations.join(" ")).toContain("No caller exclusions");
  });

  it("returns lossless owned JSON and deterministic file ordering", () => {
    const files = [{ file: "src/B.tsx", source: component(palette()) }, { file: "src/A.tsx", source: component(utility("mr", 2)) }];
    const result = analyzeSources(files);
    expect(analyzeSources([...files].reverse())).toEqual(result);
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(result.findings.every((finding) => finding.fingerprint === fingerprintFinding(finding))).toBe(true);
  });

  it("fails closed on syntax errors before returning findings from other files", () => {
    expect(() => analyzeSources([{ file: "src/Good.tsx", source: component(palette()) }, { file: "src/Bad.tsx", source: "export const X=()=> <div className={" }])).toThrow(/Design policy syntax error in src\/Bad.tsx:/);
    expect(() => analyzeSources([{ file: "../escape.tsx", source: "" }])).toThrow(/relative POSIX/);
    expect(() => analyzeSources([{ file: "src/A.css", source: "" }])).toThrow(/Unsupported source extension/);
    expect(() => analyzeSources([{ file: "src/A.ts", source: "" }, { file: "src/A.ts", source: "" }])).toThrow(/Duplicate source file/);
  });
});

describe("no-growth multiset accounting, not approval", () => {
  it("ignores line/formatting changes while keeping existing debt visible", () => {
    const bad = palette();
    const before = analyze(component(bad)).findings;
    const after = analyze(`\nexport const Card = () => (\n  <div\n    className=${quote(bad)}\n  />\n);`).findings;
    expect(before[0]?.line).not.toBe(after[0]?.line);
    const result = compareFindings(before, after);
    expect(result.hasGrowth).toBe(false);
    expect(result.totals).toEqual({ baseline: 1, current: 1, existing: 1, introduced: 0, removed: 0 });
  });

  it("counts added duplicate occurrences instead of collapsing them into a set", () => {
    const bad = palette(); const before = analyze(component(bad)).findings;
    const after = analyze(component(`${bad} ${bad} ${bad}`)).findings;
    const result = compareFindings(before, after);
    expect(result.introduced[0]?.count).toBe(2);
    expect(result.existing[0]?.count).toBe(1);
    expect(result.hasGrowth).toBe(true);
  });

  it.each(["owner", "path"] as const)("treats movement to a new %s as introduced debt", (changed) => {
    const bad = palette(); const before = analyze(component(bad)).findings;
    const after = analyze(component(bad, changed === "owner" ? "OtherCard" : "Card"), changed === "path" ? "src/Other.tsx" : "src/Fixture.tsx").findings;
    const result = compareFindings(before, after);
    expect(result.totals).toEqual({ baseline: 1, current: 1, existing: 0, introduced: 1, removed: 1 });
    expect(result.hasGrowth).toBe(true);
  });

  it("reports removals and does not let net reductions hide a newly introduced identity", () => {
    const bad = palette(); const before = analyze(component(`${bad} ${bad} ${bad}`)).findings;
    const current = analyze(component(utility("ml", 2))).findings;
    const result = compareFindings(before, current);
    expect(result.totals).toEqual({ baseline: 3, current: 1, existing: 0, introduced: 1, removed: 3 });
    expect(result.hasGrowth).toBe(true);
    expect(compareFindings(before, []).removed[0]?.count).toBe(3);
    expect(compareFindings(before, []).hasGrowth).toBe(false);
  });

  it("uses identity fields rather than trusting a supplied fingerprint", () => {
    const before = analyze(component(palette())).findings;
    const after = analyze(component(utility("mr", 2))).findings;
    const changed = after[0], original = before[0]; if (!changed || !original) throw new Error("Missing fixture findings");
    expect(compareFindings(before, [{ ...changed, fingerprint: original.fingerprint }]).hasGrowth).toBe(true);
  });
});
