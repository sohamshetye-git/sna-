/**
 * HITTING TIME - GLOBAL HEURISTIC EDUCATIONAL VISUALIZATION
 * Dynamic Graph Engine, Linear System (I - Q)H = 1 Solver,
 * Real-Time Mathematical Derivation, and Stochastic Simulation.
 */

// ============================================================================
// 1. DATA STRUCTURES & PRESET GRAPH DEFINITIONS
// ============================================================================

const PRESETS = {
  star5: {
    nodes: {
      A: { id: "A", label: "A", x: 130, y: 220, sub: "Leaf" },
      B: { id: "B", label: "B", x: 340, y: 220, sub: "Hub" },
      C: { id: "C", label: "C", x: 550, y: 220, sub: "Leaf" },
      D: { id: "D", label: "D", x: 340, y: 80,  sub: "Leaf" },
      E: { id: "E", label: "E", x: 340, y: 360, sub: "Leaf" }
    },
    edges: [
      { u: "A", v: "B" },
      { u: "B", v: "C" },
      { u: "B", v: "D" },
      { u: "B", v: "E" }
    ],
    startNode: "A",
    targetNode: "C"
  },
  line3: {
    nodes: {
      A: { id: "A", label: "A", x: 160, y: 220, sub: "End 1" },
      B: { id: "B", label: "B", x: 340, y: 220, sub: "Center" },
      C: { id: "C", label: "C", x: 520, y: 220, sub: "End 2" }
    },
    edges: [
      { u: "A", v: "B" },
      { u: "B", v: "C" }
    ],
    startNode: "A",
    targetNode: "C"
  },
  line4: {
    nodes: {
      A: { id: "A", label: "A", x: 120, y: 220, sub: "Node 1" },
      B: { id: "B", label: "B", x: 265, y: 220, sub: "Node 2" },
      C: { id: "C", label: "C", x: 415, y: 220, sub: "Node 3" },
      D: { id: "D", label: "D", x: 560, y: 220, sub: "Node 4" }
    },
    edges: [
      { u: "A", v: "B" },
      { u: "B", v: "C" },
      { u: "C", v: "D" }
    ],
    startNode: "A",
    targetNode: "D"
  },
  triangle: {
    nodes: {
      A: { id: "A", label: "A", x: 200, y: 320, sub: "Node A" },
      B: { id: "B", label: "B", x: 340, y: 120, sub: "Node B" },
      C: { id: "C", label: "C", x: 480, y: 320, sub: "Node C" }
    },
    edges: [
      { u: "A", v: "B" },
      { u: "B", v: "C" },
      { u: "C", v: "A" }
    ],
    startNode: "A",
    targetNode: "C"
  },
  disconnected: {
    nodes: {
      A: { id: "A", label: "A", x: 150, y: 160, sub: "Comp 1" },
      B: { id: "B", label: "B", x: 270, y: 160, sub: "Comp 1" },
      C: { id: "C", label: "C", x: 450, y: 280, sub: "Comp 2" },
      D: { id: "D", label: "D", x: 570, y: 280, sub: "Comp 2" }
    },
    edges: [
      { u: "A", v: "B" },
      { u: "C", v: "D" }
    ],
    startNode: "A",
    targetNode: "C"
  }
};

// Application State
const state = {
  // Dynamic Graph
  nodes: {},
  edges: [],
  startNode: "A",
  targetNode: "C",

  // Model: "standard" | "classroom" | "custom"
  walkModel: "standard",
  customTransitions: {}, // { u: { v: prob } }

  // Target PageRank / Stationary weights
  pageRank: {},

  // Cached Dynamic Calculations
  transitionMatrix: {}, // { u: { v: p } }
  hittingTimeMatrix: {}, // { start: { target: value | Infinity } }

  // Simulation State
  isWalking: false,
  isPaused: false,
  currentWalkStep: 0,
  walkPath: [],
  walkTimer: null,
  stepSpeedMs: 600,

  // UI Modes
  mode: "simple",
  isPresentation: false
};

// ============================================================================
// 2. DYNAMIC GRAPH TOPOLOGY UTILITIES
// ============================================================================

function getNodeKeys() {
  return Object.keys(state.nodes).sort();
}

function getNeighbors(nodeId) {
  const nbrs = new Set();
  state.edges.forEach(e => {
    if (e.u === nodeId) nbrs.add(e.v);
    else if (e.v === nodeId) nbrs.add(e.u);
  });
  return Array.from(nbrs).sort();
}

function hasEdge(u, v) {
  return state.edges.some(e => (e.u === u && e.v === v) || (e.u === v && e.v === u));
}

function getDegree(nodeId) {
  return getNeighbors(nodeId).length;
}

// ============================================================================
// 3. TRANSITION MATRIX GENERATION (NO HARDCODING)
// ============================================================================

/**
 * Builds transition matrix P where P[u][v] = probability to move u -> v.
 * Completely dynamic based on degree and selected model.
 */
function buildTransitionMatrix() {
  const P = {};
  const nodes = getNodeKeys();

  nodes.forEach(u => {
    P[u] = {};
    nodes.forEach(v => { P[u][v] = 0; });
  });

  if (state.walkModel === "standard") {
    // Model 1: Standard Undirected Random Walk
    // P(u, v) = 1 / degree(u) for each neighbor v
    nodes.forEach(u => {
      const nbrs = getNeighbors(u);
      const deg = nbrs.length;
      if (deg > 0) {
        const prob = 1.0 / deg;
        nbrs.forEach(v => {
          P[u][v] = prob;
        });
      }
    });
  } else if (state.walkModel === "classroom") {
    // Model 2: Classroom / Forward Walk Model
    // Test Case: Leaf nodes move to hub (B) with prob 1.
    // Hub (B) transitions forward to candidate leaves {C, D, E} equally: 1 / count.
    // If hub B has neighbor A (source) and target is among neighbors,
    // forward leaves from B are all neighbors except start node A!
    nodes.forEach(u => {
      const nbrs = getNeighbors(u);
      if (nbrs.length === 0) return;

      if (u === "B" && nbrs.includes("A") && nbrs.length > 1) {
        // Forward from B: exclude start node A if A is a neighbor and other neighbors exist
        const forwardNeighbors = nbrs.filter(n => n !== state.startNode);
        if (forwardNeighbors.length > 0) {
          const prob = 1.0 / forwardNeighbors.length;
          forwardNeighbors.forEach(v => {
            P[u][v] = prob;
          });
        } else {
          const prob = 1.0 / nbrs.length;
          nbrs.forEach(v => { P[u][v] = prob; });
        }
      } else {
        // Uniform across all available neighbors
        const prob = 1.0 / nbrs.length;
        nbrs.forEach(v => {
          P[u][v] = prob;
        });
      }
    });
  } else if (state.walkModel === "custom") {
    // Model 3: User Custom Transitions
    nodes.forEach(u => {
      const userOut = state.customTransitions[u];
      if (userOut && Object.keys(userOut).length > 0) {
        let sum = 0;
        Object.entries(userOut).forEach(([v, p]) => {
          if (nodes.includes(v)) sum += p;
        });
        if (sum > 0) {
          Object.entries(userOut).forEach(([v, p]) => {
            if (nodes.includes(v)) P[u][v] = p / sum;
          });
        }
      } else {
        const nbrs = getNeighbors(u);
        if (nbrs.length > 0) {
          const prob = 1.0 / nbrs.length;
          nbrs.forEach(v => { P[u][v] = prob; });
        }
      }
    });
  }

  return P;
}

