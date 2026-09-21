/**
 * HITTING TIME - GLOBAL HEURISTIC EDUCATIONAL VISUALIZATION
 * Mathematical Engine, Graph Rendering, Random Walk Simulation,
 * and Classroom Presentation Controller.
 */

// ============================================================================
// 1. GRAPH DEFINITION & TOPOLOGY
// ============================================================================
// Graph topology as specified:
// Nodes: A, B, C, D, E
// Edges: A-B, B-C, B-D, B-E
// B is the central hub connected to all other nodes.
// Coordinates designed for a 680x440 SVG canvas with pleasing layout.

const GRAPH = {
  nodes: {
    A: { id: "A", label: "A", x: 130, y: 220, sub: "Leaf (deg 1)" },
    B: { id: "B", label: "B", x: 340, y: 220, sub: "Hub (deg 4)" },
    C: { id: "C", label: "C", x: 550, y: 220, sub: "Leaf (deg 1)" },
    D: { id: "D", label: "D", x: 340, y: 80,  sub: "Leaf (deg 1)" },
    E: { id: "E", label: "E", x: 340, y: 360, sub: "Leaf (deg 1)" }
  },
  edges: [
    { u: "A", v: "B" },
    { u: "B", v: "C" },
    { u: "B", v: "D" },
    { u: "B", v: "E" }
  ]
};

// Canonical node keys
const NODE_KEYS = ["A", "B", "C", "D", "E"];

// Adjacency list representation
const ADJ = {
  A: ["B"],
  B: ["A", "C", "D", "E"],
  C: ["B"],
  D: ["B"],
  E: ["B"]
};

// Classroom prompt default stationary / PageRank values:
// pi_A=0.15, pi_B=0.35, pi_C=0.20, pi_D=0.18, pi_E=0.12
const DEFAULT_PAGERANK = {
  A: 0.15,
  B: 0.35,
  C: 0.20,
  D: 0.18,
  E: 0.12
};

// ============================================================================
// 2. MATHEMATICAL ENGINES: HITTING TIME CALCULATIONS
// ============================================================================

/**
 * 1) FULL MARKOV RANDOM WALK SOLVER (Linear Algebra / First-Step Analysis)
 * Standard Markov Chain on undirected graph G where every node chooses
 * each neighbor with probability 1 / deg(x).
 * For non-target states:
 *   HT(x, y) = 1 + sum_{z in N(x)} (1/deg(x)) * HT(z, y)
 * Solved via Gaussian elimination.
 */
function solveFullMarkovHittingTimes(targetNode) {
  const nonTargetNodes = NODE_KEYS.filter(n => n !== targetNode);
  const n = nonTargetNodes.length;
  const result = {};
  result[targetNode] = 0;

  if (n === 0) return result;

  const A = Array.from({ length: n }, () => Array(n).fill(0));
  const b = Array(n).fill(1);

  nonTargetNodes.forEach((x, i) => {
    A[i][i] = 1.0;
    const neighbors = ADJ[x];
    const p = 1.0 / neighbors.length;

    neighbors.forEach(nbr => {
      if (nbr !== targetNode) {
        const j = nonTargetNodes.indexOf(nbr);
        if (j !== -1) {
          A[i][j] -= p;
        }
      }
    });
  });

  // Gaussian elimination with partial pivoting
  for (let col = 0; col < n; col++) {
    let maxRow = col;
    let maxVal = Math.abs(A[col][col]);
    for (let r = col + 1; r < n; r++) {
      if (Math.abs(A[r][col]) > maxVal) {
        maxVal = Math.abs(A[r][col]);
        maxRow = r;
      }
    }
    if (maxRow !== col) {
      [A[col], A[maxRow]] = [A[maxRow], A[col]];
      [b[col], b[maxRow]] = [b[maxRow], b[col]];
    }
    const pivot = A[col][col];
    for (let r = col + 1; r < n; r++) {
      const factor = A[r][col] / pivot;
      for (let c = col; c < n; c++) {
        A[r][c] -= factor * A[col][c];
      }
      b[r] -= factor * b[col];
    }
  }

  // Back substitution
  const hSolution = Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let sum = b[r];
    for (let c = r + 1; c < n; c++) {
      sum -= A[r][c] * hSolution[c];
    }
    hSolution[r] = sum / A[r][r];
  }

  nonTargetNodes.forEach((node, i) => {
    result[node] = Math.max(0, hSolution[i]);
  });

  return result;
}

