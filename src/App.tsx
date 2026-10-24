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
import { AiOptimizerModal, ApiDocsModal, TechTreeModal } from './components/ModalsAndDocs';
import { AgroPythonInterpreter } from './engine/pythonInterpreter';
import { soundFX } from './utils/sound';

function createInitialGrid(size: number): TileData[][] {
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
      } else if ((x === 1 && z === 2) || (x === 2 && z === 3)) {
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

  // Farm Grid & Warehouse Inventory (Wheat, Wood, Carrot, Corn — No Stone!)
  const [tiles, setTiles] = useState<TileData[][]>(() => createInitialGrid(4));
  const [warehouse, setWarehouse] = useState<Inventory>({
    jerami: 2,
    kayu: 0,
    wortel: 0,
    jagung: 0,
  });

  // Tractor State
  const [tractor, setTractor] = useState<TractorState>({
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

  const tilesRef = useRef(tiles);
  tilesRef.current = tiles;
  const tractorRef = useRef(tractor);
  tractorRef.current = tractor;
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

  // Passive Crop Growth Loop
  useEffect(() => {
    const interval = setInterval(() => {
      setTiles((prevGrid) => {
        let changed = false;
        const nextGrid = prevGrid.map((row) =>
          row.map((tile) => {
            if (tile.soilState === 'ditanam' && tile.crop) {
              const rate =
                tile.crop === 'jerami'
                  ? 0.25
                  : tile.crop === 'wortel'
                  ? 0.2
                  : tile.crop === 'kayu'
                  ? 0.16
                  : 0.14;
              const nextGrowth = Math.min(1, tile.growth + rate);
              const nextState = nextGrowth >= 1 ? 'siap_panen' : 'ditanam';
              changed = true;
              return { ...tile, growth: nextGrowth, soilState: nextState };
            }
            return tile;
          })
        );
        return changed ? nextGrid : prevGrid;
      });
    }, 900);
    return () => clearInterval(interval);
  }, []);

  const getTotalCargo = (cargo: Inventory) =>
    cargo.jerami + cargo.kayu + cargo.wortel + cargo.jagung;

  const isNodeUnlocked = useCallback((nodeId: string) => {
    const found = techNodesRef.current.find((n) => n.id === nodeId);
    return Boolean(found && (found.unlocked || found.level > 0));
  }, []);

  const getNodeLevel = useCallback((nodeId: string) => {
    return techNodesRef.current.find((n) => n.id === nodeId)?.level ?? 0;
  }, []);

  const sleepTick = async (baseMs: number) => {
    const tractorSpeedLv = Math.max(1, getNodeLevel('alat_dasar'));
    const speedBonus = 1 + (tractorSpeedLv - 1) * 0.25;
    const ms = Math.max(45, Math.round(baseMs / (speedRef.current * speedBonus)));
    await new Promise((r) => setTimeout(r, ms));
  };

  // Python API Tractor Actions
  const actionTurn = useCallback(async (dirInput: string) => {
    const curDir = tractorRef.current.direction;
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

    const nextTractor = {
      ...tractorRef.current,
      direction: nextDir,
      statusMessage: `turn("${DIR_TO_EN[nextDir]}")`,
    };
    tractorRef.current = nextTractor;
    setTractor(nextTractor);
    await sleepTick(200);
  }, []);

  const actionMove = useCallback(
    async (arg: number | string = 1) => {
      if (typeof arg === 'string') {
        await actionTurn(arg);
        arg = 1;
      }
      const steps = typeof arg === 'number' ? arg : 1;
      const size = tilesRef.current.length;

      for (let s = 0; s < steps; s++) {
        if (stopRequestedRef.current) return;
        const cur = tractorRef.current;

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
        const fuelCost = isMud ? 4 : 2;

        soundFX.playMove(isMud, false);

        const nextTractor: TractorState = {
          ...cur,
          x: nx,
          z: nz,
          fuel: Math.max(0, cur.fuel - fuelCost),
          isMoving: true,
          statusMessage: `move() -> (${nx}, ${nz})`,
        };
        tractorRef.current = nextTractor;
        setTractor(nextTractor);
        setSelectedTile({ x: nx, z: nz });

        await sleepTick(isMud ? 520 : 340);

        const settled = { ...tractorRef.current, isMoving: false };
        tractorRef.current = settled;
        setTractor(settled);
      }
    },
    [actionTurn, addLog]
  );

  const actionEquip = useCallback(async (toolInput: string) => {
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

    if (tractorRef.current.implement === target) return;

    soundFX.playEquip();
    const nextTractor: TractorState = {
      ...tractorRef.current,
      implement: target,
      statusMessage: `equip("${TOOL_TO_EN[target]}")`,
    };
    tractorRef.current = nextTractor;
    setTractor(nextTractor);
    await sleepTick(240);
  }, []);

  const actionPlow = useCallback(async () => {
    const cur = tractorRef.current;
    if (cur.implement !== 'bajak') {
      await actionEquip('plow');
    }

    const { x, z } = tractorRef.current;
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

    const updatedTractor = {
      ...tractorRef.current,
      fuel: Math.max(0, tractorRef.current.fuel - 1),
      statusMessage: `plow() at (${x}, ${z})`,
    };
    tractorRef.current = updatedTractor;
    setTractor(updatedTractor);
    await sleepTick(280);
  }, [actionEquip, addLog]);

  const actionPlant = useCallback(
    async (seedRaw: string = 'wheat') => {
      const cur = tractorRef.current;
      if (cur.implement !== 'penabur') {
        await actionEquip('seeder');
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
        addLog('warn', `Seed "${seedRaw}" requires 'Bibit Wortel & Kayu' unlocked in Tech Tree (^).`);
        return;
      }
      if (crop === 'jagung' && !isNodeUnlocked('alat_jagung')) {
        soundFX.playError();
        addLog('warn', `Seed "corn" requires 'Bibit Jagung Unggul' unlocked in Tech Tree (^).`);
        return;
      }

      const { x, z } = tractorRef.current;
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

      const updatedTractor = {
        ...tractorRef.current,
        fuel: Math.max(0, tractorRef.current.fuel - 1),
        statusMessage: `plant("${seedRaw}") at (${x}, ${z})`,
      };
      tractorRef.current = updatedTractor;
      setTractor(updatedTractor);
      await sleepTick(280);
    },
    [actionEquip, addLog, isNodeUnlocked]
  );

  const actionHarvest = useCallback(async () => {
    const cur = tractorRef.current;
    if (cur.implement !== 'pemanen') {
      await actionEquip('harvester');
    }

    const { x, z } = tractorRef.current;
    const tile = tilesRef.current[z][x];

    if (tile.soilState !== 'siap_panen' || !tile.crop) {
      addLog('info', `No ripe crop to harvest at (${x}, ${z}).`);
      await sleepTick(180);
      return;
    }

    const harvestedCrop = tile.crop;
    soundFX.playHarvest();

    const nextGrid = tilesRef.current.map((row) =>
      row.map((t) =>
        t.x === x && t.z === z
          ? { ...t, soilState: 'liar' as const, crop: null, growth: 0 }
          : t
      )
    );
    tilesRef.current = nextGrid;
    setTiles(nextGrid);

    const currentCargoCount = getTotalCargo(tractorRef.current.cargo);
    const canCarryMore = currentCargoCount < tractorRef.current.maxCargo;

    // Calculate harvest yield bonus from upgrade level
    let cropLevel = 1;
    if (harvestedCrop === 'jerami') cropLevel = Math.max(1, getNodeLevel('logistik_dasar'));
    else if (harvestedCrop === 'wortel') cropLevel = Math.max(1, getNodeLevel('alat_wortel_kayu'));
    else if (harvestedCrop === 'kayu') cropLevel = Math.max(1, getNodeLevel('alat_pengangkut'));
    else if (harvestedCrop === 'jagung') cropLevel = Math.max(1, getNodeLevel('alat_jagung'));

    const barnYield = 1 + cropLevel;

    const nextCargo = canCarryMore
      ? {
          ...tractorRef.current.cargo,
          [harvestedCrop]: tractorRef.current.cargo[harvestedCrop] + 1,
        }
      : tractorRef.current.cargo;

    setWarehouse((prev) => ({
      ...prev,
      [harvestedCrop]: prev[harvestedCrop] + barnYield,
    }));

    const updatedTractor: TractorState = {
      ...tractorRef.current,
      fuel: Math.max(0, tractorRef.current.fuel - 1),
      cargo: nextCargo,
      statusMessage: `harvest() at (${x}, ${z})`,
    };
    tractorRef.current = updatedTractor;
    setTractor(updatedTractor);

    addLog('action', `Harvested at (${x}, ${z})! (+${barnYield} added to Barn)`);
    await sleepTick(300);
  }, [actionEquip, addLog, getNodeLevel]);

  const actionGoToCoord = useCallback(
    async (targetX: number, targetZ: number) => {
      const size = tilesRef.current.length;
      const tx = Math.max(0, Math.min(size - 1, Math.round(targetX)));
      const tz = Math.max(0, Math.min(size - 1, Math.round(targetZ)));

      let guard = 0;
      while ((tractorRef.current.x !== tx || tractorRef.current.z !== tz) && guard < 24) {
        if (stopRequestedRef.current) return;
        guard++;
        const cx = tractorRef.current.x;
        const cz = tractorRef.current.z;

        if (cx < tx) {
          if (tractorRef.current.direction !== 'timur') await actionTurn('east');
          await actionMove(1);
        } else if (cx > tx) {
          if (tractorRef.current.direction !== 'barat') await actionTurn('west');
          await actionMove(1);
        } else if (cz < tz) {
          if (tractorRef.current.direction !== 'selatan') await actionTurn('south');
          await actionMove(1);
        } else if (cz > tz) {
          if (tractorRef.current.direction !== 'utara') await actionTurn('north');
          await actionMove(1);
        }
      }
    },
    [actionTurn, actionMove]
  );

  const actionGoToFuel = useCallback(async () => {
    await actionGoToCoord(0, 0);
    await sleepTick(150);
  }, [actionGoToCoord]);

  const actionGoToBarn = useCallback(async () => {
    const size = tilesRef.current.length;
    await actionGoToCoord(size - 1, 0);
    await sleepTick(150);
  }, [actionGoToCoord]);

  const actionRefuel = useCallback(async () => {
    const { x, z } = tractorRef.current;
    const tile = tilesRef.current[z][x];

    if (tile.terrain !== 'pom_bensin') {
      await actionGoToFuel();
    }

    soundFX.playRefuel();
    const updatedTractor: TractorState = {
      ...tractorRef.current,
      fuel: tractorRef.current.maxFuel,
      statusMessage: `refuel() -> ${tractorRef.current.maxFuel}L`,
    };
    tractorRef.current = updatedTractor;
    setTractor(updatedTractor);
    addLog('action', `Refueled to ${updatedTractor.maxFuel}/${updatedTractor.maxFuel}L.`);
    await sleepTick(320);
  }, [actionGoToFuel, addLog]);

  const actionDeliver = useCallback(async () => {
    const { x, z } = tractorRef.current;
    const tile = tilesRef.current[z][x];
    if (tile.terrain !== 'gudang') {
      await actionGoToBarn();
    }

    await actionEquip('trailer');
    const c = tractorRef.current.cargo;
    const total = getTotalCargo(c);

    soundFX.playUnlock();
    setWarehouse((prev) => ({
      jerami: prev.jerami + c.jerami + (total === 0 ? 1 : 0),
      kayu: prev.kayu + c.kayu,
      wortel: prev.wortel + c.wortel,
      jagung: prev.jagung + c.jagung,
    }));

    const emptyCargo: Inventory = { jerami: 0, kayu: 0, wortel: 0, jagung: 0 };
    const updatedTractor: TractorState = {
      ...tractorRef.current,
      cargo: emptyCargo,
      statusMessage: 'deliver() -> Barn',
    };
    tractorRef.current = updatedTractor;
    setTractor(updatedTractor);
    addLog('action', 'Cargo delivered to Barn!');
    await sleepTick(300);
  }, [actionGoToBarn, actionEquip, addLog]);

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
        getTractorState: () => ({
          x: tractorRef.current.x,
          z: tractorRef.current.z,
          direction: tractorRef.current.direction,
          fuel: tractorRef.current.fuel,
          max_fuel: tractorRef.current.maxFuel,
          tool: tractorRef.current.implement,
          cargo: getTotalCargo(tractorRef.current.cargo),
          max_cargo: tractorRef.current.maxCargo,
        }),
        getWorldSize: () => tilesRef.current.length,
        checkSoil: () => {
          const { x, z } = tractorRef.current;
          const t = tilesRef.current[z][x];
          if (t.terrain === 'lumpur') return 'mud';
          if (t.terrain === 'pom_bensin') return 'fuel_station';
          if (t.terrain === 'gudang') return 'barn';
          if (t.soilState === 'liar') return 'wild';
          if (t.soilState === 'dibajak') return 'plowed';
          if (t.soilState === 'ditanam') return 'planted';
          return 'ready';
        },
        canHarvest: () => {
          const { x, z } = tractorRef.current;
          const t = tilesRef.current[z][x];
          return t.soilState === 'siap_panen';
        },
        isNodeUnlocked,
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
      actionDeliver,
      actionEquip,
      actionGoToBarn,
      actionGoToCoord,
      actionGoToFuel,
      actionHarvest,
      actionMove,
      actionPlant,
      actionPlow,
      actionRefuel,
      actionTurn,
      addLog,
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

  // Unlock or Upgrade Tech Tree Node Handler (Supports multi-level 0/10 -> 1/10 -> ... -> 10/10)
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

    if (nodeId === 'alat_pengangkut') {
      setTractor((t) => ({ ...t, maxCargo: 10 + nextLevel * 5 }));
    } else if (nodeId === 'alat_tangki_besar') {
      const newMaxFuel = 100 + nextLevel * 50;
      setTractor((t) => ({ ...t, maxFuel: newMaxFuel, fuel: newMaxFuel }));
    } else if (nodeId === 'logistik_ekspansi') {
      const newSize = getIslandSizeForLevel(nextLevel);
      const nextGrid = createInitialGrid(newSize);
      // Preserve existing crops/soil states on interior tiles when expanding the island
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

  // Keyboard Shortcuts (Title Screen Enter/Space & Esc Pause/Close Modal)
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

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none">
      {/* 1. Full-Viewport 3D Floating Sky Island & Composite Tractor Scene */}
      <FarmViewport3D
        tiles={tiles}
        tractor={tractor}
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
              viewBox="0 0 520 110"
              className="w-full max-w-[460px] h-auto drop-shadow-lg"
              aria-label="AgroCode"
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
                fontSize="58"
                letterSpacing="2"
              >
                AGROCODE
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
              Tulis kode Python untuk mengendalikan traktor di atas pulau ladang melayang, memanen komoditas, dan membuka Pohon Teknologi.
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

      {/* 3. ACTIVE GAMEPLAY HUD */}
      {screen !== 'title' && (
        <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-3.5">
          <div className="flex items-start justify-between gap-3">
            {/* Top-Left: Compact Tractor Fuel, Tool & Barn Resources */}
            <div className="pointer-events-auto flex flex-col gap-1.5 bg-[#232527]/95 border border-[#4E5358] rounded-md px-3.5 py-2.5 shadow-lg">
              <div className="flex items-center gap-3 text-xs font-mono-code">
                <span className="font-display font-bold text-white tracking-tight text-sm">
                  AGROCODE
                </span>
                <span className="text-[#8B929A]">·</span>
                <span
                  className={
                    tractor.fuel < 25 ? 'text-[#FF7B72] font-bold' : 'text-[#E5A93C] font-semibold'
                  }
                >
                  fuel: {Math.round(tractor.fuel)}/{tractor.maxFuel}L
                </span>
                <span className="text-[#8B929A]">·</span>
                <span className="text-[#A8E040]">
                  tool: "{TOOL_TO_EN[tractor.implement]}"
                </span>
                <span className="text-[#8B929A]">·</span>
                <span className="text-[#D0D6DC]">
                  cargo: {getTotalCargo(tractor.cargo)}/{tractor.maxCargo}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono-code text-[#D8DEE4] pt-1 border-t border-[#383C40]">
                <span className="text-[#9DA5AE]">Barn:</span>
                <span>Wheat {warehouse.jerami}</span>
                <span aria-hidden="true">·</span>
                <span>Carrot {warehouse.wortel}</span>
                <span aria-hidden="true">·</span>
                <span>Wood {warehouse.kayu}</span>
                <span aria-hidden="true">·</span>
                <span>Corn {warehouse.jagung}</span>
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
          onAddScript={() => {
            const nextNum = scripts.length + 1;
            const newId = `script_${nextNum}`;
            setScripts((prev) => [
              ...prev,
              {
                id: newId,
                name: newId,
                code: `# ${newId}\nmove(1)\n`,
              },
            ]);
            setActiveScriptId(newId);
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
              pos=({tractor.x}, {tractor.z}) · fuel={Math.round(tractor.fuel)}/{tractor.maxFuel}L
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
                  const resetGrid = createInitialGrid(getIslandSizeForLevel(expandLv));
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