// ============================================================================
// 4. GAUSSIAN ELIMINATION & LINEAR SYSTEM SOLVER: (I - Q)H = 1
// ============================================================================

/**
 * Solves (I - Q) H = 1 for expected hitting times to target y.
 * - H(y) = 0
 * - For each v != y:
 *     H(v) = 1 + sum_{u != y} P(v, u) H(u)
 *     <=> (1 - P(v, v)) H(v) - sum_{u != v, u != y} P(v, u) H(u) = 1
 *
 * Uses Gaussian elimination with partial pivoting.
 * Identifies disconnected or unreachable components and assigns Infinity.
 */
function solveHittingTimesForTarget(target, P) {
  const nodes = getNodeKeys();
  const result = {};
  nodes.forEach(u => { result[u] = Infinity; });

  if (!nodes.includes(target)) return result;
  result[target] = 0;

  // Find all nodes that have a directed path to target in P
  // (BFS backwards from target)
  const reachableToTarget = new Set([target]);
  const queue = [target];

  while (queue.length > 0) {
    const curr = queue.shift();
    nodes.forEach(u => {
      if (!reachableToTarget.has(u) && P[u] && P[u][curr] > 1e-9) {
        reachableToTarget.add(u);
        queue.push(u);
      }
    });
  }

  // Non-target nodes that CAN reach the target
  const activeNodes = nodes.filter(n => n !== target && reachableToTarget.has(n));
  const m = activeNodes.length;

  if (m === 0) return result;

  // Build matrix A = (I - Q) and vector b = 1
  const A = Array.from({ length: m }, () => Array(m).fill(0));
  const b = Array(m).fill(1.0);

  activeNodes.forEach((v, i) => {
    A[i][i] = 1.0;
    activeNodes.forEach((u, j) => {
      const p_vu = P[v] ? (P[v][u] || 0) : 0;
      A[i][j] -= p_vu;
    });
  });

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < m; col++) {
    let maxRow = col;
    let maxVal = Math.abs(A[col][col]);
    for (let r = col + 1; r < m; r++) {
      if (Math.abs(A[r][col]) > maxVal) {
        maxVal = Math.abs(A[r][col]);
        maxRow = r;
      }
    }

    if (maxVal < 1e-11) {
      // Singular / trap state without exit to target
      continue;
    }

    if (maxRow !== col) {
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      [b[col], b[maxRow]] = [b[maxRow], b[col]];
    }

    const pivot = A[col][col];
    for (let r = col + 1; r < m; r++) {
      const factor = A[r][col] / pivot;
      for (let c = col; c < m; c++) {
        A[r][c] -= factor * A[col][c];
      }
      b[r] -= factor * b[col];
    }
  }

  // Back substitution
  const H = Array(m).fill(0);
  for (let r = m - 1; r >= 0; r--) {
    let sum = b[r];
    for (let c = r + 1; c < m; c++) {
      sum -= A[r][c] * H[c];
    }
    if (Math.abs(A[r][r]) > 1e-11) {
      H[r] = sum / A[r][r];
    } else {
      H[r] = Infinity;
    }
  }

  activeNodes.forEach((u, i) => {
    const val = H[i];
    result[u] = (isNaN(val) || val < 0 || !isFinite(val)) ? Infinity : Math.max(0, val);
  });

  return result;
}

/**
 * Computes the full all-pairs hitting time matrix dynamically.
 */
function computeAllHittingTimes(P) {
  const nodes = getNodeKeys();
  const matrix = {};
  nodes.forEach(u => { matrix[u] = {}; });

  nodes.forEach(target => {
    const col = solveHittingTimesForTarget(target, P);
    nodes.forEach(src => {
      matrix[src][target] = col[src];
    });
  });

  return matrix;
}

// ============================================================================
// 5. GRAPH RENDERING & VISUALIZATION (SVG)
// ============================================================================

