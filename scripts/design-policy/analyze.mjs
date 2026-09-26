// Pure kernel: supplied text only. No filesystem, Git, subprocesses or baseline writes.
import ts from "typescript";

export const RULES = Object.freeze(["numbered-palette", "literal-color-class", "physical-spacing", "fixed-text-px", "literal-paint"]);
export const LIMITATIONS = Object.freeze([
  "Source candidates, not computed styles, contrast results, semantic approval or executed branches.",
  "Only actual JSX class/style/paint props and recognized imported cn/clsx/cva/twMerge producers are inspected. No caller exclusions are applied.",
  "Import aliases and lexical shadowing are resolved; assignments/variables, arbitrary function results, imported constants and runtime dataflow are not expanded.",
  "Literal conditional/logical branches and supported helper configurations are inspected. Opaque spreads and dynamic/incomplete tokens are not certified clean.",
  "Recognized helper specifiers are @/lib/utils, clsx, tailwind-merge and class-variance-authority; arbitrary local wrappers/re-exports are not inferred.",
  "Style-like props use an explicit finite name list; CSS custom-property definitions and arbitrary component APIs are not inferred.",
  "Arbitrary class paint inspection decodes Tailwind underscore whitespace, preserving escaped underscores, URLs and variable identifiers; inline CSS is not decoded and reported class tokens remain unchanged.",
  "Locations identify the owning literal/expression in TypeScript UTF-16 coordinates; fingerprints ignore locations and preserve duplicate occurrence counts.",
]);
const compare = (a, b) => a < b ? -1 : a > b ? 1 : 0;
const palettes = "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose";
const colorUtility = "(?:bg|text|border(?:-[trblxyse])?|ring(?:-offset)?|outline|decoration|divide(?:-[xy])?|shadow|accent|caret|fill|stroke|placeholder|from|via|to)";
const numbered = new RegExp(`^${colorUtility}-(?:${palettes})-(?:50|[1-9]00|950)(?:/.*)?$`);
const unnumbered = new RegExp(`^${colorUtility}-(?:black|white)(?:/.*)?$`);
const arbitraryColor = new RegExp(`^${colorUtility}-\\[(.*)\\](?:/.*)?$`);
const paintFields = new Set("color background background-color border border-color border-top border-top-color border-right border-right-color border-bottom border-bottom-color border-left border-left-color border-inline border-inline-color border-block border-block-color outline outline-color fill stroke stop-color flood-color lighting-color box-shadow text-shadow text-decoration text-decoration-color caret-color accent-color column-rule column-rule-color".split(" "));
const styleProps = new Set(["style", "contentStyle", "wrapperStyle", "labelStyle", "itemStyle", "tick", "tickLine", "axisLine", "dot", "activeDot", "cursor", "label"]);
const namedColors = new Set(("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgrey darkgreen darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray grey green greenyellow honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgrey lightgreen lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen").split(" "));
const kebab = (name) => name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
const classProp = (name) => name === "className" || name.endsWith("ClassName") || ["iconBgClass", "iconColorClass"].includes(name);
const cleanColor = (text) => text.toLowerCase().replace(/\s+/g, " ").replace(/\s*([(),/])\s*/g, "$1").trim();
const helpers = {
  "@/lib/utils": { cn: "classes" },
  clsx: { default: "classes", clsx: "classes" },
  "tailwind-merge": { twMerge: "classes" },
  "class-variance-authority": { cva: "cva" },
};
function validFile(file) {
  return typeof file === "string" && file.length > 0 && !file.startsWith("/") && !/^[a-z]:/i.test(file)
    && !file.includes("\\") && !file.split("/").some((part) => !part || part === "." || part === "..");
}
function unwrap(node) {
  while (node && (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isTypeAssertionExpression(node) || ts.isNonNullExpression(node) || ts.isSatisfiesExpression(node))) node = node.expression;
  return node;
}
function staticText(node) {
  node = unwrap(node);
  if (!node) return undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = staticText(node.left), right = staticText(node.right);
    return left !== undefined && right !== undefined ? left + right : undefined;
  }
  if (ts.isTemplateExpression(node)) {
    let text = node.head.text;
    for (const span of node.templateSpans) {
      const value = staticText(span.expression);
      if (value === undefined) return undefined;
      text += value + span.literal.text;
    }
    return text;
  }
  return undefined;
}
function nameOf(node) {
  if (node && ts.isComputedPropertyName(node)) return staticText(node.expression);
  return node && (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) ? node.text : undefined;
}
function ownerOf(node) {
  const names = [];
  for (let at = node.parent; at; at = at.parent) {
    let name;
    if (ts.isVariableDeclaration(at) || ts.isFunctionDeclaration(at) || ts.isFunctionExpression(at) || ts.isClassDeclaration(at) || ts.isMethodDeclaration(at)) name = nameOf(at.name);
    if (ts.isPropertyAssignment(at) && (ts.isArrowFunction(unwrap(at.initializer)) || ts.isFunctionExpression(unwrap(at.initializer)))) name = nameOf(at.name);
    if (ts.isExportAssignment(at) && !at.isExportEquals) name = "default";
    if (name && names.at(-1) !== name) names.push(name);
  }
  return names.reverse().join(".") || "<module>";
}
function baseUtility(token) {
  let depth = 0, last = -1;
  for (let i = 0; i < token.length; i++) {
    const char = token[i];
    if (char === "\\") { i++; continue; }
    if (char === "[" || char === "(") depth++;
    if (char === "]" || char === ")") depth--;
    if (char === ":" && depth === 0) last = i;
  }
  return token.slice(last + 1).replace(/^!+|!+$/g, "");
}
function closeParen(text, start) {
  let depth = 1, quote = "";
  for (let i = start + 1; i < text.length; i++) {
    const char = text[i];
    if (char === "\\") { i++; continue; }
    if (quote) { if (char === quote) quote = ""; continue; }
    if (char === "\"" || char === "'") { quote = char; continue; }
    if (char === "(") depth++;
    if (char === ")" && --depth === 0) return i;
    if (char !== ")") continue;
  }
  return -1;
}
// Decode only Tailwind arbitrary-value whitespace for inspection. Never alter
// the reported candidate. URL contents and variable identifiers keep underscores;
// explicit escaped underscores remain identifiers, not invented word boundaries.
function arbitraryPaintValue(value) {
  let result = "";
  for (let i = 0; i < value.length;) {
    if (value[i] === "\\" && value[i + 1] === "_") { result += "_"; i += 2; continue; }
    const fn = /^(url|var|env)\(/i.exec(value.slice(i));
    if (fn && !/[\w-]/.test(result.at(-1) ?? "")) {
      const open = i + fn[0].length - 1;
      const end = closeParen(value, open);
      if (end >= 0) {
        if (fn[1].toLowerCase() === "url") result += value.slice(i, end + 1);
        else {
          const args = value.slice(open + 1, end), comma = args.indexOf(",");
          const identifier = comma < 0 ? args : args.slice(0, comma);
          result += value.slice(i, open + 1) + identifier.replace(/\\_/g, "_");
          if (comma >= 0) result += "," + arbitraryPaintValue(args.slice(comma + 1));
          result += ")";
        }
        i = end + 1; continue;
      }
    }
    result += value[i] === "_" ? " " : value[i];
    i++;
  }
  return result;
}
// CSS value inspection is deliberately bounded; it is not a CSS validity parser.
function colorsIn(text) {
  const found = [];
  for (let i = 0; i < text.length;) {
    if (text[i] === "\"" || text[i] === "'") {
      const quote = text[i++];
      while (i < text.length) { if (text[i] === "\\") i += 2; else if (text[i++] === quote) break; }
      continue;
    }
    const hex = /^#[\da-f]+/i.exec(text.slice(i));
    if (hex) {
      if ([4, 5, 7, 9].includes(hex[0].length) && !/[\w-]/.test(text[i + hex[0].length] ?? "")) found.push(cleanColor(hex[0]));
      i += hex[0].length; continue;
    }
    const word = /^[-a-z_][-\w]*/i.exec(text.slice(i));
    if (!word) { i++; continue; }
    const name = word[0].toLowerCase();
    const after = i + word[0].length;
    let start = after; while (/\s/.test(text[start] ?? "") && start < text.length) start++;
    if (text[start] === "(") {
      const end = closeParen(text, start);
      if (end < 0) { i = after; continue; }
      const args = text.slice(start + 1, end);
      if (name === "var" || name === "env") {
        // Variable identifiers are not named colors; only an explicit fallback is inspected.
        const comma = args.indexOf(",");
        if (comma >= 0) found.push(...colorsIn(args.slice(comma + 1)));
      } else if (name !== "url") {
        if (/^(?:rgb|rgba|hsl|hsla|hwb|lab|lch|oklab|oklch|color)$/.test(name) && !/\b(?:var|env)\s*\(|currentcolor/i.test(args)) found.push(cleanColor(text.slice(i, end + 1)));
        else found.push(...colorsIn(args));
      }
      i = end + 1; continue;
    }
    if (namedColors.has(name)) found.push(name);
    i = after;
  }
  return found;
}

export function fingerprintFinding(finding) {
  return JSON.stringify([finding.file, finding.owner, finding.rule, finding.token]);
}
export function analyzeSources(snapshots) {
  if (!Array.isArray(snapshots)) throw new Error("Expected file/source snapshots array");
  const sources = new Map();
  const names = new Map();
  for (const snapshot of snapshots) {
    if (!snapshot || !validFile(snapshot.file) || typeof snapshot.source !== "string") throw new Error("Invalid file/source snapshot; paths must be relative POSIX");
    if (!/\.(?:[cm]?[jt]s|[jt]sx)$/.test(snapshot.file)) throw new Error(`Unsupported source extension: ${snapshot.file}`);
    const key = `/${snapshot.file}`;
    if (sources.has(key)) throw new Error(`Duplicate source file: ${snapshot.file}`);
    const kind = key.endsWith(".jsx") ? ts.ScriptKind.JSX : key.endsWith(".tsx") ? ts.ScriptKind.TSX : /\.[cm]?js$/.test(key) ? ts.ScriptKind.JS : ts.ScriptKind.TS;
    sources.set(key, ts.createSourceFile(key, snapshot.source, ts.ScriptTarget.Latest, true, kind)); names.set(key, snapshot.file);
  }
  const host = {
    getSourceFile: (file) => sources.get(file), getDefaultLibFileName: () => "/__no_lib__.d.ts",
    writeFile: () => { throw new Error("Analyzer cannot write files"); }, getCurrentDirectory: () => "/", getDirectories: () => [],
    getCanonicalFileName: (file) => file, useCaseSensitiveFileNames: () => true, getNewLine: () => "\n",
    fileExists: (file) => sources.has(file), readFile: (file) => sources.get(file)?.text,
  };
  const program = ts.createProgram({ rootNames: [...sources.keys()].sort(compare), options: { noLib: true, noResolve: true, noEmit: true, allowJs: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.Latest }, host });
  for (const name of [...sources.keys()].sort(compare)) {
    const source = sources.get(name);
    const errors = program.getSyntacticDiagnostics(source);
    if (errors.length) {
      const first = errors[0]; const at = source.getLineAndCharacterOfPosition(first.start ?? 0);
      throw new Error(`Design policy syntax error in ${names.get(source.fileName)}:${at.line + 1}:${at.character + 1}: ${ts.flattenDiagnosticMessageText(first.messageText, " ")}`);
    }
  }
  const checker = program.getTypeChecker();
  function helperKind(expression) {
    expression = unwrap(expression);
    const identifier = ts.isPropertyAccessExpression(expression) ? expression.expression : expression;
    if (!ts.isIdentifier(identifier)) return undefined;
    const declarations = checker.getSymbolAtLocation(identifier)?.getDeclarations() ?? [];
    for (const declaration of declarations) {
      let imported;
      if (ts.isImportSpecifier(declaration) && !ts.isPropertyAccessExpression(expression)) { if (declaration.isTypeOnly) continue; imported = (declaration.propertyName ?? declaration.name).text; }
      else if (ts.isImportClause(declaration) && !ts.isPropertyAccessExpression(expression)) imported = "default";
      else if (ts.isNamespaceImport(declaration) && ts.isPropertyAccessExpression(expression)) imported = expression.name.text;
      else continue;
      let at = declaration;
      while (at && !ts.isImportDeclaration(at)) { if (ts.isImportClause(at) && at.isTypeOnly) break; at = at.parent; }
      if (at && ts.isImportDeclaration(at) && ts.isStringLiteral(at.moduleSpecifier)) return helpers[at.moduleSpecifier.text]?.[imported];
    }
    return undefined;
  }
  const findings = [], seen = new Set();
  function add(node, rule, token, occurrence) {
    const source = node.getSourceFile(), file = names.get(source.fileName);
    const key = JSON.stringify([file, node.pos, rule, token, occurrence]);
    if (seen.has(key)) return;
    seen.add(key);
    const at = source.getLineAndCharacterOfPosition(node.getStart(source));
    const finding = { rule, file, line: at.line + 1, column: at.character + 1, token, owner: ownerOf(node) };
    findings.push({ ...finding, fingerprint: fingerprintFinding(finding) });
  }
  function classText(node, text, left = true, right = true) {
    for (const match of text.matchAll(/\S+/g)) {
      if ((!left && match.index === 0) || (!right && match.index + match[0].length === text.length)) continue;
      const token = match[0], base = baseUtility(token);
      if (numbered.test(base)) add(node, "numbered-palette", token, match.index);
      if (/^-?(?:ml|mr|pl|pr)-.+/.test(base)) add(node, "physical-spacing", token, match.index);
      if (/^text-\[(?:length:)?-?(?:\d+(?:\.\d+)?|\.\d+)px\](?:\/.*)?$/.test(base)) add(node, "fixed-text-px", token, match.index);
      const arbitrary = arbitraryColor.exec(base);
      const property = /^\[([^:]+):(.+)\]$/.exec(base);
      if (unnumbered.test(base) || (arbitrary && colorsIn(arbitraryPaintValue(arbitrary[1])).length) || (property && paintFields.has(property[1]) && colorsIn(arbitraryPaintValue(property[2])).length)) add(node, "literal-color-class", token, match.index);
    }
  }
  function branches(node, walk) {
    if (ts.isConditionalExpression(node)) { walk(node.whenTrue); walk(node.whenFalse); return true; }
    if (ts.isBinaryExpression(node) && [ts.SyntaxKind.AmpersandAmpersandToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken].includes(node.operatorToken.kind)) {
      if (node.operatorToken.kind !== ts.SyntaxKind.AmpersandAmpersandToken) walk(node.left);
      walk(node.right); return true;
    }
    return false;
  }
  function classes(node) {
    node = unwrap(node); if (!node) return;
    const text = staticText(node);
    if (text !== undefined) { classText(node, text); return; }
    if (branches(node, classes)) return;
    if (ts.isArrayLiteralExpression(node)) { node.elements.forEach((item) => { if (!ts.isSpreadElement(item)) classes(item); }); return; }
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) {
          const key = ts.isComputedPropertyName(property.name) ? staticText(property.name.expression) : staticText(property.name);
          if (key !== undefined) classText(property.name, key);
        }
        if (ts.isSpreadAssignment(property) && ts.isObjectLiteralExpression(unwrap(property.expression))) classes(property.expression);
      }
      return;
    }
    if (ts.isTemplateExpression(node)) {
      classText(node.head, node.head.text, true, false);
      node.templateSpans.forEach((span, index) => {
        const last = index === node.templateSpans.length - 1;
        classText(span.literal, span.literal.text, false, last);
        const before = index === 0 ? node.head.text : node.templateSpans[index - 1].literal.text;
        const after = span.literal.text;
        const leftBoundary = /\s$/.test(before) || (index === 0 && before === "");
        const rightBoundary = /^\s/.test(after) || (last && after === "");
        if (leftBoundary && rightBoundary) classes(span.expression);
      });
    }
    if (ts.isCallExpression(node)) producer(node);
  }
  function objects(node, visit) {
    node = unwrap(node); if (!node) return;
    if (branches(node, (branch) => objects(branch, visit))) return;
    if (ts.isObjectLiteralExpression(node)) {
      for (const property of node.properties) {
        if (ts.isPropertyAssignment(property)) visit(nameOf(property.name), property.initializer);
        else if (ts.isSpreadAssignment(property)) objects(property.expression, visit);
      }
    }
  }
  function producer(node) {
    const kind = helperKind(node.expression);
    if (kind === "classes") node.arguments.forEach((argument) => classes(argument));
    if (kind === "cva") {
      classes(node.arguments[0]);
      objects(node.arguments[1], (name, value) => {
        if (name === "variants") objects(value, (_dimension, variants) => objects(variants, (_variant, choice) => classes(choice)));
        if (name === "compoundVariants") {
          value = unwrap(value);
          if (value && ts.isArrayLiteralExpression(value)) value.elements.forEach((item) => objects(item, (field, content) => { if (field === "class" || field === "className") classes(content); }));
        }
      });
    }
  }
  function paint(node, property) {
    node = unwrap(node); if (!node) return;
    const text = staticText(node);
    if (text !== undefined) { colorsIn(text).forEach((color, index) => add(node, "literal-paint", `${property}:${color}`, index)); return; }
    branches(node, (branch) => paint(branch, property));
  }
  function styles(node) {
    objects(node, (property, value) => { if (property && paintFields.has(kebab(property))) paint(value, kebab(property)); });
  }
  function inspectProp(name, value) {
    if (!name || !value) return;
    if (classProp(name)) classes(value);
    else if (styleProps.has(name)) styles(value);
    else if (paintFields.has(kebab(name))) paint(value, kebab(name));
  }
  function visit(node) {
    if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(node.getSourceFile());
      const value = node.initializer && (ts.isJsxExpression(node.initializer) ? node.initializer.expression : node.initializer);
      inspectProp(name, value);
    }
    if (ts.isJsxSpreadAttribute(node)) objects(node.expression, inspectProp);
    if (ts.isCallExpression(node)) producer(node);
    ts.forEachChild(node, visit);
  }
  for (const source of sources.values()) visit(source);
  findings.sort((a, b) => compare(a.file, b.file) || compare(a.owner, b.owner) || compare(a.rule, b.rule) || compare(a.token, b.token) || a.line - b.line || a.column - b.column);
  return { schemaVersion: 1, findings, limitations: [...LIMITATIONS] };
}
function counted(findings) {
  if (!Array.isArray(findings)) throw new Error("Expected findings array");
  const result = new Map();
  for (const finding of findings) {
    if (!finding || !validFile(finding.file) || !RULES.includes(finding.rule) || typeof finding.owner !== "string" || !finding.owner || typeof finding.token !== "string" || !finding.token) throw new Error("Invalid finding identity");
    const fingerprint = fingerprintFinding(finding);
    const existing = result.get(fingerprint);
    if (existing) existing.count++;
    else result.set(fingerprint, { fingerprint, file: finding.file, owner: finding.owner, rule: finding.rule, token: finding.token, count: 1 });
  }
  return result;
}
/** Multiset accounting only: callers own exclusion policy and reviewed baselines. */
export function compareFindings(baseline, current) {
  const before = counted(baseline), after = counted(current);
  const introduced = [], existing = [], removed = [];
  for (const key of [...new Set([...before.keys(), ...after.keys()])].sort(compare)) {
    const old = before.get(key), next = after.get(key);
    const retained = Math.min(old?.count ?? 0, next?.count ?? 0);
    if (retained) existing.push({ ...next, count: retained });
    if ((next?.count ?? 0) > retained) introduced.push({ ...next, count: next.count - retained });
    if ((old?.count ?? 0) > retained) removed.push({ ...old, count: old.count - retained });
  }
  const total = (groups) => groups.reduce((sum, group) => sum + group.count, 0);
  return { schemaVersion: 1, hasGrowth: introduced.length > 0, introduced, existing, removed, totals: { baseline: baseline.length, current: current.length, introduced: total(introduced), existing: total(existing), removed: total(removed) } };
}
