/**
 * Grid Search Engine - A* and BFS Algorithms
 * Author: Karim Hassan
 * Description: Core algorithmic implementation showcasing A* (Heuristic Search)
 * and BFS (Breadth-First Search) with multi-size agent navigation, precomputed
 * cardinal connectedness sectors, and diagonal obstacle clearance.
 */

class Node {
    constructor(x, y, action, parent, g = 0, h = 0) {
        this.x = x;
        this.y = y;
        this.action = action; // [dx, dy]
        this.parent = parent; // parent Node
        this.g = g;           // cost from start to current node
        this.h = h;           // estimated cost to goal
        this.f = g + h;       // total evaluation score
    }
}

class Environment {
    constructor(data) {
        this.width = data.width;
        this.height = data.height;
        this.map = data.map;
    }

    get(x, y) {
        if (x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return null;
        }
        return this.map[y * this.width + x];
    }

    isOOB(x, y, size = 1) {
        return x < 0 || y < 0 || (x + size) > this.width || (y + size) > this.height;
    }
}

/**
 * Precomputes connected terrain sectors for agent sizes 1 to maxSize.
 * Allows O(1) determination of whether any start and goal are reachable.
 */
class SectorManager {
    constructor(env, maxSize = 3) {
        this.env = env;
        this.maxSize = maxSize;
        this.sectors = [];
        this.computeSectors();
    }

    canFit(x, y, size) {
        if (this.env.isOOB(x, y, size)) {
            return false;
        }
        const firstTile = this.env.get(x, y);
        for (let dx = 0; dx < size; dx++) {
            for (let dy = 0; dy < size; dy++) {
                if (this.env.get(x + dx, y + dy) !== firstTile) {
                    return false;
                }
            }
        }
        return true;
    }

    cardinalBFS(x, y, sectorNumber, size) {
        const startColor = this.env.get(x, y);
        const queue = [[x, y]];
        let head = 0;
        this.sectors[size][x][y] = sectorNumber;

        const actions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        while (head < queue.length) {
            const curr = queue[head++];
            const cx = curr[0];
            const cy = curr[1];

            for (let i = 0; i < actions.length; i++) {
                const nx = cx + actions[i][0];
                const ny = cy + actions[i][1];

                if (this.env.isOOB(nx, ny, size)) continue;
                if (this.sectors[size][nx][ny] !== 0) continue;
                if (this.env.get(nx, ny) !== startColor) continue;
                if (!this.canFit(nx, ny, size)) continue;

                this.sectors[size][nx][ny] = sectorNumber;
                queue.push([nx, ny]);
            }
        }
    }

    computeSectors() {
        this.sectors = [];
        for (let s = 1; s <= this.maxSize; s++) {
            this.sectors[s] = [];
            for (let x = 0; x < this.env.width; x++) {
                this.sectors[s][x] = new Int32Array(this.env.height);
            }

            let sectorNumber = 0;
            for (let x = 0; x < this.env.width; x++) {
                for (let y = 0; y < this.env.height; y++) {
                    if (this.sectors[s][x][y] !== 0 || !this.canFit(x, y, s)) {
                        continue;
                    }
                    sectorNumber++;
                    this.cardinalBFS(x, y, sectorNumber, s);
                }
            }
        }
    }

    isConnected(x1, y1, x2, y2, size) {
        if (this.env.isOOB(x1, y1, size) || this.env.isOOB(x2, y2, size)) {
            return false;
        }
        if (this.sectors[size][x1][y1] === 0 || this.sectors[size][x2][y2] === 0) {
            return false;
        }
        return this.sectors[size][x1][y1] === this.sectors[size][x2][y2];
    }

    isLegalAction(x, y, action, size) {
        const nx = x + action[0];
        const ny = y + action[1];

        // Target cell must be connected to current cell for this agent footprint
        if (!this.isConnected(x, y, nx, ny, size)) {
            return false;
        }

        // For diagonal movement, prevent cutting corners across obstacles
        if (action[0] !== 0 && action[1] !== 0) {
            if (!this.isConnected(x, y, x, ny, size)) return false;
            if (!this.isConnected(x, y, nx, y, size)) return false;
        }

        return true;
    }
}

/**
 * A* Search Implementation
 * Uses Min-Heap priority queue, admissible heuristics, and multi-size constraints
 */
class AStarSearch {
    constructor(env, config, sectorManager) {
        this.name = "A* Search";
        this.env = env;
        this.config = config;
        this.sectorManager = sectorManager;

        this.sx = -1;
        this.sy = -1;
        this.gx = -1;
        this.gy = -1;
        this.size = 1;

        this.inProgress = false;
        this.status = "ready"; // 'ready', 'searching', 'found', 'unreachable'
        this.cost = 0;
        this.path = [];
        this.node = null;

        this.open = new BinaryHeap(node => node.f);
        this.closed = [];
        this.closedSet = new Set();
    }

    estimateCost(x, y, gx, gy) {
        const dx = Math.abs(x - gx);
        const dy = Math.abs(y - gy);

        if (this.config.heuristic === 'diag') {
            // 8-Direction Octile Distance
            const diag = Math.min(dx, dy);
            const card = Math.abs(dx - dy);
            return (diag * 141) + (card * 100);
        } else if (this.config.heuristic === 'card') {
            // 4-Direction Manhattan Distance
            return (dx + dy) * 100;
        } else if (this.config.heuristic === 'dist') {
            // 2D Euclidean Distance
            return Math.round(Math.sqrt(dx * dx + dy * dy) * 100);
        } else if (this.config.heuristic === 'zero') {
            // Dijkstra / Uninformed
            return 0;
        }
        return 0;
    }

