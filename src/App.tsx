/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  ConsoleLogEntry,
  CropType,
  Direction,
  GameShellScreen,
  ImplementType,
  Inventory,
  ScriptTab,
  TechNode,
  TileData,
  TractorState,
} from './types/game';
import {
  INITIAL_SCRIPTS,
  INITIAL_TECH_NODES,
  getIslandSizeForLevel,
  getUpgradeCostsForNode,
} from './data/techTreeData';
import { FarmViewport3D } from './components/FarmViewport3D';
import { FloatingCodeEditor } from './components/FloatingCodeEditor';
import {
  AiOptimizerModal,
  ApiDocsModal,
  TechTreeModal,
  renderNodeCenterVisual,
  renderResourceIcon,
} from './components/ModalsAndDocs';
import { AgroPythonInterpreter } from './engine/pythonInterpreter';
import { soundFX } from './utils/sound';

function createInitialGrid(size: number, irrigationLevel = 0): TileData[][] {
  const grid: TileData[][] = [];
  for (let z = 0; z < size; z++) {
    const row: TileData[] = [];
    for (let x = 0; x < size; x++) {
      let terrain: TileData['terrain'] = 'tanah';
      let soilState: TileData['soilState'] = 'liar';
      let crop: CropType | null = null;
      let growth = 0;

      if (x === 0 && z === 0) {
        terrain = 'pom_bensin';
      } else if (x === size - 1 && z === 0) {
        terrain = 'gudang';
      } else if (irrigationLevel === 0 && ((x === 1 && z === 2) || (x === 2 && z === 3))) {
        terrain = 'lumpur';
      } else if ((x === 1 && z === 1) || (x === 2 && z === 1)) {
        soilState = 'siap_panen';
        crop = 'jerami';
        growth = 1;
      }

      row.push({ x, z, terrain, soilState, crop, growth });
    }
    grid.push(row);
  }
  return grid;
}

const DIRECTION_ORDER: Direction[] = ['utara', 'timur', 'selatan', 'barat'];

const DIR_TO_EN: Record<Direction, string> = {
  utara: 'north',
  timur: 'east',
  selatan: 'south',
  barat: 'west',
};

const TOOL_TO_EN: Record<ImplementType, string> = {
  kosong: 'none',
  bajak: 'plow',
  penabur: 'seeder',
  pemanen: 'harvester',
  pengangkut: 'trailer',
};

