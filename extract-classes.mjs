#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";

function isIdentStart(ch) {
  return /[A-Za-z_$]/.test(ch);
}

function isIdentPart(ch) {
  return /[A-Za-z0-9_$]/.test(ch);
}

function skipSpace(src, i) {
  while (i < src.length && /\s/.test(src[i])) i++;
  return i;
}

function readIdent(src, i) {
  if (!isIdentStart(src[i])) return { name: "", next: i };
  let j = i + 1;
  while (j < src.length && isIdentPart(src[j])) j++;
  return { name: src.slice(i, j), next: j };
}

function startsWord(src, i, word) {
  if (src.slice(i, i + word.length) !== word) return false;
  const before = i > 0 ? src[i - 1] : "";
  const after = i + word.length < src.length ? src[i + word.length] : "";
  const b = !before || !isIdentPart(before);
  const a = !after || !isIdentPart(after);
  return b && a;
}

function nextSignificantChar(src, i) {
  let j = i;
  while (j < src.length && /\s/.test(src[j])) j++;
  return { ch: src[j] || "", idx: j };
}

function findMatchingBrace(src, openIdx) {
  let i = openIdx;
  let depth = 0;
  let mode = "code";
  let quote = "";
  let templateExprDepth = 0;

  while (i < src.length) {
    const c = src[i];
    const n = i + 1 < src.length ? src[i + 1] : "";

    if (mode === "line_comment") {
      if (c === "\n") mode = "code";
      i++;
      continue;
    }
    if (mode === "block_comment") {
      if (c === "*" && n === "/") {
        mode = "code";
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (mode === "string") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === quote) mode = "code";
      i++;
      continue;
    }
    if (mode === "template") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "`" && templateExprDepth === 0) {
        mode = "code";
        i++;
        continue;
      }
      if (c === "$" && n === "{") {
        templateExprDepth++;
        depth++;
        i += 2;
        continue;
      }
      if (c === "}" && templateExprDepth > 0) {
        templateExprDepth--;
        depth--;
        i++;
        continue;
      }
      i++;
      continue;
    }

    if (c === "/" && n === "/") {
      mode = "line_comment";
      i += 2;
      continue;
    }
    if (c === "/" && n === "*") {
      mode = "block_comment";
      i += 2;
      continue;
    }
    if (c === "'" || c === '"') {
      mode = "string";
      quote = c;
      i++;
      continue;
    }
    if (c === "`") {
      mode = "template";
      templateExprDepth = 0;
      i++;
      continue;
    }

    if (c === "{") {
      depth++;
    } else if (c === "}") {
      depth--;
      if (depth === 0) return i;
    }
    i++;
  }
  return -1;
}

function isInsideAnyRange(pos, ranges) {
  for (let i = 0; i < ranges.length; i++) {
    const r = ranges[i];
    if (pos >= r.start && pos < r.end) return true;
  }
  return false;
}

