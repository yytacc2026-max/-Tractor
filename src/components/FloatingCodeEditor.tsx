import React, { useState, useRef, useEffect } from 'react';
import { ConsoleLogEntry, ScriptTab } from '../types/game';

interface FloatingCodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  scripts: ScriptTab[];
  activeScriptId: string;
  onSelectScript: (id: string) => void;
  onUpdateCode: (code: string) => void;
  onAddScript: () => void;
  isRunning: boolean;
  isStepWaiting: boolean;
  activeLine: number | null;
  onRun: () => void;
  onStep: () => void;
  onStop: () => void;
  logs: ConsoleLogEntry[];
  onClearLogs: () => void;
  executionSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

const QUICK_SNIPPETS = [
  { label: 'move(1)', snippet: 'move(1)\n' },
  { label: 'turn("right")', snippet: 'turn("right")\n' },
  { label: 'plow()', snippet: 'plow()\n' },
  { label: 'plant("wheat")', snippet: 'plant("wheat")\n' },
  { label: 'harvest()', snippet: 'harvest()\n' },
  { label: 'while True:', snippet: 'while True:\n    ' },
  { label: 'if can_harvest():', snippet: 'if can_harvest():\n    harvest()\n' },
  { label: 'refuel check', snippet: 'if tractor.fuel < 25:\n    tractor.go_to_fuel()\n    tractor.refuel()\n' },
];

