import React, { useState, useRef, useEffect } from 'react';
import { Inventory, NodeVisualKind, TechNode, TractorState } from '../types/game';
import { getIslandSizeForLevel, getUpgradeCostsForNode } from '../data/techTreeData';

interface TechTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: TechNode[];
  inventory: Inventory;
  onUnlockNode: (nodeId: string) => void;
}

const RESOURCE_LABELS: Record<keyof Inventory, string> = {
  jerami: 'Wheat',
  kayu: 'Wood',
  wortel: 'Carrot',
  jagung: 'Corn',
};

// Bespoke Isometric / 3D-Styled Resource & Node SVGs matching the reference Tech Tree UI
function renderResourceIcon(kind: keyof Inventory) {
  switch (kind) {
    case 'jerami':
      return (
        <svg viewBox="0 0 36 36" className="w-8 h-8 drop-shadow">
          <path d="M8 24 L18 29 L28 24 L28 14 L18 9 L8 14 Z" fill="#C89632" />
          <path d="M8 14 L18 19 L28 14 L18 9 Z" fill="#E9C45A" />
          <path d="M18 19 L28 14 L28 24 L18 29 Z" fill="#9E721E" />
        </svg>
      );
    case 'kayu':
      return (
        <svg viewBox="0 0 36 36" className="w-8 h-8 drop-shadow">
          <path d="M7 22 L23 11 L29 17 L13 28 Z" fill="#7D4925" />
          <ellipse cx="10" cy="25" rx="4" ry="4" fill="#C68B59" stroke="#5A3216" strokeWidth="1.5" />
          <path d="M12 16 L26 7 L30 12 L16 21 Z" fill="#683B1C" />
        </svg>
      );
    case 'wortel':
      return (
        <svg viewBox="0 0 36 36" className="w-8 h-8 drop-shadow">
          <path d="M18 6 L23 11 L19 14 L14 9 Z" fill="#5CB83C" />
          <path d="M13 13 L23 13 L18 30 Z" fill="#EE7B22" />
          <path d="M18 13 L23 13 L18 30 Z" fill="#C95E12" />
        </svg>
      );
    case 'jagung':
      return (
        <svg viewBox="0 0 36 36" className="w-8 h-8 drop-shadow">
          <ellipse cx="18" cy="18" rx="7" ry="11" fill="#F4C430" />
          <path d="M11 19 C11 27, 18 31, 18 31 C18 31, 25 27, 25 19 L21 23 L18 17 L15 23 Z" fill="#549E32" />
        </svg>
      );
  }
}