/**
 * 2) CLASSROOM SYLLABUS MODEL (Section 3 & 5 of specification)
 * In the classroom lecture notes for A -> C:
 * Surfer moves from A -> B (1 step).
 * From B, the forward choices to other branches are equiprobable:
 *   P(B->C) = 1/3, P(B->D) = 1/3, P(B->E) = 1/3.
 * The 3 canonical trajectories to reach C are:
 *   1) A -> B -> C (2 steps, prob 1/3)
 *   2) A -> B -> D -> B -> C (4 steps, prob 1/3)
 *   3) A -> B -> E -> B -> C (4 steps, prob 1/3)
 * Expected Steps = (2 + 4 + 4) / 3 = 10 / 3 = 3.33 steps!
 * This function computes this pedagogical hitting time for any start/target pair.
 */
function solveClassroomHittingTimes(targetNode) {
  const result = {};
  NODE_KEYS.forEach(src => {
    if (src === targetNode) {
      result[src] = 0;
    } else if (src === "B" || targetNode === "B") {
      // Hub to leaf or leaf to hub
      if (src !== "B" && targetNode === "B") {
        // Direct leaf to hub: 1 step
        result[src] = 1.0;
      } else {
        // Hub B to leaf (e.g. B -> C):
        // 1/3 prob to hit C in 1 step, 2/3 prob to visit other leaf and take 3 steps
        // (1 + 3 + 3) / 3 = 7 / 3 = 2.33 steps
        result[src] = 7 / 3;
      }
    } else {
      // Leaf to leaf (e.g. A to C, D to C, etc.):
      // 1 step to B + 2.33 from B = 3.33 steps (10/3)
      result[src] = 10 / 3;
    }
  });
  return result;
}

// Compute pairwise hitting times cache
function computeHittingTimesMatrix(modelType) {
  const matrix = {};
  NODE_KEYS.forEach(u => matrix[u] = {});
  NODE_KEYS.forEach(target => {
    const col = (modelType === "classroom") 
      ? solveClassroomHittingTimes(target)
      : solveFullMarkovHittingTimes(target);
    NODE_KEYS.forEach(src => {
      matrix[src][target] = col[src];
    });
  });
  return matrix;
}

// ============================================================================
// 3. APPLICATION STATE
// ============================================================================
const state = {
  startNode: "A",
  targetNode: "C",
  walkModel: "classroom", // "classroom" | "full"
  pageRank: { ...DEFAULT_PAGERANK },
  hittingTimesCache: null, // populated in init

  // Animation & simulation states
  isWalking: false,
  isPaused: false,
  currentWalkStep: 0,
  walkPath: [],
  walkTimer: null,
  stepSpeedMs: 600,

  // Display modes
  mode: "simple", // "simple" | "formula"
  isPresentation: false,
  isCalcOpen: false
};

state.hittingTimesCache = computeHittingTimesMatrix(state.walkModel);