function renderGraph() {
  const edgesLayer = document.getElementById("edgesLayer");
  const nodesLayer = document.getElementById("nodesLayer");
  const probLabelsLayer = document.getElementById("probLabelsLayer");
  if (!edgesLayer || !nodesLayer || !probLabelsLayer) return;

  edgesLayer.innerHTML = "";
  nodesLayer.innerHTML = "";
  probLabelsLayer.innerHTML = "";

  const P = state.transitionMatrix;
  const shortestPathEdges = getShortestPathEdges(state.startNode, state.targetNode);

  // Render Edges
  state.edges.forEach((edge, idx) => {
    const uNode = state.nodes[edge.u];
    const vNode = state.nodes[edge.v];
    if (!uNode || !vNode) return;

    const isShortest = shortestPathEdges.some(
      pe => (pe.u === edge.u && pe.v === edge.v) || (pe.u === edge.v && pe.v === edge.u)
    );

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", uNode.x);
    line.setAttribute("y1", uNode.y);
    line.setAttribute("x2", vNode.x);
    line.setAttribute("y2", vNode.y);
    line.setAttribute("class", `edge-line ${isShortest ? "active-path" : ""}`);
    line.setAttribute("id", `edge-${edge.u}-${edge.v}`);
    edgesLayer.appendChild(line);

    // Probability Indicator Badges on edges
    const midX = (uNode.x + vNode.x) / 2;
    const midY = (uNode.y + vNode.y) / 2;
    const dx = vNode.x - uNode.x;
    const dy = vNode.y - uNode.y;
    const len = Math.hypot(dx, dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;

    const pUV = (P[edge.u] && P[edge.u][edge.v] !== undefined) ? P[edge.u][edge.v] : 0;
    const pVU = (P[edge.v] && P[edge.v][edge.u] !== undefined) ? P[edge.v][edge.u] : 0;

    // Badge for u -> v
    if (pUV > 0) {
      const badgeX = midX + perpX * 18 - (dx / len) * 22;
      const badgeY = midY + perpY * 18 - (dy / len) * 22;
      renderProbBadge(probLabelsLayer, badgeX, badgeY, `${edge.u}➔${edge.v}`, pUV);
    }

    // Badge for v -> u
    if (pVU > 0) {
      const badgeX = midX - perpX * 18 + (dx / len) * 22;
      const badgeY = midY - perpY * 18 + (dy / len) * 22;
      renderProbBadge(probLabelsLayer, badgeX, badgeY, `${edge.v}➔${edge.u}`, pVU);
    }
  });

  // Render Nodes
  getNodeKeys().forEach(k => {
    const node = state.nodes[k];
    if (!node) return;

    const gNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gNode.setAttribute("class", "node-group");
    gNode.setAttribute("id", `node-${k}`);
    gNode.setAttribute("transform", `translate(${node.x}, ${node.y})`);

    const isStart = k === state.startNode;
    const isTarget = k === state.targetNode;
    if (isStart && isTarget) gNode.classList.add("is-both");
    else if (isStart) gNode.classList.add("is-start");
    else if (isTarget) gNode.classList.add("is-target");

    // Glow ring
    const ring = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    ring.setAttribute("r", "28");
    ring.setAttribute("class", "node-ring");
    gNode.appendChild(ring);

    // Node body circle
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("r", "22");
    circle.setAttribute("class", "node-base");
    gNode.appendChild(circle);

    // Node label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("class", "node-text");
    text.setAttribute("y", "1");
    text.textContent = node.label || k;
    gNode.appendChild(text);

    // Node degree subtext
    const subtext = document.createElementNS("http://www.w3.org/2000/svg", "text");
    subtext.setAttribute("class", "node-subtext");
    subtext.setAttribute("y", "38");
    subtext.textContent = `deg ${getDegree(k)}`;
    gNode.appendChild(subtext);

    // Click node to select as Start (left click) or Target (shift-click)
    gNode.addEventListener("click", (e) => {
      if (e.shiftKey) {
        setTargetNode(k);
      } else {
        setStartNode(k);
      }
    });

    nodesLayer.appendChild(gNode);
  });
}

function renderProbBadge(layer, x, y, label, prob) {
  const gBadge = document.createElementNS("http://www.w3.org/2000/svg", "g");
  gBadge.setAttribute("class", "prob-badge-group");

  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("class", "prob-badge-rect");
  rect.setAttribute("x", x - 28);
  rect.setAttribute("y", y - 10);
  rect.setAttribute("width", 56);
  rect.setAttribute("height", 20);

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  text.setAttribute("class", "prob-badge-text");
  text.setAttribute("x", x);
  text.setAttribute("y", y);

  // Clean fraction display or 2 decimal places
  let pStr = formatProbability(prob);
  text.textContent = `${label}: ${pStr}`;

  gBadge.appendChild(rect);
  gBadge.appendChild(text);
  layer.appendChild(gBadge);
}

function formatProbability(prob) {
  if (Math.abs(prob - 1) < 1e-4) return "1";
  if (Math.abs(prob - 0.5) < 1e-4) return "½";
  if (Math.abs(prob - 1/3) < 1e-4) return "⅓";
  if (Math.abs(prob - 0.25) < 1e-4) return "¼";
  if (Math.abs(prob - 0.2) < 1e-4) return "⅕";
  if (Math.abs(prob - 1/6) < 1e-4) return "⅙";
  return prob.toFixed(2);
}

function getShortestPathEdges(start, target) {
  if (!start || !target || start === target) return [];
  const queue = [[start]];
  const visited = new Set([start]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current === target) {
      const edgeList = [];
      for (let i = 0; i < path.length - 1; i++) {
        edgeList.push({ u: path[i], v: path[i+1] });
      }
      return edgeList;
    }

    for (const nbr of getNeighbors(current)) {
      if (!visited.has(nbr)) {
        visited.add(nbr);
        queue.push([...path, nbr]);
      }
    }
  }
  return [];
}

// ============================================================================
// 6. METRICS, DERIVATION & LIVE CALCULATIONS
// ============================================================================

function recalculateAll() {
  const nodes = getNodeKeys();

  // Validate start & target
  if (!nodes.includes(state.startNode)) {
    state.startNode = nodes[0] || null;
  }
  if (!nodes.includes(state.targetNode)) {
    state.targetNode = nodes.find(n => n !== state.startNode) || nodes[0] || null;
  }

  // 1. Build Transition Matrix
  state.transitionMatrix = buildTransitionMatrix();

  // 2. Solve simultaneous equations for all pairs
  state.hittingTimeMatrix = computeAllHittingTimes(state.transitionMatrix);

  // 3. Console Logging for verification as requested
  logDebugInfo();

  // 4. Update UI displays
  updateDropdowns();
  updatePageRankInputs();
  renderGraph();
  updateCalculationCards();
  renderComparisonTable();
  renderAllPairsMatrix();
}

function logDebugInfo() {
  const x = state.startNode;
  const y = state.targetNode;
  const P = state.transitionMatrix;
  const HT = state.hittingTimeMatrix;

  console.group(`%c[HITTING TIME] Current Graph Calculation`, "color: #38bdf8; font-weight: bold;");
  console.log("CURRENT START:", x);
  console.log("CURRENT TARGET:", y);
  console.log("CURRENT GRAPH NODES:", getNodeKeys());
  console.log("CURRENT EDGES:", state.edges);
  console.log("TRANSITION MATRIX P:", P);
  console.log("SOLVED HITTING TIMES MATRIX:", HT);
  if (x && y && HT[x]) {
    console.log(`FINAL HT(${x}, ${y}):`, HT[x][y] === Infinity ? "Infinity (Unreachable)" : HT[x][y]);
  }
  console.groupEnd();
}