function collectNamedClassesNotNestedInClass(src) {
  const out = [];
  let i = 0;
  let mode = "code";
  let quote = "";
  let braceDepth = 0;
  let templateExprDepth = 0;
  const classBodyRanges = [];

  while (i < src.length) {
    const c = src[i];
    const n = i + 1 < src.length ? src[i + 1] : "";

    if (mode === "line_comment") {
      if (c === "\n") mode = "code";
      i++;
      continue;
    }
    if (mode === "block_comment") {
      if (c === "*" && n === "/") {
        mode = "code";
        i += 2;
        continue;
      }
      i++;
      continue;
    }
    if (mode === "string") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === quote) mode = "code";
      i++;
      continue;
    }
    if (mode === "template") {
      if (c === "\\") {
        i += 2;
        continue;
      }
      if (c === "`" && templateExprDepth === 0) {
        mode = "code";
        i++;
        continue;
      }
      if (c === "$" && n === "{") {
        templateExprDepth++;
        braceDepth++;
        i += 2;
        continue;
      }
      if (c === "}" && templateExprDepth > 0) {
        templateExprDepth--;
        braceDepth--;
        i++;
        continue;
      }
      i++;
      continue;
    }

    if (c === "/" && n === "/") {
      mode = "line_comment";
      i += 2;
      continue;
    }
    if (c === "/" && n === "*") {
      mode = "block_comment";
      i += 2;
      continue;
    }
    if (c === "'" || c === '"') {
      mode = "string";
      quote = c;
      i++;
      continue;
    }
    if (c === "`") {
      mode = "template";
      templateExprDepth = 0;
      i++;
      continue;
    }

    if (startsWord(src, i, "class")) {
      // Reject classes declared inside another class body.
      if (isInsideAnyRange(i, classBodyRanges)) {
        i += 5;
        continue;
      }

      let j = skipSpace(src, i + 5);
      const ident = readIdent(src, j);
      if (!ident.name) {
        // Skip anonymous or malformed class keyword.
        i += 5;
        continue;
      }
      const className = ident.name;
      j = skipSpace(src, ident.next);

      // optional extends ...
      if (startsWord(src, j, "extends")) {
        j = skipSpace(src, j + 7);
        while (j < src.length) {
          const sig = nextSignificantChar(src, j);
          if (sig.ch === "{") {
            j = sig.idx;
            break;
          }
          j = sig.idx + 1;
        }
      }

      const sig = nextSignificantChar(src, j);
      if (sig.ch !== "{") {
        i += 5;
        continue;
      }
      const openIdx = sig.idx;
      const closeIdx = findMatchingBrace(src, openIdx);
      if (closeIdx === -1) {
        i = openIdx + 1;
        continue;
      }

      out.push({
        name: className,
        start: i,
        end: closeIdx + 1,
        source: src.slice(i, closeIdx + 1)
      });
      classBodyRanges.push({ start: openIdx + 1, end: closeIdx });

      i = closeIdx + 1;
      continue;
    }
    i++;
  }

  return out;
}

function uniqueName(base, used) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}_${n}`)) n++;
  const v = `${base}_${n}`;
  used.add(v);
  return v;
}

function cleanOutDir(outDir) {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
}

function nodeCheck(filePath) {
  const p = spawnSync("node", ["--check", filePath], { encoding: "utf8" });
  return {
    ok: p.status === 0,
    status: p.status,
    stdout: p.stdout || "",
    stderr: p.stderr || ""
  };
}

function main() {
  const inFile = process.argv[2];
  const outDirArg = process.argv[3] || "./classes-out";
  if (!inFile) {
    console.error("Usage: node extract-classes.mjs <input.js> [outDir]");
    process.exit(1);
  }

  const inputPath = path.resolve(inFile);
  const outDir = path.resolve(outDirArg);
  const src = fs.readFileSync(inputPath, "utf8");

  cleanOutDir(outDir);

  const classes = collectNamedClassesNotNestedInClass(src);
  const used = new Set();
  const written = [];
  const failed = [];

  for (const c of classes) {
    const fileBase = uniqueName(c.name, used);
    const filePath = path.join(outDir, `${fileBase}.js`);
    fs.writeFileSync(filePath, `${c.source}\n`, "utf8");

    const check = nodeCheck(filePath);
    if (!check.ok) {
      fs.rmSync(filePath, { force: true });
      failed.push({
        name: fileBase,
        start: c.start,
        end: c.end,
        status: check.status,
        stderr: check.stderr.trim()
      });
      continue;
    }

    written.push({
      name: fileBase,
      start: c.start,
      end: c.end,
      file: path.basename(filePath)
    });
  }

  const meta = {
    input: inputPath,
    outputDir: outDir,
    extracted: written.length,
    failed: failed.length,
    classes: written,
    failures: failed
  };
  fs.writeFileSync(path.join(outDir, "_classes.json"), JSON.stringify(meta, null, 2), "utf8");

  console.log(`Classes found (excluding nested-in-class): ${classes.length}`);
  console.log(`Written (node --check pass): ${written.length}`);
  console.log(`Failed/removed: ${failed.length}`);

  if (failed.length) {
    console.error("Some classes failed syntax check and were removed. See _classes.json failures.");
    process.exit(2);
  }
}

main();