// ============================================================================
// 4. SVG GRAPH RENDERING
// ============================================================================
function initGraphVisualization() {
  const edgesLayer = document.getElementById("edgesLayer");
  const nodesLayer = document.getElementById("nodesLayer");
  const probLabelsLayer = document.getElementById("probLabelsLayer");

  edgesLayer.innerHTML = "";
  nodesLayer.innerHTML = "";
  probLabelsLayer.innerHTML = "";

  // Render static edges
  GRAPH.edges.forEach(edge => {
    const uNode = GRAPH.nodes[edge.u];
    const vNode = GRAPH.nodes[edge.v];

    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", uNode.x);
    line.setAttribute("y1", uNode.y);
    line.setAttribute("x2", vNode.x);
    line.setAttribute("y2", vNode.y);
    line.setAttribute("class", "edge-line");
    line.setAttribute("id", `edge-${edge.u}-${edge.v}`);
    edgesLayer.appendChild(line);

    // Probability Indicator Badge on edge
    const midX = (uNode.x + vNode.x) / 2;
    const midY = (uNode.y + vNode.y) / 2;

    const gBadge = document.createElementNS("http://www.w3.org/2000/svg", "g");
    gBadge.setAttribute("class", "prob-badge-group");
    gBadge.setAttribute("id", `prob-${edge.u}-${edge.v}`);

    // Perpendicular offset for badge clarity
    const dx = vNode.x - uNode.x;
    const dy = vNode.y - uNode.y;
    const len = Math.hypot(dx, dy) || 1;
    const perpX = -dy / len * 16;
    const perpY = dx / len * 16;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", midX + perpX - 26);
    rect.setAttribute("y", midY + perpY - 12);
    rect.setAttribute("width", 52);
    rect.setAttribute("height", 24);
    rect.setAttribute("class", "prob-badge-rect");

    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", midX + perpX);
    text.setAttribute("y", midY + perpY);
    text.setAttribute("class", "prob-badge-text");
    text.textContent = "P=1/3";

    gBadge.appendChild(rect);
    gBadge.appendChild(text);
    probLabelsLayer.appendChild(gBadge);
  });

  // Render nodes
  NODE_KEYS.forEach(nodeKey => {
    const node = GRAPH.nodes[nodeKey];
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", "node-group");
    g.setAttribute("id", `node-${nodeKey}`);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", `Node ${nodeKey}`);

    // Outer Halo
    const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    halo.setAttribute("cx", node.x);
    halo.setAttribute("cy", node.y);
    halo.setAttribute("r", 33);
    halo.setAttribute("class", "node-halo");
    halo.setAttribute("fill", "none");
    halo.setAttribute("stroke", "transparent");
    halo.setAttribute("stroke-width", "2");

    // Base circle
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", node.x);
    circle.setAttribute("cy", node.y);
    circle.setAttribute("r", 27);
    circle.setAttribute("class", "node-base");

    // Center Node Label
    const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
    text.setAttribute("x", node.x);
    text.setAttribute("y", node.y);
    text.setAttribute("class", "node-text");
    text.textContent = node.label;

    // Subtext (Node degree / role)
    const subText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    subText.setAttribute("x", node.x);
    subText.setAttribute("y", node.y + 40);
    subText.setAttribute("class", "node-subtext");
    subText.textContent = node.sub;

    g.appendChild(halo);
    g.appendChild(circle);
    g.appendChild(text);
    g.appendChild(subText);

    // Interactive node selection via click
    g.addEventListener("click", () => {
      handleNodeClick(nodeKey);
    });

    nodesLayer.appendChild(g);
  });

  updateGraphVisualClasses();
  updateEdgeProbabilityLabels();
}

/**
 * Handle clicking on a node directly in the SVG graph:
 * If start != clicked, switch target to clicked.
 */
function handleNodeClick(nodeKey) {
  if (state.isWalking) resetRandomWalk();
  if (nodeKey === state.startNode) return;

  state.targetNode = nodeKey;
  document.getElementById("targetNodeSelect").value = nodeKey;
  syncAll();
}

/**
 * Updates visual classes on SVG nodes and edges reflecting
 * the active start node, target node, and shortest path.
 */
function updateGraphVisualClasses() {
  NODE_KEYS.forEach(k => {
    const nodeEl = document.getElementById(`node-${k}`);
    if (!nodeEl) return;
    nodeEl.classList.remove("is-start", "is-target", "is-both");

    if (k === state.startNode && k === state.targetNode) {
      nodeEl.classList.add("is-both");
    } else if (k === state.startNode) {
      nodeEl.classList.add("is-start");
    } else if (k === state.targetNode) {
      nodeEl.classList.add("is-target");
    }
  });

  // Shortest path edge highlight
  const shortestPathEdges = getShortestPathEdges(state.startNode, state.targetNode);
  GRAPH.edges.forEach(e => {
    const edgeId = `edge-${e.u}-${e.v}`;
    const edgeEl = document.getElementById(edgeId);
    if (!edgeEl) return;

    const isShortest = shortestPathEdges.some(
      pe => (pe.u === e.u && pe.v === e.v) || (pe.u === e.v && pe.v === e.u)
    );
    if (isShortest) {
      edgeEl.classList.add("active-path");
    } else {
      edgeEl.classList.remove("active-path");
    }
  });
}