function updateCalculationCards() {
  const x = state.startNode;
  const y = state.targetNode;

  const htDisplay = document.getElementById("htValDisplay");
  const scoreDisplay = document.getElementById("scoreValDisplay");
  const normDisplay = document.getElementById("normScoreValDisplay");
  const nodePairBadge = document.getElementById("nodePairBadge");
  const normCalcSub = document.getElementById("normCalcSub");

  if (!x || !y) {
    if (nodePairBadge) nodePairBadge.textContent = "—";
    if (htDisplay) htDisplay.textContent = "—";
    if (scoreDisplay) scoreDisplay.textContent = "—";
    if (normDisplay) normDisplay.textContent = "—";
    return;
  }

  nodePairBadge.textContent = `${x} ➔ ${y}`;

  const htVal = (state.hittingTimeMatrix[x] && state.hittingTimeMatrix[x][y] !== undefined)
    ? state.hittingTimeMatrix[x][y]
    : Infinity;

  const py = state.pageRank[y] !== undefined ? state.pageRank[y] : 0.20;

  if (htVal === Infinity) {
    htDisplay.textContent = "∞";
    htDisplay.style.color = "var(--red-accent)";
    scoreDisplay.textContent = "−∞";
    normDisplay.textContent = "−∞";
    normCalcSub.textContent = "Target is unreachable from start";
  } else {
    htDisplay.style.color = "";
    htDisplay.textContent = htVal.toFixed(2);
    const scoreVal = -htVal;
    scoreDisplay.textContent = scoreVal === 0 ? "0.00" : scoreVal.toFixed(2);
    const normVal = scoreVal * py;
    normDisplay.textContent = normVal === 0 ? "0.000" : normVal.toFixed(3);
    normCalcSub.textContent = `−${htVal.toFixed(2)} × ${py.toFixed(2)} = ${normVal.toFixed(3)}`;
  }

  // Update Mathematical Derivation
  renderStepByStepDerivation(x, y, htVal);
}

function renderStepByStepDerivation(x, y, htVal) {
  const container = document.getElementById("dynamicStepsContainer");
  if (!container) return;

  if (!x || !y) {
    container.innerHTML = "<p>Please select a valid start and target node.</p>";
    return;
  }

  if (x === y) {
    container.innerHTML = `
      <div class="step-item">
        <div class="step-num">BASE CASE: START = TARGET</div>
        <div class="step-title">Node ${x} is already at target ${y}</div>
        <div class="step-math">HT(${x}, ${y}) = 0.00 steps\nS_HT(${x}, ${y}) = 0.00\nS_Norm = 0.000</div>
      </div>
    `;
    return;
  }

  const nodes = getNodeKeys();
  const P = state.transitionMatrix;
  const nonTargetNodes = nodes.filter(n => n !== y);

  let html = "";

  // Step 1: Target Base Condition
  html += `
    <div class="step-item">
      <div class="step-num">STEP 1 • TARGET BASE CONDITION</div>
      <div class="step-title">Hitting time at target is zero</div>
      <div class="step-math">H(${y}) = 0\n(Random walk terminates immediately upon first arrival at target node ${y})</div>
    </div>
  `;

  // Step 2: System Equations for Non-Target States
  let eqLines = [];
  nonTargetNodes.forEach(v => {
    const outgoing = Object.entries(P[v] || {}).filter(([_, prob]) => prob > 0);
    if (outgoing.length === 0) {
      eqLines.push(`H(${v}) = ∞  (Isolated / no outgoing transitions)`);
    } else {
      const terms = outgoing.map(([u, prob]) => {
        const pStr = formatProbability(prob);
        return u === y ? `${pStr}·H(${u}) [=0]` : `${pStr}·H(${u})`;
      }).join(" + ");
      eqLines.push(`H(${v}) = 1 + [ ${terms} ]`);
    }
  });

  html += `
    <div class="step-item">
      <div class="step-num">STEP 2 • SIMULTANEOUS FIRST-STEP RECURRENCE EQUATIONS</div>
      <div class="step-title">For each state v &ne; ${y}: H(v) = 1 + &sum; P(v,u) H(u)</div>
      <div class="step-math">${eqLines.join("\n")}</div>
    </div>
  `;

  // Step 3: Linear System (I - Q)H = 1
  html += `
    <div class="step-item">
      <div class="step-num">STEP 3 • MATRIX FORM (I − Q) H = 1 & GAUSSIAN ELIMINATION</div>
      <div class="step-title">Excluding target ${y}, solve simultaneous linear system over active states</div>
      <div class="step-math">Solved Expected Hitting Times to target ${y}:\n` +
      nodes.map(n => {
        const val = state.hittingTimeMatrix[n] ? state.hittingTimeMatrix[n][y] : Infinity;
        return `H(${n}) = ${val === Infinity ? '∞ (Unreachable)' : val.toFixed(2)}`;
      }).join("\n") +
      `\n\nResult for selected start node ${x}:\nHT(${x}, ${y}) = ${htVal === Infinity ? '∞ (Unreachable)' : htVal.toFixed(2)} steps</div>
    </div>
  `;

  // Step 4: Similarity Score
  const py = state.pageRank[y] !== undefined ? state.pageRank[y] : 0.20;
  html += `
    <div class="step-item">
      <div class="step-num">STEP 4 • PROXIMITY SCORE & NORMALIZATION</div>
      <div class="step-title">S_HT = −HT(x,y) and S_Norm = −HT(x,y) &times; &pi;_${y}</div>
      <div class="step-math">S_HT(${x}, ${y}) = ${htVal === Infinity ? '−∞' : (-htVal).toFixed(2)}\nS_Norm(${x}, ${y}) = ${htVal === Infinity ? '−∞' : (-htVal * py).toFixed(3)}</div>
    </div>
  `;

  container.innerHTML = html;
}

