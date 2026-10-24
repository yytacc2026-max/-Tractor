import { TechNode, TechCost, ScriptTab } from '../types/game';

/**
 * Computes the resource cost required to upgrade a node from `node.level` to `node.level + 1`.
 * For single-level nodes (maxLevel === 1), returns the base cost.
 * For multi-level nodes (maxLevel > 1), scales cost smoothly with current level.
 */
export function getUpgradeCostsForNode(node: TechNode): TechCost[] {
  if (node.level >= node.maxLevel) return [];
  if (node.maxLevel === 1) return node.costs;
  const multiplier = node.level === 0 ? 1 : 1 + Math.floor(node.level * 0.6);
  return node.costs.map((c) => ({
    resource: c.resource,
    amount: Math.max(1, Math.round(c.amount * multiplier)),
  }));
}

/**
 * Maps Island Expansion level (0..10) to grid dimension N (NxN).
 * Level 0/10 -> 4x4
 * Level 1/10 -> 6x6 (as requested by user: "upgrade pulau nya jadi 1/10 atau level 1 pulau nya 6x6 dan seterus nya")
 * Level 2/10 -> 7x7
 * Level 3/10 -> 8x8
 * ...
 * Level 10/10 -> 15x15
 */
export function getIslandSizeForLevel(level: number): number {
  if (level <= 0) return 4;
  return 5 + level; // level 1 => 6x6, level 2 => 7x7, ..., level 10 => 15x15
}