/**
 * Displays contextual transition probabilities on edges
 */
function updateEdgeProbabilityLabels() {
  const isClassroom = state.walkModel === "classroom";
  const frac = isClassroom ? "⅓" : "¼";

  GRAPH.edges.forEach(e => {
    const gBadge = document.getElementById(`prob-${e.u}-${e.v}`);
    if (!gBadge) return;
    const textEl = gBadge.querySelector("text");

    if (e.u === "B" || e.v === "B") {
      const leaf = e.u === "B" ? e.v : e.u;
      textEl.textContent = `B➔${leaf}: ${frac}`;
    }
  });
}

/**
 * BFS for shortest path edges
 */
function getShortestPathEdges(start, target) {
  if (start === target) return [];
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

    for (const nbr of ADJ[current]) {
      if (!visited.has(nbr)) {
        visited.add(nbr);
        queue.push([...path, nbr]);
      }
    }
  }
  return [];
}

// ============================================================================
// 5. LIVE CALCULATION & METRICS SYNCHRONIZATION
// ============================================================================
function updateCalculations() {
  const x = state.startNode;
  const y = state.targetNode;

  // Retrieve exact hitting time from cache
  const htVal = state.hittingTimesCache[x][y];
  const scoreVal = -htVal;
  const py = state.pageRank[y] || 0.0;
  const normScoreVal = scoreVal * py;

  // Update Hero Metric Displays
  const htDisplay = document.getElementById("htValDisplay");
  const scoreDisplay = document.getElementById("scoreValDisplay");
  const normDisplay = document.getElementById("normScoreValDisplay");
  const nodePairBadge = document.getElementById("nodePairBadge");
  const normCalcSub = document.getElementById("normCalcSub");

  nodePairBadge.textContent = `${x} ➔ ${y}`;

  // If hitting time is zero (start == target)
  htDisplay.textContent = htVal === 0 ? "0.00" : htVal.toFixed(2);
  scoreDisplay.textContent = scoreVal === 0 ? "0.00" : scoreVal.toFixed(2);
  normDisplay.textContent = normScoreVal === 0 ? "0.000" : normScoreVal.toFixed(3);

  normCalcSub.textContent = `−${htVal.toFixed(2)} × ${py.toFixed(2)} = ${normScoreVal.toFixed(3)}`;

  // Highlight active target in PageRank input list
  NODE_KEYS.forEach(k => {
    const grp = document.getElementById(`prGroup${k}`);
    if (grp) {
      if (k === y) {
        grp.classList.add("active-target");
      } else {
        grp.classList.remove("active-target");
      }
    }
  });

  // Step-by-Step Derivation Breakdown
  renderStepByStepDerivation(x, y, htVal, scoreVal, py, normScoreVal);

  // Update Comparison Table
  renderComparisonTable(x);
}

/**
 * Step-by-Step Mathematical Derivation
 * Explains Markov first-step analysis and classroom path decomposition.
 */