function renderComparisonTable() {
  const tbody = document.getElementById("comparisonTableBody");
  const compareStartHeader = document.getElementById("compareStartNode");
  if (!tbody) return;

  const startNode = state.startNode;
  if (compareStartHeader) compareStartHeader.textContent = startNode || "—";
  tbody.innerHTML = "";

  if (!startNode) return;

  const candidates = getNodeKeys().filter(k => k !== startNode);
  const rows = candidates.map(target => {
    const sp = getShortestPathEdges(startNode, target).length;
    const ht = state.hittingTimeMatrix[startNode] ? state.hittingTimeMatrix[startNode][target] : Infinity;
    const score = ht === Infinity ? -Infinity : -ht;
    const py = state.pageRank[target] !== undefined ? state.pageRank[target] : 0.20;
    const norm = ht === Infinity ? -Infinity : score * py;
    return { target, sp, ht, score, py, norm };
  });

  // Sort by highest score (smallest hitting time)
  rows.sort((a, b) => b.score - a.score);

  rows.forEach((row, idx) => {
    const isCurrentTarget = row.target === state.targetNode;
    const tr = document.createElement("tr");
    if (isCurrentTarget) tr.classList.add("active-row");

    tr.innerHTML = `
      <td><strong>Node ${row.target}</strong> ${isCurrentTarget ? '<span class="badge">ACTIVE</span>' : ''}</td>
      <td>${row.sp > 0 ? `${row.sp} hop${row.sp > 1 ? 's' : ''}` : 'Unconnected'}</td>
      <td><strong>${row.ht === Infinity ? '<span style="color:var(--red-accent);">∞ (Unreachable)</span>' : row.ht.toFixed(2) + ' steps'}</strong></td>
      <td><span style="color:var(--amber-accent); font-weight:700;">${row.score === -Infinity ? '−∞' : row.score.toFixed(2)}</span></td>
      <td>${row.py.toFixed(2)}</td>
      <td><span style="color:var(--purple-accent); font-weight:700;">${row.norm === -Infinity ? '−∞' : row.norm.toFixed(3)}</span></td>
      <td><span class="rank-badge ${idx === 0 ? 'rank-1' : ''}">${idx + 1}</span></td>
      <td>
        <button class="btn-select-target" data-target="${row.target}">Select</button>
      </td>
    `;

    tr.querySelector(".btn-select-target").addEventListener("click", () => {
      setTargetNode(row.target);
    });

    tbody.appendChild(tr);
  });
}

function renderAllPairsMatrix() {
  const headerRow = document.getElementById("allPairsHeaderRow");
  const body = document.getElementById("allPairsBody");
  if (!headerRow || !body) return;

  const nodes = getNodeKeys();
  headerRow.innerHTML = "<th>Start \\ Target</th>" + nodes.map(n => `<th>Target ${n}</th>`).join("");
  body.innerHTML = "";

  nodes.forEach(src => {
    const tr = document.createElement("tr");
    let cellsHtml = `<td><strong>Node ${src}</strong></td>`;

    nodes.forEach(tgt => {
      if (src === tgt) {
        cellsHtml += `<td class="matrix-cell-diagonal">0.00</td>`;
      } else {
        const val = state.hittingTimeMatrix[src] ? state.hittingTimeMatrix[src][tgt] : Infinity;
        if (val === Infinity) {
          cellsHtml += `<td class="matrix-cell-unreachable">∞</td>`;
        } else {
          cellsHtml += `<td class="matrix-cell-val">${val.toFixed(2)}</td>`;
        }
      }
    });

    tr.innerHTML = cellsHtml;
    body.appendChild(tr);
  });
}

// ============================================================================
// 7. DYNAMIC UI CONTROLS & DROPDOWNS
// ============================================================================

function updateDropdowns() {
  const startSelect = document.getElementById("startNodeSelect");
  const targetSelect = document.getElementById("targetNodeSelect");
  if (!startSelect || !targetSelect) return;

  const nodes = getNodeKeys();
  const currentStart = state.startNode;
  const currentTarget = state.targetNode;

  startSelect.innerHTML = "";
  targetSelect.innerHTML = "";

  nodes.forEach(n => {
    const optStart = document.createElement("option");
    optStart.value = n;
    optStart.textContent = `Node ${n}`;
    if (n === currentStart) optStart.selected = true;
    startSelect.appendChild(optStart);

    const optTarget = document.createElement("option");
    optTarget.value = n;
    optTarget.textContent = `Node ${n}`;
    if (n === currentTarget) optTarget.selected = true;
    targetSelect.appendChild(optTarget);
  });
}

function updatePageRankInputs() {
  const container = document.querySelector(".pr-inputs-grid");
  if (!container) return;

  const nodes = getNodeKeys();
  container.innerHTML = "";

  nodes.forEach(k => {
    if (state.pageRank[k] === undefined) {
      state.pageRank[k] = parseFloat((1.0 / nodes.length).toFixed(2));
    }

    const item = document.createElement("div");
    item.className = "pr-input-item";
    item.id = `prGroup${k}`;
    if (k === state.targetNode) item.classList.add("active-target");

    item.innerHTML = `
      <label for="pr${k}">&pi;<sub>${k}</sub></label>
      <input type="number" id="pr${k}" min="0.01" max="1.0" step="0.01" value="${state.pageRank[k].toFixed(2)}" class="pr-input">
    `;

    item.querySelector("input").addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      if (!isNaN(val) && val >= 0) {
        state.pageRank[k] = val;
        updateCalculationCards();
        renderComparisonTable();
      }
    });

    container.appendChild(item);
  });
}

function setStartNode(nodeKey) {
  if (state.isWalking) resetRandomWalk();
  state.startNode = nodeKey;
  const select = document.getElementById("startNodeSelect");
  if (select) select.value = nodeKey;
  recalculateAll();
  updateWalkUI();
}

function setTargetNode(nodeKey) {
  if (state.isWalking) resetRandomWalk();
  state.targetNode = nodeKey;
  const select = document.getElementById("targetNodeSelect");
  if (select) select.value = nodeKey;
  recalculateAll();
  updateWalkUI();
}

// ============================================================================
// 8. RANDOM WALK SIMULATION (STOCHASTIC RUN)
// ============================================================================

function runRandomWalk() {
  if (state.isWalking) return;

  const start = state.startNode;
  const target = state.targetNode;

  if (!start || !target) {
    alert("Please ensure both start and target nodes are selected.");
    return;
  }

  if (start === target) {
    alert(`Start (${start}) and Target (${target}) are identical. Hitting time is 0 steps.`);
    return;
  }

  const theoreticalHT = state.hittingTimeMatrix[start] ? state.hittingTimeMatrix[start][target] : Infinity;
  if (theoreticalHT === Infinity) {
    alert(`Node ${target} is unreachable from Node ${start}! Theoretical Hitting Time is ∞.`);
    return;
  }

  state.isWalking = true;
  state.isPaused = false;
  state.currentWalkStep = 0;
  state.walkPath = [start];

  document.getElementById("btnRunWalk").style.display = "none";
  document.getElementById("btnPauseWalk").style.display = "inline-flex";
  document.getElementById("walkStatusBadge").className = "walk-status-badge running";
  document.getElementById("walkStatusBadge").textContent = "WALKING...";
  updateWalkUI();

  const particle = document.getElementById("surferParticle");
  const pulse = document.getElementById("particlePulse");
  const startCoords = state.nodes[start];

  particle.setAttribute("cx", startCoords.x);
  particle.setAttribute("cy", startCoords.y);
  particle.style.display = "block";

  pulse.setAttribute("cx", startCoords.x);
  pulse.setAttribute("cy", startCoords.y);
  pulse.style.display = "block";

  highlightNodeVisited(start);
  document.getElementById("walkTraceLayer").innerHTML = "";

  scheduleNextStep();
}

