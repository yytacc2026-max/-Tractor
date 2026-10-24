export type Direction = 'utara' | 'timur' | 'selatan' | 'barat';

export type TerrainType =
  | 'tanah'
  | 'lumpur'
  | 'pom_bensin'
  | 'gudang';

export type SoilState = 'liar' | 'dibajak' | 'ditanam' | 'siap_panen';

export type CropType = 'jerami' | 'kayu' | 'wortel' | 'jagung';

export type ResourceType = 'jerami' | 'kayu' | 'wortel' | 'jagung';

export type ImplementType =
  | 'kosong'
  | 'bajak'
  | 'penabur'
  | 'pemanen'
  | 'pengangkut';

export interface TileData {
  x: number;
  z: number;
  terrain: TerrainType;
  soilState: SoilState;
  crop: CropType | null;
  growth: number; // 0.0 to 1.0
}

export interface Inventory {
  jerami: number;
  kayu: number;
  wortel: number;
  jagung: number;
}

export interface TractorState {
  x: number;
  z: number;
  direction: Direction;
  fuel: number;
  maxFuel: number;
  implement: ImplementType;
  cargo: Inventory;
  maxCargo: number;
  isMoving: boolean;
  statusMessage: string;
}

export type TechBranch = 'kode' | 'alat' | 'logistik';

export interface TechCost {
  resource: ResourceType;
  amount: number;
}

export type NodeVisualKind =
  | 'code'
  | 'wheat'
  | 'tractor_speed'
  | 'grid_expand'
  | 'carrot'
  | 'fuel_tank'
  | 'wood_tree'
  | 'trailer'
  | 'corn'
  | 'autopilot';

export interface TechNode {
  id: string;
  branch: TechBranch;
  title: string;
  subtitle: string;
  description: string;
  syntaxBadge: string;
  visualKind: NodeVisualKind;
  unlocked: boolean;
  level: number;
  maxLevel: number;
  costs: TechCost[];
  prerequisiteId?: string;
  // Grid coordinates for the visual node tree
  treeX: number;
  treeY: number;
}

export interface ScriptTab {
  id: string;
  name: string;
  code: string;
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: string;
  type: 'info' | 'print' | 'warn' | 'error' | 'action';
  message: string;
  line?: number;
}

export type GameShellScreen = 'title' | 'playing' | 'paused';