function renderStepByStepDerivation(x, y, htVal, scoreVal, py, normScoreVal) {
  const container = document.getElementById("dynamicStepsContainer");
  if (!container) return;

  if (x === y) {
    container.innerHTML = `
      <div class="step-item">
        <div class="step-num">TRIVIAL BASE CASE: START = TARGET</div>
        <div class="step-title">Node ${x} is already at Target ${y}</div>
        <div class="step-math">HT(${x}, ${y}) = 0.00 steps\nS_HT(${x}, ${y}) = -0.00\nS_Norm(${x}, ${y}) = 0.000</div>
      </div>
    `;
    return;
  }

  const isClassroom = state.walkModel === "classroom";
  let derivationHtml = "";

  // Step 1: Base Condition
  derivationHtml += `
    <div class="step-item">
      <div class="step-num">STEP 1 • TARGET BASE CONDITION</div>
      <div class="step-title">Hitting time at target is zero</div>
      <div class="step-math">HT(${y}, ${y}) = 0\n(Random walk absorbs/terminates immediately upon first arrival at target ${y})</div>
    </div>
  `;

  // Step 2: System Equations for Neighbors
  const nonTargetNodes = NODE_KEYS.filter(n => n !== y);
  let eqText = "";
  nonTargetNodes.forEach(node => {
    const nbrs = ADJ[node];
    const p = isClassroom 
      ? (node === "B" ? "⅓" : "1") 
      : (1.0 / nbrs.length).toFixed(2);
    const sumTerms = nbrs.map(nbr => `(${p} · HT(${nbr}, ${y}))`).join(" + ");
    eqText += `HT(${node}, ${y}) = 1 + [ ${sumTerms} ]\n`;
  });

  derivationHtml += `
    <div class="step-item">
      <div class="step-num">STEP 2 • FIRST-STEP RECURRENCE SYSTEM</div>
      <div class="step-title">Expected steps from each non-target node: HT(x,y) = 1 + &sum; P(x,z) HT(z,y)</div>
      <div class="step-math">${eqText.trim()}</div>
    </div>
  `;

  // Step 3: Specific Path Analysis
  let explanationNote = "";
  if (x === "A" && y === "C") {
    if (isClassroom) {
      explanationNote = 
        `1. From A: leaf with 1 outgoing edge to B (prob = 1.0).\n` +
        `   HT(A, C) = 1 + HT(B, C)\n\n` +
        `2. From B: random surfer chooses among forward branches {C, D, E} uniformly (prob = ⅓ each):\n` +
        `   • Path 1: A ➔ B ➔ C                         [Length: 2 steps, Prob = ⅓]\n` +
        `   • Path 2: A ➔ B ➔ D ➔ B ➔ C                 [Length: 4 steps, Prob = ⅓]\n` +
        `   • Path 3: A ➔ B ➔ E ➔ B ➔ C                 [Length: 4 steps, Prob = ⅓]\n\n` +
        `3. Expected Hitting Time Calculation:\n` +
        `   HT(A, C) = (2 × ⅓) + (4 × ⅓) + (4 × ⅓) = (2 + 4 + 4) / 3 = 10 / 3\n` +
        `   ➔ HT(A, C) = 3.33 steps (Exact syllabus expectation!)`;
    } else {
      explanationNote = 
        `1. From A: only neighbor is B ➔ HT(A, C) = 1 + HT(B, C)\n` +
        `2. From B: 4 neighbors {A, C, D, E} each with probability ¼ = 0.25:\n` +
        `   HT(B, C) = 1 + 0.25·HT(A, C) + 0.25·HT(C, C) + 0.25·HT(D, C) + 0.25·HT(E, C)\n` +
        `   Since HT(C, C)=0 and by symmetry HT(A, C) = HT(D, C) = HT(E, C) = 1 + HT(B, C):\n` +
        `   HT(B, C) = 1 + 0.75·(1 + HT(B, C)) = 1.75 + 0.75·HT(B, C)\n` +
        `   0.25·HT(B, C) = 1.75 ➔ HT(B, C) = 7.00 steps.\n` +
        `   ➔ HT(A, C) = 1 + 7.00 = 8.00 steps.`;
    }
  } else if (x === "A" && y === "B") {
    explanationNote = 
      `A has a single edge directly to B. Any walk starting at A must immediately move to B on step 1.\n` +
      `➔ HT(A, B) = 1 + HT(B, B) = 1 + 0 = 1.00 step.`;
  } else if (x === "B" && y === "A") {
    explanationNote = 
      `From Hub B to Leaf A: target branch is selected with probability 1/deg(B).\n` +
      `If chosen on step 1, takes 1 step. Otherwise bounces through other leaf nodes.\n` +
      `➔ Expected hitting time = ${htVal.toFixed(2)} steps!\n` +
      `Notice the stark asymmetry: HT(A,B) = 1.00 vs HT(B,A) = ${htVal.toFixed(2)}.`;
  } else {
    explanationNote = 
      `Solving the first-step linear system for source ${x} and target ${y}:\n` +
      `➔ HT(${x}, ${y}) = ${htVal.toFixed(2)} steps.`;
  }

  derivationHtml += `
    <div class="step-item">
      <div class="step-num">STEP 3 • ALGEBRAIC RESOLUTION</div>
      <div class="step-title">Analytical evaluation for source node ${x} to target ${y}</div>
      <div class="step-math">${explanationNote}</div>
    </div>
  `;

  // Step 4: Scores
  derivationHtml += `
    <div class="step-item">
      <div class="step-num">STEP 4 • HITTING SCORE & NORMALIZATION</div>
      <div class="step-title">Invert arrival time into similarity score: S_HT = −HT and S_Norm = −HT × &pi;_y</div>
      <div class="step-math">S_HT(${x}, ${y}) = -HT(${x}, ${y}) = ${scoreVal.toFixed(2)}\nS_Norm(${x}, ${y}) = -HT(${x}, ${y}) × π_${y} = -${htVal.toFixed(2)} × ${py.toFixed(2)} = ${normScoreVal.toFixed(3)}</div>
    </div>
  `;

  container.innerHTML = derivationHtml;
}