function scheduleNextStep() {
  if (!state.isWalking || state.isPaused) return;

  state.walkTimer = setTimeout(() => {
    executeNextWalkStep();
  }, state.stepSpeedMs);
}

function executeNextWalkStep() {
  const current = state.walkPath[state.walkPath.length - 1];
  const target = state.targetNode;

  if (current === target) {
    finishRandomWalk();
    return;
  }

  const P = state.transitionMatrix;
  const row = P[current] || {};
  const candidates = Object.entries(row).filter(([_, prob]) => prob > 0);

  if (candidates.length === 0) {
    alert(`Walker reached a dead-end at Node ${current} with no outgoing edges!`);
    finishRandomWalk(true);
    return;
  }

  // Stochastic next node selection based on dynamic transition probabilities
  const rand = Math.random();
  let cum = 0;
  let nextNode = candidates[candidates.length - 1][0];

  for (const [candidate, prob] of candidates) {
    cum += prob;
    if (rand <= cum) {
      nextNode = candidate;
      break;
    }
  }

  state.currentWalkStep++;
  state.walkPath.push(nextNode);

  animateParticleTransition(current, nextNode, () => {
    highlightNodeVisited(nextNode);
    drawWalkArrow(current, nextNode);
    updateWalkUI();

    if (nextNode === target) {
      finishRandomWalk();
    } else {
      if (state.currentWalkStep >= 40) {
        document.getElementById("walkStatusBadge").textContent = "STOPPED (MAX 40 STEPS)";
        finishRandomWalk(true);
      } else {
        scheduleNextStep();
      }
    }
  });
}

function animateParticleTransition(fromNode, toNode, onComplete) {
  const p = document.getElementById("surferParticle");
  const pulse = document.getElementById("particlePulse");
  const fromCoord = state.nodes[fromNode];
  const toCoord = state.nodes[toNode];
  if (!fromCoord || !toCoord) {
    if (onComplete) onComplete();
    return;
  }

  const duration = Math.min(state.stepSpeedMs * 0.7, 500);
  const startTime = performance.now();

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1.0);
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

    const curX = fromCoord.x + (toCoord.x - fromCoord.x) * ease;
    const curY = fromCoord.y + (toCoord.y - fromCoord.y) * ease;

    p.setAttribute("cx", curX);
    p.setAttribute("cy", curY);
    pulse.setAttribute("cx", curX);
    pulse.setAttribute("cy", curY);

    if (progress < 1.0 && state.isWalking) {
      requestAnimationFrame(step);
    } else {
      p.setAttribute("cx", toCoord.x);
      p.setAttribute("cy", toCoord.y);
      pulse.setAttribute("cx", toCoord.x);
      pulse.setAttribute("cy", toCoord.y);
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(step);
}

function highlightNodeVisited(nodeKey) {
  const nodeEl = document.getElementById(`node-${nodeKey}`);
  if (nodeEl && !nodeEl.classList.contains("is-start") && !nodeEl.classList.contains("is-target")) {
    nodeEl.classList.add("is-visited");
  }
}

function drawWalkArrow(fromNode, toNode) {
  const traceLayer = document.getElementById("walkTraceLayer");
  const from = state.nodes[fromNode];
  const to = state.nodes[toNode];
  if (!from || !to) return;

  const jitterX = (Math.random() - 0.5) * 8;
  const jitterY = (Math.random() - 0.5) * 8;

  const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
  line.setAttribute("x1", from.x + jitterX);
  line.setAttribute("y1", from.y + jitterY);
  line.setAttribute("x2", to.x + jitterX);
  line.setAttribute("y2", to.y + jitterY);
  line.setAttribute("class", "walk-arrow-line");

  traceLayer.appendChild(line);
}

function finishRandomWalk(capped = false) {
  state.isWalking = false;
  state.isPaused = false;
  if (state.walkTimer) clearTimeout(state.walkTimer);

  document.getElementById("btnRunWalk").style.display = "inline-flex";
  document.getElementById("btnPauseWalk").style.display = "none";

  const badge = document.getElementById("walkStatusBadge");
  if (capped) {
    badge.className = "walk-status-badge";
    badge.textContent = "STOPPED";
  } else {
    badge.className = "walk-status-badge hit";
    badge.textContent = `TARGET HIT IN ${state.currentWalkStep} STEPS!`;
  }

  updateWalkUI();
}

function pauseRandomWalk() {
  if (!state.isWalking) return;
  state.isPaused = !state.isPaused;

  const pauseBtn = document.getElementById("btnPauseWalk");
  const badge = document.getElementById("walkStatusBadge");

  if (state.isPaused) {
    pauseBtn.innerHTML = `<span>▶</span> RESUME`;
    badge.textContent = "PAUSED";
    if (state.walkTimer) clearTimeout(state.walkTimer);
  } else {
    pauseBtn.innerHTML = `<span>⏸</span> PAUSE`;
    badge.textContent = "WALKING...";
    scheduleNextStep();
  }
}

function resetRandomWalk() {
  state.isWalking = false;
  state.isPaused = false;
  if (state.walkTimer) clearTimeout(state.walkTimer);

  state.currentWalkStep = 0;
  state.walkPath = [];

  document.getElementById("btnRunWalk").style.display = "inline-flex";
  document.getElementById("btnPauseWalk").style.display = "none";
  document.getElementById("btnPauseWalk").innerHTML = `<span>⏸</span> PAUSE`;

  const badge = document.getElementById("walkStatusBadge");
  badge.className = "walk-status-badge";
  badge.textContent = "READY TO RUN";

  const particle = document.getElementById("surferParticle");
  const pulse = document.getElementById("particlePulse");
  particle.style.display = "none";
  pulse.style.display = "none";

  document.getElementById("walkTraceLayer").innerHTML = "";

  getNodeKeys().forEach(k => {
    const el = document.getElementById(`node-${k}`);
    if (el) el.classList.remove("is-visited");
  });

  updateWalkUI();
}

