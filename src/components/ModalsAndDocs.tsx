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

export const RESOURCE_LABELS: Record<keyof Inventory, string> = {
  jerami: 'Wheat',
  kayu: 'Wood',
  wortel: 'Carrot',
  jagung: 'Corn',
};

// Exported Bespoke Isometric / 3D-Styled Resource SVGs so HUD and Tech Tree share identical icons
export function renderResourceIcon(kind: keyof Inventory, sizeClass = 'w-8 h-8') {
  switch (kind) {
    case 'jerami':
      return (
        <svg viewBox="0 0 36 36" className={`${sizeClass} drop-shadow shrink-0`}>
          <path d="M8 24 L18 29 L28 24 L28 14 L18 9 L8 14 Z" fill="#C89632" />
          <path d="M8 14 L18 19 L28 14 L18 9 Z" fill="#E9C45A" />
          <path d="M18 19 L28 14 L28 24 L18 29 Z" fill="#9E721E" />
        </svg>
      );
    case 'kayu':
      return (
        <svg viewBox="0 0 36 36" className={`${sizeClass} drop-shadow shrink-0`}>
          <path d="M7 22 L23 11 L29 17 L13 28 Z" fill="#7D4925" />
          <ellipse cx="10" cy="25" rx="4" ry="4" fill="#C68B59" stroke="#5A3216" strokeWidth="1.5" />
          <path d="M12 16 L26 7 L30 12 L16 21 Z" fill="#683B1C" />
        </svg>
      );
    case 'wortel':
      return (
        <svg viewBox="0 0 36 36" className={`${sizeClass} drop-shadow shrink-0`}>
          <path d="M18 6 L23 11 L19 14 L14 9 Z" fill="#5CB83C" />
          <path d="M13 13 L23 13 L18 30 Z" fill="#EE7B22" />
          <path d="M18 13 L23 13 L18 30 Z" fill="#C95E12" />
        </svg>
      );
    case 'jagung':
      return (
        <svg viewBox="0 0 36 36" className={`${sizeClass} drop-shadow shrink-0`}>
          <ellipse cx="18" cy="18" rx="7" ry="11" fill="#F4C430" />
          <path d="M11 19 C11 27, 18 31, 18 31 C18 31, 25 27, 25 19 L21 23 L18 17 L15 23 Z" fill="#549E32" />
        </svg>
      );
  }
}