/**
 * Renders the Comparison Table comparing hitting times from start node x
 * to all possible targets (B, C, D, E, etc.)
 */
function renderComparisonTable(startNode) {
  const tbody = document.getElementById("comparisonTableBody");
  const compareStartHeader = document.getElementById("compareStartNode");
  if (!tbody || !compareStartHeader) return;

  compareStartHeader.textContent = startNode;

  // Candidates are all nodes other than startNode
  const candidates = NODE_KEYS.filter(k => k !== startNode);

  // Compute metrics for each candidate
  const rowsData = candidates.map(target => {
    const ht = state.hittingTimesCache[startNode][target];
    const score = -ht;
    const py = state.pageRank[target] || 0.15;
    const norm = score * py;
    const shortestPath = getShortestPathEdges(startNode, target).length;

    return {
      target,
      shortestPath,
      ht,
      score,
      py,
      norm
    };
  });

  // Sort by S_HT descending (closer to 0 is highest similarity)
  rowsData.sort((a, b) => b.score - a.score);

  tbody.innerHTML = "";
  rowsData.forEach((row, index) => {
    const tr = document.createElement("tr");
    const isCurrentTarget = row.target === state.targetNode;
    const isBest = index === 0;

    if (isCurrentTarget) tr.classList.add("selected-row");
    if (isBest) tr.classList.add("best-row");

    tr.innerHTML = `
      <td><strong>Node ${row.target}</strong> ${isCurrentTarget ? '<span class="badge">ACTIVE</span>' : ''}</td>
      <td>${row.shortestPath} hop${row.shortestPath > 1 ? 's' : ''}</td>
      <td><strong>${row.ht.toFixed(2)}</strong> steps</td>
      <td><span style="color:var(--amber-accent); font-weight:700;">${row.score.toFixed(2)}</span></td>
      <td>${row.py.toFixed(2)}</td>
      <td><span style="color:var(--purple-accent); font-weight:700;">${row.norm.toFixed(3)}</span></td>
      <td><span class="rank-badge ${index === 0 ? 'rank-1' : ''}">${index + 1}</span></td>
      <td>
        <button class="btn-select-target" data-target="${row.target}">
          Select
        </button>
      </td>
    `;

    tr.querySelector(".btn-select-target").addEventListener("click", () => {
      if (state.isWalking) resetRandomWalk();
      state.targetNode = row.target;
      document.getElementById("targetNodeSelect").value = row.target;
      syncAll();
    });

    tbody.appendChild(tr);
  });
}