export default function App() {
  // Game Shell State
  const [screen, setScreen] = useState<GameShellScreen>('title');
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Farm Grid & Warehouse Inventory (Wheat, Wood, Carrot, Corn)
  const [tiles, setTiles] = useState<TileData[][]>(() => createInitialGrid(4));
  const [warehouse, setWarehouse] = useState<Inventory>({
    jerami: 4,
    kayu: 0,
    wortel: 0,
    jagung: 0,
  });

  // Primary Tractor (#1) & Extra Fleet Tractors (#2, #3, #4)
  const [tractor, setTractor] = useState<TractorState>({
    id: 0,
    x: 1,
    z: 1,
    direction: 'selatan',
    fuel: 100,
    maxFuel: 100,
    implement: 'pemanen',
    cargo: { jerami: 0, kayu: 0, wortel: 0, jagung: 0 },
    maxCargo: 10,
    isMoving: false,
    statusMessage: 'Ready to execute Python script.',
  });

  const [extraTractors, setExtraTractors] = useState<TractorState[]>([]);
  const [selectedTile, setSelectedTile] = useState<{ x: number; z: number } | null>({ x: 1, z: 1 });

  // Tech Tree & Modals
  const [techNodes, setTechNodes] = useState<TechNode[]>(INITIAL_TECH_NODES);
  const [isEditorOpen, setIsEditorOpen] = useState<boolean>(true);
  const [isTechModalOpen, setIsTechModalOpen] = useState<boolean>(false);
  const [isDocsModalOpen, setIsDocsModalOpen] = useState<boolean>(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState<boolean>(false);

  // Python IDE State
  const [scripts, setScripts] = useState<ScriptTab[]>(INITIAL_SCRIPTS);
  const [activeScriptId, setActiveScriptId] = useState<string>('main');
  const [isRunningCode, setIsRunningCode] = useState<boolean>(false);
  const [isStepMode, setIsStepMode] = useState<boolean>(false);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [executionSpeed, setExecutionSpeed] = useState<number>(1);
  const [logs, setLogs] = useState<ConsoleLogEntry[]>([
    {
      id: 'init-1',
      timestamp: '00:00',
      type: 'info',
      message: 'Ready. Press Play (▶) or Step (▷) in the Python editor to control the tractor.',
    },
  ]);

  const startTimeRef = useRef<number>(Date.now());
  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;
  const tractorRef = useRef(tractor);
  tractorRef.current = tractor;
  const extraTractorsRef = useRef(extraTractors);
  extraTractorsRef.current = extraTractors;
  const activeTractorIdxRef = useRef<number>(0);
  const techNodesRef = useRef(techNodes);
  techNodesRef.current = techNodes;
  const speedRef = useRef(executionSpeed);
  speedRef.current = executionSpeed;

  const stopRequestedRef = useRef<boolean>(false);
  const stepGateResolverRef = useRef<(() => void) | null>(null);
  const isStepModeRef = useRef<boolean>(false);

  const addLog = useCallback(
    (type: ConsoleLogEntry['type'], message: string, line?: number) => {
      const now = new Date();
      const ts = `${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      setLogs((prev) => [
        ...prev.slice(-49),
        {
          id: `${Date.now()}-${Math.random()}`,
          timestamp: ts,
          type,
          message,
          line,
        },
      ]);
    },
    []
  );

  const isNodeUnlocked = useCallback((nodeId: string) => {
    const found = techNodesRef.current.find((n) => n.id === nodeId);
    return Boolean(found && (found.unlocked || found.level > 0));
  }, []);

  const getNodeLevel = useCallback((nodeId: string) => {
    return techNodesRef.current.find((n) => n.id === nodeId)?.level ?? 0;
  }, []);

  // Passive Crop Growth Loop (Accelerated by Fertilizer Level & Wheat Level)
  useEffect(() => {
    const interval = setInterval(() => {
      const fertLevel = getNodeLevel('alat_pupuk');
      const wheatLevel = Math.max(1, getNodeLevel('logistik_dasar'));
      const fertMultiplier = 1 + fertLevel * 0.22;

      setTiles((prevGrid) => {
        let changed = false;
        const nextGrid = prevGrid.map((row) =>
          row.map((tile) => {
            if (tile.soilState === 'ditanam' && tile.crop) {
              const baseRate =
                tile.crop === 'jerami'
                  ? 0.24 * (1 + (wheatLevel - 1) * 0.08)
                  : tile.crop === 'wortel'
                  ? 0.2
                  : tile.crop === 'kayu'
                  ? 0.16
                  : 0.15;
              const nextGrowth = Math.min(1, tile.growth + baseRate * fertMultiplier);
              const nextState = nextGrowth >= 1 ? 'siap_panen' : 'ditanam';
              changed = true;
              return { ...tile, growth: nextGrowth, soilState: nextState };
            }
            return tile;
          })
        );
        return changed ? nextGrid : prevGrid;
      });
    }, 850);
    return () => clearInterval(interval);
  }, [getNodeLevel]);

  const getTotalCargo = (cargo: Inventory) =>
    cargo.jerami + cargo.kayu + cargo.wortel + cargo.jagung;

  const sleepTick = async (baseMs: number) => {
    const tractorSpeedLv = Math.max(1, getNodeLevel('alat_dasar'));
    const speedBonus = 1 + (tractorSpeedLv - 1) * 0.25;
    const ms = Math.max(40, Math.round(baseMs / (speedRef.current * speedBonus)));
    await new Promise((r) => setTimeout(r, ms));
  };

  // Helper to get or update a specific tractor by index (0 = primary, 1..3 = extraTractors)
  const getTargetTractor = useCallback((idx?: number): TractorState => {
    const resolvedIdx = idx !== undefined ? idx : activeTractorIdxRef.current;
    if (resolvedIdx <= 0) return tractorRef.current;
    return extraTractorsRef.current[resolvedIdx - 1] || tractorRef.current;
  }, []);

  const updateTargetTractor = useCallback((idx: number | undefined, updater: (prev: TractorState) => TractorState) => {
    const resolvedIdx = idx !== undefined ? idx : activeTractorIdxRef.current;
    if (resolvedIdx <= 0 || !extraTractorsRef.current[resolvedIdx - 1]) {
      const next = updater(tractorRef.current);
      tractorRef.current = next;
      setTractor(next);
    } else {
      const eIdx = resolvedIdx - 1;
      const nextExtras = [...extraTractorsRef.current];
      nextExtras[eIdx] = updater(nextExtras[eIdx]);
      extraTractorsRef.current = nextExtras;
      setExtraTractors(nextExtras);
    }
  }, []);

  // Python API Tractor Actions
  const actionTurn = useCallback(
    async (dirInput: string, tractorIdx?: number) => {
      const cur = getTargetTractor(tractorIdx);
      const curDir = cur.direction;
      const idx = DIRECTION_ORDER.indexOf(curDir);
      let nextDir: Direction = curDir;

      if (dirInput === 'right' || dirInput === 'kanan') {
        nextDir = DIRECTION_ORDER[(idx + 1) % 4];
      } else if (dirInput === 'left' || dirInput === 'kiri') {
        nextDir = DIRECTION_ORDER[(idx + 3) % 4];
      } else if (dirInput === 'north' || dirInput === 'utara') {
        nextDir = 'utara';
      } else if (dirInput === 'east' || dirInput === 'timur') {
        nextDir = 'timur';
      } else if (dirInput === 'south' || dirInput === 'selatan') {
        nextDir = 'selatan';
      } else if (dirInput === 'west' || dirInput === 'barat') {
        nextDir = 'barat';
      }

      updateTargetTractor(tractorIdx, (prev) => ({
        ...prev,
        direction: nextDir,
        statusMessage: `turn("${DIR_TO_EN[nextDir]}")`,
      }));
      await sleepTick(180);
    },
    [getTargetTractor, updateTargetTractor]
  );

  const actionMove = useCallback(
    async (arg: number | string = 1, tractorIdx?: number) => {
      if (typeof arg === 'string') {
        await actionTurn(arg, tractorIdx);
        arg = 1;
      }
      const steps = typeof arg === 'number' ? arg : 1;
      const size = tilesRef.current.length;

      for (let s = 0; s < steps; s++) {
        if (stopRequestedRef.current) return;
        const cur = getTargetTractor(tractorIdx);

        if (cur.fuel <= 0) {
          soundFX.playError();
          addLog('error', 'Out of fuel! Refuel at (0, 0) using refuel().');
          throw new Error('Tractor is out of diesel fuel (0L).');
        }

        let nx = cur.x;
        let nz = cur.z;
        if (cur.direction === 'utara') nz -= 1;
        else if (cur.direction === 'selatan') nz += 1;
        else if (cur.direction === 'timur') nx += 1;
        else if (cur.direction === 'barat') nx -= 1;

        if (nx < 0 || nx >= size || nz < 0 || nz >= size) {
          soundFX.playError();
          addLog('warn', `Reached island boundary at (${cur.x}, ${cur.z}).`);
          break;
        }

        const destTile = tilesRef.current[nz][nx];
        const isMud = destTile.terrain === 'lumpur';
        const fuelCost = isMud ? 4 : 1.5;

        soundFX.playMove(isMud, false);

        updateTargetTractor(tractorIdx, (prev) => ({
          ...prev,
          x: nx,
          z: nz,
          fuel: Math.max(0, prev.fuel - fuelCost),
          isMoving: true,
          statusMessage: `move() -> (${nx}, ${nz})`,
        }));
        setSelectedTile({ x: nx, z: nz });

        await sleepTick(isMud ? 460 : 300);

        updateTargetTractor(tractorIdx, (prev) => ({ ...prev, isMoving: false }));
      }
    },
    [actionTurn, addLog, getTargetTractor, updateTargetTractor]
  );

  const actionEquip = useCallback(
    async (toolInput: string, tractorIdx?: number) => {
      const mapTool: Record<string, ImplementType> = {
        none: 'kosong',
        kosong: 'kosong',
        plow: 'bajak',
        bajak: 'bajak',
        seeder: 'penabur',
        penabur: 'penabur',
        harvester: 'pemanen',
        pemanen: 'pemanen',
        trailer: 'pengangkut',
        pengangkut: 'pengangkut',
      };
      const target = mapTool[toolInput] || 'bajak';
      const cur = getTargetTractor(tractorIdx);
      if (cur.implement === target) return;

      soundFX.playEquip();
      updateTargetTractor(tractorIdx, (prev) => ({
        ...prev,
        implement: target,
        statusMessage: `equip("${TOOL_TO_EN[target]}")`,
      }));
      await sleepTick(200);
    },
    [getTargetTractor, updateTargetTractor]
  );

  const actionPlow = useCallback(
    async (tractorIdx?: number) => {
      const cur = getTargetTractor(tractorIdx);
      if (cur.implement !== 'bajak') {
        await actionEquip('plow', tractorIdx);
      }

      const { x, z } = getTargetTractor(tractorIdx);
      const tile = tilesRef.current[z][x];

      if (tile.terrain === 'pom_bensin' || tile.terrain === 'gudang') {
        addLog('warn', `Tile (${x}, ${z}) cannot be plowed.`);
        return;
      }

      soundFX.playPlow();
      const nextGrid = tilesRef.current.map((row) =>
        row.map((t) =>
          t.x === x && t.z === z
            ? { ...t, soilState: 'dibajak' as const, crop: null, growth: 0 }
            : t
        )
      );
      tilesRef.current = nextGrid;
      setTiles(nextGrid);

      updateTargetTractor(tractorIdx, (prev) => ({
        ...prev,
        fuel: Math.max(0, prev.fuel - 1),
        statusMessage: `plow() at (${x}, ${z})`,
      }));
      await sleepTick(240);
    },
    [actionEquip, addLog, getTargetTractor, updateTargetTractor]
  );

  const actionPlant = useCallback(
    async (seedRaw: string = 'wheat', tractorIdx?: number) => {
      const cur = getTargetTractor(tractorIdx);
      if (cur.implement !== 'penabur') {
        await actionEquip('seeder', tractorIdx);
      }

      const seedMap: Record<string, CropType> = {
        wheat: 'jerami',
        jerami: 'jerami',
        carrot: 'wortel',
        wortel: 'wortel',
        wood: 'kayu',
        kayu: 'kayu',
        corn: 'jagung',
        jagung: 'jagung',
      };
      const crop: CropType = seedMap[seedRaw] || 'jerami';

      if ((crop === 'wortel' || crop === 'kayu') && !isNodeUnlocked('alat_wortel_kayu')) {
        soundFX.playError();
        addLog(
          'warn',
          `Seed "${seedRaw}" requires 'Bibit & Panen Wortel' unlocked in Tech Tree (^).`
        );
        return;
      }
      if (crop === 'jagung' && !isNodeUnlocked('alat_jagung')) {
        soundFX.playError();
        addLog(
          'warn',
          `Seed "corn" requires 'Bibit & Panen Jagung' unlocked in Tech Tree (^).`
        );
        return;
      }

      const { x, z } = getTargetTractor(tractorIdx);
      const tile = tilesRef.current[z][x];

      if (tile.terrain === 'pom_bensin' || tile.terrain === 'gudang') {
        addLog('warn', `Cannot plant on (${x}, ${z}).`);
        return;
      }

      soundFX.playPlant();
      const nextGrid = tilesRef.current.map((row) =>
        row.map((t) =>
          t.x === x && t.z === z
            ? { ...t, soilState: 'ditanam' as const, crop, growth: 0.15 }
            : t
        )
      );
      tilesRef.current = nextGrid;
      setTiles(nextGrid);

      updateTargetTractor(tractorIdx, (prev) => ({
        ...prev,
        fuel: Math.max(0, prev.fuel - 1),
        statusMessage: `plant("${seedRaw}") at (${x}, ${z})`,
      }));
      await sleepTick(240);
    },
    [actionEquip, addLog, getTargetTractor, isNodeUnlocked, updateTargetTractor]
  );

  const actionFertilize = useCallback(
    async (tractorIdx?: number) => {
      const { x, z } = getTargetTractor(tractorIdx);
      const tile = tilesRef.current[z][x];
      if (!tile.crop) {
        addLog('info', `No crop to fertilize at (${x}, ${z}).`);
        return;
      }

      soundFX.playUnlock();
      const nextGrid = tilesRef.current.map((row) =>
        row.map((t) =>
          t.x === x && t.z === z
            ? { ...t, soilState: 'siap_panen' as const, growth: 1.0 }
            : t
        )
      );
      tilesRef.current = nextGrid;
      setTiles(nextGrid);

      updateTargetTractor(tractorIdx, (prev) => ({
        ...prev,
        statusMessage: `fertilize() at (${x}, ${z})`,
      }));
      addLog('action', `Fertilized crop at (${x}, ${z}) -> 100% Ready!`);
      await sleepTick(200);
    },
    [addLog, getTargetTractor, updateTargetTractor]
  );

  const actionHarvest = useCallback(
    async (tractorIdx?: number) => {
      const cur = getTargetTractor(tractorIdx);
      if (cur.implement !== 'pemanen') {
        await actionEquip('harvester', tractorIdx);
      }

      const { x, z } = getTargetTractor(tractorIdx);
      const tile = tilesRef.current[z][x];

      if (tile.soilState !== 'siap_panen' || !tile.crop) {
        addLog('info', `No ripe crop to harvest at (${x}, ${z}).`);
        await sleepTick(160);
        return;
      }

      const harvestedCrop = tile.crop;
      soundFX.playHarvest();

      const irrigationLv = getNodeLevel('logistik_irigasi');
      const keepPlowed = irrigationLv > 0 && Math.random() < irrigationLv * 0.18;

      const nextGrid = tilesRef.current.map((row) =>
        row.map((t) =>
          t.x === x && t.z === z
            ? {
                ...t,
                soilState: keepPlowed ? ('dibajak' as const) : ('liar' as const),
                crop: null,
                growth: 0,
              }
            : t
        )
      );
      tilesRef.current = nextGrid;
      setTiles(nextGrid);

      // Calculate harvest yield bonus from upgrade level
      let cropLevel = 1;
      if (harvestedCrop === 'jerami') cropLevel = Math.max(1, getNodeLevel('logistik_dasar'));
      else if (harvestedCrop === 'wortel') cropLevel = Math.max(1, getNodeLevel('alat_wortel_kayu'));
      else if (harvestedCrop === 'kayu') cropLevel = Math.max(1, getNodeLevel('alat_pengangkut'));
      else if (harvestedCrop === 'jagung') cropLevel = Math.max(1, getNodeLevel('alat_jagung'));

      const barnYield = 1 + cropLevel;

      setWarehouse((prev) => ({
        ...prev,
        [harvestedCrop]: prev[harvestedCrop] + barnYield,
      }));

      updateTargetTractor(tractorIdx, (prev) => {
        const currentCargoCount = getTotalCargo(prev.cargo);
        const canCarryMore = currentCargoCount < prev.maxCargo;
        const nextCargo = canCarryMore
          ? { ...prev.cargo, [harvestedCrop]: prev.cargo[harvestedCrop] + 1 }
          : prev.cargo;
        return {
          ...prev,
          fuel: Math.max(0, prev.fuel - 1),
          cargo: nextCargo,
          statusMessage: `harvest() at (${x}, ${z})`,
        };
      });

      addLog('action', `Harvested at (${x}, ${z})! (+${barnYield} added to Barn)`);
      await sleepTick(260);
    },
    [actionEquip, addLog, getNodeLevel, getTargetTractor, updateTargetTractor]
  );

  const actionGoToCoord = useCallback(
    async (targetX: number, targetZ: number, tractorIdx?: number) => {
      const size = tilesRef.current.length;
      const tx = Math.max(0, Math.min(size - 1, Math.round(targetX)));
      const tz = Math.max(0, Math.min(size - 1, Math.round(targetZ)));

      let guard = 0;
      while (guard < 60) {
        if (stopRequestedRef.current) return;
        const cur = getTargetTractor(tractorIdx);
        if (cur.x === tx && cur.z === tz) break;
        guard++;

        if (cur.x < tx) {
          if (cur.direction !== 'timur') await actionTurn('east', tractorIdx);
          await actionMove(1, tractorIdx);
        } else if (cur.x > tx) {
          if (cur.direction !== 'barat') await actionTurn('west', tractorIdx);
          await actionMove(1, tractorIdx);
        } else if (cur.z < tz) {
          if (cur.direction !== 'selatan') await actionTurn('south', tractorIdx);
          await actionMove(1, tractorIdx);
        } else if (cur.z > tz) {
          if (cur.direction !== 'utara') await actionTurn('north', tractorIdx);
          await actionMove(1, tractorIdx);
        }
      }
    },
    [actionMove, actionTurn, getTargetTractor]
  );

  const actionGoToFuel = useCallback(
    async (tractorIdx?: number) => {
      await actionGoToCoord(0, 0, tractorIdx);
      await sleepTick(150);
    },
    [actionGoToCoord]
  );

  const actionGoToBarn = useCallback(
    async (tractorIdx?: number) => {
      const size = tilesRef.current.length;
      await actionGoToCoord(size - 1, 0, tractorIdx);
      await sleepTick(150);
    },
    [actionGoToCoord]
  );

  const actionRefuel = useCallback(
    async (tractorIdx?: number) => {
      const { x, z } = getTargetTractor(tractorIdx);
      const tile = tilesRef.current[z][x];

      if (tile.terrain !== 'pom_bensin') {
        await actionGoToFuel(tractorIdx);
      }

      soundFX.playRefuel();
      updateTargetTractor(tractorIdx, (prev) => ({
        ...prev,
        fuel: prev.maxFuel,
        statusMessage: `refuel() -> ${prev.maxFuel}L`,
      }));
      addLog('action', 'Refueled tractor tank to 100%!');
      await sleepTick(280);
    },
    [actionGoToFuel, addLog, getTargetTractor, updateTargetTractor]
  );

  const actionDeliver = useCallback(
    async (tractorIdx?: number) => {
      const { x, z } = getTargetTractor(tractorIdx);
      const tile = tilesRef.current[z][x];
      if (tile.terrain !== 'gudang') {
        await actionGoToBarn(tractorIdx);
      }

      await actionEquip('trailer', tractorIdx);
      const cur = getTargetTractor(tractorIdx);
      const c = cur.cargo;
      const total = getTotalCargo(c);

      soundFX.playUnlock();
      setWarehouse((prev) => ({
        jerami: prev.jerami + c.jerami + (total === 0 ? 1 : 0),
        kayu: prev.kayu + c.kayu,
        wortel: prev.wortel + c.wortel,
        jagung: prev.jagung + c.jagung,
      }));

      const emptyCargo: Inventory = { jerami: 0, kayu: 0, wortel: 0, jagung: 0 };
      updateTargetTractor(tractorIdx, (prev) => ({
        ...prev,
        cargo: emptyCargo,
        statusMessage: 'deliver() -> Barn',
      }));
      addLog('action', 'Cargo delivered to Barn!');
      await sleepTick(260);
    },
    [actionEquip, actionGoToBarn, addLog, getTargetTractor, updateTargetTractor]
  );

  const actionStartHelper = useCallback(
    async (helperIndex: number, seedRaw: string) => {
      const fleetLevel = Math.max(1, getNodeLevel('alat_multi_traktor'));
      if (helperIndex < 1 || helperIndex >= fleetLevel) {
        addLog(
          'warn',
          `Tractor #${helperIndex + 1} is not unlocked yet. Upgrade 'Armada Multi-Traktor' in Tech Tree (^).`
        );
        return;
      }

      const seedMap: Record<string, CropType> = {
        wheat: 'jerami',
        carrot: 'wortel',
        wood: 'kayu',
        corn: 'jagung',
      };
      const preferredSeed: CropType = seedMap[seedRaw] || 'jerami';

      const eIdx = helperIndex - 1;
      const nextExtras = [...extraTractorsRef.current];
      if (nextExtras[eIdx]) {
        nextExtras[eIdx] = {
          ...nextExtras[eIdx],
          autoHelper: true,
          preferredSeed,
        };
        extraTractorsRef.current = nextExtras;
        setExtraTractors(nextExtras);
        addLog('action', `Tractor #${helperIndex + 1} helper active (planting "${seedRaw}").`);
      }
    },
    [addLog, getNodeLevel]
  );

  const actionClearField = useCallback(async () => {
    const size = tilesRef.current.length;
    const irLv = getNodeLevel('logistik_irigasi');
    const cleared = createInitialGrid(size, irLv);
    tilesRef.current = cleared;
    setTiles(cleared);
    addLog('info', 'Field reset with clear().');
    await sleepTick(200);
  }, [addLog, getNodeLevel]);

  // Execute Python Code
  const startPythonExecution = useCallback(
    async (stepMode: boolean) => {
      if (isRunningCode) {
        if (stepMode && stepGateResolverRef.current) {
          const resolve = stepGateResolverRef.current;
          stepGateResolverRef.current = null;
          resolve();
          return;
        }
        if (!stepMode && isStepModeRef.current && stepGateResolverRef.current) {
          isStepModeRef.current = false;
          setIsStepMode(false);
          const resolve = stepGateResolverRef.current;
          stepGateResolverRef.current = null;
          resolve();
          return;
        }
        return;
      }

      const activeTab = scripts.find((s) => s.id === activeScriptId) || scripts[0];
      stopRequestedRef.current = false;
      isStepModeRef.current = stepMode;
      setIsStepMode(stepMode);
      setIsRunningCode(true);

      addLog('info', `Running '${activeTab.name}'...`);

      const interpreter = new AgroPythonInterpreter({
        getTractorState: (idx) => {
          const t = getTargetTractor(idx);
          return {
            x: t.x,
            z: t.z,
            direction: t.direction,
            fuel: t.fuel,
            max_fuel: t.maxFuel,
            tool: t.implement,
            cargo: getTotalCargo(t.cargo),
            max_cargo: t.maxCargo,
          };
        },
        getTractorCount: () => 1 + extraTractorsRef.current.length,
        getWorldSize: () => tilesRef.current.length,
        checkSoil: (idx) => {
          const { x, z } = getTargetTractor(idx);
          const t = tilesRef.current[z][x];
          if (t.terrain === 'lumpur') return 'mud';
          if (t.terrain === 'pom_bensin') return 'fuel_station';
          if (t.terrain === 'gudang') return 'barn';
          if (t.soilState === 'liar') return 'wild';
          if (t.soilState === 'dibajak') return 'plowed';
          if (t.soilState === 'ditanam') return 'planted';
          return 'ready';
        },
        canHarvest: (idx) => {
          const { x, z } = getTargetTractor(idx);
          const t = tilesRef.current[z][x];
          return t.soilState === 'siap_panen';
        },
        measureCrop: (idx) => {
          const { x, z } = getTargetTractor(idx);
          const t = tilesRef.current[z][x];
          return Math.round((t.growth || 0) * 100);
        },
        getElapsedTime: () => Math.round((Date.now() - startTimeRef.current) / 100) / 10,
        isNodeUnlocked,
        setActiveTractorIndex: (idx) => {
          activeTractorIdxRef.current = Math.max(0, Math.min(3, idx));
        },
        setSimSpeed: (spd) => {
          speedRef.current = spd;
          setExecutionSpeed(spd);
        },
        startHelper: actionStartHelper,
        fertilize: actionFertilize,
        clearField: actionClearField,
        move: actionMove,
        turn: actionTurn,
        equip: actionEquip,
        plow: actionPlow,
        plant: actionPlant,
        harvest: actionHarvest,
        refuel: actionRefuel,
        deliver: actionDeliver,
        goToFuel: actionGoToFuel,
        goToBarn: actionGoToBarn,
        goToCoord: actionGoToCoord,
        onActiveLine: (ln) => setActiveLine(ln),
        onLog: addLog,
        shouldStop: () => stopRequestedRef.current,
        waitStepGate: async () => {
          if (!isStepModeRef.current) return;
          await new Promise<void>((resolve) => {
            stepGateResolverRef.current = resolve;
          });
        },
      });

      try {
        if (stepMode) {
          setTimeout(() => {
            if (stepGateResolverRef.current) {
              const r = stepGateResolverRef.current;
              stepGateResolverRef.current = null;
              r();
            }
          }, 20);
        }
        await interpreter.execute(activeTab.code);
        if (!stopRequestedRef.current) {
          addLog('info', `Finished '${activeTab.name}'.`);
        }
      } catch (err: any) {
        soundFX.playError();
        addLog('error', err?.message || 'Python execution error.');
      } finally {
        setIsRunningCode(false);
        setIsStepMode(false);
        isStepModeRef.current = false;
        stepGateResolverRef.current = null;
        setActiveLine(null);
      }
    },
    [
      activeScriptId,
      actionClearField,
      actionDeliver,
      actionEquip,
      actionFertilize,
      actionGoToBarn,
      actionGoToCoord,
      actionGoToFuel,
      actionHarvest,
      actionMove,
      actionPlant,
      actionPlow,
      actionRefuel,
      actionStartHelper,
      actionTurn,
      addLog,
      getTargetTractor,
      isNodeUnlocked,
      isRunningCode,
      scripts,
    ]
  );

  const stopPythonExecution = useCallback(() => {
    stopRequestedRef.current = true;
    if (stepGateResolverRef.current) {
      const r = stepGateResolverRef.current;
      stepGateResolverRef.current = null;
      r();
    }
    setIsRunningCode(false);
    setIsStepMode(false);
    setActiveLine(null);
    addLog('warn', 'Execution stopped.');
  }, [addLog]);

  // Unlock or Upgrade Tech Tree Node Handler
  const handleUnlockTechNode = (nodeId: string) => {
    const node = techNodes.find((n) => n.id === nodeId);
    if (!node || node.level >= node.maxLevel) return;

    const currentCosts = getUpgradeCostsForNode(node);
    for (const cost of currentCosts) {
      if (warehouse[cost.resource] < cost.amount) return;
    }

    const nextLevel = node.level + 1;
    soundFX.playUnlock();

    setWarehouse((prev) => {
      const next = { ...prev };
      currentCosts.forEach((c) => {
        next[c.resource] = Math.max(0, next[c.resource] - c.amount);
      });
      return next;
    });

    setTechNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, unlocked: true, level: nextLevel } : n
      )
    );

    if (nodeId === 'alat_multi_traktor') {
      // Spawn new 3D tractor on the island!
      const size = tilesRef.current.length;
      const newIdx = nextLevel - 1;
      const spawnCoords = [
        { x: Math.min(size - 1, 2), z: Math.min(size - 1, 2) },
        { x: 0, z: Math.min(size - 1, 2) },
        { x: Math.min(size - 1, 3), z: Math.min(size - 1, 1) },
      ];
      const pos = spawnCoords[newIdx - 1] || { x: 1, z: 1 };
      const newHelper: TractorState = {
        id: newIdx,
        x: pos.x,
        z: pos.z,
        direction: 'selatan',
        fuel: tractorRef.current.maxFuel,
        maxFuel: tractorRef.current.maxFuel,
        implement: 'pemanen',
        cargo: { jerami: 0, kayu: 0, wortel: 0, jagung: 0 },
        maxCargo: tractorRef.current.maxCargo,
        isMoving: false,
        statusMessage: `Tractor #${nextLevel} Ready (Control via Python code)`,
        autoHelper: false,
      };
      const updatedExtras = [...extraTractorsRef.current, newHelper];
      extraTractorsRef.current = updatedExtras;
      setExtraTractors(updatedExtras);
    } else if (nodeId === 'alat_pengangkut') {
      setTractor((t) => ({ ...t, maxCargo: 10 + nextLevel * 5 }));
    } else if (nodeId === 'alat_tangki_besar') {
      const newMaxFuel = 100 + nextLevel * 50;
      setTractor((t) => ({ ...t, maxFuel: newMaxFuel, fuel: newMaxFuel }));
    } else if (nodeId === 'logistik_irigasi') {
      // Convert mud tiles into fertile soil
      const nextGrid = tilesRef.current.map((row) =>
        row.map((t) => (t.terrain === 'lumpur' ? { ...t, terrain: 'tanah' as const } : t))
      );
      tilesRef.current = nextGrid;
      setTiles(nextGrid);
    } else if (nodeId === 'logistik_ekspansi') {
      const newSize = getIslandSizeForLevel(nextLevel);
      const irLv = getNodeLevel('logistik_irigasi');
      const nextGrid = createInitialGrid(newSize, irLv);
      const oldGrid = tilesRef.current;
      const oldSize = oldGrid.length;
      for (let z = 0; z < Math.min(oldSize, newSize); z++) {
        for (let x = 0; x < Math.min(oldSize, newSize); x++) {
          const oldTile = oldGrid[z][x];
          if (oldTile.terrain === 'tanah' && oldTile.soilState !== 'liar') {
            nextGrid[z][x] = {
              ...nextGrid[z][x],
              soilState: oldTile.soilState,
              crop: oldTile.crop,
              growth: oldTile.growth,
            };
          }
        }
      }
      tilesRef.current = nextGrid;
      setTiles(nextGrid);
    }

    if (node.maxLevel > 1) {
      addLog(
        'action',
        `Tech Upgraded: ${node.title} -> Level ${nextLevel}/${node.maxLevel}!`
      );
    } else {
      addLog('action', `Tech Unlocked: ${node.title} (${node.syntaxBadge})!`);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'TEXTAREA' || tag === 'INPUT') {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (screen === 'title') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setScreen('playing');
        }
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        if (isTechModalOpen) {
          setIsTechModalOpen(false);
        } else if (isDocsModalOpen) {
          setIsDocsModalOpen(false);
        } else if (isAiModalOpen) {
          setIsAiModalOpen(false);
        } else {
          setScreen((prev) => (prev === 'paused' ? 'playing' : 'paused'));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAiModalOpen, isDocsModalOpen, isTechModalOpen, screen]);

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];
  const totalTractorsCount = 1 + extraTractors.length;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      {/* 1. Full-Viewport 3D Floating Sky Island & Multi-Tractor Scene */}
      <FarmViewport3D
        tiles={tiles}
        tractor={tractor}
        extraTractors={extraTractors}
        isTitleScreen={screen === 'title'}
        selectedTile={selectedTile}
        onSelectTile={(coord) => setSelectedTile(coord)}
      />

      {/* 2. TITLE SCREEN OVERLAY */}
      {screen === 'title' && (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-between p-8 bg-black/30 pointer-events-auto">
          <div className="text-xs font-mono-code tracking-wider text-[#E8EEF2] mt-2">
            3D PYTHON FARMING AUTOMATION GAME
          </div>

          <div className="flex flex-col items-center text-center max-w-xl my-auto">
            <svg
              viewBox="0 0 540 110"
              className="w-full max-w-[480px] h-auto drop-shadow-lg"
              aria-label="этаTractor"
            >
              <rect
                x="14"
                y="16"
                width="78"
                height="78"
                rx="12"
                fill="#658B1E"
                stroke="#9CD03B"
                strokeWidth="3"
              />
              <path
                d="M34 66 H72 L68 44 H52 V34 H42 V44 H34 Z"
                fill="#F3F5F4"
              />
              <circle cx="42" cy="68" r="10" fill="#232527" stroke="#E5A93C" strokeWidth="4" />
              <circle cx="64" cy="70" r="7" fill="#232527" stroke="#E5A93C" strokeWidth="3" />
              <text
                x="110"
                y="68"
                fill="#FFFFFF"
                fontFamily="Outfit, sans-serif"
                fontWeight="700"
                fontSize="56"
                letterSpacing="1.5"
              >
                этаTractor
              </text>
              <text
                x="112"
                y="92"
                fill="#E5A93C"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="600"
                fontSize="14"
                letterSpacing="3"
              >
                PYTHON TRACTOR AUTOMATION
              </text>
            </svg>

            <p className="mt-4 text-sm text-[#EAEEF2] leading-relaxed max-w-md">
              Tulis kode Python untuk mengendalikan armada traktor di atas pulau ladang melayang, memanen komoditas, dan membuka Pohon Teknologi.
            </p>

            <button
              onClick={() => setScreen('playing')}
              className="mt-7 px-8 py-3.5 rounded-md bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white font-display font-bold text-base tracking-wide border-2 border-[#9CD03B] shadow-xl transition-all cursor-pointer"
            >
              Mulai Bermain (Enter / Space)
            </button>
          </div>

          <div className="text-xs font-mono-code text-[#E2E8EE] bg-[#232527]/90 px-4 py-2 rounded border border-[#4E5358]">
            Play (▶) Jalankan Python · Step (▷) Eksekusi Per Baris · Klik & Geser Kamera 3D · Esc Jeda
          </div>
        </div>
      )}

      {/* 3. ACTIVE GAMEPLAY HUD (With Tech Tree Icons as requested in Screenshot_2026-10-25_000057) */}
      {screen !== 'title' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3.5">
          <div className="flex items-start justify-between gap-3">
            {/* Top-Left: Transparent Tractor Telemetry & Barn Inventory with Tech Tree Icons */}
            <div className="pointer-events-auto flex flex-col gap-1.5 bg-transparent px-1 py-0.5 drop-shadow-[0_2px_4px_rgba(0,0,0,0.85)]">
              {/* Row 1: AGROCODE + Fuel + Tool + Cargo + Multi-Tractor Count with Tech Tree Icons */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono-code">
                <span className="inline-flex items-center gap-1.5 font-display font-bold text-white tracking-tight text-sm">
                  {renderNodeCenterVisual('tractor_speed', '', 'w-5 h-5')}
                  <span>этаTractor</span>
                </span>

                <span className="text-white/75">·</span>

                <span
                  className={`inline-flex items-center gap-1 ${
                    tractor.fuel < 25 ? 'text-[#FF7B72] font-bold' : 'text-[#FFD166] font-semibold'
                  }`}
                >
                  {renderNodeCenterVisual('fuel_tank', '', 'w-5 h-5')}
                  <span>
                    fuel: {Math.round(tractor.fuel)}/{tractor.maxFuel}L
                  </span>
                </span>

                <span className="text-white/75">·</span>

                <span className="inline-flex items-center gap-1 text-[#B8F252] font-semibold">
                  {renderNodeCenterVisual('autopilot', '', 'w-5 h-5')}
                  <span>tool: "{TOOL_TO_EN[tractor.implement]}"</span>
                </span>

                <span className="text-white/75">·</span>

                <span className="inline-flex items-center gap-1 text-white font-semibold">
                  {renderNodeCenterVisual('wood_tree', '', 'w-5 h-5')}
                  <span>
                    cargo: {getTotalCargo(tractor.cargo)}/{tractor.maxCargo}
                  </span>
                </span>

                {totalTractorsCount > 1 && (
                  <>
                    <span className="text-white/75">·</span>
                    <span className="inline-flex items-center gap-1 text-[#7CE8FF] font-semibold">
                      {renderNodeCenterVisual('multi_tractor', '', 'w-5 h-5')}
                      <span>tractors: {totalTractorsCount}</span>
                    </span>
                  </>
                )}
              </div>

              {/* Row 2: Barn Commodities with 3D Isometric Tech Tree Icons (Transparent, No Box) */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono-code text-white font-semibold">
                <span className="inline-flex items-center gap-1 text-[#E2E8F0]">
                  {renderNodeCenterVisual('grid_expand', '', 'w-4 h-4')}
                  <span>Barn:</span>
                </span>

                <span className="inline-flex items-center gap-1.5">
                  {renderResourceIcon('jerami', 'w-5 h-5')}
                  <span>Wheat {warehouse.jerami}</span>
                </span>

                <span className="text-white/70" aria-hidden="true">
                  ·
                </span>

                <span className="inline-flex items-center gap-1.5">
                  {renderResourceIcon('wortel', 'w-5 h-5')}
                  <span>Carrot {warehouse.wortel}</span>
                </span>

                <span className="text-white/70" aria-hidden="true">
                  ·
                </span>

                <span className="inline-flex items-center gap-1.5">
                  {renderResourceIcon('kayu', 'w-5 h-5')}
                  <span>Wood {warehouse.kayu}</span>
                </span>

                <span className="text-white/70" aria-hidden="true">
                  ·
                </span>

                <span className="inline-flex items-center gap-1.5">
                  {renderResourceIcon('jagung', 'w-5 h-5')}
                  <span>Corn {warehouse.jagung}</span>
                </span>
              </div>
            </div>

            {/* Top-Right: Reference-Screenshot Matched Moss-Green Square Icon Buttons (+, i, ^) */}
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                onClick={() => setIsEditorOpen((prev) => !prev)}
                title="Toggle Python Code Editor (+)"
                className="w-10 h-10 flex items-center justify-center rounded bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white font-mono-code text-xl font-bold border border-[#88B82E] shadow-lg transition-transform cursor-pointer"
              >
                +
              </button>

              <button
                onClick={() => setIsDocsModalOpen(true)}
                title="Python API Documentation (i)"
                className="w-10 h-10 flex items-center justify-center rounded bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white font-serif italic text-lg font-bold border border-[#88B82E] shadow-lg transition-transform cursor-pointer"
              >
                i
              </button>

              <button
                onClick={() => setIsTechModalOpen(true)}
                title="Tech Tree (^)"
                className="w-10 h-10 flex items-center justify-center rounded bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white border border-[#88B82E] shadow-lg transition-transform cursor-pointer"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[2.5]">
                  <polyline points="6 15 12 9 18 15" />
                  <polyline points="6 20 12 14 18 20" />
                </svg>
              </button>

              <button
                onClick={() => setIsAiModalOpen(true)}
                title="Optimize Python Code"
                className="px-2.5 h-10 flex items-center justify-center rounded bg-[#474A4D] hover:bg-[#658B1E] text-white font-mono-code text-xs font-bold border border-[#6E7378] shadow-lg transition-colors cursor-pointer"
              >
                Opt
              </button>

              <button
                onClick={() => {
                  soundFX.muted = !isMuted;
                  setIsMuted(!isMuted);
                }}
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                className="w-10 h-10 flex items-center justify-center rounded bg-[#474A4D] hover:bg-[#5A5E62] text-white text-xs font-mono-code border border-[#6E7378] shadow-lg transition-colors cursor-pointer"
              >
                {isMuted ? 'MUTE' : 'SFX'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. DRAGGABLE FLOATING PYTHON CODE EDITOR */}
      {screen === 'playing' && (
        <FloatingCodeEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          scripts={scripts}
          activeScriptId={activeScriptId}
          onSelectScript={(id) => setActiveScriptId(id)}
          onUpdateCode={(newCode) =>
            setScripts((prev) =>
              prev.map((s) => (s.id === activeScript.id ? { ...s, code: newCode } : s))
            )
          }
          onAddScript={(customName) => {
            const nextNum = scripts.length + 1;
            const newId = `script_${Date.now()}`;
            const defaultName = customName || `script_${nextNum}`;
            setScripts((prev) => [
              ...prev,
              {
                id: newId,
                name: defaultName,
                code: `# ${defaultName}\nmove(1)\n`,
              },
            ]);
            setActiveScriptId(newId);
            return newId;
          }}
          onRenameScript={(id, newName) => {
            setScripts((prev) =>
              prev.map((s) => (s.id === id ? { ...s, name: newName } : s))
            );
          }}
          isRunning={isRunningCode}
          isStepWaiting={isStepMode}
          activeLine={activeLine}
          onRun={() => void startPythonExecution(false)}
          onStep={() => void startPythonExecution(true)}
          onStop={stopPythonExecution}
          logs={logs}
          onClearLogs={() => setLogs([])}
          executionSpeed={executionSpeed}
          onChangeSpeed={(spd) => setExecutionSpeed(spd)}
        />
      )}

      {/* 5. PAUSE MODAL */}
      {screen === 'paused' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 pointer-events-auto">
          <div className="w-full max-w-sm rounded-lg border border-[#52565A] bg-[#232527] p-6 text-center space-y-4 shadow-2xl">
            <h2 className="text-xl font-display font-bold text-white">Permainan Dijeda</h2>
            <p className="text-xs text-[#B8BFC6] font-mono-code">
              pos=({tractor.x}, {tractor.z}) · fuel={Math.round(tractor.fuel)}/{tractor.maxFuel}L · tractors={totalTractorsCount}
            </p>
            <div className="flex flex-col gap-2.5 pt-2">
              <button
                onClick={() => setScreen('playing')}
                className="w-full py-2.5 rounded bg-[#658B1E] hover:bg-[#76A124] text-white font-semibold text-sm border border-[#84B034]"
              >
                Lanjutkan Bermain (Esc)
              </button>
              <button
                onClick={() => {
                  stopPythonExecution();
                  const expandLv =
                    techNodes.find((n) => n.id === 'logistik_ekspansi')?.level ?? 0;
                  const irLv = getNodeLevel('logistik_irigasi');
                  const resetGrid = createInitialGrid(getIslandSizeForLevel(expandLv), irLv);
                  tilesRef.current = resetGrid;
                  setTiles(resetGrid);
                  setTractor((t) => ({
                    ...t,
                    x: 1,
                    z: 1,
                    direction: 'selatan',
                    fuel: t.maxFuel,
                  }));
                  setScreen('playing');
                }}
                className="w-full py-2.5 rounded bg-[#34383C] hover:bg-[#43484D] text-white font-semibold text-sm"
              >
                Reset Posisi Traktor & Ladang
              </button>
              <button
                onClick={() => {
                  stopPythonExecution();
                  setScreen('title');
                }}
                className="w-full py-2.5 rounded bg-[#2B2E31] hover:bg-[#383C40] text-[#C4CAD0] text-sm"
              >
                Kembali ke Layar Judul
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. TECH TREE, API DOCS & AI OPTIMIZER MODALS */}
      <TechTreeModal
        isOpen={isTechModalOpen}
        onClose={() => setIsTechModalOpen(false)}
        nodes={techNodes}
        inventory={warehouse}
        onUnlockNode={handleUnlockTechNode}
      />

      <ApiDocsModal
        isOpen={isDocsModalOpen}
        onClose={() => setIsDocsModalOpen(false)}
        onLoadSnippet={(snippet) => {
          setScripts((prev) =>
            prev.map((s) => (s.id === activeScript.id ? { ...s, code: snippet } : s))
          );
          setIsEditorOpen(true);
        }}
      />

      <AiOptimizerModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        currentCode={activeScript.code}
        tractor={tractor}
        unlockedNodes={techNodes.filter((n) => n.unlocked).map((n) => n.title)}
        onApplyCode={(optimizedCode) => {
          setScripts((prev) =>
            prev.map((s) => (s.id === activeScript.id ? { ...s, code: optimizedCode } : s))
          );
          setIsEditorOpen(true);
        }}
      />
    </div>
  );
}