export const FloatingCodeEditor: React.FC<FloatingCodeEditorProps> = ({
  isOpen,
  onClose,
  scripts,
  activeScriptId,
  onSelectScript,
  onUpdateCode,
  onAddScript,
  isRunning,
  isStepWaiting,
  activeLine,
  onRun,
  onStep,
  onStop,
  logs,
  onClearLogs,
  executionSpeed,
  onChangeSpeed,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: Math.max(20, typeof window !== 'undefined' ? Math.floor(window.innerWidth * 0.5 - 270) : 280),
    y: Math.max(80, typeof window !== 'undefined' ? window.innerHeight - 310 : 420),
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
    origX: 0,
    origY: 0,
  });

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

  const activeScript = scripts.find((s) => s.id === activeScriptId) || scripts[0];
  const codeLines = activeScript.code.split('\n');

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current.dragging) return;
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      const nextX = Math.max(8, Math.min(window.innerWidth - 320, dragRef.current.origX + dx));
      const nextY = Math.max(52, Math.min(window.innerHeight - 60, dragRef.current.origY + dy));
      setPosition({ x: nextX, y: nextY });
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

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: position.x,
      origY: position.y,
    };
  };

  const handleInsertSnippet = (snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      onUpdateCode(activeScript.code + snippet);
      return;
    }
    const start = ta.selectionStart ?? activeScript.code.length;
    const end = ta.selectionEnd ?? activeScript.code.length;
    const nextCode = activeScript.code.slice(0, start) + snippet + activeScript.code.slice(end);
    onUpdateCode(nextCode);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + snippet.length;
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      handleInsertSnippet('    ');
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
      }}
      className="fixed top-0 left-0 z-30 w-[540px] max-w-[95vw] pointer-events-auto rounded-md border border-[#52565A] bg-[#232527] shadow-2xl"
    >
      {/* Window Header — Styled Directly After Reference Screenshot */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className="flex items-center justify-between gap-2 px-2.5 py-2 bg-[#474A4D] border-b border-[#5A5E62] cursor-move rounded-t-md select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Play / Run Button */}
          {!isRunning || isStepWaiting ? (
            <button
              onClick={onRun}
              title="Run Python Script (Play)"
              className="w-7 h-7 flex items-center justify-center rounded bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white transition-transform shrink-0 border border-[#84B034]"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onStop}
              title="Stop Execution"
              className="w-7 h-7 flex items-center justify-center rounded bg-[#C94A38] hover:bg-[#DF5643] active:scale-95 text-white transition-transform shrink-0 border border-[#E57365]"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>
          )}

          {/* Step Button (Outline Triangle like Reference Screenshot) */}
          <button
            onClick={onStep}
            title="Step 1 Line"
            className="w-7 h-7 flex items-center justify-center rounded bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white transition-transform shrink-0 border border-[#84B034]"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current stroke-2">
              <polygon points="8,5 19,12 8,19" />
            </svg>
          </button>

          {/* Script File Tabs (`main`, etc.) */}
          <div className="flex items-center gap-1 ml-1 overflow-x-auto">
            {scripts.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onSelectScript(tab.id)}
                className={`px-2.5 py-1 text-xs font-mono-code rounded transition-colors whitespace-nowrap shrink-0 ${
                  tab.id === activeScript.id
                    ? 'bg-[#232527] text-white font-semibold border border-[#658B1E]'
                    : 'text-[#D0D4D8] hover:bg-[#36393C]'
                }`}
              >
                {tab.name}
              </button>
            ))}
            <button
              onClick={onAddScript}
              title="New Script Tab"
              className="px-2 py-0.5 text-xs font-mono-code rounded bg-[#36393C] hover:bg-[#658B1E] text-white transition-colors shrink-0"
            >
              +
            </button>
          </div>
        </div>

        {/* Right Window Controls (Speed, Minimize, Close) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => onChangeSpeed(executionSpeed === 1 ? 2 : executionSpeed === 2 ? 4 : 1)}
            title="Execution Speed"
            className="px-2 h-7 text-xs font-mono-code rounded bg-[#333639] hover:bg-[#3F4347] text-[#E5A93C] border border-[#585C60] whitespace-nowrap shrink-0"
          >
            {executionSpeed}x
          </button>

          {/* Minimize Button */}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            title={isMinimized ? 'Expand Editor' : 'Minimize Editor'}
            className="w-7 h-7 flex items-center justify-center rounded bg-[#658B1E] hover:bg-[#76A124] text-white transition-colors border border-[#84B034] shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current stroke-[2.5]">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            title="Close Editor (Reopen with + at top right)"
            className="w-7 h-7 flex items-center justify-center rounded bg-[#658B1E] hover:bg-[#76A124] text-white transition-colors border border-[#84B034] shrink-0"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 stroke-current stroke-[2.5]">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Quick Touch/Click Python API Snippet Bar */}
          <div className="flex items-center gap-1 px-2.5 py-1.5 bg-[#2A2D30] border-b border-[#3A3D40] overflow-x-auto">
            {QUICK_SNIPPETS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleInsertSnippet(item.snippet)}
                className="px-2 py-0.5 text-[11px] font-mono-code rounded bg-[#363A3E] hover:bg-[#658B1E] text-[#E8ECEF] transition-colors whitespace-nowrap shrink-0"
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Code Editor Body with Line Gutter & Active Line Highlight */}
          <div className="relative flex h-44 bg-[#252729]">
            {/* Line Number Gutter */}
            <div
              ref={gutterRef}
              className="w-10 py-2.5 bg-[#1D1F21] border-r border-[#35383B] text-right pr-2 select-none overflow-hidden font-mono-code text-xs text-[#757B82] leading-5"
            >
              {codeLines.map((_, idx) => {
                const ln = idx + 1;
                const isAct = activeLine === ln;
                return (
                  <div
                    key={ln}
                    className={`h-5 ${
                      isAct ? 'text-[#A8E040] font-bold bg-[#658B1E]/30 -mr-2 pr-2' : ''
                    }`}
                  >
                    {ln}
                  </div>
                );
              })}
            </div>

            {/* Active Execution Line Highlight Bar */}
            <div className="relative flex-1 h-full overflow-hidden">
              {activeLine !== null && (
                <div
                  style={{
                    transform: `translateY(${(activeLine - 1) * 20 + 10 - (textareaRef.current?.scrollTop || 0)}px)`,
                  }}
                  className="pointer-events-none absolute left-0 right-0 h-5 bg-[#658B1E]/25 border-y border-[#84B034]/40 transition-transform duration-75"
                />
              )}

              <textarea
                ref={textareaRef}
                value={activeScript.code}
                onChange={(e) => onUpdateCode(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                placeholder="# Write Python code here..."
                className="relative z-10 w-full h-full px-3 py-2.5 bg-transparent text-[#F1F3F5] font-mono-code text-xs leading-5 resize-none focus:outline-none overflow-y-auto"
              />
            </div>
          </div>

          {/* Footer / Console Output Drawer */}
          <div className="border-t border-[#3A3D40] bg-[#1C1E20] rounded-b-md">
            <div className="flex items-center justify-between px-3 py-1 text-[11px] text-[#A0A6AD]">
              <button
                onClick={() => setShowConsole(!showConsole)}
                className="flex items-center gap-1.5 hover:text-white transition-colors whitespace-nowrap shrink-0"
              >
                <span>{showConsole ? '▾' : '▸'} Console Output ({logs.length})</span>
                {activeLine !== null && (
                  <span className="text-[#A8E040] font-mono-code">
                    · Line {activeLine}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-3">
                {isRunning && (
                  <button
                    onClick={onStop}
                    className="text-[#F07167] hover:underline font-medium whitespace-nowrap shrink-0"
                  >
                    Stop
                  </button>
                )}
                <button
                  onClick={onClearLogs}
                  className="hover:text-white transition-colors whitespace-nowrap shrink-0"
                >
                  Clear
                </button>
              </div>
            </div>

            {showConsole && (
              <div className="h-20 px-3 py-1.5 overflow-y-auto font-mono-code text-[11px] space-y-1 border-t border-[#2C2F33]">
                {logs.length === 0 ? (
                  <div className="text-[#6C7278] italic">
                    Ready. Click Play (▶) or Step (▷) to run Python code.
                  </div>
                ) : (
                  logs.map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-2 leading-4 ${
                        entry.type === 'error'
                          ? 'text-[#FF7B72]'
                          : entry.type === 'warn'
                          ? 'text-[#F2CC60]'
                          : entry.type === 'print'
                          ? 'text-[#A5D6FF]'
                          : entry.type === 'action'
                          ? 'text-[#A8E040]'
                          : 'text-[#C9D1D9]'
                      }`}
                    >
                      <span className="text-[#6E7681] shrink-0">{entry.timestamp}</span>
                      <span className="break-words">{entry.message}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
