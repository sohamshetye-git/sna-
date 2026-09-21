# Hitting Time – Global Heuristic Visualization

An interactive, educational web-based simulation and calculation dashboard for **Social Network Analysis (SNA)** explaining **Hitting Time** (Random Walk Based Node Similarity).

Designed for college classroom presentations, data-science coursework, and algorithm demonstrations.

---

## 🌟 Features

- **Interactive SVG Graph Visualization**:
  - Live topology featuring leaf nodes ($A, C, D, E$) and central hub ($B$).
  - Real-time transition probabilities ($P = 1/3$ and $P = 1/4$) labeled on edges.
  - Dynamic start ($x$) and target ($y$) node selection with glowing visual indicators.
- **Realistic Random Walk Simulation**:
  - Glowing surfer particle traversing edges in real time.
  - Visited node rings and directional arrow breadcrumbs.
  - Interactive speed slider (*Fast*, *Normal*, *Slow*), pause/resume, and reset controls.
  - Clear pedagogical distinction between a **sample random walk** and **mathematical expected hitting time**.
- **Live Mathematical Calculations**:
  - First-step Markov recurrence analysis: $HT(x,y) = 1 + \sum_{z \in N(x)} P(x,z) HT(z,y)$.
  - Hitting Time Score: $S_{HT}(x,y) = -HT(x,y)$.
  - Normalized Score: $S_{\text{Norm}}(x,y) = -HT(x,y) \times \pi_y$.
  - Editable stationary distribution / PageRank ($\pi_y$) inputs.
- **Target Comparison Table**:
  - Ranks all candidate targets from the selected start node dynamically.
- **Presentation & Educational Modes**:
  - **Simple Mode** vs. **Formula Mode** (with step-by-step linear algebra derivation).
  - **Presentation Mode** for large classroom projection.

---

## 🚀 Live Demo / GitHub Pages

To enable GitHub Pages:
1. Go to repository **Settings** > **Pages**.
2. Under **Build and deployment** > **Source**, choose **Deploy from a branch**.
3. Select `main` branch and `/ (root)` folder, then click **Save**.
4. Your site will be live at:
   `https://sohamshetye-git.github.io/sna-/`

---

## 💻 Local Development

No build tools, backend, or package managers needed.
Simply open `index.html` in any modern web browser or serve locally:

```bash
# Using npx serve
npx serve .

# Or using python
python -m http.server 8000
```
