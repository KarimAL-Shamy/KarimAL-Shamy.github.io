/**
 * Pathfinding Canvas Visualizer
 * Author: Karim Hassan
 * Description: High-performance HTML5 Canvas renderer with offscreen terrain caching,
 * smooth animation loops, parent pointer vectors, and interactive drag-and-drop.
 */

class Visualizer {
    constructor(canvasContainer, onStateChange) {
        this.container = canvasContainer;
        this.onStateChange = onStateChange || (() => {});

        // Setup DOM Canvas
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container.appendChild(this.canvas);

        // Offscreen canvas for cached terrain rendering
        this.bgCanvas = document.createElement('canvas');
        this.bgCtx = this.bgCanvas.getContext('2d');

        // Color Palette
        this.colors = {
            terrain0: '#334155', // Rocky / Mountain (Slate)
            terrain1: '#16a34a', // Plains / Grass (Green)
            terrain2: '#0284c7', // Water / Ocean (Blue)
            terrainUnknown: '#1e293b',
            open: 'rgba(245, 158, 11, 0.75)',     // Amber / Gold
            closed: 'rgba(239, 68, 68, 0.40)',    // Translucent Coral
            pathLine: '#04c2c9',                  // Signature Teal
            pathGlow: 'rgba(4, 194, 201, 0.6)',
            parentLine: 'rgba(255, 255, 255, 0.35)',
            start: '#10b981',                     // Emerald
            goal: '#f43f5e',                      // Ruby / Coral
            gridLine: 'rgba(0, 0, 0, 0.25)',
            footprintValid: 'rgba(16, 185, 129, 0.4)',
            footprintInvalid: 'rgba(239, 68, 68, 0.45)'
        };

        // Grid & Dimensions
        this.map = null;
        this.cellSize = 12;
        this.canvasSize = 768; // Base target size

        // Search References
        this.search = null;
        this.sectorManager = null;
        this.agentSize = 1;

        // Display Toggles
        this.showOpen = true;
        this.showClosed = true;
        this.showParents = true;
        this.showGrid = true;

        // Mouse & Interaction State
        this.sx = -1;
        this.sy = -1;
        this.gx = -1;
        this.gy = -1;
        this.hoverX = -1;
        this.hoverY = -1;
        this.isDragging = false;
        this.dragTarget = null; // 'start', 'goal', or 'set_goal'

        this.bindEvents();
    }

    setEnvironment(env, sectorManager) {
        this.map = env;
        this.sectorManager = sectorManager;

        // Calculate responsive canvas display dimensions
        const maxDim = Math.max(env.width, env.height);
        // Determine square cell size so canvas fits neatly
        const containerWidth = this.container.clientWidth || 768;
        this.canvasSize = Math.min(800, Math.max(480, containerWidth));
        this.cellSize = this.canvasSize / maxDim;

        const pixelWidth = Math.round(env.width * this.cellSize);
        const pixelHeight = Math.round(env.height * this.cellSize);

        // Set dimensions on visible canvas
        this.canvas.width = pixelWidth;
        this.canvas.height = pixelHeight;

        // Setup offscreen cache canvas
        this.bgCanvas.width = pixelWidth;
        this.bgCanvas.height = pixelHeight;

        this.renderBackgroundCache();
        this.render();
    }

    setSearch(searchInstance, agentSize = 1) {
        this.search = searchInstance;
        this.agentSize = agentSize;
        this.render();
    }

    setStartGoal(sx, sy, gx, gy) {
        this.sx = sx;
        this.sy = sy;
        this.gx = gx;
        this.gy = gy;
        this.render();
    }

    getTerrainColor(val) {
        if (val === '0') return this.colors.terrain0;
        if (val === '1') return this.colors.terrain1;
        if (val === '2') return this.colors.terrain2;
        return this.colors.terrainUnknown;
    }

