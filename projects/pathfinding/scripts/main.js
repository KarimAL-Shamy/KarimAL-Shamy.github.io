/**
 * Pathfinding & Grid Search Visualizer - Main Controller
 * Author: Karim Hassan
 * Description: UI Event management, state orchestrator, responsive animation loop,
 * and live performance telemetry.
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const canvasContainer = document.getElementById('canvas_container');
    const selectMap = document.getElementById('select_map');
    const selectAlgo = document.getElementById('select_algo');
    const selectSize = document.getElementById('select_size');
    const selectActions = document.getElementById('select_actions');
    const selectHeuristic = document.getElementById('select_heuristic');
    const heuristicGroup = document.getElementById('heuristic_group');
    const selectVis = document.getElementById('select_vis');
    const selectSpeed = document.getElementById('select_speed');
    const speedGroup = document.getElementById('speed_group');

    // Action buttons
    const btnPlayPause = document.getElementById('btn_play');
    const btnStep = document.getElementById('btn_step');
    const btnRerun = document.getElementById('btn_rerun');
    const btnClear = document.getElementById('btn_clear');

    // Toggles
    const toggleOpen = document.getElementById('toggle_open');
    const toggleClosed = document.getElementById('toggle_closed');
    const toggleParents = document.getElementById('toggle_parents');
    const toggleGrid = document.getElementById('toggle_grid');

    // Metrics HUD
    const hudStatus = document.getElementById('hud_status');
    const hudAlgo = document.getElementById('hud_algo');
    const hudCost = document.getElementById('hud_cost');
    const hudOpen = document.getElementById('hud_open');
    const hudClosed = document.getElementById('hud_closed');
    const hudTime = document.getElementById('hud_time');
    const hudNps = document.getElementById('hud_nps');
    const hudCoords = document.getElementById('hud_coords');
    const hudHover = document.getElementById('hud_hover');

    // Default Configuration
    const config = {
        actions: [[1, 1], [-1, -1], [1, -1], [-1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]],
        actionCosts: [141, 141, 141, 141, 100, 100, 100, 100],
        heuristic: 'diag',
        visMode: 'anim', // 'instant', 'anim', 'step'
        speedMultiplier: 4,
        agentSize: 1,
        algo: 'astar', // 'astar' or 'bfs'
        currentMapName: 'Default'
    };

    // State Variables
    let currentEnv = null;
    let sectorManager = null;
    let searchInstance = null;
    let sx = -1, sy = -1, gx = -1, gy = -1;
    let isPaused = false;
    let singleStepTriggered = false;
    let pathTimeMs = 0;
    let lastRenderTime = performance.now();

    // Map default presets (start & goal) to immediately present a great demo
    const mapPresets = {
        'Default': { sx: 13, sy: 8, gx: 60, gy: 50 },
        'Maze': { sx: 2, sy: 2, gx: 125, gy: 125 },
        'Sparse Caves': { sx: 18, sy: 12, gx: 110, gy: 95 },
        'Dense Caves': { sx: 25, sy: 30, gx: 180, gy: 170 },
        'Wheel of War': { sx: 54, sy: 27, gx: 179, gy: 171 },
        'L-Shaped Wall': { sx: 2, sy: 2, gx: 13, gy: 13 },
        'Blank': { sx: 4, sy: 4, gx: 27, gy: 27 },
        'Small': { sx: 1, sy: 1, gx: 4, gy: 4 }
    };

    // Initialize Visualizer Canvas
    const visualizer = new Visualizer(canvasContainer, handleVisualizerState);

    // Populate Map Selector
    selectMap.innerHTML = '';
    for (const key in ENVIRONMENTS) {
        const opt = document.createElement('option');
        opt.value = key;
        opt.textContent = `${key} (${ENVIRONMENTS[key].width} × ${ENVIRONMENTS[key].height})`;
        selectMap.appendChild(opt);
    }
    selectMap.value = 'Default';

    function handleVisualizerState(update) {
        if (update.sx !== undefined && update.sy !== undefined &&
            update.gx !== undefined && update.gy !== undefined) {
            sx = update.sx;
            sy = update.sy;
            gx = update.gx;
            gy = update.gy;
            if (update.needsRestart) {
                runSearch();
            }
        }

        if (update.hoverX !== undefined && update.hoverY !== undefined) {
            if (update.hoverX >= 0 && update.hoverY >= 0) {
                let terrainName = 'Unknown';
                if (update.hoverTile === '0') terrainName = 'Mountain / Obstacle';
                else if (update.hoverTile === '1') terrainName = 'Plains / Grass';
                else if (update.hoverTile === '2') terrainName = 'Ocean / Water';
                hudHover.textContent = `(${update.hoverX}, ${update.hoverY}) · ${terrainName}`;
            } else {
                hudHover.textContent = 'Hover over grid';
            }
        }
    }

    function loadEnvironment(mapName) {
        config.currentMapName = mapName;
        const envData = ENVIRONMENTS[mapName];
        currentEnv = new Environment(envData);
        hudStatus.textContent = 'Computing sectors...';
        hudStatus.className = 'status-badge status-searching';

        // Precompute connectivity sectors for sizes 1 to 3
        sectorManager = new SectorManager(currentEnv, 3);
        visualizer.setEnvironment(currentEnv, sectorManager);

        // Load Preset Coordinates
        const preset = mapPresets[mapName] || { sx: 2, sy: 2, gx: currentEnv.width - 3, gy: currentEnv.height - 3 };
        sx = preset.sx;
        sy = preset.sy;
        gx = preset.gx;
        gy = preset.gy;

        visualizer.setStartGoal(sx, sy, gx, gy);
        runSearch();
    }

    function createSearchInstance() {
        if (config.algo === 'astar') {
            return new AStarSearch(currentEnv, config, sectorManager);
        } else {
            return new BFSSearch(currentEnv, config, sectorManager);
        }
    }

    function runSearch() {
        if (!currentEnv || !sectorManager) return;

        searchInstance = createSearchInstance();
        visualizer.setSearch(searchInstance, config.agentSize);
        visualizer.setStartGoal(sx, sy, gx, gy);

        isPaused = false;
        btnPlayPause.innerHTML = '<i class="mdi mdi-pause"></i> Pause';

        const t0 = performance.now();
        searchInstance.startSearch(sx, sy, gx, gy, config.agentSize);

        if (config.visMode === 'instant') {
            while (searchInstance.inProgress) {
                searchInstance.searchIteration();
            }
            pathTimeMs = performance.now() - t0;
            updateHud();
            visualizer.render();
        } else {
            pathTimeMs = 0;
            updateHud();
            visualizer.render();
        }
    }

    function updateHud() {
        if (!searchInstance) return;

        hudAlgo.textContent = searchInstance.name;
        hudCoords.textContent = (sx >= 0 && gx >= 0) ? `(${sx},${sy}) → (${gx},${gy})` : 'Not Set';

        // Status badge
        if (searchInstance.status === 'searching') {
            hudStatus.textContent = isPaused ? 'Paused' : 'Searching...';
            hudStatus.className = 'status-badge status-searching';
        } else if (searchInstance.status === 'found') {
            hudStatus.textContent = 'Path Found!';
            hudStatus.className = 'status-badge status-found';
        } else if (searchInstance.status === 'unreachable') {
            hudStatus.textContent = 'Unreachable / No Path';
            hudStatus.className = 'status-badge status-unreachable';
        } else {
            hudStatus.textContent = 'Ready';
            hudStatus.className = 'status-badge status-ready';
        }

        // Cost & Nodes
        if (searchInstance.cost >= 0) {
            hudCost.textContent = `${searchInstance.cost} (${searchInstance.path ? searchInstance.path.length : 0} steps)`;
        } else {
            hudCost.textContent = '∞ (None)';
        }

        const openList = searchInstance.getOpen();
        const closedList = searchInstance.getClosed();

        hudOpen.textContent = openList.length.toLocaleString();
        hudClosed.textContent = closedList.length.toLocaleString();

        hudTime.textContent = pathTimeMs > 0 ? `${pathTimeMs.toFixed(2)} ms` : (config.visMode === 'instant' ? '0.00 ms' : 'Active');

        if (pathTimeMs > 0 && closedList.length > 0) {
            const nps = Math.round((closedList.length / (pathTimeMs / 1000)));
            hudNps.textContent = `${(nps / 1000).toFixed(1)}k /s`;
        } else {
            hudNps.textContent = '—';
        }
    }

    // Animation Loop
    function animationLoop() {
        if (searchInstance && searchInstance.inProgress && !isPaused) {
            if (config.visMode === 'anim') {
                const startTime = performance.now();
                for (let i = 0; i < config.speedMultiplier; i++) {
                    if (!searchInstance.searchIteration()) {
                        pathTimeMs = performance.now() - startTime;
                        break;
                    }
                }
                updateHud();
                visualizer.render();
            } else if (config.visMode === 'step' && singleStepTriggered) {
                searchInstance.searchIteration();
                singleStepTriggered = false;
                updateHud();
                visualizer.render();
            }
        }
        requestAnimationFrame(animationLoop);
    }
    requestAnimationFrame(animationLoop);

    // Event Handlers
    selectMap.addEventListener('change', () => {
        loadEnvironment(selectMap.value);
    });

    selectAlgo.addEventListener('change', () => {
        config.algo = selectAlgo.value;
        // Hide heuristic option when BFS is selected since BFS is unweighted
        if (config.algo === 'bfs') {
            heuristicGroup.style.opacity = '0.35';
            heuristicGroup.style.pointerEvents = 'none';
        } else {
            heuristicGroup.style.opacity = '1';
            heuristicGroup.style.pointerEvents = 'auto';
        }
        runSearch();
    });

    selectSize.addEventListener('change', () => {
        config.agentSize = parseInt(selectSize.value, 10);
        runSearch();
    });

    selectActions.addEventListener('change', () => {
        if (selectActions.value === 'diag') {
            config.actions = [[1, 1], [-1, -1], [1, -1], [-1, 1], [0, 1], [0, -1], [1, 0], [-1, 0]];
            config.actionCosts = [141, 141, 141, 141, 100, 100, 100, 100];
        } else {
            config.actions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            config.actionCosts = [100, 100, 100, 100];
        }
        runSearch();
    });

    selectHeuristic.addEventListener('change', () => {
        config.heuristic = selectHeuristic.value;
        runSearch();
    });

    selectVis.addEventListener('change', () => {
        config.visMode = selectVis.value;
        if (config.visMode === 'step') {
            btnStep.style.display = 'inline-flex';
            speedGroup.style.display = 'none';
            isPaused = true;
            btnPlayPause.style.display = 'none';
        } else if (config.visMode === 'anim') {
            btnStep.style.display = 'none';
            speedGroup.style.display = 'flex';
            btnPlayPause.style.display = 'inline-flex';
        } else {
            // Instant
            btnStep.style.display = 'none';
            speedGroup.style.display = 'none';
            btnPlayPause.style.display = 'none';
        }
        runSearch();
    });

    selectSpeed.addEventListener('change', () => {
        config.speedMultiplier = parseInt(selectSpeed.value, 10);
    });

    btnPlayPause.addEventListener('click', () => {
        if (!searchInstance || !searchInstance.inProgress) {
            runSearch();
            return;
        }
        isPaused = !isPaused;
        btnPlayPause.innerHTML = isPaused
            ? '<i class="mdi mdi-play"></i> Resume'
            : '<i class="mdi mdi-pause"></i> Pause';
        updateHud();
    });

    btnStep.addEventListener('click', () => {
        singleStepTriggered = true;
    });

    btnRerun.addEventListener('click', () => {
        runSearch();
    });

    btnClear.addEventListener('click', () => {
        sx = -1;
        sy = -1;
        gx = -1;
        gy = -1;
        if (searchInstance) {
            searchInstance.inProgress = false;
            searchInstance.status = 'ready';
            searchInstance.path = [];
            searchInstance.cost = 0;
        }
        visualizer.setStartGoal(-1, -1, -1, -1);
        visualizer.render();
        updateHud();
    });

    // Display Toggles
    toggleOpen.addEventListener('change', () => {
        visualizer.showOpen = toggleOpen.checked;
        visualizer.render();
    });

    toggleClosed.addEventListener('change', () => {
        visualizer.showClosed = toggleClosed.checked;
        visualizer.render();
    });

    toggleParents.addEventListener('change', () => {
        visualizer.showParents = toggleParents.checked;
        visualizer.render();
    });

    toggleGrid.addEventListener('change', () => {
        visualizer.showGrid = toggleGrid.checked;
        visualizer.render();
    });

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.code === 'Space') {
            e.preventDefault();
            btnPlayPause.click();
        } else if (e.code === 'KeyR') {
            btnRerun.click();
        } else if (e.code === 'KeyC') {
            btnClear.click();
        } else if (e.code === 'KeyS' && config.visMode === 'step') {
            btnStep.click();
        }
    });

    // Initial Load
    loadEnvironment('Default');
});
