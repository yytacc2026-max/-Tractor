import { TechNode, TechCost, ScriptTab } from '../types/game';

/**
 * Computes the resource cost required to upgrade a node from `node.level` to `node.level + 1`.
 */
export function getUpgradeCostsForNode(node: TechNode): TechCost[] {
  if (node.level >= node.maxLevel) return [];
  if (node.maxLevel === 1) return node.costs;
  const multiplier = node.level === 0 ? 1 : 1 + Math.floor(node.level * 0.65);
  return node.costs.map((c) => ({
    resource: c.resource,
    amount: Math.max(1, Math.round(c.amount * multiplier)),
  }));
}

/**
 * Maps Island Expansion level (0..12) to grid dimension N (NxN).
 * Each upgrade level adds +2 to both width and length for much larger island expansion!
 * Level 0/12 -> 4x4 (16 tiles)
 * Level 1/12 -> 6x6 (36 tiles)
 * Level 2/12 -> 8x8 (64 tiles)
 * Level 3/12 -> 10x10 (100 tiles)
 * Level 4/12 -> 12x12 (144 tiles)
 * Level 5/12 -> 14x14 (196 tiles)
 * Level 6/12 -> 16x16 (256 tiles)
 * ...
 * Level 12/12 -> 28x28 (784 tiles)
 */
export function getIslandSizeForLevel(level: number): number {
  if (level <= 0) return 4;
  return 4 + level * 2;
}