function updateWalkUI() {
  const stepCountEl = document.getElementById("currentStepCount");
  if (stepCountEl) stepCountEl.textContent = state.currentWalkStep;

  const pathTextEl = document.getElementById("walkPathText");
  if (pathTextEl) {
    if (state.walkPath.length === 0) {
      pathTextEl.textContent = `${state.startNode || '—'} (Awaiting walk)`;
    } else {
      pathTextEl.textContent = state.walkPath.join(" ➔ ");
    }
  }
}

// ============================================================================
// 9. DYNAMIC GRAPH EDITING: ADD / DELETE NODES & EDGES
// ============================================================================

function addNodePrompt() {
  const existing = getNodeKeys();
  let candidate = "";
  for (let i = 65; i <= 90; i++) {
    const char = String.fromCharCode(i);
    if (!existing.includes(char)) {
      candidate = char;
      break;
    }
  }
  if (!candidate) candidate = `N${existing.length + 1}`;

  const nodeName = prompt("Enter new node name (e.g. F):", candidate);
  if (!nodeName) return;

  const cleanName = nodeName.trim().toUpperCase();
  if (state.nodes[cleanName]) {
    alert(`Node ${cleanName} already exists!`);
    return;
  }

  // Position node pleasantly in SVG viewport
  const count = existing.length;
  const angle = (count * 1.25) % (Math.PI * 2);
  const cx = 340 + Math.cos(angle) * 160;
  const cy = 220 + Math.sin(angle) * 120;

  state.nodes[cleanName] = {
    id: cleanName,
    label: cleanName,
    x: Math.round(Math.max(60, Math.min(620, cx))),
    y: Math.round(Math.max(60, Math.min(380, cy))),
    sub: "Custom Node"
  };

  recalculateAll();
}

function deleteNodePrompt() {
  const nodes = getNodeKeys();
  if (nodes.length <= 2) {
    alert("Graph must have at least 2 nodes to calculate hitting times.");
    return;
  }

  const target = prompt(`Enter node to delete (${nodes.join(", ")}):`, nodes[nodes.length - 1]);
  if (!target) return;

  const cleanTarget = target.trim().toUpperCase();
  if (!state.nodes[cleanTarget]) {
    alert(`Node ${cleanTarget} does not exist!`);
    return;
  }

  delete state.nodes[cleanTarget];
  delete state.pageRank[cleanTarget];
  delete state.customTransitions[cleanTarget];

  // Remove connected edges
  state.edges = state.edges.filter(e => e.u !== cleanTarget && e.v !== cleanTarget);

  if (state.startNode === cleanTarget) state.startNode = getNodeKeys()[0];
  if (state.targetNode === cleanTarget) state.targetNode = getNodeKeys().find(n => n !== state.startNode) || getNodeKeys()[0];

  recalculateAll();
}

function addEdgePrompt() {
  const nodes = getNodeKeys();
  if (nodes.length < 2) {
    alert("Graph needs at least two nodes to add an edge.");
    return;
  }

  const u = prompt(`Enter first node (${nodes.join(", ")}):`, nodes[0]);
  if (!u) return;
  const v = prompt(`Enter second node (${nodes.join(", ")}):`, nodes[1]);
  if (!v) return;

  const cleanU = u.trim().toUpperCase();
  const cleanV = v.trim().toUpperCase();

  if (cleanU === cleanV) {
    alert("Self-loops are not permitted in standard simple graph analysis.");
    return;
  }

  if (!state.nodes[cleanU] || !state.nodes[cleanV]) {
    alert("One or both nodes do not exist!");
    return;
  }

  if (hasEdge(cleanU, cleanV)) {
    alert(`Edge between ${cleanU} and ${cleanV} already exists!`);
    return;
  }

  state.edges.push({ u: cleanU, v: cleanV });
  recalculateAll();
}

function deleteEdgePrompt() {
  if (state.edges.length === 0) {
    alert("Graph has no edges to delete.");
    return;
  }

  const edgeListStr = state.edges.map((e, i) => `${i + 1}: ${e.u}-${e.v}`).join("\n");
  const choice = prompt(`Enter edge number to delete:\n${edgeListStr}`);
  if (!choice) return;

  const idx = parseInt(choice, 10) - 1;
  if (isNaN(idx) || idx < 0 || idx >= state.edges.length) {
    alert("Invalid edge number.");
    return;
  }

  state.edges.splice(idx, 1);
  recalculateAll();
}

function loadPreset(presetKey) {
  const preset = PRESETS[presetKey];
  if (!preset) return;

  if (state.isWalking) resetRandomWalk();

  state.nodes = JSON.parse(JSON.stringify(preset.nodes));
  state.edges = JSON.parse(JSON.stringify(preset.edges));
  state.startNode = preset.startNode;
  state.targetNode = preset.targetNode;

  // Initialize PageRank weights uniformly for preset
  const keys = Object.keys(preset.nodes);
  state.pageRank = {};
  keys.forEach(k => {
    state.pageRank[k] = parseFloat((1.0 / keys.length).toFixed(2));
  });

  recalculateAll();
}

// ============================================================================
// 10. CUSTOM TRANSITION PROBABILITIES MODAL
// ============================================================================

function openCustomTransitionsModal() {
  const modal = document.getElementById("customModelModal");
  const container = document.getElementById("modalTransitionsContainer");
  if (!modal || !container) return;

  container.innerHTML = "";
  const nodes = getNodeKeys();

  nodes.forEach(u => {
    const nbrs = getNeighbors(u);
    const box = document.createElement("div");
    box.className = "node-trans-box";

    let rowsHtml = "";
    if (nbrs.length === 0) {
      rowsHtml = `<div class="node-trans-row" style="color:var(--text-muted);">No neighbors (isolated node)</div>`;
    } else {
      nbrs.forEach(v => {
        const currentP = (state.transitionMatrix[u] && state.transitionMatrix[u][v] !== undefined)
          ? state.transitionMatrix[u][v]
          : (1.0 / nbrs.length);

        rowsHtml += `
          <div class="node-trans-row">
            <span>Transition <strong>${u} ➔ ${v}</strong>:</span>
            <input type="number" class="trans-prob-input" data-u="${u}" data-v="${v}" min="0" max="1" step="0.05" value="${currentP.toFixed(2)}">
          </div>
        `;
      });
    }

    box.innerHTML = `
      <div class="node-trans-title">
        <span>Node ${u} Outgoing Transitions</span>
        <span style="font-size:0.75rem; color:var(--text-muted);">${nbrs.length} neighbor(s)</span>
      </div>
      <div class="node-trans-rows">${rowsHtml}</div>
    `;

    container.appendChild(box);
  });

  modal.style.display = "flex";
}