    computePath(node) {
        const path = [];
        let curr = node;
        while (curr.parent !== null) {
            path.push({
                x: curr.x,
                y: curr.y,
                action: curr.action
            });
            curr = curr.parent;
        }
        path.push({ x: curr.x, y: curr.y, action: null });
        path.reverse();
        return path;
    }

    startSearch(sx, sy, gx, gy, size = 1) {
        this.sx = sx;
        this.sy = sy;
        this.gx = gx;
        this.gy = gy;
        this.size = size;
        this.cost = 0;
        this.path = [];
        this.node = null;

        this.open.clear();
        this.closed = [];
        this.closedSet.clear();

        if (sx === -1 || sy === -1 || gx === -1 || gy === -1) {
            this.inProgress = false;
            this.status = "ready";
            return;
        }

        // Fast sector pre-check: verify connectivity
        if (!this.sectorManager.isConnected(sx, sy, gx, gy, size)) {
            this.cost = -1;
            this.inProgress = false;
            this.status = "unreachable";
            return;
        }

        this.inProgress = true;
        this.status = "searching";

        const h = this.estimateCost(sx, sy, gx, gy);
        const root = new Node(sx, sy, null, null, 0, h);
        this.open.push(root);
    }

    searchIteration() {
        if (!this.inProgress) return false;

        if (this.open.size() === 0) {
            this.cost = -1;
            this.inProgress = false;
            this.status = "unreachable";
            return false;
        }

        const node = this.open.pop();
        this.node = node;

        // Goal check
        if (node.x === this.gx && node.y === this.gy) {
            this.path = this.computePath(node);
            this.cost = node.g;
            this.inProgress = false;
            this.status = "found";
            return false;
        }

        const key = node.x + ',' + node.y;
        if (this.closedSet.has(key)) {
            return true;
        }

        this.closedSet.add(key);
        this.closed.push(node);

        const actions = this.config.actions;
        const costs = this.config.actionCosts;

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const cost = costs[i];

            if (this.sectorManager.isLegalAction(node.x, node.y, action, this.size)) {
                const nx = node.x + action[0];
                const ny = node.y + action[1];
                const nKey = nx + ',' + ny;

                if (this.closedSet.has(nKey)) {
                    continue;
                }

                const g = node.g + cost;
                const h = this.estimateCost(nx, ny, this.gx, this.gy);
                const child = new Node(nx, ny, action, node, g, h);
                this.open.push(child);
            }
        }

        return true;
    }

    getOpen() {
        return this.open.content;
    }

    getClosed() {
        return this.closed;
    }
}

/**
 * Breadth-First Search (BFS) Implementation
 * Unweighted shortest-path exploration using a FIFO queue
 */
class BFSSearch {
    constructor(env, config, sectorManager) {
        this.name = "Breadth-First Search (BFS)";
        this.env = env;
        this.config = config;
        this.sectorManager = sectorManager;

        this.sx = -1;
        this.sy = -1;
        this.gx = -1;
        this.gy = -1;
        this.size = 1;

        this.inProgress = false;
        this.status = "ready";
        this.cost = 0;
        this.path = [];
        this.node = null;

        this.queue = [];
        this.queueHead = 0;
        this.closed = [];
        this.closedSet = new Set();
    }

    computePath(node) {
        const path = [];
        let curr = node;
        while (curr.parent !== null) {
            path.push({
                x: curr.x,
                y: curr.y,
                action: curr.action
            });
            curr = curr.parent;
        }
        path.push({ x: curr.x, y: curr.y, action: null });
        path.reverse();
        return path;
    }

    startSearch(sx, sy, gx, gy, size = 1) {
        this.sx = sx;
        this.sy = sy;
        this.gx = gx;
        this.gy = gy;
        this.size = size;
        this.cost = 0;
        this.path = [];
        this.node = null;

        this.queue = [];
        this.queueHead = 0;
        this.closed = [];
        this.closedSet.clear();

        if (sx === -1 || sy === -1 || gx === -1 || gy === -1) {
            this.inProgress = false;
            this.status = "ready";
            return;
        }

        // Fast sector pre-check: verify connectivity
        if (!this.sectorManager.isConnected(sx, sy, gx, gy, size)) {
            this.cost = -1;
            this.inProgress = false;
            this.status = "unreachable";
            return;
        }

        this.inProgress = true;
        this.status = "searching";

        const root = new Node(sx, sy, null, null, 0, 0);
        this.queue.push(root);
    }

    searchIteration() {
        if (!this.inProgress) return false;

        if (this.queueHead >= this.queue.length) {
            this.cost = -1;
            this.inProgress = false;
            this.status = "unreachable";
            return false;
        }

        const node = this.queue[this.queueHead++];
        this.node = node;

        // Goal check
        if (node.x === this.gx && node.y === this.gy) {
            this.path = this.computePath(node);
            this.cost = node.g;
            this.inProgress = false;
            this.status = "found";
            return false;
        }

        const key = node.x + ',' + node.y;
        if (this.closedSet.has(key)) {
            return true;
        }

        this.closedSet.add(key);
        this.closed.push(node);

        const actions = this.config.actions;
        const costs = this.config.actionCosts;

        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            const cost = costs[i];

            if (this.sectorManager.isLegalAction(node.x, node.y, action, this.size)) {
                const nx = node.x + action[0];
                const ny = node.y + action[1];
                const nKey = nx + ',' + ny;

                if (this.closedSet.has(nKey)) {
                    continue;
                }

                const g = node.g + cost;
                const child = new Node(nx, ny, action, node, g, 0);
                this.queue.push(child);
            }
        }

        return true;
    }

    getOpen() {
        return this.queue.slice(this.queueHead);
    }

    getClosed() {
        return this.closed;
    }
}