export const INITIAL_TECH_NODES: TechNode[] = [
  // ROW 0 (Root Node at Top Center — 'while' syntax unlock, maxLevel = 1)
  {
    id: 'kode_while',
    branch: 'kode',
    title: 'While Loop',
    subtitle: 'Continuous Automation',
    description: 'Mengulang blok kode tanpa henti selama kondisi bernilai True (while True:).',
    syntaxBadge: 'while',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [{ resource: 'jerami', amount: 4 }],
    treeX: 480,
    treeY: 50,
  },

  // ROW 1 (Tractor Speed 1/5, Wheat Yield 1/10, Basic Python API)
  {
    id: 'alat_dasar',
    branch: 'alat',
    title: 'Kecepatan & Alat Traktor',
    subtitle: 'Upgrade Level (1/5 -> 5/5)',
    description: 'Meningkatkan kecepatan gerak dan kerja alat tempel traktor (+25% kecepatan per level).',
    syntaxBadge: 'plow() · harvest()',
    visualKind: 'tractor_speed',
    unlocked: true,
    level: 1,
    maxLevel: 5,
    costs: [{ resource: 'jerami', amount: 4 }],
    prerequisiteId: 'kode_while',
    treeX: 340,
    treeY: 175,
  },
  {
    id: 'logistik_dasar',
    branch: 'logistik',
    title: 'Produksi Panen Gandum',
    subtitle: 'Upgrade Level (1/10 -> 10/10)',
    description: 'Meningkatkan jumlah hasil panen Gandum ("wheat") +1 per level serta mempercepat tumbuh gandum.',
    syntaxBadge: 'plant("wheat")',
    visualKind: 'wheat',
    unlocked: true,
    level: 1,
    maxLevel: 10,
    costs: [{ resource: 'jerami', amount: 4 }],
    prerequisiteId: 'kode_while',
    treeX: 480,
    treeY: 175,
  },
  {
    id: 'kode_dasar',
    branch: 'kode',
    title: 'Basic Python API',
    subtitle: 'Sequential Commands',
    description: 'Perintah dasar Python untuk menggerakkan traktor: move(), turn(), plow(), plant(), harvest().',
    syntaxBadge: 'move(1)',
    visualKind: 'code',
    unlocked: true,
    level: 1,
    maxLevel: 1,
    costs: [],
    prerequisiteId: 'kode_while',
    treeX: 620,
    treeY: 175,
  },

  // ROW 2 (Ekspansi Pulau 0/10, Navigasi Rute Pintar, Conditional Logic if/else)
  {
    id: 'logistik_ekspansi',
    branch: 'logistik',
    title: 'Ekspansi Pulau Ladang',
    subtitle: 'Upgrade Level (0/10 -> 10/10)',
    description: 'Memperluas ukuran pulau ladang melayang: Lv.0 (4x4), Lv.1 (6x6), Lv.2 (7x7), Lv.3 (8x8) hingga Lv.10 (15x15).',
    syntaxBadge: 'get_world_size()',
    visualKind: 'grid_expand',
    unlocked: false,
    level: 0,
    maxLevel: 10,
    costs: [{ resource: 'jerami', amount: 6 }],
    prerequisiteId: 'logistik_dasar',
    treeX: 360,
    treeY: 310,
  },
  {
    id: 'logistik_autopilot',
    branch: 'logistik',
    title: 'Navigasi Rute Pintar',
    subtitle: 'go_to_fuel() & go_to_barn()',
    description: 'Traktor dapat menavigasi otomatis menuju Pom Bensin (0,0) atau Gudang terdekat.',
    syntaxBadge: 'go_to_fuel()',
    visualKind: 'autopilot',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [{ resource: 'jerami', amount: 5 }],
    prerequisiteId: 'logistik_dasar',
    treeX: 480,
    treeY: 310,
  },
  {
    id: 'kode_if',
    branch: 'kode',
    title: 'Conditional Logic',
    subtitle: 'if / elif / else',
    description: 'Memeriksa kondisi ladang atau bahan bakar sebelum bertindak (if can_harvest():).',
    syntaxBadge: 'if / else',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [{ resource: 'jerami', amount: 5 }],
    prerequisiteId: 'logistik_dasar',
    treeX: 620,
    treeY: 310,
  },

  // ROW 3 (Carrot Mastery 0/10, print(), For Loop)
  {
    id: 'alat_wortel_kayu',
    branch: 'alat',
    title: 'Bibit & Panen Wortel',
    subtitle: 'Upgrade Level (0/10 -> 10/10)',
    description: 'Lv.1 membuka bibit Wortel ("carrot") & Kayu ("wood"). Upgrade level berikutnya menambah hasil panen Wortel +1 per level.',
    syntaxBadge: 'plant("carrot")',
    visualKind: 'carrot',
    unlocked: false,
    level: 0,
    maxLevel: 10,
    costs: [{ resource: 'jerami', amount: 6 }],
    prerequisiteId: 'logistik_ekspansi',
    treeX: 330,
    treeY: 445,
  },
  {
    id: 'kode_print',
    branch: 'kode',
    title: 'Console Output',
    subtitle: 'print() & status()',
    description: 'Mencetak hasil sensor check_soil() dan status traktor ke konsol editor.',
    syntaxBadge: 'print()',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [{ resource: 'wortel', amount: 4 }],
    prerequisiteId: 'kode_if',
    treeX: 545,
    treeY: 445,
  },
  {
    id: 'kode_for',
    branch: 'kode',
    title: 'For Loop & Range',
    subtitle: 'for i in range(n):',
    description: 'Mengulangi perintah secara terukur menggunakan for loop dan fungsi range().',
    syntaxBadge: 'for i in range():',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [
      { resource: 'jerami', amount: 6 },
      { resource: 'wortel', amount: 4 },
    ],
    prerequisiteId: 'kode_if',
    treeX: 730,
    treeY: 445,
  },

  // ROW 4 (Fuel Tank 0/8, Wood & Cargo Mastery 0/10)
  {
    id: 'alat_tangki_besar',
    branch: 'alat',
    title: 'Kapasitas Tangki Solar',
    subtitle: 'Upgrade Level (0/8 -> 8/8)',
    description: 'Menambah kapasitas tangki solar traktor sebesar +50 Liter di setiap level (100L hingga 500L).',
    syntaxBadge: 'max_fuel +50L',
    visualKind: 'fuel_tank',
    unlocked: false,
    level: 0,
    maxLevel: 8,
    costs: [
      { resource: 'wortel', amount: 5 },
      { resource: 'kayu', amount: 3 },
    ],
    prerequisiteId: 'alat_wortel_kayu',
    treeX: 250,
    treeY: 580,
  },
  {
    id: 'alat_pengangkut',
    branch: 'alat',
    title: 'Budidaya Kayu & Kargo',
    subtitle: 'Upgrade Level (0/10 -> 10/10)',
    description: 'Meningkatkan hasil panen Pohon Kayu ("wood") +1 dan kapasitas muatan kargo traktor +5 di setiap level.',
    syntaxBadge: 'plant("wood")',
    visualKind: 'wood_tree',
    unlocked: false,
    level: 0,
    maxLevel: 10,
    costs: [
      { resource: 'jerami', amount: 6 },
      { resource: 'wortel', amount: 4 },
    ],
    prerequisiteId: 'alat_wortel_kayu',
    treeX: 395,
    treeY: 580,
  },

  // ROW 5 (Corn Mastery 0/10, Python Lists, Python Functions def)
  {
    id: 'alat_jagung',
    branch: 'alat',
    title: 'Bibit & Panen Jagung',
    subtitle: 'Upgrade Level (0/10 -> 10/10)',
    description: 'Lv.1 membuka bibit Jagung ("corn"). Upgrade level berikutnya meningkatkan hasil panen Jagung +1 per level.',
    syntaxBadge: 'plant("corn")',
    visualKind: 'corn',
    unlocked: false,
    level: 0,
    maxLevel: 10,
    costs: [
      { resource: 'wortel', amount: 6 },
      { resource: 'kayu', amount: 4 },
    ],
    prerequisiteId: 'alat_pengangkut',
    treeX: 395,
    treeY: 715,
  },
  {
    id: 'kode_list',
    branch: 'kode',
    title: 'Python List',
    subtitle: 'seeds = ["wheat", "corn"]',
    description: 'Menyimpan daftar komoditas tanaman atau rute di dalam struktur data list [...].',
    syntaxBadge: '[1,2,3]',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [
      { resource: 'wortel', amount: 6 },
      { resource: 'kayu', amount: 4 },
    ],
    prerequisiteId: 'kode_for',
    treeX: 660,
    treeY: 580,
  },
  {
    id: 'kode_def',
    branch: 'kode',
    title: 'Custom Functions',
    subtitle: 'def work_tile():',
    description: 'Mendefinisikan fungsi Python sendiri dengan kata kunci def.',
    syntaxBadge: 'def f():',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [
      { resource: 'kayu', amount: 6 },
      { resource: 'jagung', amount: 4 },
    ],
    prerequisiteId: 'kode_for',
    treeX: 800,
    treeY: 580,
  },

  // ROW 6 (Random Module — uses Corn & Wood, NO Stone/Batu!)
  {
    id: 'kode_random',
    branch: 'kode',
    title: 'Random Module',
    subtitle: 'import random',
    description: 'Membuka import random dan random.choice() untuk menanam variasi tanaman secara acak.',
    syntaxBadge: 'import random',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [
      { resource: 'jagung', amount: 8 },
      { resource: 'kayu', amount: 6 },
    ],
    prerequisiteId: 'kode_def',
    treeX: 800,
    treeY: 715,
  },
];