export function renderNodeCenterVisual(
  kind: NodeVisualKind,
  syntaxBadge: string,
  iconSizeClass = 'w-10 h-10'
) {
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
    if (syntaxBadge === '1 + 1') {
      return (
        <span className="font-mono-code text-xs font-semibold">
          <span className="text-[#56B6C2]">1</span>
          <span className="text-white"> + </span>
          <span className="text-[#56B6C2]">1</span>
        </span>
      );
    }
    if (syntaxBadge === 'set_speed()') {
      return (
        <span className="font-mono-code text-[11px] font-semibold">
          <span className="text-[#61AFEF]">set_speed</span>
          <span className="text-white">()</span>
        </span>
      );
    }
    if (syntaxBadge === 'get_time()') {
      return (
        <span className="font-mono-code text-[11px] font-semibold">
          <span className="text-[#61AFEF]">get_time</span>
          <span className="text-white">()</span>
        </span>
      );
    }
    if (syntaxBadge === '(x,y)') {
      return (
        <span className="font-mono-code text-xs font-semibold">
          <span className="text-white">(x,y)</span>
        </span>
      );
    }
    if (syntaxBadge === 'a = 2') {
      return (
        <span className="font-mono-code text-xs font-semibold">
          <span className="text-white">a = </span>
          <span className="text-[#56B6C2]">2</span>
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
    if (syntaxBadge === '{1:2}') {
      return (
        <span className="font-mono-code text-xs font-semibold">
          <span className="text-white">{'{'}</span>
          <span className="text-[#56B6C2]">1</span>
          <span className="text-white">:</span>
          <span className="text-[#56B6C2]">2</span>
          <span className="text-white">{'}'}</span>
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
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <path d="M12 34 L16 12 M18 35 L20 10 M24 35 L25 11 M30 34 L31 13" stroke="#E2B84B" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M14 28 L30 28" stroke="#A67622" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case 'tractor_speed':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <rect x="12" y="18" width="18" height="10" rx="2" fill="#D99226" />
          <rect x="20" y="11" width="10" height="8" rx="1" fill="#658B1E" />
          <circle cx="16" cy="29" r="5" fill="#1C1E20" stroke="#E8B948" strokeWidth="2.5" />
          <circle cx="28" cy="30" r="3.5" fill="#1C1E20" stroke="#E8B948" strokeWidth="2" />
        </svg>
      );
    case 'multi_tractor':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          {/* Back Tractor (Blue) */}
          <rect x="7" y="13" width="15" height="8" rx="2" fill="#2E86DE" />
          <rect x="13" y="8" width="8" height="6" rx="1" fill="#54A0FF" />
          <circle cx="10" cy="22" r="4" fill="#1C1E20" stroke="#E8B948" strokeWidth="2" />
          <circle cx="20" cy="23" r="3" fill="#1C1E20" stroke="#E8B948" strokeWidth="1.5" />
          {/* Front Tractor (Gold) */}
          <rect x="18" y="22" width="17" height="9" rx="2" fill="#D99226" />
          <rect x="25" y="16" width="9" height="7" rx="1" fill="#658B1E" />
          <circle cx="22" cy="32" r="4.5" fill="#1C1E20" stroke="#E8B948" strokeWidth="2.2" />
          <circle cx="33" cy="33" r="3.2" fill="#1C1E20" stroke="#E8B948" strokeWidth="1.8" />
        </svg>
      );
    case 'autopilot':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <circle cx="18" cy="22" r="6" fill="#658B1E" />
          <circle cx="26" cy="20" r="5" fill="#84B038" />
          <circle cx="23" cy="26" r="5" fill="#4F7D28" />
        </svg>
      );
    case 'grid_expand':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <path d="M10 22 L22 15 L34 22 L22 29 Z" fill="#729632" />
          <path d="M10 22 L22 29 L22 35 L10 28 Z" fill="#C28340" />
          <path d="M34 22 L22 29 L22 35 L34 28 Z" fill="#9C622B" />
        </svg>
      );
    case 'carrot':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <path d="M16 14 L21 14 L18 32 Z" fill="#EE7B22" />
          <path d="M23 15 L28 15 L25 32 Z" fill="#D96514" />
          <path d="M16 14 L14 9 M19 14 L20 8 M25 15 L24 9 M27 15 L29 10" stroke="#5CB83C" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'fuel_tank':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <ellipse cx="22" cy="14" rx="8" ry="4" fill="#3D7A5A" stroke="#7E522B" strokeWidth="2" />
          <path d="M14 14 L14 29 C14 32, 30 32, 30 29 L30 14 Z" fill="#8C5828" />
          <ellipse cx="22" cy="14" rx="6" ry="3" fill="#2A6E4D" />
        </svg>
      );
    case 'wood_tree':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <rect x="20" y="24" width="4" height="10" fill="#6E4726" />
          <circle cx="22" cy="18" r="8" fill="#5E8C2A" />
          <circle cx="18" cy="20" r="5" fill="#76A838" />
        </svg>
      );
    case 'fertilizer':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <path d="M14 16 L30 16 L32 32 C32 34, 12 34, 12 32 Z" fill="#C89D54" />
          <ellipse cx="22" cy="16" rx="8" ry="3.5" fill="#65B845" stroke="#8C6730" strokeWidth="2" />
          <circle cx="22" cy="25" r="4" fill="#65B845" />
        </svg>
      );
    case 'irrigation':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <rect x="13" y="20" width="18" height="12" rx="2" fill="#4B7742" stroke="#2D4A28" strokeWidth="2" />
          <path d="M22 10 C22 10, 28 17, 28 21 C28 24.5, 25.3 27, 22 27 C18.7 27, 16 24.5, 16 21 C16 17, 22 10, 22 10 Z" fill="#4DA8DA" />
        </svg>
      );
    case 'corn':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <ellipse cx="22" cy="21" rx="6" ry="10" fill="#F5C73D" />
          <path d="M15 22 C15 30, 22 33, 22 33 C22 33, 29 30, 29 22 L25 26 L22 19 L19 26 Z" fill="#5C9C30" />
        </svg>
      );
    case 'trophy':
      return (
        <svg viewBox="0 0 44 44" className={`${iconSizeClass} shrink-0`}>
          <path d="M15 12 H29 V20 C29 25, 15 25, 15 20 Z" fill="#E6A832" />
          <rect x="20" y="24" width="4" height="6" fill="#C4881E" />
          <rect x="15" y="30" width="14" height="4" rx="1" fill="#8C5828" />
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
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    panX: number;
    panY: number;
    moved: boolean;
  }>({
    startX: 0,
    startY: 0,
    panX: 0,
    panY: 0,
    moved: false,
  });

  useEffect(() => {
    if (isOpen) {
      const centerOffsetX = Math.round((window.innerWidth - 1140) / 2);
      const centerOffsetY = Math.max(12, Math.round((window.innerHeight - 920) / 2));
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
  const getBoxHeight = (node: TechNode) => (node.maxLevel > 1 ? 82 : 64);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
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

      {/* Top-Right Return to 3D Farm Red X Button */}
      <button
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onClose}
        title="Kembali ke Ladang 3D (Esc)"
        className="fixed top-4 right-5 z-30 w-11 h-11 flex items-center justify-center rounded-md bg-[#C93B2B] hover:bg-[#E04535] active:scale-95 border-2 border-[#FF6B5B] text-white shadow-xl transition-all cursor-pointer"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[2.8]">
          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
        </svg>
      </button>

      {/* Bottom-Left Selected Node Inspector & Level Upgrade Action Card */}
      <div
        onPointerDown={(e) => e.stopPropagation()}
        className="fixed bottom-5 left-5 z-30 w-92 max-w-[92vw] rounded-md border-2 border-[#466E8F] bg-[#23272D]/95 p-4 shadow-2xl cursor-default"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {renderNodeCenterVisual(selectedNode.visualKind, selectedNode.syntaxBadge, 'w-6 h-6')}
            <span className="text-[11px] font-mono-code text-[#6EC6E6]">
              {selectedNode.maxLevel > 1
                ? `Level: ${selectedNode.level} / ${selectedNode.maxLevel}`
                : selectedNode.subtitle}
            </span>
          </div>
          <span className="text-xs font-mono-code text-[#E5C07B]">
            {selectedNode.syntaxBadge}
          </span>
        </div>

        <h3 className="text-base font-bold text-white mt-1">{selectedNode.title}</h3>
        <p className="text-xs text-[#B8C0C8] mt-1 leading-relaxed">
          {selectedNode.description}
        </p>

        {/* Dynamic Level Preview for Island Expansion & Multi-Tractor */}
        {selectedNode.id === 'logistik_ekspansi' && (
          <div className="mt-2 px-2.5 py-1.5 rounded bg-[#1B1E23] border border-[#36414D] text-[11px] font-mono-code text-[#A8E040]">
            Ukuran Pulau Saat Ini: {getIslandSizeForLevel(selectedNode.level)}x
            {getIslandSizeForLevel(selectedNode.level)} ({getIslandSizeForLevel(selectedNode.level) ** 2} petak)
            {selectedNode.level < selectedNode.maxLevel && (
              <span className="text-[#6EC6E6]">
                {' '}
                → Lv.{selectedNode.level + 1}: {getIslandSizeForLevel(selectedNode.level + 1)}x
                {getIslandSizeForLevel(selectedNode.level + 1)} ({getIslandSizeForLevel(selectedNode.level + 1) ** 2} petak)
              </span>
            )}
          </div>
        )}

        {selectedNode.id === 'alat_multi_traktor' && (
          <div className="mt-2 px-2.5 py-1.5 rounded bg-[#1B1E23] border border-[#36414D] text-[11px] font-mono-code text-[#A8E040]">
            Jumlah Traktor Aktif: {selectedNode.level} Unit
            {selectedNode.level < selectedNode.maxLevel && (
              <span className="text-[#6EC6E6]">
                {' '}
                → Upgrade ke {selectedNode.level + 1} Traktor 3D!
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
                <div className="flex flex-wrap items-center gap-2.5 mt-0.5">
                  {selectedNextCosts.map((c) => {
                    const cur = inventory[c.resource];
                    const met = cur >= c.amount;
                    return (
                      <span
                        key={c.resource}
                        className={`inline-flex items-center gap-1 ${
                          met ? 'text-[#7CE38B] font-semibold' : 'text-[#F2CC60]'
                        }`}
                      >
                        {renderResourceIcon(c.resource, 'w-4 h-4')}
                        {c.amount} {RESOURCE_LABELS[c.resource]}
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
        className="relative w-[1140px] h-[940px] will-change-transform"
      >
        {/* Orthogonal Steel-Blue Connector Lines SVG Layer */}
        <svg
          viewBox="0 0 1140 940"
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
              {/* Top Level Progress Bar */}
              <div className="w-full h-[3px] bg-[#2E343B] shrink-0 overflow-hidden">
                <div
                  style={{
                    width: `${
                      isMultiLevel
                        ? Math.max(node.level > 0 ? 12 : 0, levelRatio * 100)
                        : node.unlocked
                        ? 100
                        : 0
                    }%`,
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

              {/* Bottom Level Strip (ONLY for multi-level upgrades: displays level / maxLevel like 0 / 12, 1 / 4, 5 / 5) */}
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

interface TutorialStepItem {
  stepNumber: number;
  categoryBadge: string;
  title: string;
  subtitle: string;
  showEditorToolbarDiagram?: boolean;
  showHudIconsDiagram?: boolean;
  paragraphs: string[];
  pythonConceptTitle: string;
  pythonConceptPoints: string[];
  codeTitle?: string;
  code?: string;
  showFullApiCheatsheet?: boolean;
}

const TUTORIAL_STEPS: TutorialStepItem[] = [
  {
    stepNumber: 1,
    categoryBadge: 'LANGKAH 1 DARI 8 · CARA BERMAIN',
    title: 'First Program (Program Pertama)',
    subtitle: 'Text Editor & Cara Menjalankan Traktor dengan Kode Python',
    showEditorToolbarDiagram: true,
    paragraphs: [
      'Selamat datang di этаTractor! Di game ini, Anda tidak menggerakkan traktor dengan tombol arah keyboard, melainkan dengan menulis kode Python di dalam jendela Text Editor (tab coding).',
      'Setiap jendela kode mewakili satu file script Python. Kode dapat diedit kapan saja selama program sedang tidak berjalan.',
      'Anda dapat langsung menjalankan program dengan menekan tombol Play berwarna hijau (▶) di pojok kiri atas jendela kode, atau menekan tombol Step (▷) di sebelahnya untuk menjalankan kode baris demi baris.',
      'Saat program berjalan, baris kode yang sedang dieksekusi akan menyala sehingga Anda bisa melihat alur kerja Python secara langsung.',
      'Anda dapat membuat banyak pop-up jendela kode baru menggunakan tombol "+" di pojok kanan atas layar, serta mengatur ukuran (size) jendela kode dengan menarik sudut kanan bawah jendela.',
    ],
    pythonConceptTitle: 'Belajar Python Dasar #1: Apa Itu Baris Perintah?',
    pythonConceptPoints: [
      'Komputer membaca kode Python dari ATAS ke BAWAH, baris demi baris.',
      'Baris yang diawali tanda pagar (#) disebut Komentar (Comment) — berguna sebagai catatan dan tidak akan dijalankan oleh traktor.',
      'Setiap perintah aksi ditulis dengan nama fungsi diikuti tanda kurung buka dan tutup, contohnya: harvest() atau move(1).',
    ],
    codeTitle: 'Contoh Program Pertama (Klik tombol di bawah untuk memuat ke Editor):',
    code: `# Program Pertama: Panen, Bajak, Tanam, dan Maju
harvest()
plow()
plant("wheat")
move(1)
turn("right")`,
  },
  {
    stepNumber: 2,
    categoryBadge: 'LANGKAH 2 DARI 8 · BELAJAR PYTHON',
    title: 'Fungsi & Parameter (Functions & Arguments)',
    subtitle: 'Cara Memberi Perintah Spesifik kepada Traktor',
    paragraphs: [
      'Di Python, perintah seperti move(1), turn("right"), dan plant("wheat") disebut pemanggilan Fungsi (Function Call).',
      'Nilai di dalam tanda kurung disebut Parameter / Argumen. Misalnya angka 1 pada move(1) memberi tahu traktor untuk maju sebanyak 1 petak, sedangkan teks "right" pada turn("right") memberi tahu traktor untuk berbelok ke kanan.',
      'Perhatikan perbedaan tipe data di Python: angka ditulis langsung tanpa tanda kutip seperti move(2), sedangkan teks (String) WAJIB diapit tanda kutip seperti "wheat", "right", atau "left".',
    ],
    pythonConceptTitle: 'Belajar Python Dasar #2: Aturan Penulisan Fungsi',
    pythonConceptPoints: [
      'move(1) → Maju 1 petak sesuai arah hadap traktor saat ini.',
      'turn("right") atau turn("left") → Berbelok ke kanan atau ke kiri.',
      'plow() → Membajak tanah liar ("wild") agar siap ditanami bibit.',
      'plant("wheat") → Menanam bibit gandum di tanah yang sudah dibajak.',
      'harvest() → Memanen tanaman yang sudah matang 100%.',
    ],
    codeTitle: 'Contoh Memanen 2 Petak Berturut-turut:',
    code: `# Panen dan tanam di petak pertama (1, 1)
harvest()
plow()
plant("wheat")

# Belok kiri ke petak (2, 1) lalu panen & tanam
turn("left")
move(1)
harvest()
plow()
plant("wheat")`,
  },
  {
    stepNumber: 3,
    categoryBadge: 'LANGKAH 3 DARI 8 · BELAJAR PYTHON',
    title: 'Perulangan Tanpa Henti (while True Loop)',
    subtitle: 'Membuat Traktor Bekerja Otomatis Terus-Menerus',
    paragraphs: [
      'Menekan tombol Play berulang-ulang tentu melelahkan. Di Python, kita bisa menggunakan perulangan while True: untuk menyuruh traktor mengulangi blok perintah tanpa henti!',
      'ATURAN PENTING PYTHON (Indentasi / Spasi Menjorok): Semua baris perintah yang ingin diulang di dalam while True: WAJIB ditulis menjorok ke dalam sebanyak 4 spasi (cukup tekan tombol Tab pada keyboard).',
      'Jangan lupa tanda titik dua (:) di akhir baris while True:.',
    ],
    pythonConceptTitle: 'Belajar Python Dasar #3: Struktur while True & Indentasi',
    pythonConceptPoints: [
      'while True: artinya "Selama kondisi bernilai Benar (selamanya), ulangi perintah di bawahnya".',
      'Gunakan tombol Tab untuk memberi jarak 4 spasi di awal baris di bawah while True:.',
      'Setelah sampai di baris paling bawah yang menjorok, Python akan otomatis kembali ke baris pertama di dalam while True:.',
    ],
    codeTitle: 'Contoh Loop Otomatis (Berputar Mengelilingi Ladang):',
    code: `# Perulangan otomatis tanpa henti
while True:
    harvest()
    plow()
    plant("wheat")
    move(1)
    turn("right")`,
  },
  {
    stepNumber: 4,
    categoryBadge: 'LANGKAH 4 DARI 8 · BELAJAR PYTHON',
    title: 'Logika Percabangan (if, elif, else)',
    subtitle: 'Membuat Traktor Pintar Mengecek Kondisi Tanah & Tanaman',
    paragraphs: [
      'Bagaimana jika tanaman belum matang saat traktor lewat? Atau bagaimana jika tanah masih liar ("wild")? Di sinilah kita menggunakan logika if (Jika) di Python!',
      'Fungsi can_harvest() akan menghasilkan nilai True jika tanaman di bawah traktor sudah siap panen, dan False jika belum.',
      'Fungsi check_soil() akan mengembalikan teks status tanah saat ini: "wild" (liar), "plowed" (sudah dibajak), "planted" (sedang tumbuh), atau "ready" (siap panen).',
      'Di Python, gunakan tanda sama dengan ganda (==) untuk membandingkan apakah dua nilai sama, contohnya: if check_soil() == "wild":.',
    ],
    pythonConceptTitle: 'Belajar Python Dasar #4: Cara Kerja if dan Operator ==',
    pythonConceptPoints: [
      'if can_harvest(): → Hanya jalankan harvest() jika tanaman memang sudah matang.',
      'if check_soil() == "wild": → Jika tanah masih liar, jalankan plow() untuk membajaknya.',
      'if check_soil() == "plowed": → Jika tanah sudah dibajak, tanam bibit dengan plant("wheat").',
      'Perintah di dalam blok if juga wajib menjorok 4 spasi (Tab) lebih dalam!',
    ],
    codeTitle: 'Contoh Traktor Pintar dengan Sensor if:',
    code: `while True:
    if can_harvest():
        harvest()
    if check_soil() == "wild":
        plow()
    if check_soil() == "plowed":
        plant("wheat")
    move(1)
    if get_pos_x() == get_world_size() - 1 or get_pos_x() == 0:
        turn("right")`,
  },
  {
    stepNumber: 5,
    categoryBadge: 'LANGKAH 5 DARI 8 · MEKANIK GAME & TECH TREE',
    title: 'Pom Bensin, Gudang & Pohon Teknologi (^)',
    subtitle: 'Mengelola Bahan Bakar Solar & Membuka Teknologi Baru',
    showHudIconsDiagram: true,
    paragraphs: [
      'Traktor membutuhkan bahan bakar solar (fuel) setiap kali bergerak dan bekerja. Jika solar habis (0L), traktor akan berhenti. Anda bisa memprogram traktor untuk mengisi solar otomatis di petak Pom Bensin (0, 0) menggunakan go_to_fuel() dan refuel().',
      'Hasil panen yang dikumpulkan akan masuk ke penyimpanan (Wheat, Carrot, Wood, Corn) yang terlihat di pojok kiri atas layar.',
      'Klik tombol Pohon Teknologi (^) di pojok kanan atas untuk menukar hasil panen dengan upgrade penting: Kecepatan Traktor, Bibit Wortel & Kayu, Bibit Jagung, Pupuk Instan fertilize(), Perluasan Pulau, hingga Armada Multi-Traktor!',
    ],
    pythonConceptTitle: 'Belajar Python Dasar #5: Operator Perbandingan (<, >, <=, >=)',
    pythonConceptPoints: [
      'tractor.fuel membaca sisa liter solar traktor saat ini.',
      'if tractor.fuel < 25: artinya "Jika solar kurang dari 25 liter, segera pergi ke Pom Bensin".',
      'go_to_fuel() mengarahkan traktor ke koordinat (0, 0), lalu refuel() mengisi penuh tangki solar.',
    ],
    codeTitle: 'Contoh Otomatis Isi Solar Saat Hampir Habis:',
    code: `while True:
    # Cek apakah solar di bawah 25 Liter
    if tractor.fuel < 25:
        go_to_fuel()
        refuel()

    if can_harvest():
        harvest()
    if check_soil() == "wild":
        plow()
    if check_soil() == "plowed":
        plant("wheat")
    move(1)
    turn("right")`,
  },
  {
    stepNumber: 6,
    categoryBadge: 'LANGKAH 6 DARI 8 · BELAJAR PYTHON LANJUTAN',
    title: 'Variabel, Perulangan for, & Fungsi def',
    subtitle: 'Membuat Kode Lebih Rapi, Modular, dan Menyapu Seluruh Pulau',
    paragraphs: [
      'Di Python, kita bisa menyimpan data ke dalam Variabel, misalnya size = get_world_size() untuk menyimpan ukuran pulau saat ini (4, 6, 8, dst.).',
      'Kita juga bisa menggunakan perulangan for x in range(size): untuk memindai setiap kolom dan baris pulau secara berurutan dari koordinat 0 sampai ujung pulau.',
      'Dengan kata kunci def, Anda bisa menciptakan fungsi buatan sendiri (misal def rawat_petak():) agar kode tidak perlu ditulis berulang-ulang. Anda bahkan bisa membuat pop-up script baru dengan tombol (+) lalu memanggilnya dengan import!',
    ],
    pythonConceptTitle: 'Belajar Python #6: Variabel, for in range(), dan def',
    pythonConceptPoints: [
      'size = get_world_size() → Menyimpan lebar/panjang pulau ke variabel bernama size.',
      'for z in range(size): → Mengulangi variabel z mulai dari angka 0, 1, 2, ... hingga size - 1.',
      'def rawat_petak(bibit): → Mendefinisikan fungsi baru yang bisa dipanggil kapan saja.',
    ],
    codeTitle: 'Contoh Penggunaan def & Pemindaian Seluruh Pulau:',
    code: `def rawat_petak(jenis_bibit):
    if can_harvest():
        harvest()
    if check_soil() == "wild":
        plow()
    if check_soil() == "plowed":
        plant(jenis_bibit)

while True:
    size = get_world_size()
    for z in range(size):
        for x in range(size):
            if (x == 0 and z == 0) or (x == size - 1 and z == 0):
                continue
            goto(x, z)
            rawat_petak("wheat")`,
  },
  {
    stepNumber: 7,
    categoryBadge: 'LANGKAH 7 DARI 8 · MULTI-TRAKTOR',
    title: 'Menggerakkan Traktor 1 & 2 Secara Bersamaan',
    subtitle: 'Kontrol Armada Multi-Traktor (tractors[0], tractors[1], & use_tractor)',
    paragraphs: [
      'Setelah membuka teknologi "Armada Multi-Traktor" di Tech Tree (^), Anda akan memiliki lebih dari 1 traktor di pulau ladang!',
      'Di Python, daftar objek disimpan di dalam List (Array) dengan nomor indeks mulai dari 0. Jadi Traktor #1 adalah tractors[0], Traktor #2 adalah tractors[1], Traktor #3 adalah tractors[2], dan seterusnya.',
      'Untuk menggerakkan Traktor 1 dan Traktor 2 secara bersamaan, cukup panggil perintah untuk tractors[0] dan tractors[1] di dalam satu blok while True: yang sama, atau gunakan perulangan for i in range(num_tractors()): dengan use_tractor(i)!',
    ],
    pythonConceptTitle: 'Belajar Python #7: List Indexing tractors[0] & tractors[1]',
    pythonConceptPoints: [
      'tractors[0].move(1) → Menggerakkan Traktor 1 tanpa mengganggu Traktor 2.',
      'tractors[1].move(1) → Menggerakkan Traktor 2 secara bersamaan dalam siklus loop yang sama.',
      'num_tractors() → Mengecek berapa jumlah total traktor yang aktif saat ini (1 s/d 4).',
      'use_tractor(i) → Mengalihkan fokus perintah standar ke traktor nomor indeks ke-i.',
    ],
    codeTitle: 'Contoh Menggerakkan Traktor 1 & Traktor 2 Bersamaan:',
    code: `set_speed(2)

while True:
    # --- KONTROL TRAKTOR 1 (tractors[0]) ---
    if tractors[0].can_harvest():
        tractors[0].harvest()
    if tractors[0].check_soil() == "wild":
        tractors[0].plow()
    if tractors[0].check_soil() == "plowed":
        tractors[0].plant("wheat")
    tractors[0].move(1)
    if tractors[0].x == get_world_size() - 1 or tractors[0].x == 0:
        tractors[0].turn("right")

    # --- KONTROL TRAKTOR 2 (tractors[1]) BERSAMAAN ---
    if num_tractors() > 1:
        if tractors[1].can_harvest():
            tractors[1].harvest()
        if tractors[1].check_soil() == "wild":
            tractors[1].plow()
        if tractors[1].check_soil() == "plowed":
            tractors[1].plant("wheat")
        tractors[1].move(1)
        if tractors[1].z == get_world_size() - 1 or tractors[1].z == 0:
            tractors[1].turn("left")`,
  },
  {
    stepNumber: 8,
    categoryBadge: 'LANGKAH 8 DARI 8 · KAMUS LENGKAP PYTHON API',
    title: 'Kamus Lengkap Perintah Python & Multi-Tanaman',
    subtitle: 'Referensi Semua Fungsi Python & Penanaman 4 Komoditas (Wheat, Carrot, Wood, Corn)',
    showFullApiCheatsheet: true,
    paragraphs: [
      'Selamat! Anda sudah mempelajari seluruh dasar pemrograman Python dan mekanik permainan этаTractor.',
      'Di halaman terakhir ini, Anda dapat melihat ringkasan lengkap seluruh fungsi Python API yang tersedia di dalam game beserta contoh kode multi-tanaman dan pupuk instan fertilize().',
      'Ingat: Kapan pun Anda menutup jendela tutorial ini, Anda selalu bisa membukanya kembali melalui tombol ikon "i" (Python API Documentation) di pojok kanan atas layar!',
    ],
    pythonConceptTitle: 'Tips Kombinasi 4 Komoditas & Pupuk Instan:',
    pythonConceptPoints: [
      'Gunakan "wheat" (Gandum), "carrot" (Wortel), "wood" (Kayu), dan "corn" (Jagung) pada fungsi plant(...).',
      'Panggil fertilize() tepat setelah plant(...) untuk langsung mematangkan tanaman menjadi 100% siap panen (membutuhkan Tech Pupuk).',
    ],
    codeTitle: 'Contoh Otomatisasi 4 Komoditas + Armada Multi-Traktor:',
    code: `set_speed(3)

while True:
    for i in range(num_tractors()):
        use_tractor(i)
        if tractor.fuel < 20:
            go_to_fuel()
            refuel()
        if can_harvest():
            harvest()
        if check_soil() == "wild":
            plow()
        if check_soil() == "plowed":
            x = get_pos_x()
            if x % 2 == 0:
                plant("wheat")
            else:
                plant("carrot")
            fertilize()
        move(1)
        if get_pos_x() == get_world_size() - 1 or get_pos_x() == 0:
            turn("right")`,
  },
];

export const ApiDocsModal: React.FC<ApiDocsModalProps> = ({
  isOpen,
  onClose,
  onLoadSnippet,
}) => {
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [winPos, setWinPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window !== 'undefined') {
      return {
        x: Math.max(20, Math.round((window.innerWidth - 680) / 2)),
        y: Math.max(48, Math.round((window.innerHeight - 540) / 2)),
      };
    }
    return { x: 180, y: 72 };
  });

  const dragRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: winPos.x,
    origY: winPos.y,
  });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const nextX = Math.max(8, Math.min(window.innerWidth - 220, dragRef.current.origX + dx));
      const nextY = Math.max(8, Math.min(window.innerHeight - 60, dragRef.current.origY + dy));
      setWinPos({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      dragRef.current.dragging = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStepIdx] || TUTORIAL_STEPS[0];
  const totalSteps = TUTORIAL_STEPS.length;
  const hasPrev = currentStepIdx > 0;
  const hasNext = currentStepIdx < totalSteps - 1;

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: winPos.x,
      origY: winPos.y,
    };
  };

  return (
    <div
      style={{
        transform: `translate3d(${winPos.x}px, ${winPos.y}px, 0)`,
      }}
      className="fixed top-0 left-0 z-50 w-[680px] max-w-[94vw] rounded-[4px] border-2 border-[#5A5E62] bg-[#1E2022] text-[#EAEEF2] shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[84vh] pointer-events-auto"
    >
      {/* Draggable Top Window Bar (Green Return/Step Button on Left, Step Info, Red Close X on Right) */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className="flex items-center justify-between px-2.5 py-1.5 bg-[#525558] border-b border-[#686C70] shrink-0 select-none cursor-move"
      >
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (hasPrev) {
                setCurrentStepIdx((prev) => Math.max(0, prev - 1));
              } else {
                setCurrentStepIdx(0);
              }
            }}
            title={hasPrev ? 'Kembali ke Langkah Sebelumnya' : 'Langkah Pertama'}
            className="w-7 h-7 flex items-center justify-center rounded-[3px] bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white border border-[#88B82E] shadow transition-transform cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2.5]">
              <path d="M9 14l-4-4 4-4" />
              <path d="M5 10h11a4 4 0 1 1 0 8h-1" />
            </svg>
          </button>
          <span className="font-mono-code text-xs font-bold text-[#E2E8F0]">
            Tutorial & Belajar Python ({step.stepNumber} / {totalSteps})
          </span>
        </div>

        <button
          onClick={onClose}
          title="Tutup (Esc)"
          className="w-7 h-7 flex items-center justify-center rounded-[3px] bg-[#C93B2B] hover:bg-[#E04535] active:scale-95 text-white font-bold border border-[#F06A5B] cursor-pointer"
        >
          ✕
        </button>
      </div>

        {/* Main Tutorial Step Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm leading-relaxed bg-[#1E2022]">
          {/* Centered Step Title Header (Like "First Program" in reference image) */}
          <div className="text-center space-y-1 border-b border-[#32363A] pb-4">
            <div className="text-[11px] font-mono-code font-bold text-[#9CD03B] tracking-wider uppercase">
              {step.categoryBadge}
            </div>
            <h2 className="text-2xl font-display font-bold text-white tracking-wide">
              {step.title}
            </h2>
          </div>

          {/* Section Subtitle & Explanations */}
          <div className="space-y-3">
            <h3 className="text-base font-display font-semibold text-white">
              {step.subtitle}
            </h3>

            <div className="space-y-2.5 text-[13px] text-[#D8DEE4] leading-relaxed">
              {step.paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>

          {/* Embedded Visual Editor Toolbar Illustration (Matches Reference Screenshot on Step 1!) */}
          {step.showEditorToolbarDiagram && (
            <div className="my-4 flex flex-col items-center justify-center">
              <div className="w-full max-w-[360px] rounded-t-[4px] border-2 border-[#686C70] bg-[#525558] px-2.5 py-2 shadow-xl flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {/* Highlighted Play Button with Orange/Red Ring like Screenshot */}
                  <div className="relative p-0.5 rounded-[4px] ring-2 ring-[#E05A2B] bg-[#E05A2B]/20">
                    <div className="w-6 h-6 flex items-center justify-center rounded-[3px] bg-[#658B1E] text-white border border-[#88B82E]">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                  </div>
                  {/* Step Button */}
                  <div className="w-6 h-6 flex items-center justify-center rounded-[3px] bg-[#658B1E] text-white border border-[#88B82E]">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
                      <polygon points="8,5 19,12 8,19" />
                    </svg>
                  </div>
                  {/* + Button */}
                  <div className="w-6 h-6 flex items-center justify-center rounded-[3px] bg-[#658B1E] text-white font-mono-code font-bold text-sm border border-[#88B82E]">
                    +
                  </div>
                  <span className="ml-1 font-mono-code text-xs font-bold text-white">main</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-6 h-6 flex items-center justify-center rounded-[3px] bg-[#658B1E] text-white border border-[#88B82E]">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current stroke-[2.8]">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </div>
                </div>
              </div>
              <span className="mt-1.5 text-[11px] font-mono-code text-[#E5A93C]">
                ▲ Tekan tombol Play hijau (▶) untuk mengeksekusi kode Python Anda
              </span>
            </div>
          )}

          {/* Embedded HUD Icons Guide on Step 5 */}
          {step.showHudIconsDiagram && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-3 rounded bg-[#26292C] border border-[#3E4246] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#658B1E] text-white font-mono-code text-lg font-bold flex items-center justify-center shrink-0 border border-[#88B82E]">
                  +
                </div>
                <div className="text-xs">
                  <div className="font-bold text-white">Tambah Script (+)</div>
                  <div className="text-[#B8BFC6] text-[11px]">Buka pop-up editor Python baru</div>
                </div>
              </div>
              <div className="p-3 rounded bg-[#26292C] border border-[#3E4246] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#658B1E] text-white font-serif italic text-base font-bold flex items-center justify-center shrink-0 border border-[#88B82E]">
                  i
                </div>
                <div className="text-xs">
                  <div className="font-bold text-white">Tutorial & API (i)</div>
                  <div className="text-[#B8BFC6] text-[11px]">Buka panduan ini kapan saja</div>
                </div>
              </div>
              <div className="p-3 rounded bg-[#26292C] border border-[#3E4246] flex items-center gap-2.5">
                <div className="w-8 h-8 rounded bg-[#658B1E] text-white flex items-center justify-center shrink-0 border border-[#88B82E]">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-[2.5]">
                    <polyline points="6 15 12 9 18 15" />
                    <polyline points="6 20 12 14 18 20" />
                  </svg>
                </div>
                <div className="text-xs">
                  <div className="font-bold text-white">Tech Tree (^)</div>
                  <div className="text-[#B8BFC6] text-[11px]">Upgrade pulau, bibit & multi-traktor</div>
                </div>
              </div>
            </div>
          )}

          {/* Python Learning Box */}
          <div className="rounded-md bg-[#26292C] border border-[#3E4348] p-4 space-y-2">
            <div className="text-xs font-mono-code font-bold text-[#9CD03B] flex items-center gap-1.5">
              <span>🐍</span>
              <span>{step.pythonConceptTitle}</span>
            </div>
            <ul className="list-disc list-inside space-y-1.5 text-[12px] text-[#E2E8F0]">
              {step.pythonConceptPoints.map((pt, idx) => (
                <li key={idx} className="leading-relaxed">
                  {pt}
                </li>
              ))}
            </ul>
          </div>

          {/* Full API Cheat Sheet on Final Step */}
          {step.showFullApiCheatsheet && (
            <div className="space-y-2.5">
              <div className="text-xs font-mono-code font-bold text-[#E5A93C]">
                RINGKASAN SEMUA PERINTAH PYTHON API:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                <div className="p-3 rounded bg-[#161819] border border-[#34383C]">
                  <div className="font-mono-code text-[#A8E040] font-semibold">
                    move(steps) · turn(dir) · goto(x, z)
                  </div>
                  <p className="text-[#C4CAD0] mt-1 text-[11px]">
                    Maju <code className="text-white">move(1)</code>, belok (<code className="text-white">"right"</code>, <code className="text-white">"left"</code>, <code className="text-white">"north"</code>, <code className="text-white">"south"</code>, <code className="text-white">"east"</code>, <code className="text-white">"west"</code>), atau ke koordinat <code className="text-white">goto(x, z)</code>.
                  </p>
                </div>
                <div className="p-3 rounded bg-[#161819] border border-[#34383C]">
                  <div className="font-mono-code text-[#A8E040] font-semibold">
                    plow() · plant(seed) · fertilize() · harvest()
                  </div>
                  <p className="text-[#C4CAD0] mt-1 text-[11px]">
                    Bajak tanah, tanam (<code className="text-white">"wheat"</code>, <code className="text-white">"carrot"</code>, <code className="text-white">"wood"</code>, <code className="text-white">"corn"</code>), pupuk instan <code className="text-white">fertilize()</code>, dan panen.
                  </p>
                </div>
                <div className="p-3 rounded bg-[#161819] border border-[#34383C]">
                  <div className="font-mono-code text-[#E5A93C] font-semibold">
                    tractors[0] · tractors[1] · use_tractor(i) · num_tractors()
                  </div>
                  <p className="text-[#C4CAD0] mt-1 text-[11px]">
                    Kontrol Traktor 1 (<code className="text-white">tractors[0]</code>) & Traktor 2 (<code className="text-white">tractors[1]</code>) secara bersamaan.
                  </p>
                </div>
                <div className="p-3 rounded bg-[#161819] border border-[#34383C]">
                  <div className="font-mono-code text-[#A5D6FF] font-semibold">
                    can_harvest() · check_soil() · get_world_size() · refuel()
                  </div>
                  <p className="text-[#C4CAD0] mt-1 text-[11px]">
                    Sensor siap panen, status tanah (<code className="text-white">"wild"</code>, <code className="text-white">"plowed"</code>), ukuran pulau, dan isi solar di <code className="text-white">(0,0)</code>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Example Python Code Block + Load to Editor Button */}
          {step.code && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono-code font-bold text-[#B8BFC6]">
                  {step.codeTitle || 'Contoh Kode Python:'}
                </span>
                <button
                  onClick={() => {
                    onLoadSnippet(step.code!);
                    onClose();
                  }}
                  className="px-3 py-1.5 rounded bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white font-mono-code text-xs font-bold border border-[#9CD03B] shadow cursor-pointer"
                >
                  Masukkan Kode Ini ke Editor
                </button>
              </div>
              <pre className="p-3.5 rounded bg-[#141618] border border-[#32363A] text-[#A8E040] font-mono-code text-xs overflow-x-auto leading-relaxed">
                {step.code}
              </pre>
            </div>
          )}
        </div>

        {/* Bottom Stepper Footer (Next) */}
        <div className="flex flex-wrap items-center justify-end gap-3 px-5 py-3 bg-[#282B2E] border-t border-[#3E4246] shrink-0">
          {hasNext ? (
            <button
              onClick={() => setCurrentStepIdx((prev) => Math.min(totalSteps - 1, prev + 1))}
              className="px-4 py-1.5 rounded bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white font-mono-code text-xs font-bold border border-[#9CD03B] shadow transition-all cursor-pointer"
            >
              Selanjutnya (Next) →
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white font-mono-code text-xs font-bold border border-[#9CD03B] shadow transition-all cursor-pointer"
            >
              Selesai & Mulai Bermain ✓
            </button>
          )}
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
