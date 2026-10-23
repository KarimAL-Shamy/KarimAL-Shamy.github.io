/**
 * Pathfinding Canvas Visualizer - Fullscreen Edition
 * Author: Karim Hassan
 * Description: Full-viewport HTML5 Canvas renderer with offscreen terrain caching,
 * dynamic screen-filling auto-fit, parent pointer vectors, and alternating Start/Goal click placement.
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
            pathGlow: 'rgba(4, 194, 201, 0.65)',
            parentLine: 'rgba(255, 255, 255, 0.35)',
            start: '#10b981',                     // Emerald
            goal: '#f43f5e',                      // Ruby / Coral
            gridLine: 'rgba(0, 0, 0, 0.22)',
            footprintValid: 'rgba(16, 185, 129, 0.4)',
            footprintInvalid: 'rgba(239, 68, 68, 0.45)'
        };

        // Grid & Sizing
        this.map = null;
        this.cellSize = 16;
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;

        // Search References
        this.search = null;
        this.sectorManager = null;
        this.agentSize = 1;

        // Display Layer Toggles
        this.showOpen = true;
        this.showClosed = true;
        this.showParents = true;
        this.showGrid = true;

        // Coordinates & Drag State
        this.sx = -1;
        this.sy = -1;
        this.gx = -1;
        this.gy = -1;
        this.hoverX = -1;
        this.hoverY = -1;
        this.isDragging = false;
        this.dragTarget = null; // 'start' or 'goal'

        this.bindEvents();
    }

    setEnvironment(env, sectorManager) {
        this.map = env;
        this.sectorManager = sectorManager;
        this.recalculateDimensions();
        this.renderBackgroundCache();
        this.render();
    }

    recalculateDimensions() {
        if (!this.map) return;
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.canvas.width = w;
        this.canvas.height = h;

        // Maximize cellSize so the map fills the whole page (width or height)
        this.cellSize = Math.min(w / this.map.width, h / this.map.height);

        // Center map in viewport
        this.gridOffsetX = Math.floor((w - this.map.width * this.cellSize) / 2);
        this.gridOffsetY = Math.floor((h - this.map.height * this.cellSize) / 2);

        // Background cache size matches map dimensions
        const bgW = Math.round(this.map.width * this.cellSize);
        const bgH = Math.round(this.map.height * this.cellSize);
        this.bgCanvas.width = bgW;
        this.bgCanvas.height = bgH;
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
        const ox = this.gridOffsetX;
        const oy = this.gridOffsetY;

        // Clear full screen
        ctx.fillStyle = '#070a13';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 1. Draw cached map
        ctx.drawImage(this.bgCanvas, ox, oy);

        // 2. Draw Closed List (Visited)
        if (this.showClosed && this.search) {
            const closed = this.search.getClosed();
            ctx.fillStyle = this.colors.closed;
            for (let i = 0; i < closed.length; i++) {
                const node = closed[i];
                ctx.fillRect(ox + node.x * cs, oy + node.y * cs, cs * this.agentSize, cs * this.agentSize);
            }
        }

        // 3. Draw Open List (Frontier)
        if (this.showOpen && this.search) {
            const open = this.search.getOpen();
            ctx.fillStyle = this.colors.open;
            for (let i = 0; i < open.length; i++) {
                const node = open[i];
                ctx.fillRect(ox + node.x * cs, oy + node.y * cs, cs * this.agentSize, cs * this.agentSize);
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
                    const cx = ox + (node.x + 0.5) * cs;
                    const cy = oy + (node.y + 0.5) * cs;
                    const px = ox + (node.parent.x + 0.5) * cs;
                    const py = oy + (node.parent.y + 0.5) * cs;
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
            const mapW = this.map.width * cs;
            const mapH = this.map.height * cs;
            for (let x = 0; x <= this.map.width; x++) {
                const px = Math.floor(ox + x * cs) + 0.5;
                ctx.moveTo(px, oy);
                ctx.lineTo(px, oy + mapH);
            }
            for (let y = 0; y <= this.map.height; y++) {
                const py = Math.floor(oy + y * cs) + 0.5;
                ctx.moveTo(ox, py);
                ctx.lineTo(ox + mapW, py);
            }
            ctx.stroke();
        }

        // 6. Draw Solution Path
        if (this.search && this.search.path && this.search.path.length > 0) {
            const path = this.search.path;

            // Highlight footprint width along path if agentSize > 1
            if (this.agentSize > 1) {
                ctx.fillStyle = 'rgba(4, 194, 201, 0.15)';
                for (let i = 0; i < path.length; i++) {
                    ctx.fillRect(ox + path[i].x * cs, oy + path[i].y * cs, cs * this.agentSize, cs * this.agentSize);
                }
            }

            // Glowing cyan path trajectory
            ctx.save();
            ctx.shadowColor = this.colors.pathGlow;
            ctx.shadowBlur = Math.max(6, cs * 0.9);
            ctx.strokeStyle = this.colors.pathLine;
            ctx.lineWidth = Math.max(2.8, cs * 0.38);
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();
            for (let i = 0; i < path.length; i++) {
                const px = ox + (path[i].x + this.agentSize * 0.5) * cs;
                const py = oy + (path[i].y + this.agentSize * 0.5) * cs;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();

            // Core white line
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1.2, cs * 0.16);
            ctx.stroke();
            ctx.restore();
        }

        // 7. Draw Hover Footprint Preview
        if (this.hoverX >= 0 && this.hoverY >= 0 && this.sectorManager) {
            const canFit = this.sectorManager.canFit(this.hoverX, this.hoverY, this.agentSize);
            ctx.strokeStyle = canFit ? this.colors.start : '#ef4444';
            ctx.lineWidth = Math.max(1.5, cs * 0.2);
            ctx.fillStyle = canFit ? this.colors.footprintValid : this.colors.footprintInvalid;
            ctx.fillRect(ox + this.hoverX * cs, oy + this.hoverY * cs, cs * this.agentSize, cs * this.agentSize);
            ctx.strokeRect(ox + this.hoverX * cs, oy + this.hoverY * cs, cs * this.agentSize, cs * this.agentSize);
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
        const ox = this.gridOffsetX;
        const oy = this.gridOffsetY;
        const w = size * cs;
        const h = size * cs;
        const px = ox + x * cs;
        const py = oy + y * cs;

        ctx.save();
        ctx.fillStyle = color;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 8;

        const radius = Math.min(6, cs * 0.4);
        ctx.beginPath();
        ctx.roundRect(px + 1, py + 1, w - 2, h - 2, radius);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = Math.max(1, cs * 0.15);
        ctx.stroke();

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
        if (!this.map) return null;
        const rect = this.canvas.getBoundingClientRect();
        const clientX = evt.clientX !== undefined ? evt.clientX : (evt.touches && evt.touches[0].clientX);
        const clientY = evt.clientY !== undefined ? evt.clientY : (evt.touches && evt.touches[0].clientY);

        if (clientX === undefined || clientY === undefined) return null;

        const x = clientX - rect.left - this.gridOffsetX;
        const y = clientY - rect.top - this.gridOffsetY;

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

            // Direct click on existing Start or Goal marker initiates drag for that specific marker
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
                    // Start not set yet -> set Start
                    this.sx = coords.x;
                    this.sy = coords.y;
                    this.dragTarget = 'start';
                } else if (this.gx === -1) {
                    // Start already set, but Goal not set -> set Goal
                    this.gx = coords.x;
                    this.gy = coords.y;
                    this.dragTarget = 'goal';
                } else {
                    // Both Start and Goal are already placed!
                    // Requirement: 1st click sets new Start and clears Goal; 2nd click sets new Goal
                    this.sx = coords.x;
                    this.sy = coords.y;
                    this.gx = -1;
                    this.gy = -1;
                    this.dragTarget = 'start';
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
                            needsRestart: (this.gx !== -1)
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
                this.recalculateDimensions();
                this.renderBackgroundCache();
                this.render();
            }
        });
    }
}