function renderNodeCenterVisual(kind: NodeVisualKind, syntaxBadge: string) {
  if (kind === 'code') {
    if (syntaxBadge === 'while') {
      return <span className="font-mono-code text-xs font-semibold text-[#C678DD]">while</span>;
    }
    if (syntaxBadge === 'move(1)') {
      return (
        <span className="font-mono-code text-xs font-semibold">
          <span className="text-[#E5C07B]">move</span>
          <span className="text-white">(</span>
          <span className="text-[#56B6C2]">1</span>
          <span className="text-white">)</span>
        </span>
      );
    }
    if (syntaxBadge === 'if / else') {
      return (
        <span className="font-mono-code text-xs font-semibold">
          <span className="text-[#C678DD]">if</span>
          <span className="text-white"> / </span>
          <span className="text-[#C678DD]">else</span>
        </span>
      );
    }
    if (syntaxBadge === 'print()') {
      return (
        <span className="font-mono-code text-xs font-semibold">
          <span className="text-[#61AFEF]">print</span>
          <span className="text-white">()</span>
        </span>
      );
    }
    if (syntaxBadge === 'for i in range():') {
      return (
        <span className="font-mono-code text-[11px] font-semibold">
          <span className="text-[#C678DD]">for</span>
          <span className="text-white"> i </span>
          <span className="text-[#C678DD]">in</span>
          <span className="text-[#61AFEF]"> range</span>
          <span className="text-white">()</span>
        </span>
      );
    }
    if (syntaxBadge === '[1,2,3]') {
      return (
        <span className="font-mono-code text-xs font-semibold">
          <span className="text-white">[</span>
          <span className="text-[#56B6C2]">1</span>
          <span className="text-white">,</span>
          <span className="text-[#56B6C2]">2</span>
          <span className="text-white">,</span>
          <span className="text-[#56B6C2]">3</span>
          <span className="text-white">]</span>
        </span>
      );
    }
    if (syntaxBadge === 'def f():') {
      return (
        <span className="font-mono-code text-xs font-semibold">
          <span className="text-[#C678DD]">def</span>
          <span className="text-white"> f():</span>
        </span>
      );
    }
    if (syntaxBadge === 'import random') {
      return (
        <span className="font-mono-code text-xs font-semibold">
          <span className="text-[#C678DD]">import</span>
          <span className="text-[#E5C07B]"> random</span>
        </span>
      );
    }
    return <span className="font-mono-code text-xs text-white">{syntaxBadge}</span>;
  }

  switch (kind) {
    case 'wheat':
      return (
        <svg viewBox="0 0 44 44" className="w-10 h-10">
          <path d="M12 34 L16 12 M18 35 L20 10 M24 35 L25 11 M30 34 L31 13" stroke="#E2B84B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M14 28 L30 28" stroke="#A67622" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'tractor_speed':
      return (
        <svg viewBox="0 0 44 44" className="w-10 h-10">
          <rect x="12" y="18" width="18" height="10" rx="2" fill="#D99226" />
          <rect x="20" y="11" width="10" height="8" rx="1" fill="#658B1E" />
          <circle cx="16" cy="29" r="5" fill="#1C1E20" stroke="#E8B948" strokeWidth="2.5" />
          <circle cx="28" cy="30" r="3.5" fill="#1C1E20" stroke="#E8B948" strokeWidth="2" />
        </svg>
      );
    case 'autopilot':
      return (
        <svg viewBox="0 0 44 44" className="w-10 h-10">
          <circle cx="18" cy="22" r="6" fill="#658B1E" />
          <circle cx="26" cy="20" r="5" fill="#84B038" />
          <circle cx="23" cy="26" r="5" fill="#4F7D28" />
        </svg>
      );
    case 'grid_expand':
      return (
        <svg viewBox="0 0 44 44" className="w-10 h-10">
          <path d="M10 22 L22 15 L34 22 L22 29 Z" fill="#729632" />
          <path d="M10 22 L22 29 L22 35 L10 28 Z" fill="#C28340" />
          <path d="M34 22 L22 29 L22 35 L34 28 Z" fill="#9C622B" />
        </svg>
      );
    case 'carrot':
      return (
        <svg viewBox="0 0 44 44" className="w-10 h-10">
          <path d="M16 14 L21 14 L18 32 Z" fill="#EE7B22" />
          <path d="M23 15 L28 15 L25 32 Z" fill="#D96514" />
          <path d="M16 14 L14 9 M19 14 L20 8 M25 15 L24 9 M27 15 L29 10" stroke="#5CB83C" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'fuel_tank':
      return (
        <svg viewBox="0 0 44 44" className="w-10 h-10">
          <ellipse cx="22" cy="14" rx="8" ry="4" fill="#3D7A5A" stroke="#7E522B" strokeWidth="2" />
          <path d="M14 14 L14 29 C14 32, 30 32, 30 29 L30 14 Z" fill="#8C5828" />
          <ellipse cx="22" cy="14" rx="6" ry="3" fill="#2A6E4D" />
        </svg>
      );
    case 'wood_tree':
      return (
        <svg viewBox="0 0 44 44" className="w-10 h-10">
          <rect x="20" y="24" width="4" height="10" fill="#6E4726" />
          <circle cx="22" cy="18" r="8" fill="#5E8C2A" />
          <circle cx="18" cy="20" r="5" fill="#76A838" />
        </svg>
      );
    case 'corn':
      return (
        <svg viewBox="0 0 44 44" className="w-10 h-10">
          <ellipse cx="22" cy="21" rx="6" ry="10" fill="#F5C73D" />
          <path d="M15 22 C15 30, 22 33, 22 33 C22 33, 29 30, 29 22 L25 26 L22 19 L19 26 Z" fill="#5C9C30" />
        </svg>
      );
    default:
      return null;
  }
}

export const TechTreeModal: React.FC<TechTreeModalProps> = ({
  isOpen,
  onClose,
  nodes,
  inventory,
  onUnlockNode,
}) => {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('logistik_ekspansi');

  // Mouse drag-to-pan state (No browser scrollbars / sliders!)
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ startX: number; startY: number; panX: number; panY: number; moved: boolean }>({
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
    moved: false,
  });

  // Center the tree canvas nicely when opened
  useEffect(() => {
    if (isOpen) {
      const centerOffsetX = Math.round((window.innerWidth - 1060) / 2);
      const centerOffsetY = Math.max(16, Math.round((window.innerHeight - 860) / 2));
      setPan({ x: centerOffsetX, y: centerOffsetY });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isPrerequisiteMet = (node: TechNode) => {
    if (!node.prerequisiteId) return true;
    const pre = nodes.find((n) => n.id === node.prerequisiteId);
    return pre ? pre.unlocked || pre.level > 0 : true;
  };

  const canUpgradeOrUnlock = (node: TechNode) => {
    if (node.level >= node.maxLevel) return false;
    if (!isPrerequisiteMet(node)) return false;
    const currentCosts = getUpgradeCostsForNode(node);
    return currentCosts.every((c) => inventory[c.resource] >= c.amount);
  };

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  const selectedPrereq = selectedNode.prerequisiteId
    ? nodes.find((n) => n.id === selectedNode.prerequisiteId)
    : null;
  const selectedPrereqMet = isPrerequisiteMet(selectedNode);
  const selectedAffordable = canUpgradeOrUnlock(selectedNode);
  const selectedNextCosts = getUpgradeCostsForNode(selectedNode);
  const isMaxLevel = selectedNode.level >= selectedNode.maxLevel;

  const BOX_W = 104;
  const getBoxHeight = (node: TechNode) => (node.maxLevel > 1 ? 82 : 66);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only initiate drag with primary mouse button or touch
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    if (Math.hypot(dx, dy) > 5) {
      dragStartRef.current.moved = true;
    }
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy,
    });
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      className={`fixed inset-0 z-50 bg-[#1B2026] text-[#F3F5F4] pointer-events-auto overflow-hidden select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {/* Top-Left Resource Bar (Matches Reference Image Icon + Count Underneath) */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed top-4 left-5 z-30 flex items-center gap-6 bg-[#1B2026]/90 px-3 py-2 rounded-md cursor-default"
      >
        {(['jerami', 'kayu', 'wortel', 'jagung'] as (keyof Inventory)[]).map((resKey) => (
          <div key={resKey} className="flex flex-col items-center">
            {renderResourceIcon(resKey)}
            <span className="mt-1 font-mono-code font-bold text-sm text-white tracking-tight">
              {inventory[resKey]}
            </span>
            <span className="text-[10px] text-[#9099A2]">{RESOURCE_LABELS[resKey]}</span>
          </div>
        ))}
      </div>

      {/* Top-Right Return to 3D Farm Cube Button (Matches Reference Image) */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onClose}
        title="Kembali ke Ladang 3D (Esc)"
        className="fixed top-4 right-5 z-30 w-12 h-12 flex items-center justify-center rounded bg-[#324B64] hover:bg-[#3F5F7E] active:scale-95 border-2 border-[#52789C] shadow-xl transition-all cursor-pointer"
      >
        <svg viewBox="0 0 32 32" className="w-7 h-7 fill-none stroke-white stroke-[1.8]">
          <polygon points="16,4 27,10 27,22 16,28 5,22 5,10" />
          <polyline points="5,10 16,16 27,10" />
          <line x1="16" y1="16" x2="16" y2="28" />
        </svg>
      </button>

      {/* Bottom-Left Selected Node Inspector & Level Upgrade Action Card */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed bottom-5 left-5 z-30 w-88 max-w-[92vw] rounded-md border-2 border-[#466E8F] bg-[#23272D]/95 p-4 shadow-2xl cursor-default"
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono-code text-[#6EC6E6]">
            {selectedNode.maxLevel > 1
              ? `Level: ${selectedNode.level} / ${selectedNode.maxLevel}`
              : selectedNode.subtitle}
          </span>
          <span className="text-xs font-mono-code text-[#E5C07B]">
            {selectedNode.syntaxBadge}
          </span>
        </div>

        <h3 className="text-base font-bold text-white mt-0.5">{selectedNode.title}</h3>
        <p className="text-xs text-[#B8C0C8] mt-1 leading-relaxed">
          {selectedNode.description}
        </p>

        {/* Dynamic Level Preview for Island Expansion & Multi-Level Upgrades */}
        {selectedNode.id === 'logistik_ekspansi' && (
          <div className="mt-2 px-2.5 py-1.5 rounded bg-[#1B1E23] border border-[#36414D] text-[11px] font-mono-code text-[#A8E040]">
            Ukuran Pulau Saat Ini: {getIslandSizeForLevel(selectedNode.level)}x
            {getIslandSizeForLevel(selectedNode.level)}
            {selectedNode.level < selectedNode.maxLevel && (
              <span className="text-[#6EC6E6]">
                {' '}
                → Lv.{selectedNode.level + 1}: {getIslandSizeForLevel(selectedNode.level + 1)}x
                {getIslandSizeForLevel(selectedNode.level + 1)}
              </span>
            )}
          </div>
        )}

        <div className="mt-3 pt-2.5 border-t border-[#363C44] flex items-center justify-between gap-2">
          <div className="flex flex-col gap-0.5 text-xs font-mono-code">
            {isMaxLevel ? (
              <span className="text-[#7CE38B]">
                {selectedNode.maxLevel > 1
                  ? `Level Maksimum (${selectedNode.level} / ${selectedNode.maxLevel})`
                  : 'Sudah Terbuka (Unlocked)'}
              </span>
            ) : (
              <>
                <span className="text-[10px] text-[#9099A2]">
                  {selectedNode.maxLevel > 1
                    ? `Biaya Upgrade ke Lv.${selectedNode.level + 1}:`
                    : 'Biaya Unlock:'}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedNextCosts.map((c) => {
                    const cur = inventory[c.resource];
                    const met = cur >= c.amount;
                    return (
                      <span
                        key={c.resource}
                        className={met ? 'text-[#7CE38B] font-semibold' : 'text-[#F2CC60]'}
                      >
                        {c.amount} {RESOURCE_LABELS[c.resource]} (Stok: {cur})
                      </span>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {isMaxLevel ? (
            <span className="px-2.5 py-1 rounded bg-[#2D4536] text-[#7CE38B] text-xs font-semibold whitespace-nowrap">
              {selectedNode.maxLevel > 1 ? 'MAX' : 'Unlocked'}
            </span>
          ) : !selectedPrereqMet ? (
            <span className="text-[11px] text-[#8E96A0] whitespace-nowrap">
              Butuh: {selectedPrereq?.title}
            </span>
          ) : (
            <button
              onClick={() => onUnlockNode(selectedNode.id)}
              disabled={!selectedAffordable}
              className={`px-3.5 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                selectedAffordable
                  ? 'bg-[#658B1E] hover:bg-[#76A124] text-white border border-[#9CD03B]'
                  : 'bg-[#343940] text-[#767E87] cursor-not-allowed'
              }`}
            >
              {selectedNode.maxLevel > 1
                ? `Upgrade (${selectedNode.level + 1}/${selectedNode.maxLevel})`
                : 'Unlock'}
            </button>
          )}
        </div>
      </div>

      {/* Draggable / Pannable Node Graph Layer (No Sliders / Scrollbars) */}
      <div
        style={{
          transform: `translate3d(${pan.x}px, ${pan.y}px, 0)`,
        }}
        className="relative w-[1060px] h-[860px] will-change-transform"
      >
        {/* Orthogonal Steel-Blue Connector Lines SVG Layer */}
        <svg
          viewBox="0 0 1060 860"
          className="absolute inset-0 w-full h-full pointer-events-none"
        >
          {nodes.map((node) => {
            if (!node.prerequisiteId) return null;
            const parent = nodes.find((n) => n.id === node.prerequisiteId);
            if (!parent) return null;

            const parentH = getBoxHeight(parent);
            const startX = parent.treeX + BOX_W / 2;
            const startY = parent.treeY + parentH;
            const endX = node.treeX + BOX_W / 2;
            const endY = node.treeY;
            const midY = Math.round((startY + endY) / 2);

            const isPathActive =
              (parent.unlocked || parent.level > 0) && (node.unlocked || node.level > 0);
            const isPathAvailable =
              (parent.unlocked || parent.level > 0) && !(node.unlocked || node.level > 0);

            return (
              <path
                key={`${parent.id}->${node.id}`}
                d={`M ${startX} ${startY} L ${startX} ${midY} L ${endX} ${midY} L ${endX} ${endY}`}
                fill="none"
                stroke={
                  isPathActive
                    ? '#6EC6E6'
                    : isPathAvailable
                    ? '#4B779D'
                    : '#36526B'
                }
                strokeWidth="2.5"
              />
            );
          })}
        </svg>

        {/* Node Boxes Layer */}
        {nodes.map((node) => {
          const isSelected = node.id === selectedNode.id;
          const affordable = canUpgradeOrUnlock(node);
          const isMultiLevel = node.maxLevel > 1;
          const boxH = getBoxHeight(node);
          const levelRatio = Math.min(1, Math.max(0, node.level / node.maxLevel));

          const borderClass = isSelected
            ? 'border-[#7CE38B] ring-2 ring-[#7CE38B]/40'
            : affordable
            ? 'border-[#6EC6E6]'
            : node.level >= node.maxLevel
            ? 'border-[#4D7A9E]'
            : 'border-[#3C5E7B]';

          return (
            <button
              key={node.id}
              onClick={(e) => {
                e.stopPropagation();
                // Ignore click if user was dragging the canvas with the mouse
                if (dragStartRef.current.moved) return;
                if (selectedNodeId === node.id && affordable) {
                  onUnlockNode(node.id);
                } else {
                  setSelectedNodeId(node.id);
                }
              }}
              style={{
                left: `${node.treeX}px`,
                top: `${node.treeY}px`,
                width: `${BOX_W}px`,
                height: `${boxH}px`,
              }}
              className={`absolute flex flex-col justify-between rounded-[3px] border-[3px] bg-[#26282B] hover:bg-[#2E3136] transition-colors cursor-pointer overflow-hidden shadow-lg ${borderClass}`}
            >
              {/* Top Level Progress Bar (Matches Purple/Cyan partial fill in reference screenshot) */}
              <div className="w-full h-[3px] bg-[#2E343B] shrink-0 overflow-hidden">
                <div
                  style={{
                    width: `${isMultiLevel ? Math.max(node.level > 0 ? 12 : 0, levelRatio * 100) : node.unlocked ? 100 : 0}%`,
                    backgroundColor:
                      node.level >= node.maxLevel ? '#6EC6E6' : '#8558C8',
                  }}
                  className="h-full transition-all duration-200"
                />
              </div>

              {/* Center Icon or Syntax Text */}
              <div className="flex-1 w-full flex items-center justify-center px-1.5">
                {renderNodeCenterVisual(node.visualKind, node.syntaxBadge)}
              </div>

              {/* Bottom Level Strip (ONLY for multi-level upgrades: displays level / maxLevel like 0 / 10, 1 / 10, 5 / 5) */}
              {isMultiLevel && (
                <div className="w-full h-5 bg-[#36393E] flex items-center justify-center font-mono-code text-[10px] font-bold text-[#E2E6EA] shrink-0">
                  {node.level} / {node.maxLevel}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

interface ApiDocsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSnippet: (code: string) => void;
}

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({
  isOpen,
  onClose,
  onLoadSnippet,
}) => {
  if (!isOpen) return null;

  const examples = [
    {
      title: '1. Basic Harvest & Replant (No Tech Unlocks Needed)',
      desc: 'Memanen gandum matang, membajak tanah, menanam kembali, dan maju ke petak berikutnya.',
      code: `harvest()
plow()
plant("wheat")
move(1)
turn("right")`,
    },
    {
      title: '2. Continuous Loop Automation (Requires while & if)',
      desc: 'Otomasi pemeriksaan bahan bakar solar, panen otomatis jika siap, dan bergerak mengelilingi ladang.',
      code: `while True:
    if tractor.fuel < 20:
        tractor.go_to_fuel()
        tractor.refuel()
    if can_harvest():
        tractor.harvest()
    if check_soil() == "wild":
        tractor.plow()
        tractor.plant("wheat")
    elif check_soil() == "plowed":
        tractor.plant("wheat")
    tractor.move(1)
    if tractor.x == get_world_size() - 1 or tractor.x == 0:
        tractor.turn("right")`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 pointer-events-auto">
      <div className="w-full max-w-3xl rounded-lg border border-[#52565A] bg-[#232527] text-[#F3F5F4] shadow-2xl overflow-hidden flex flex-col max-h-[86vh]">
        <div className="flex items-center justify-between px-6 py-4 bg-[#34373B] border-b border-[#4A4E52]">
          <div>
            <h2 className="text-xl font-display font-bold text-white">
              Python API Reference — AgroCode
            </h2>
            <p className="text-xs text-[#B8BFC6] mt-0.5">
              Daftar fungsi Python standar untuk mengendalikan traktor di ladang 3D.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded bg-[#658B1E] hover:bg-[#76A124] text-white border border-[#84B034]"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs leading-relaxed">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded bg-[#1C1E20] border border-[#383C40]">
              <div className="font-mono-code text-[#A8E040] font-semibold">
                move(steps) & turn(direction)
              </div>
              <p className="text-[#C4CAD0] mt-1">
                Menggerakkan traktor maju sejumlah petak dan berbelok ke{' '}
                <code className="text-white">"right"</code>, <code className="text-white">"left"</code>,{' '}
                <code className="text-white">"north"</code>, <code className="text-white">"east"</code>,{' '}
                <code className="text-white">"south"</code>, atau <code className="text-white">"west"</code>.
              </p>
            </div>

            <div className="p-3.5 rounded bg-[#1C1E20] border border-[#383C40]">
              <div className="font-mono-code text-[#A8E040] font-semibold">
                plow() · plant(seed) · harvest()
              </div>
              <p className="text-[#C4CAD0] mt-1">
                Otomatis memasang alat tempel yang sesuai lalu mengolah tanah. Pilihan argumen seed:{' '}
                <code className="text-white">"wheat"</code>, <code className="text-white">"carrot"</code>,{' '}
                <code className="text-white">"wood"</code>, <code className="text-white">"corn"</code>.
              </p>
            </div>

            <div className="p-3.5 rounded bg-[#1C1E20] border border-[#383C40]">
              <div className="font-mono-code text-[#E5A93C] font-semibold">
                refuel() · deliver() · go_to_fuel() · go_to_barn()
              </div>
              <p className="text-[#C4CAD0] mt-1">
                Mengisi ulang solar di Fuel Station dan menyimpan hasil panen ke Barn agar bisa dipakai di Pohon Teknologi.
              </p>
            </div>

            <div className="p-3.5 rounded bg-[#1C1E20] border border-[#383C40]">
              <div className="font-mono-code text-[#A5D6FF] font-semibold">
                can_harvest() · check_soil() · get_world_size()
              </div>
              <p className="text-[#C4CAD0] mt-1">
                Sensor untuk mengecek apakah tanaman siap panen (<code className="text-white">True/False</code>) dan status petak (<code className="text-white">"wild"</code>, <code className="text-white">"plowed"</code>, <code className="text-white">"planted"</code>, <code className="text-white">"ready"</code>).
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Contoh Skrip Python</h3>
            {examples.map((ex) => (
              <div
                key={ex.title}
                className="p-4 rounded bg-[#1C1E20] border border-[#383C40] space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-white">{ex.title}</div>
                    <div className="text-[#9DA5AE]">{ex.desc}</div>
                  </div>
                  <button
                    onClick={() => {
                      onLoadSnippet(ex.code);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded bg-[#658B1E] hover:bg-[#76A124] text-white font-semibold whitespace-nowrap shrink-0"
                  >
                    Load to Editor
                  </button>
                </div>
                <pre className="p-3 rounded bg-[#141618] text-[#D8DEE4] font-mono-code text-xs overflow-x-auto">
                  {ex.code}
                </pre>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

interface AiOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCode: string;
  tractor: TractorState;
  unlockedNodes: string[];
  onApplyCode: (code: string) => void;
}

export const AiOptimizerModal: React.FC<AiOptimizerModalProps> = ({
  isOpen,
  onClose,
  currentCode,
  tractor,
  unlockedNodes,
  onApplyCode,
}) => {
  const [question, setQuestion] = useState(
    'Optimize my Python tractor script for better fuel efficiency and harvesting.'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    ringkasanAnalisis: string;
    estimasiHematSolar: string;
    tipsLogika: string[];
    rekomendasiKode: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/ai/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: currentCode,
          farmSummary: {
            tractorPos: { x: tractor.x, z: tractor.z, direction: tractor.direction },
            fuel: `${Math.round(tractor.fuel)}/${tractor.maxFuel}`,
            tool: tractor.implement,
          },
          unlockedNodes,
          question,
        }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || 'Gagal menghubungi server analisis AI.');
      }
      setResult(data);
    } catch (err: any) {
      setError(err?.message || 'Terjadi kesalahan saat menganalisis kode.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 pointer-events-auto">
      <div className="w-full max-w-2xl rounded-lg border border-[#52565A] bg-[#232527] text-[#F3F5F4] shadow-2xl overflow-hidden flex flex-col max-h-[86vh]">
        <div className="flex items-center justify-between px-6 py-4 bg-[#34373B] border-b border-[#4A4E52]">
          <div>
            <h2 className="text-lg font-display font-bold text-white">
              Python Code Optimizer (High-Thinking)
            </h2>
            <p className="text-xs text-[#B8BFC6] mt-0.5">
              Menganalisis efisiensi bahan bakar solar dan algoritma Python traktor Anda.
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded bg-[#658B1E] hover:bg-[#76A124] text-white border border-[#84B034]"
          >
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          <div>
            <label className="block text-[#C4CAD0] font-semibold mb-1.5">
              Target Optimasi:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="flex-1 px-3 py-2 rounded bg-[#181A1C] border border-[#42464A] text-white focus:outline-none focus:border-[#658B1E]"
              />
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="px-4 py-2 rounded bg-[#658B1E] hover:bg-[#76A124] disabled:opacity-50 text-white font-semibold whitespace-nowrap shrink-0"
              >
                {loading ? 'Analyzing...' : 'Analyze Code'}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded bg-[#3A1D1D] border border-[#C94A38] text-[#FF9B93]">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4 pt-2 border-t border-[#3A3E42]">
              <div className="p-3.5 rounded bg-[#1C1E20] border border-[#383C40] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white">Hasil Evaluasi Logika</span>
                  <span className="font-mono-code text-[#A8E040]">{result.estimasiHematSolar}</span>
                </div>
                <p className="text-[#D0D6DC] leading-relaxed">{result.ringkasanAnalisis}</p>
              </div>

              <div className="space-y-1.5">
                <div className="font-semibold text-white">Tips Logika Python:</div>
                <ul className="list-disc list-inside space-y-1 text-[#C4CAD0]">
                  {result.tipsLogika.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white">Recommended Python Script:</span>
                  <button
                    onClick={() => {
                      onApplyCode(result.rekomendasiKode);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded bg-[#658B1E] hover:bg-[#76A124] text-white font-semibold"
                  >
                    Apply to Editor
                  </button>
                </div>
                <pre className="p-3 rounded bg-[#141618] border border-[#34383C] text-[#A8E040] font-mono-code overflow-x-auto">
                  {result.rekomendasiKode}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