export const INITIAL_SCRIPTS: ScriptTab[] = [
  {
    id: 'main',
    name: 'main',
    code: `# Press Play (▶) or Step (▷) to run Python code
harvest()
plow()
plant("wheat")
move(1)
turn("right")
`,
  },
  {
    id: 'auto_farm',
    name: 'auto_farm',
    code: `# Requires 'while', 'if', and 'go_to_fuel()' unlocked in Tech Tree (^)
while True:
    if tractor.fuel < 25:
        tractor.go_to_fuel()
        tractor.refuel()
    if tractor.cargo >= 8:
        tractor.go_to_barn()
        tractor.deliver()
    if can_harvest():
        tractor.harvest()
    if check_soil() == "wild":
        tractor.plow()
        tractor.plant("wheat")
    elif check_soil() == "plowed":
        tractor.plant("wheat")
    tractor.move(1)
    if tractor.x == get_world_size() - 1 or tractor.x == 0:
        tractor.turn("right")
`,
  },
  {
    id: 'grid_sweep',
    name: 'grid_sweep',
    code: `# Requires 'for', 'list', and 'def' unlocked in Tech Tree (^)
def work_tile(seed_name):
    if can_harvest():
        harvest()
    if check_soil() == "wild":
        plow()
    if check_soil() == "plowed":
        plant(seed_name)

seeds = ["wheat", "carrot", "corn", "wood"]

for i in range(4):
    work_tile(seeds[i % 4])
    move(1)
    turn("right")
`,
  },
];