// ============================================================================
// 6. RANDOM WALK SIMULATION & ANIMATION
// ============================================================================
function runRandomWalk() {
  if (state.isWalking) return;

  const start = state.startNode;
  const target = state.targetNode;

  if (start === target) {
    alert(`Start Node (${start}) and Target Node (${target}) are the same. Hitting Time is already 0!`);
    return;
  }

  state.isWalking = true;
  state.isPaused = false;
  state.currentWalkStep = 0;
  state.walkPath = [start];

  // UI state updates
  document.getElementById("btnRunWalk").style.display = "none";
  document.getElementById("btnPauseWalk").style.display = "inline-flex";
  document.getElementById("walkStatusBadge").className = "walk-status-badge running";
  document.getElementById("walkStatusBadge").textContent = "WALKING...";
  updateWalkUI();

  // Show surfer particle at start node
  const particle = document.getElementById("surferParticle");
  const pulse = document.getElementById("particlePulse");
  const startCoords = GRAPH.nodes[start];

  particle.setAttribute("cx", startCoords.x);
  particle.setAttribute("cy", startCoords.y);
  particle.style.display = "block";

  pulse.setAttribute("cx", startCoords.x);
  pulse.setAttribute("cy", startCoords.y);
  pulse.style.display = "block";

  // Mark start node visited
  highlightNodeVisited(start);

  // Clear previous walk trace arrows
  document.getElementById("walkTraceLayer").innerHTML = "";

  // Trigger step loop
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

  // Determine possible next steps based on model
  const isClassroom = state.walkModel === "classroom";
  let nextNode;

  if (isClassroom && current === "B") {
    // Classroom model: from B, surfer chooses uniformly among forward leaves
    // If target is C, branches are C, D, E (each 1/3)
    const forwardBranches = ["C", "D", "E"];
    nextNode = forwardBranches[Math.floor(Math.random() * forwardBranches.length)];
  } else {
    // Standard uniform selection among all neighbors
    const neighbors = ADJ[current];
    nextNode = neighbors[Math.floor(Math.random() * neighbors.length)];
  }

  state.currentWalkStep++;
  state.walkPath.push(nextNode);

  // Animate particle transition along edge
  animateParticleTransition(current, nextNode, () => {
    highlightNodeVisited(nextNode);
    drawWalkArrow(current, nextNode);
    updateWalkUI();

    if (nextNode === target) {
      finishRandomWalk();
    } else {
      // Continue walk (safety cap at 30 steps to keep classroom presentation crisp)
      if (state.currentWalkStep >= 30) {
        document.getElementById("walkStatusBadge").textContent = "WALK CAPPED (30 STEPS)";
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
  const fromCoord = GRAPH.nodes[fromNode];
  const toCoord = GRAPH.nodes[toNode];

  const duration = Math.min(state.stepSpeedMs * 0.7, 500);
  const startTime = performance.now();

  function stepAnimation(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1.0);
    // Smooth ease-in-out curve
    const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;

    const curX = fromCoord.x + (toCoord.x - fromCoord.x) * ease;
    const curY = fromCoord.y + (toCoord.y - fromCoord.y) * ease;

    p.setAttribute("cx", curX);
    p.setAttribute("cy", curY);
    pulse.setAttribute("cx", curX);
    pulse.setAttribute("cy", curY);

    if (progress < 1.0 && state.isWalking) {
      requestAnimationFrame(stepAnimation);
    } else {
      p.setAttribute("cx", toCoord.x);
      p.setAttribute("cy", toCoord.y);
      pulse.setAttribute("cx", toCoord.x);
      pulse.setAttribute("cy", toCoord.y);
      if (onComplete) onComplete();
    }
  }

  requestAnimationFrame(stepAnimation);
}

function highlightNodeVisited(nodeKey) {
  const nodeEl = document.getElementById(`node-${nodeKey}`);
  if (nodeEl && !nodeEl.classList.contains("is-start") && !nodeEl.classList.contains("is-target")) {
    nodeEl.classList.add("is-visited");
  }
}

function drawWalkArrow(fromNode, toNode) {
  const traceLayer = document.getElementById("walkTraceLayer");
  const from = GRAPH.nodes[fromNode];
  const to = GRAPH.nodes[toNode];

  // Micro-offset line coordinate if edge was traversed multiple times
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
    badge.textContent = "STOPPED (MAX STEPS)";
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

  // Reset visual walk indicators on SVG
  const particle = document.getElementById("surferParticle");
  const pulse = document.getElementById("particlePulse");
  particle.style.display = "none";
  pulse.style.display = "none";

  document.getElementById("walkTraceLayer").innerHTML = "";

  NODE_KEYS.forEach(k => {
    const el = document.getElementById(`node-${k}`);
    if (el) el.classList.remove("is-visited");
  });

  updateWalkUI();
}

function updateWalkUI() {
  document.getElementById("currentStepCount").textContent = state.currentWalkStep;
  const pathTextEl = document.getElementById("walkPathText");

  if (state.walkPath.length === 0) {
    pathTextEl.textContent = `${state.startNode} (Awaiting walk)`;
  } else {
    pathTextEl.textContent = state.walkPath.join(" ➔ ");
  }
}

// ============================================================================
// 7. EVENT HANDLERS & INTERACTIONS
// ============================================================================
function setupEventListeners() {
  // Start / Target Selectors
  const startSelect = document.getElementById("startNodeSelect");
  const targetSelect = document.getElementById("targetNodeSelect");

  startSelect.addEventListener("change", (e) => {
    if (state.isWalking) resetRandomWalk();
    state.startNode = e.target.value;
    syncAll();
  });

  targetSelect.addEventListener("change", (e) => {
    if (state.isWalking) resetRandomWalk();
    state.targetNode = e.target.value;
    syncAll();
  });

  // Dynamics Model Selector
  const modelSelect = document.getElementById("walkModelSelect");
  if (modelSelect) {
    modelSelect.addEventListener("change", (e) => {
      if (state.isWalking) resetRandomWalk();
      state.walkModel = e.target.value;
      state.hittingTimesCache = computeHittingTimesMatrix(state.walkModel);
      updateEdgeProbabilityLabels();
      syncAll();
    });
  }

  // Walk Control Buttons
  document.getElementById("btnRunWalk").addEventListener("click", runRandomWalk);
  document.getElementById("btnPauseWalk").addEventListener("click", pauseRandomWalk);
  document.getElementById("btnResetWalk").addEventListener("click", resetRandomWalk);

  // Speed Slider
  const speedSlider = document.getElementById("speedSlider");
  const speedLabel = document.getElementById("speedLabel");
  speedSlider.addEventListener("input", (e) => {
    const val = parseInt(e.target.value, 10);
    // 200 => Fast (250ms), 600 => Normal (600ms), 1200 => Slow (1100ms)
    state.stepSpeedMs = 1400 - val;
    if (state.stepSpeedMs < 450) speedLabel.textContent = "Fast";
    else if (state.stepSpeedMs > 850) speedLabel.textContent = "Slow";
    else speedLabel.textContent = "Normal";
  });

  // PageRank / Stationary Distribution Inputs
  NODE_KEYS.forEach(k => {
    const prInput = document.getElementById(`pr${k}`);
    if (prInput) {
      prInput.addEventListener("input", (e) => {
        const val = parseFloat(e.target.value);
        if (!isNaN(val) && val >= 0) {
          state.pageRank[k] = val;
          updateCalculations();
        }
      });
    }
  });

  // Reset PageRank button
  document.getElementById("btnResetPR").addEventListener("click", () => {
    state.pageRank = { ...DEFAULT_PAGERANK };
    NODE_KEYS.forEach(k => {
      const input = document.getElementById(`pr${k}`);
      if (input) input.value = DEFAULT_PAGERANK[k].toFixed(2);
    });
    updateCalculations();
  });

  // Educational Mode (Simple vs. Formula Mode)
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

  // Collapsible Calculation Section
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
    if (state.isPresentation) {
      btnPres.innerHTML = `<span>✕</span> Exit Presentation`;
    } else {
      btnPres.innerHTML = `<span class="icon">⛶</span> Presentation Mode`;
    }
  });
}

/**
 * Synchronize all UI elements and visualizations with current state
 */
function syncAll() {
  updateGraphVisualClasses();
  updateCalculations();
  updateWalkUI();
}

// ============================================================================
// 8. INITIALIZATION
// ============================================================================
document.addEventListener("DOMContentLoaded", () => {
  initGraphVisualization();
  setupEventListeners();
  syncAll();
});