export const INITIAL_TECH_NODES: TechNode[] = [
  // ================= ROW 0 (Root Node at Top Center: 'while') =================
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
    treeX: 540,
    treeY: 40,
  },

  // ================= ROW 1 (Multi-Tractor Fleet 1/4, Tractor Speed 1/5, Wheat Yield 1/10, Basic API) =================
  {
    id: 'alat_multi_traktor',
    branch: 'alat',
    title: 'Armada Multi-Traktor',
    subtitle: 'Upgrade Level (1/4 -> 4/4 Traktor)',
    description:
      'Menambah jumlah objek traktor 3D di pulau ladang (hingga 4 traktor). Setiap traktor dikendalikan lewat kode Python menggunakan use_tractor(i) atau tractors[i].move(1).',
    syntaxBadge: 'use_tractor(i)',
    visualKind: 'multi_tractor',
    unlocked: true,
    level: 1,
    maxLevel: 4,
    costs: [
      { resource: 'jerami', amount: 8 },
      { resource: 'kayu', amount: 4 },
    ],
    prerequisiteId: 'kode_while',
    treeX: 350,
    treeY: 165,
  },
  {
    id: 'alat_dasar',
    branch: 'alat',
    title: 'Kecepatan & Alat Traktor',
    subtitle: 'Upgrade Level (1/5 -> 5/5)',
    description: 'Meningkatkan kecepatan gerak dan kerja seluruh traktor (+25% kecepatan per level).',
    syntaxBadge: 'plow() · harvest()',
    visualKind: 'tractor_speed',
    unlocked: true,
    level: 1,
    maxLevel: 5,
    costs: [{ resource: 'jerami', amount: 4 }],
    prerequisiteId: 'kode_while',
    treeX: 480,
    treeY: 165,
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
    treeX: 610,
    treeY: 165,
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
    treeX: 740,
    treeY: 165,
  },

  // ================= ROW 2 (Ekspansi Pulau Besar 0/12, Autopilot Navigation, Conditional Logic if/else) =================
  {
    id: 'logistik_ekspansi',
    branch: 'logistik',
    title: 'Ekspansi Pulau Ladang',
    subtitle: 'Upgrade Level (0/12 -> 12/12)',
    description:
      'Memperluas ukuran pulau ladang melayang (+2x2 tiap level): Lv.0 (4x4), Lv.1 (6x6), Lv.2 (8x8), Lv.3 (10x10), Lv.4 (12x12) hingga Lv.12 (28x28)!',
    syntaxBadge: 'get_world_size()',
    visualKind: 'grid_expand',
    unlocked: false,
    level: 0,
    maxLevel: 12,
    costs: [{ resource: 'jerami', amount: 6 }],
    prerequisiteId: 'alat_dasar',
    treeX: 415,
    treeY: 295,
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
    prerequisiteId: 'alat_dasar',
    treeX: 545,
    treeY: 295,
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
    prerequisiteId: 'kode_dasar',
    treeX: 740,
    treeY: 295,
  },

  // ================= ROW 3 (Carrot Mastery 0/10, print(), Operators 1 + 1) =================
  {
    id: 'alat_wortel_kayu',
    branch: 'alat',
    title: 'Bibit & Panen Wortel',
    subtitle: 'Upgrade Level (0/10 -> 10/10)',
    description:
      'Lv.1 membuka bibit Wortel ("carrot") & Kayu ("wood"). Upgrade level berikutnya menambah hasil panen Wortel +1 per level.',
    syntaxBadge: 'plant("carrot")',
    visualKind: 'carrot',
    unlocked: false,
    level: 0,
    maxLevel: 10,
    costs: [{ resource: 'jerami', amount: 6 }],
    prerequisiteId: 'logistik_autopilot',
    treeX: 350,
    treeY: 425,
  },
  {
    id: 'kode_print',
    branch: 'kode',
    title: 'Console Output',
    subtitle: 'print() & status()',
    description: 'Mencetak hasil sensor check_soil(), measure(), dan status traktor ke konsol editor.',
    syntaxBadge: 'print()',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [{ resource: 'jerami', amount: 6 }],
    prerequisiteId: 'logistik_autopilot',
    treeX: 545,
    treeY: 425,
  },
  {
    id: 'kode_operator',
    branch: 'kode',
    title: 'Operators & Arithmetic',
    subtitle: '1 + 1 · % · and · or',
    description: 'Membuka ekspresi matematika (+, -, *, //, %) dan operator logika gabungan (and, or, not).',
    syntaxBadge: '1 + 1',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [{ resource: 'jerami', amount: 6 }],
    prerequisiteId: 'kode_if',
    treeX: 790,
    treeY: 425,
  },

  // ================= ROW 4 (Fuel Tank 0/8, Wood & Cargo 0/10, set_speed(), get_time(), (x,y), a = 2) =================
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
    treeX: 255,
    treeY: 560,
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
    treeY: 560,
  },
  {
    id: 'kode_speed_time',
    branch: 'kode',
    title: 'Speed Control API',
    subtitle: 'set_speed(multiplier)',
    description: 'Mengatur kecepatan simulasi traktor langsung dari skrip Python menggunakan set_speed(1..5).',
    syntaxBadge: 'set_speed()',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [{ resource: 'wortel', amount: 5 }],
    prerequisiteId: 'kode_print',
    treeX: 505,
    treeY: 560,
  },
  {
    id: 'kode_get_time',
    branch: 'kode',
    title: 'Time & Crop Sensor',
    subtitle: 'get_time() & measure()',
    description: 'Membaca waktu jalannya simulasi dengan get_time() dan persentase tumbuh tanaman (0..100) dengan measure().',
    syntaxBadge: 'get_time()',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [{ resource: 'wortel', amount: 5 }],
    prerequisiteId: 'kode_print',
    treeX: 620,
    treeY: 560,
  },
  {
    id: 'kode_tuple_coord',
    branch: 'kode',
    title: 'Coordinates & Goto',
    subtitle: '(x, y) · goto(x, z)',
    description: 'Membaca koordinat get_pos_x(), get_pos_y() serta berpindah langsung ke petak target menggunakan goto(x, z).',
    syntaxBadge: '(x,y)',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [
      { resource: 'jerami', amount: 6 },
      { resource: 'wortel', amount: 4 },
    ],
    prerequisiteId: 'kode_operator',
    treeX: 735,
    treeY: 560,
  },
  {
    id: 'kode_variabel',
    branch: 'kode',
    title: 'Variables & Assignment',
    subtitle: 'a = 2 · a += 1',
    description: 'Menyimpan angka, teks, atau koordinat ke dalam variabel Python serta mendukung +=, -=, dan *=.',
    syntaxBadge: 'a = 2',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [
      { resource: 'jerami', amount: 6 },
      { resource: 'wortel', amount: 4 },
    ],
    prerequisiteId: 'kode_operator',
    treeX: 850,
    treeY: 560,
  },

  // ================= ROW 5 (Pupuk Organik 0/8, Corn Mastery 0/10, for loop, [1,2,3], def f():) =================
  {
    id: 'alat_pupuk',
    branch: 'alat',
    title: 'Pupuk Instan & Kesuburan',
    subtitle: 'Upgrade Level (0/8 -> 8/8)',
    description:
      'Membuka fungsi fertilize() agar tanaman langsung matang seketika dan mempercepat tumbuh alami seluruh tanaman +20% per level.',
    syntaxBadge: 'fertilize()',
    visualKind: 'fertilizer',
    unlocked: false,
    level: 0,
    maxLevel: 8,
    costs: [
      { resource: 'wortel', amount: 6 },
      { resource: 'kayu', amount: 4 },
    ],
    prerequisiteId: 'alat_tangki_besar',
    treeX: 255,
    treeY: 695,
  },
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
    treeY: 695,
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
      { resource: 'wortel', amount: 6 },
      { resource: 'kayu', amount: 4 },
    ],
    prerequisiteId: 'kode_get_time',
    treeX: 620,
    treeY: 695,
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
    prerequisiteId: 'kode_variabel',
    treeX: 735,
    treeY: 695,
  },
  {
    id: 'kode_def',
    branch: 'kode',
    title: 'Custom Functions',
    subtitle: 'def work_tile():',
    description: 'Mendefinisikan fungsi Python sendiri dengan kata kunci def dan parameter.',
    syntaxBadge: 'def f():',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [
      { resource: 'kayu', amount: 6 },
      { resource: 'wortel', amount: 6 },
    ],
    prerequisiteId: 'kode_variabel',
    treeX: 850,
    treeY: 695,
  },

  // ================= ROW 6 (Irigasi & Reklamasi Lumpur 0/6, Fleet API, Dict {1:2}, import random) =================
  {
    id: 'logistik_irigasi',
    branch: 'logistik',
    title: 'Irigasi & Reklamasi Tanah',
    subtitle: 'Upgrade Level (0/6 -> 6/6)',
    description:
      'Mengubah petak lumpur menjadi tanah subur serta memberi peluang tanah tetap terbajak otomatis seusai dipanen.',
    syntaxBadge: 'auto_plow',
    visualKind: 'irrigation',
    unlocked: false,
    level: 0,
    maxLevel: 6,
    costs: [
      { resource: 'kayu', amount: 6 },
      { resource: 'jagung', amount: 4 },
    ],
    prerequisiteId: 'alat_pupuk',
    treeX: 255,
    treeY: 830,
  },
  {
    id: 'kode_fleet_api',
    branch: 'kode',
    title: 'Multi-Tractor Python API',
    subtitle: 'tractors[i] & use_tractor(i)',
    description:
      'Mengendalikan setiap unit traktor secara spesifik dari kode Python: use_tractor(1), tractors[1].move(1), num_tractors(), dan clear().',
    syntaxBadge: 'tractors[i]',
    visualKind: 'trophy',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [
      { resource: 'kayu', amount: 6 },
      { resource: 'jagung', amount: 4 },
    ],
    prerequisiteId: 'kode_for',
    treeX: 620,
    treeY: 830,
  },
  {
    id: 'kode_dict',
    branch: 'kode',
    title: 'Python Dictionaries',
    subtitle: 'plan = {"x": 0, "seed": "corn"}',
    description: 'Menyimpan pemetaan pasangan key-value menggunakan struktur data dictionary {k: v}.',
    syntaxBadge: '{1:2}',
    visualKind: 'code',
    unlocked: false,
    level: 0,
    maxLevel: 1,
    costs: [
      { resource: 'kayu', amount: 6 },
      { resource: 'jagung', amount: 6 },
    ],
    prerequisiteId: 'kode_list',
    treeX: 735,
    treeY: 830,
  },
  {
    id: 'kode_random',
    branch: 'kode',
    title: 'Random Module',
    subtitle: 'import random',
    description: 'Membuka import random, random.choice(), dan random.randint() untuk menanam variasi tanaman secara acak.',
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
    treeX: 850,
    treeY: 830,
  },
];

export const INITIAL_SCRIPTS: ScriptTab[] = [
  {
    id: 'main',
    name: 'main',
    isOpen: true,
    isMinimized: false,
    x: 20,
    y: 80,
    zIndex: 32,
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
    isOpen: true,
    isMinimized: true,
    x: 20,
    y: 448,
    zIndex: 31,
    code: `# Continuous loop automation
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
    id: 'multi_tractor',
    name: 'multi_tractor',
    isOpen: true,
    isMinimized: true,
    x: 20,
    y: 492,
    zIndex: 30,
    code: `# Control multiple tractors using Python code (Unlock 'Armada Multi-Traktor')
for i in range(num_tractors()):
    use_tractor(i)
    if can_harvest():
        harvest()
    plow()
    plant("wheat")
    move(1)
`,
  },
];