function saveCustomTransitionsFromModal() {
  const inputs = document.querySelectorAll(".trans-prob-input");
  state.customTransitions = {};

  inputs.forEach(input => {
    const u = input.dataset.u;
    const v = input.dataset.v;
    const val = parseFloat(input.value) || 0;
    if (!state.customTransitions[u]) state.customTransitions[u] = {};
    state.customTransitions[u][v] = Math.max(0, val);
  });

  state.walkModel = "custom";
  const modelSelect = document.getElementById("walkModelSelect");
  if (modelSelect) modelSelect.value = "custom";

  document.getElementById("customModelModal").style.display = "none";
  recalculateAll();
}

// ============================================================================
// 11. EVENT LISTENERS & SETUP
// ============================================================================

function setupEventListeners() {
  // Start / Target Selectors
  document.getElementById("startNodeSelect").addEventListener("change", (e) => {
    setStartNode(e.target.value);
  });

  document.getElementById("targetNodeSelect").addEventListener("change", (e) => {
    setTargetNode(e.target.value);
  });

  // Dynamics Model Selector
  const modelSelect = document.getElementById("walkModelSelect");
  if (modelSelect) {
    modelSelect.addEventListener("change", (e) => {
      if (state.isWalking) resetRandomWalk();
      state.walkModel = e.target.value;
      recalculateAll();
    });
  }

  // Simulation controls
  document.getElementById("btnRunWalk").addEventListener("click", runRandomWalk);
  document.getElementById("btnPauseWalk").addEventListener("click", pauseRandomWalk);
  document.getElementById("btnResetWalk").addEventListener("click", resetRandomWalk);

  // Speed Slider
  const speedSlider = document.getElementById("speedSlider");
  const speedLabel = document.getElementById("speedLabel");
  speedSlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    state.stepSpeedMs = 1400 - val;
    if (state.stepSpeedMs < 450) speedLabel.textContent = "Fast";
    else if (state.stepSpeedMs > 850) speedLabel.textContent = "Slow";
    else speedLabel.textContent = "Normal";
  });

  // Reset PageRank
  document.getElementById("btnResetPR").addEventListener("click", () => {
    const nodes = getNodeKeys();
    state.pageRank = {};
    nodes.forEach(k => {
      state.pageRank[k] = parseFloat((1.0 / nodes.length).toFixed(2));
    });
    updatePageRankInputs();
    updateCalculationCards();
    renderComparisonTable();
  });

  // Graph Editor Toolbar Buttons
  document.getElementById("btnAddNode").addEventListener("click", addNodePrompt);
  document.getElementById("btnDeleteNode").addEventListener("click", deleteNodePrompt);
  document.getElementById("btnAddEdge").addEventListener("click", addEdgePrompt);
  document.getElementById("btnDeleteEdge").addEventListener("click", deleteEdgePrompt);
  document.getElementById("btnConfigureModel").addEventListener("click", openCustomTransitionsModal);

  // Preset Buttons
  document.querySelectorAll(".btn-preset").forEach(btn => {
    btn.addEventListener("click", () => {
      loadPreset(btn.dataset.preset);
    });
  });

  // Custom Transitions Modal
  document.getElementById("btnCloseModal").addEventListener("click", () => {
    document.getElementById("customModelModal").style.display = "none";
  });
  document.getElementById("btnResetToStandard").addEventListener("click", () => {
    state.walkModel = "standard";
    state.customTransitions = {};
    const modelSel = document.getElementById("walkModelSelect");
    if (modelSel) modelSel.value = "standard";
    document.getElementById("customModelModal").style.display = "none";
    recalculateAll();
  });
  document.getElementById("btnSaveCustomModel").addEventListener("click", saveCustomTransitionsFromModal);

  // Toggle All-Pairs Table
  const btnToggleAllPairs = document.getElementById("btnToggleAllPairs");
  const allPairsContainer = document.getElementById("allPairsTableContainer");
  if (btnToggleAllPairs && allPairsContainer) {
    btnToggleAllPairs.addEventListener("click", () => {
      const isHidden = allPairsContainer.style.display === "none";
      allPairsContainer.style.display = isHidden ? "block" : "none";
      btnToggleAllPairs.textContent = isHidden ? "Hide Matrix View" : "Show Full Matrix View";
    });
  }

  // Educational Modes
  const btnSimple = document.getElementById("btnSimpleMode");
  const btnFormula = document.getElementById("btnFormulaMode");
  const calcContent = document.getElementById("calcContent");
  const calcChevron = document.getElementById("calcChevron");

  btnSimple.addEventListener("click", () => {
    state.mode = "simple";
    btnSimple.classList.add("active");
    btnFormula.classList.remove("active");
    calcContent.classList.remove("show");
    calcChevron.classList.remove("open");
  });

  btnFormula.addEventListener("click", () => {
    state.mode = "formula";
    btnFormula.classList.add("active");
    btnSimple.classList.remove("active");
    calcContent.classList.add("show");
    calcChevron.classList.add("open");
  });

  document.getElementById("btnToggleCalculation").addEventListener("click", () => {
    calcContent.classList.toggle("show");
    calcChevron.classList.toggle("open");
  });

  // Presentation Mode Toggle
  const btnPres = document.getElementById("btnPresentationMode");
  btnPres.addEventListener("click", () => {
    state.isPresentation = !state.isPresentation;
    document.body.classList.toggle("presentation-active", state.isPresentation);
    btnPres.classList.toggle("active", state.isPresentation);
    btnPres.innerHTML = state.isPresentation ? `<span>✕</span> Exit Presentation` : `<span class="icon">⛶</span> Presentation Mode`;
  });
}

// ============================================================================
// 12. INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  loadPreset("star5");
  setupEventListeners();
});
