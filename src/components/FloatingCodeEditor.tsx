import React, { useState, useRef, useEffect } from 'react';
import { ConsoleLogEntry, ScriptTab } from '../types/game';

interface FloatingCodeEditorProps {
  isOpen: boolean;
  onClose: () => void;
  scripts: ScriptTab[];
  activeScriptId: string;
  runningScriptId: string | null;
  newlyCreatedId?: string | null;
  onClearNewlyCreated?: () => void;
  onSelectScript: (id: string) => void;
  onUpdateCode: (id: string, code: string) => void;
  onAddScript: (customName?: string) => string;
  onRenameScript: (id: string, newName: string) => void;
  onToggleMinimizeScript: (id: string) => void;
  onCloseScriptWindow: (id: string) => void;
  onMoveScriptWindow: (id: string, x: number, y: number) => void;
  onResizeScriptWindow?: (id: string, width: number, height: number) => void;
  isRunning: boolean;
  isStepWaiting: boolean;
  activeLine: number | null;
  onRun: (scriptId: string) => void;
  onStep: (scriptId: string) => void;
  onStop: () => void;
  logs: ConsoleLogEntry[];
  onClearLogs: () => void;
  executionSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

interface SingleWindowProps {
  script: ScriptTab;
  isActive: boolean;
  isThisRunning: boolean;
  isStepWaiting: boolean;
  activeLine: number | null;
  autoFocusRename: boolean;
  onClearAutoFocusRename?: () => void;
  onFocusWindow: () => void;
  onUpdateCode: (code: string) => void;
  onRename: (newName: string) => void;
  onAddNewPopup: () => void;
  onToggleMinimize: () => void;
  onCloseWindow: () => void;
  onMoveWindow: (x: number, y: number) => void;
  onResizeWindow?: (width: number, height: number) => void;
  onRunThis: () => void;
  onStepThis: () => void;
  onStop: () => void;
  logs: ConsoleLogEntry[];
  onClearLogs: () => void;
  executionSpeed: number;
  onChangeSpeed: (speed: number) => void;
}

type ResizeDirection = 'e' | 's' | 'se' | null;

const DEFAULT_WIDTH = 420;
const DEFAULT_HEIGHT = 192;
const MIN_WIDTH = 270;
const MIN_HEIGHT = 100;

const SingleFloatingScriptWindow: React.FC<SingleWindowProps> = ({
  script,
  isActive,
  isThisRunning,
  isStepWaiting,
  activeLine,
  autoFocusRename,
  onClearAutoFocusRename,
  onFocusWindow,
  onUpdateCode,
  onRename,
  onAddNewPopup,
  onToggleMinimize,
  onCloseWindow,
  onMoveWindow,
  onResizeWindow,
  onRunThis,
  onStepThis,
  onStop,
  logs,
  onClearLogs,
  executionSpeed,
  onChangeSpeed,
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(script.name);
  const [showConsole, setShowConsole] = useState(false);

  const [winWidth, setWinWidth] = useState<number>(script.width ?? DEFAULT_WIDTH);
  const [editorHeight, setEditorHeight] = useState<number>(script.height ?? DEFAULT_HEIGHT);

  useEffect(() => {
    if (typeof script.width === 'number') setWinWidth(script.width);
  }, [script.width]);

  useEffect(() => {
    if (typeof script.height === 'number') setEditorHeight(script.height);
  }, [script.height]);

  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);

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
    origX: script.x ?? 24,
    origY: script.y ?? 80,
  });

  const resizeRef = useRef<{
    resizing: ResizeDirection;
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  }>({
    resizing: null,
    startX: 0,
    startY: 0,
    origW: winWidth,
    origH: editorHeight,
  });

  useEffect(() => {
    if (autoFocusRename) {
      setIsEditingName(true);
      setNameDraft(script.name);
      onClearAutoFocusRename?.();
    }
  }, [autoFocusRename, onClearAutoFocusRename, script.name]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (dragRef.current.dragging) {
        const dx = e.clientX - dragRef.current.startX;
        const dy = e.clientY - dragRef.current.startY;
        const nextX = Math.max(8, Math.min(window.innerWidth - 200, dragRef.current.origX + dx));
        const nextY = Math.max(46, Math.min(window.innerHeight - 44, dragRef.current.origY + dy));
        onMoveWindow(nextX, nextY);
      } else if (resizeRef.current.resizing) {
        const dir = resizeRef.current.resizing;
        const dx = e.clientX - resizeRef.current.startX;
        const dy = e.clientY - resizeRef.current.startY;

        let nextW = resizeRef.current.origW;
        let nextH = resizeRef.current.origH;

        const maxW = Math.max(MIN_WIDTH, window.innerWidth - (script.x ?? 24) - 12);
        const maxH = Math.max(MIN_HEIGHT, window.innerHeight - (script.y ?? 80) - 90);

        if (dir === 'e' || dir === 'se') {
          nextW = Math.max(MIN_WIDTH, Math.min(maxW, Math.round(resizeRef.current.origW + dx)));
          setWinWidth(nextW);
        }
        if (dir === 's' || dir === 'se') {
          nextH = Math.max(MIN_HEIGHT, Math.min(maxH, Math.round(resizeRef.current.origH + dy)));
          setEditorHeight(nextH);
        }

        onResizeWindow?.(nextW, nextH);
      }
    };

    const handlePointerUp = () => {
      dragRef.current.dragging = false;
      resizeRef.current.resizing = null;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [onMoveWindow, onResizeWindow, script.x, script.y]);

  const commitName = () => {
    const cleaned = nameDraft.trim();
    if (cleaned.length > 0) {
      onRename(cleaned);
    } else {
      setNameDraft(script.name);
    }
    setIsEditingName(false);
  };

  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    onFocusWindow();
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input')) {
      return;
    }
    dragRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origX: script.x ?? 24,
      origY: script.y ?? 80,
    };
  };

  const startResize = (dir: ResizeDirection) => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onFocusWindow();
    resizeRef.current = {
      resizing: dir,
      startX: e.clientX,
      startY: e.clientY,
      origW: winWidth,
      origH: editorHeight,
    };
  };

  const handleInsertSnippet = (snippet: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      onUpdateCode(script.code + snippet);
      return;
    }
    const start = ta.selectionStart ?? script.code.length;
    const end = ta.selectionEnd ?? script.code.length;
    const nextCode = script.code.slice(0, start) + snippet + script.code.slice(end);
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

  const codeLines = script.code.split('\n');
  const posX = script.x ?? 24;
  const posY = script.y ?? 80;
  const isMinimized = Boolean(script.isMinimized);

  return (
    <div
      onPointerDown={onFocusWindow}
      style={{
        transform: `translate3d(${posX}px, ${posY}px, 0)`,
        width: isMinimized ? 280 : winWidth,
        zIndex: script.zIndex ?? (isActive ? 38 : 30),
      }}
      className={`fixed top-0 left-0 pointer-events-auto rounded-[4px] border transition-shadow max-w-[96vw] ${
        isActive
          ? 'border-[#84B034] shadow-[0_12px_32px_rgba(0,0,0,0.65)]'
          : 'border-[#55595E] shadow-[0_6px_20px_rgba(0,0,0,0.45)]'
      } bg-[#212325]`}
    >
      {/* Window Header — Styled Directly After Reference Screenshot (Play, Step, Script Title, +, -, x) */}
      <div
        onPointerDown={handleHeaderPointerDown}
        className="flex items-center justify-between gap-2 px-2 py-1.5 bg-[#525558] border-b border-[#64686C] cursor-move rounded-t-[3px] select-none"
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {/* Play / Stop Button */}
          {!isThisRunning || isStepWaiting ? (
            <button
              onClick={onRunThis}
              title={`Run '${script.name}' (Play)`}
              className="w-6 h-6 flex items-center justify-center rounded-[3px] bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white transition-transform shrink-0 border border-[#84B034] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
          ) : (
            <button
              onClick={onStop}
              title="Stop Execution"
              className="w-6 h-6 flex items-center justify-center rounded-[3px] bg-[#C94A38] hover:bg-[#DF5643] active:scale-95 text-white transition-transform shrink-0 border border-[#E57365] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 fill-current">
                <rect x="6" y="6" width="12" height="12" />
              </svg>
            </button>
          )}

          {/* Step Button */}
          <button
            onClick={onStepThis}
            title={`Step 1 Line in '${script.name}'`}
            className="w-6 h-6 flex items-center justify-center rounded-[3px] bg-[#658B1E] hover:bg-[#76A124] active:scale-95 text-white transition-transform shrink-0 border border-[#84B034] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current stroke-2">
              <polygon points="8,5 19,12 8,19" />
            </svg>
          </button>

          {/* Editable Script Window Title */}
          {isEditingName ? (
            <input
              ref={nameInputRef}
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitName();
                } else if (e.key === 'Escape') {
                  setNameDraft(script.name);
                  setIsEditingName(false);
                }
              }}
              className="w-36 px-2 py-0.5 text-xs font-mono-code font-bold rounded bg-[#1D1F21] text-white border border-[#9CD03B] focus:outline-none"
            />
          ) : (
            <button
              onClick={() => {
                setIsEditingName(true);
                setNameDraft(script.name);
              }}
              title="Klik untuk mengganti nama script ini"
              className="px-1.5 py-0.5 text-xs font-mono-code font-bold text-white hover:text-[#B8F252] truncate flex items-center gap-1 cursor-pointer"
            >
              <span className="truncate">{script.name}</span>
              <span className="text-[10px] text-white/60 hover:text-white">✎</span>
            </button>
          )}
        </div>

        {/* Right Window Controls (+ New Pop-Up, Speed, - Minimize, x Close) */}
        <div className="flex items-center gap-1 shrink-0">
          {!isMinimized && (
            <>
              <button
                onClick={onAddNewPopup}
                title="Tambah Pop-Up Script Baru (+)"
                className="w-6 h-6 flex items-center justify-center rounded-[3px] bg-[#36393C] hover:bg-[#658B1E] text-white font-mono-code text-sm font-bold border border-[#6E7378] transition-colors cursor-pointer"
              >
                +
              </button>

              <button
                onClick={() =>
                  onChangeSpeed(executionSpeed === 1 ? 2 : executionSpeed === 2 ? 4 : 1)
                }
                title="Execution Speed"
                className="px-1.5 h-6 text-[11px] font-mono-code rounded-[3px] bg-[#333639] hover:bg-[#3F4347] text-[#E5A93C] border border-[#585C60] whitespace-nowrap cursor-pointer"
              >
                {executionSpeed}x
              </button>
            </>
          )}

          {/* Minimize Button (-) */}
          <button
            onClick={onToggleMinimize}
            title={isMinimized ? 'Perbesar Pop-Up Editor' : 'Kecilkan Pop-Up Editor (-)'}
            className="w-6 h-6 flex items-center justify-center rounded-[3px] bg-[#658B1E] hover:bg-[#76A124] text-white transition-colors border border-[#84B034] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current stroke-[2.8]">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          {/* Close Window Button (x) */}
          <button
            onClick={onCloseWindow}
            title="Tutup Pop-Up Script (x)"
            className="w-6 h-6 flex items-center justify-center rounded-[3px] bg-[#658B1E] hover:bg-[#C93B2B] text-white transition-colors border border-[#84B034] cursor-pointer"
          >
            <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 stroke-current stroke-[2.8]">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable Code Body */}
      {!isMinimized && (
        <>
          {/* Code Editor Area with Dynamic Manual Height */}
          <div
            style={{ height: `${editorHeight}px` }}
            className="relative flex bg-[#212325]"
          >
            {/* Line Number Gutter */}
            <div
              ref={gutterRef}
              className="w-8 py-2 bg-[#1A1C1E] border-r border-[#323538] text-right pr-1.5 select-none overflow-hidden font-mono-code text-[11px] text-[#6E747B] leading-5"
            >
              {codeLines.map((_, idx) => {
                const ln = idx + 1;
                const isAct = isThisRunning && activeLine === ln;
                return (
                  <div
                    key={ln}
                    className={`h-5 ${
                      isAct ? 'text-[#A8E040] font-bold bg-[#658B1E]/30 -mr-1.5 pr-1.5' : ''
                    }`}
                  >
                    {ln}
                  </div>
                );
              })}
            </div>

            {/* Active Execution Line Highlight & Textarea */}
            <div className="relative flex-1 h-full overflow-hidden">
              {isThisRunning && activeLine !== null && (
                <div
                  style={{
                    transform: `translateY(${
                      (activeLine - 1) * 20 + 8 - (textareaRef.current?.scrollTop || 0)
                    }px)`,
                  }}
                  className="pointer-events-none absolute left-0 right-0 h-5 bg-[#658B1E]/25 border-y border-[#84B034]/40 transition-transform duration-75"
                />
              )}

              <textarea
                ref={textareaRef}
                value={script.code}
                onChange={(e) => onUpdateCode(e.target.value)}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                spellCheck={false}
                autoCapitalize="off"
                autoComplete="off"
                placeholder="# Write Python code here..."
                className="relative z-10 w-full h-full px-2.5 py-2 bg-transparent text-[#F1F3F5] font-mono-code text-xs leading-5 resize-none focus:outline-none overflow-y-auto"
              />
            </div>
          </div>

          {/* Compact Console Drawer Footer */}
          <div className="relative border-t border-[#36393D] bg-[#1A1C1E] rounded-b-[3px]">
            <div className="flex items-center justify-between pl-2.5 pr-6 py-1 text-[10px] text-[#9BA1A8]">
              <button
                onClick={() => setShowConsole(!showConsole)}
                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer"
              >
                <span>{showConsole ? '▾' : '▸'} Console ({logs.length})</span>
                {isThisRunning && activeLine !== null && (
                  <span className="text-[#A8E040] font-mono-code">· Line {activeLine}</span>
                )}
              </button>
              {showConsole && (
                <button
                  onClick={onClearLogs}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            {showConsole && (
              <div className="h-16 px-2.5 py-1 overflow-y-auto font-mono-code text-[10px] space-y-0.5 border-t border-[#2A2D31]">
                {logs.length === 0 ? (
                  <div className="text-[#6C7278] italic">Ready.</div>
                ) : (
                  logs.slice(-15).map((entry) => (
                    <div
                      key={entry.id}
                      className={`flex items-start gap-1.5 leading-4 ${
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

          {/* Manual Resize Handles: Right Edge (Width), Bottom Edge (Height), and Bottom-Right Corner Grip */}
          <div
            onPointerDown={startResize('e')}
            title="Tarik untuk mengubah lebar tab coding"
            className="absolute top-8 right-0 bottom-3 w-2 cursor-ew-resize z-20"
          />
          <div
            onPointerDown={startResize('s')}
            title="Tarik untuk mengubah tinggi tab coding"
            className="absolute left-0 right-4 bottom-0 h-2 cursor-ns-resize z-20"
          />
          <div
            onPointerDown={startResize('se')}
            title="Tarik sudut ini untuk mengatur ukuran (size) tab coding"
            className="absolute right-0 bottom-0 w-4 h-4 cursor-nwse-resize z-30 flex items-end justify-end p-0.5 text-[#84B034] hover:text-[#B8F252]"
          >
            <svg viewBox="0 0 12 12" className="w-3 h-3 fill-none stroke-current stroke-[1.6]">
              <line x1="11" y1="3" x2="3" y2="11" />
              <line x1="11" y1="7" x2="7" y2="11" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
};

export const FloatingCodeEditor: React.FC<FloatingCodeEditorProps> = ({
  isOpen,
  scripts,
  activeScriptId,
  runningScriptId,
  newlyCreatedId,
  onClearNewlyCreated,
  onSelectScript,
  onUpdateCode,
  onAddScript,
  onRenameScript,
  onToggleMinimizeScript,
  onCloseScriptWindow,
  onMoveScriptWindow,
  onResizeScriptWindow,
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
  if (!isOpen) return null;

  const openWindows = scripts.filter((s) => s.isOpen !== false);

  return (
    <>
      {openWindows.map((script) => (
        <SingleFloatingScriptWindow
          key={script.id}
          script={script}
          isActive={script.id === activeScriptId}
          isThisRunning={isRunning && runningScriptId === script.id}
          isStepWaiting={isStepWaiting && runningScriptId === script.id}
          activeLine={runningScriptId === script.id ? activeLine : null}
          autoFocusRename={newlyCreatedId === script.id}
          onClearAutoFocusRename={onClearNewlyCreated}
          onFocusWindow={() => onSelectScript(script.id)}
          onUpdateCode={(newCode) => onUpdateCode(script.id, newCode)}
          onRename={(newName) => onRenameScript(script.id, newName)}
          onAddNewPopup={() => onAddScript()}
          onToggleMinimize={() => onToggleMinimizeScript(script.id)}
          onCloseWindow={() => onCloseScriptWindow(script.id)}
          onMoveWindow={(nx, ny) => onMoveScriptWindow(script.id, nx, ny)}
          onResizeWindow={(nw, nh) => onResizeScriptWindow?.(script.id, nw, nh)}
          onRunThis={() => onRun(script.id)}
          onStepThis={() => onStep(script.id)}
          onStop={onStop}
          logs={logs}
          onClearLogs={onClearLogs}
          executionSpeed={executionSpeed}
          onChangeSpeed={onChangeSpeed}
        />
      ))}
    </>
  );
};