    renderBackgroundCache() {
        if (!this.map) return;
        const ctx = this.bgCtx;
        const w = this.map.width;
        const h = this.map.height;
        const cs = this.cellSize;

        ctx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const tile = this.map.get(x, y);
                ctx.fillStyle = this.getTerrainColor(tile);
                ctx.fillRect(Math.floor(x * cs), Math.floor(y * cs), Math.ceil(cs), Math.ceil(cs));
            }
        }
    }

    render() {
        if (!this.map) return;
        const ctx = this.ctx;
        const cs = this.cellSize;

        // 1. Draw cached terrain background
        ctx.drawImage(this.bgCanvas, 0, 0);

        // 2. Draw Closed List (Visited)
        if (this.showClosed && this.search) {
            const closed = this.search.getClosed();
            ctx.fillStyle = this.colors.closed;
            for (let i = 0; i < closed.length; i++) {
                const node = closed[i];
                ctx.fillRect(node.x * cs, node.y * cs, cs * this.agentSize, cs * this.agentSize);
            }
        }

        // 3. Draw Open List (Frontier)
        if (this.showOpen && this.search) {
            const open = this.search.getOpen();
            ctx.fillStyle = this.colors.open;
            for (let i = 0; i < open.length; i++) {
                const node = open[i];
                ctx.fillRect(node.x * cs, node.y * cs, cs * this.agentSize, cs * this.agentSize);
            }
        }

        // 4. Draw Parent Pointers
        if (this.showParents && this.search) {
            const closed = this.search.getClosed();
            ctx.strokeStyle = this.colors.parentLine;
            ctx.lineWidth = Math.max(1, cs * 0.15);
            ctx.beginPath();
            for (let i = 0; i < closed.length; i++) {
                const node = closed[i];
                if (node.parent) {
                    const cx = (node.x + 0.5) * cs;
                    const cy = (node.y + 0.5) * cs;
                    const px = (node.parent.x + 0.5) * cs;
                    const py = (node.parent.y + 0.5) * cs;
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(px, py);
                }
            }
            ctx.stroke();
        }

        // 5. Draw Grid lines
        if (this.showGrid && cs >= 4) {
            ctx.strokeStyle = this.colors.gridLine;
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            for (let x = 0; x <= this.map.width; x++) {
                const px = Math.floor(x * cs) + 0.5;
                ctx.moveTo(px, 0);
                ctx.lineTo(px, this.canvas.height);
            }
            for (let y = 0; y <= this.map.height; y++) {
                const py = Math.floor(y * cs) + 0.5;
                ctx.moveTo(0, py);
                ctx.lineTo(this.canvas.width, py);
            }
            ctx.stroke();
        }

        // 6. Draw Path
        if (this.search && this.search.path && this.search.path.length > 0) {
            const path = this.search.path;

            // First draw footprint highlight along the path if agentSize > 1
            if (this.agentSize > 1) {
                ctx.fillStyle = 'rgba(4, 194, 201, 0.15)';
                for (let i = 0; i < path.length; i++) {
                    ctx.fillRect(path[i].x * cs, path[i].y * cs, cs * this.agentSize, cs * this.agentSize);
                }
            }

            // Glowing path line
            ctx.save();
            ctx.shadowColor = this.colors.pathGlow;
            ctx.shadowBlur = Math.max(4, cs * 0.8);
            ctx.strokeStyle = this.colors.pathLine;
            ctx.lineWidth = Math.max(2.5, cs * 0.35);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            for (let i = 0; i < path.length; i++) {
                const px = (path[i].x + this.agentSize * 0.5) * cs;
                const py = (path[i].y + this.agentSize * 0.5) * cs;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Core inner bright line
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.2, cs * 0.15);
            ctx.stroke();
            ctx.restore();
        }

        // 7. Draw Hover Agent Footprint
        if (this.hoverX >= 0 && this.hoverY >= 0 && this.sectorManager) {
            const canFit = this.sectorManager.canFit(this.hoverX, this.hoverY, this.agentSize);
            ctx.strokeStyle = canFit ? this.colors.start : '#ef4444';
            ctx.lineWidth = Math.max(1.5, cs * 0.2);
            ctx.fillStyle = canFit ? this.colors.footprintValid : this.colors.footprintInvalid;
            ctx.fillRect(this.hoverX * cs, this.hoverY * cs, cs * this.agentSize, cs * this.agentSize);
            ctx.strokeRect(this.hoverX * cs, this.hoverY * cs, cs * this.agentSize, cs * this.agentSize);
        }

        // 8. Draw Start Marker
        if (this.sx >= 0 && this.sy >= 0) {
            this.drawMarker(this.sx, this.sy, this.agentSize, this.colors.start, 'S');
        }

        // 9. Draw Goal Marker
        if (this.gx >= 0 && this.gy >= 0) {
            this.drawMarker(this.gx, this.gy, this.agentSize, this.colors.goal, 'G');
        }
    }

    drawMarker(x, y, size, color, label) {
        const ctx = this.ctx;
        const cs = this.cellSize;
        const w = size * cs;
        const h = size * cs;
        const px = x * cs;
        const py = y * cs;

        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.shadowBlur = 6;

        // Rounded box
        const radius = Math.min(6, cs * 0.4);
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, w - 2, h - 2, radius);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, cs * 0.15);
        ctx.stroke();

        // Label if square is big enough
        if (w >= 14) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.max(10, Math.floor(w * 0.48))}px -apple-system, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(label, px + w / 2, py + h / 2 + 1);
        }
        ctx.restore();
    }

    getGridCoords(evt) {
        const rect = this.canvas.getBoundingClientRect();
        const clientX = evt.clientX !== undefined ? evt.clientX : (evt.touches && evt.touches[0].clientX);
        const clientY = evt.clientY !== undefined ? evt.clientY : (evt.touches && evt.touches[0].clientY);

        if (clientX === undefined || clientY === undefined) return null;

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        const gx = Math.floor(x / this.cellSize);
        const gy = Math.floor(y / this.cellSize);

        if (gx < 0 || gy < 0 || gx >= this.map.width || gy >= this.map.height) {
            return null;
        }
        return { x: gx, y: gy };
    }

    bindEvents() {
        const onDown = (evt) => {
            const coords = this.getGridCoords(evt);
            if (!coords) return;
            evt.preventDefault();
            this.isDragging = true;

            // Check if clicking existing Start or Goal
            const isNearStart = (coords.x >= this.sx && coords.x < this.sx + this.agentSize &&
                                 coords.y >= this.sy && coords.y < this.sy + this.agentSize);
            const isNearGoal = (coords.x >= this.gx && coords.x < this.gx + this.agentSize &&
                                coords.y >= this.gy && coords.y < this.gy + this.agentSize);

            if (isNearStart) {
                this.dragTarget = 'start';
            } else if (isNearGoal) {
                this.dragTarget = 'goal';
            } else {
                if (this.sx === -1) {
                    this.sx = coords.x;
                    this.sy = coords.y;
                    this.dragTarget = 'start';
                } else if (this.gx === -1) {
                    this.gx = coords.x;
                    this.gy = coords.y;
                    this.dragTarget = 'goal';
                } else {
                    // Reposition goal by default when clicking on map
                    this.gx = coords.x;
                    this.gy = coords.y;
                    this.dragTarget = 'goal';
                }
            }

            this.onStateChange({
                sx: this.sx,
                sy: this.sy,
                gx: this.gx,
                gy: this.gy,
                needsRestart: true
            });
            this.render();
        };

        const onMove = (evt) => {
            const coords = this.getGridCoords(evt);
            if (!coords) {
                this.hoverX = -1;
                this.hoverY = -1;
                this.render();
                return;
            }

            this.hoverX = coords.x;
            this.hoverY = coords.y;

            if (this.isDragging && this.dragTarget) {
                if (this.dragTarget === 'start') {
                    if (coords.x !== this.sx || coords.y !== this.sy) {
                        this.sx = coords.x;
                        this.sy = coords.y;
                        this.onStateChange({
                            sx: this.sx,
                            sy: this.sy,
                            gx: this.gx,
                            gy: this.gy,
                            needsRestart: true
                        });
                    }
                } else if (this.dragTarget === 'goal') {
                    if (coords.x !== this.gx || coords.y !== this.gy) {
                        this.gx = coords.x;
                        this.gy = coords.y;
                        this.onStateChange({
                            sx: this.sx,
                            sy: this.sy,
                            gx: this.gx,
                            gy: this.gy,
                            needsRestart: true
                        });
                    }
                }
            }

            this.onStateChange({
                hoverX: this.hoverX,
                hoverY: this.hoverY,
                hoverTile: this.map ? this.map.get(this.hoverX, this.hoverY) : null
            });
            this.render();
        };

        const onUp = () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.dragTarget = null;
            }
        };

        // Desktop Mouse Listeners
        this.canvas.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);

        // Touch Listeners
        this.canvas.addEventListener('touchstart', onDown, { passive: false });
        this.canvas.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);

        // Resize Listener
        window.addEventListener('resize', () => {
            if (this.map && this.sectorManager) {
                this.setEnvironment(this.map, this.sectorManager);
            }
        });
    }
}
