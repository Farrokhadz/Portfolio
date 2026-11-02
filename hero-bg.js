/*
 * Hero banner background:
 *  - a syntax-highlighted React component scrolling like a code editor
 *  - a git graph (branches, commits, labels) moving right to left
 * Plus the typed headline. Vanilla JS, one <canvas>, no libraries.
 */
(function () {
  "use strict";

  const banner = document.getElementById("hero-banner");
  const canvas = document.getElementById("hero-canvas");
  if (!banner || !canvas) return;

  const ctx = canvas.getContext("2d");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FONT_STACK = 'ui-monospace, "JetBrains Mono", "Fira Code", Menlo, Consolas, monospace';

  /* ---------- Easy to edit ---------- */

  const HEADLINE = ["Less talk..", "More commits.."];
  const TYPE_SPEED = [70, 55];

  const CODE = [
    'import { useState, useEffect } from "react";',
    'import { git, vercel } from "./workflow";',
    "",
    "// Less talk.. More commits..",
    "export default function Developer() {",
    "  const [commits, setCommits] = useState(0);",
    "",
    "  useEffect(() => {",
    '    git.add(".");',
    '    git.commit("feat: ship the hero");',
    '    git.push("origin", "main");',
    "    vercel.deploy({ prod: true });",
    "    setCommits((count) => count + 1);",
    "  }, []);",
    "",
    "  return (",
    '    <Hero title="Frontend Developer">',
    "      <Badge count={42} />",
    "      <Status ready={true} />",
    "    </Hero>",
    "  );",
    "}",
    ""
  ];

  const COMMIT_MESSAGES = [
    "feat: add hero",
    "fix: mobile layout",
    "style: tweak spacing",
    "refactor: split components",
    "docs: update readme",
    "chore: bump deps",
    "feat: add contact form",
    "perf: optimize images"
  ];

  const CODE_SPEED = 26;
  const COMMIT_SPEED = 48;
  const LANE_COUNT = 3;

  /* ---------- Colors (read from CSS variables) ---------- */

  const css = getComputedStyle(banner);
  const readVar = (name) => css.getPropertyValue(name).trim();
  const colors = {
    bg: readVar("--hb-bg"),
    muted: readVar("--hb-muted"),
    plain: readVar("--hb-plain"),
    comment: readVar("--hb-comment"),
    string: readVar("--hb-string"),
    keyword: readVar("--hb-keyword"),
    component: readVar("--hb-component"),
    number: readVar("--hb-number"),
    call: readVar("--hb-call")
  };
  const laneColors = [readVar("--hb-accent"), readVar("--hb-keyword"), readVar("--hb-string")];

  /* ---------- Typed headline ---------- */

  const textEls = [document.getElementById("hb-text-1"), document.getElementById("hb-text-2")];
  const cursorEls = [document.getElementById("hb-cursor-1"), document.getElementById("hb-cursor-2")];

  function showFinalText() {
    HEADLINE.forEach((text, i) => {
      textEls[i].textContent = text;
      cursorEls[i].hidden = true;
    });
  }

  function typeLine(index) {
    const text = HEADLINE[index];
    let count = 0;
    cursorEls[index].hidden = false;

    (function step() {
      if (count < text.length) {
        count++;
        textEls[index].textContent = text.slice(0, count);
        setTimeout(step, TYPE_SPEED[index]);
      } else if (index < HEADLINE.length - 1) {
        cursorEls[index].hidden = true;
        setTimeout(() => typeLine(index + 1), 250);
      }
    })();
  }

  /* ---------- Tiny syntax highlighter ---------- */

  const TOKEN_RE =
    /(\/\/.*)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|\b(import|from|export|default|function|const|let|return|true|false)\b|(<\/?[A-Z][\w.]*|\b[A-Z]\w*\b)|([A-Za-z_$][\w$]*)(?=\()|(\b\d+\b)/g;
  const TOKEN_TYPES = ["comment", "string", "keyword", "component", "call", "number"];

  function tokenize(line) {
    const tokens = [];
    let last = 0;
    let match;
    TOKEN_RE.lastIndex = 0;

    while ((match = TOKEN_RE.exec(line)) !== null) {
      if (match.index > last) {
        tokens.push({ col: last, text: line.slice(last, match.index), type: "plain" });
      }
      tokens.push({ col: match.index, text: match[0], type: TOKEN_TYPES[match.slice(1).findIndex(Boolean)] });
      last = match.index + match[0].length;
    }
    if (last < line.length) {
      tokens.push({ col: last, text: line.slice(last), type: "plain" });
    }
    return tokens;
  }

  const codeLines = CODE.map(tokenize);

  /* ---------- Canvas state ---------- */

  let W = 0;
  let H = 0;
  let spacing = 68;
  let codeOffset = 0;
  let commits = [];
  let commitCount = 0;
  let lastOnLane = [];
  let running = false;
  let rafId = 0;
  let lastTime = 0;

  const laneY = (lane) => H * (0.76 + 0.09 * lane);
  const randomHex = () => Math.floor(Math.random() * 0x10000000).toString(16).padStart(7, "0");

  function makeCommit(x, prev, born) {
    let lane = prev ? prev.lane : 1;

    if (prev && Math.random() >= 0.6) {
      const options = [lane - 1, lane + 1].filter((l) => l >= 0 && l < LANE_COUNT);
      lane = options[Math.floor(Math.random() * options.length)];
    }

    const commit = {
      x: x,
      lane: lane,
      born: born,
      prev: prev,
      mergeFrom: null,
      label: null
    };

    const candidate = lastOnLane[lane];
    if (prev && candidate && candidate !== prev && prev.x - candidate.x < spacing * 6) {
      commit.mergeFrom = candidate;
    }

    if (commitCount % 4 === 0) {
      const message = COMMIT_MESSAGES[Math.floor(Math.random() * COMMIT_MESSAGES.length)];
      commit.label = randomHex() + " " + message;
    }

    commitCount++;
    lastOnLane[lane] = commit;
    return commit;
  }

  function seedCommits() {
    commits = [];
    commitCount = 0;
    lastOnLane = [];

    let prev = null;
    for (let x = -spacing; x < W + spacing; x += spacing) {
      const commit = makeCommit(x, prev, -Infinity);
      commits.push(commit);
      prev = commit;
    }
  }

  /* ---------- Drawing ---------- */

  function drawCode() {
    const small = W < 640;
    const fontSize = small ? 11 : 12;
    const lineHeight = Math.round(fontSize * 1.7);

    ctx.font = fontSize + "px " + FONT_STACK;
    ctx.textBaseline = "top";

    const charWidth = ctx.measureText("M").width;
    const startX = small ? 10 : Math.round(W * 0.42);
    const gutter = charWidth * 4;
    const total = codeLines.length * lineHeight;
    const offset = codeOffset % total;
    const firstLine = Math.floor(offset / lineHeight);
    const shift = offset - firstLine * lineHeight;
    const rows = Math.ceil(H / lineHeight) + 1;

    ctx.save();
    ctx.globalAlpha = 0.6;

    for (let row = 0; row < rows; row++) {
      const index = (firstLine + row) % codeLines.length;
      const y = row * lineHeight - shift;

      ctx.fillStyle = colors.comment;
      ctx.fillText(String(index + 1).padStart(2, " "), startX, y);

      codeLines[index].forEach((token) => {
        ctx.fillStyle = colors[token.type];
        ctx.fillText(token.text, startX + gutter + token.col * charWidth, y);
      });
    }

    ctx.restore();
  }

  function drawCurve(from, to, color, width, alpha) {
    const x1 = from.x;
    const y1 = laneY(from.lane);
    const x2 = to.x;
    const y2 = laneY(to.lane);
    const mid = (x1 + x2) / 2;

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(mid, y1, mid, y2, x2, y2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  function drawGraph(now) {
    ctx.save();

    commits.forEach((commit) => {
      if (commit.prev) drawCurve(commit.prev, commit, laneColors[commit.lane], 2, 0.9);
      if (commit.mergeFrom) drawCurve(commit.mergeFrom, commit, laneColors[commit.lane], 1.5, 0.35);
    });

    ctx.font = "10px " + FONT_STACK;
    ctx.textBaseline = "alphabetic";

    commits.forEach((commit) => {
      const y = laneY(commit.lane);
      const color = laneColors[commit.lane];
      const age = now - commit.born;

      if (age < 900) {
        ctx.globalAlpha = 1 - age / 900;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(commit.x, y, 5 + (age / 900) * 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      ctx.fillStyle = colors.bg;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(commit.x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (commit.label) {
        ctx.fillStyle = colors.muted;
        ctx.fillText(commit.label, commit.x + 9, y - 10);
      }
    });

    ctx.restore();
  }

  function drawFrame(now) {
    ctx.clearRect(0, 0, W, H);
    drawCode();
    drawGraph(now);
  }

  /* ---------- Animation loop ---------- */

  function frame(now) {
    if (!running) return;

    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    codeOffset += CODE_SPEED * dt;
    commits.forEach((commit) => {
      commit.x -= COMMIT_SPEED * dt;
    });

    let newest = commits[commits.length - 1];
    while (newest.x <= W - spacing) {
      newest = makeCommit(newest.x + spacing, newest, now);
      commits.push(newest);
    }
    while (commits.length > 2 && commits[0].x < -240) {
      commits.shift();
    }

    drawFrame(now);
    rafId = requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    lastTime = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  /* ---------- Resize ---------- */

  function resize() {
    const rect = banner.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    W = rect.width;
    H = rect.height;
    spacing = W < 640 ? 54 : 68;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    seedCommits();
    if (!running) drawFrame(performance.now());
  }

  window.addEventListener("resize", resize);
  resize();

  /* ---------- Start ---------- */

  if (reduceMotion) {
    showFinalText();
  } else {
    typeLine(0);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) start();
          else stop();
        });
      },
      { threshold: 0 }
    );
    observer.observe(banner);
  }
})();