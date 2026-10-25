import { Direction, ImplementType } from '../types/game';

export interface ExecutionContext {
  // Queries
  getTractorState: (tractorIdx?: number) => {
    x: number;
    z: number;
    direction: Direction;
    fuel: number;
    max_fuel: number;
    tool: ImplementType;
    cargo: number;
    max_cargo: number;
  };
  getTractorCount: () => number;
  getWorldSize: () => number;
  checkSoil: (tractorIdx?: number) => string;
  canHarvest: (tractorIdx?: number) => boolean;
  measureCrop: (tractorIdx?: number) => number;
  getElapsedTime: () => number;
  isNodeUnlocked: (nodeId: string) => boolean;
  getScriptCodeByName?: (scriptName: string) => string | null;

  // Async Actions (each awaits simulation tick)
  setActiveTractorIndex: (idx: number) => void;
  setSimSpeed: (speed: number) => void;
  startHelper: (idx: number, seed: string) => Promise<void>;
  fertilize: (tractorIdx?: number) => Promise<void>;
  clearField: () => Promise<void>;
  move: (arg?: number | string, tractorIdx?: number) => Promise<void>;
  turn: (dir: string, tractorIdx?: number) => Promise<void>;
  equip: (tool: string, tractorIdx?: number) => Promise<void>;
  plow: (tractorIdx?: number) => Promise<void>;
  plant: (seed?: string, tractorIdx?: number) => Promise<void>;
  harvest: (tractorIdx?: number) => Promise<void>;
  refuel: (tractorIdx?: number) => Promise<void>;
  deliver: (tractorIdx?: number) => Promise<void>;
  goToFuel: (tractorIdx?: number) => Promise<void>;
  goToBarn: (tractorIdx?: number) => Promise<void>;
  goToCoord: (targetX: number, targetZ: number, tractorIdx?: number) => Promise<void>;

  // Telemetry & UI callbacks
  onActiveLine: (line: number) => void;
  onLog: (type: 'info' | 'print' | 'warn' | 'error' | 'action', message: string, line?: number) => void;
  shouldStop: () => boolean;
  waitStepGate: () => Promise<void>;
}

interface ParsedLine {
  lineNumber: number; // 1-indexed
  indent: number;
  text: string;
}

const DEFAULT_SEEDS = ['wheat', 'carrot', 'corn', 'wood'];

export class AgroPythonInterpreter {
  private ctx: ExecutionContext;
  private variables: Record<string, any> = {};
  private functions: Record<string, { params: string[]; body: ParsedLine[] }> = {};
  private stepCount: number = 0;

  constructor(ctx: ExecutionContext) {
    this.ctx = ctx;
  }

  private checkSyntaxUnlock(nodeId: string, label: string, line: number) {
    if (!this.ctx.isNodeUnlocked(nodeId)) {
      throw new Error(
        `Line ${line}: Python feature '${label}' is locked. Unlock it first in the Tech Tree (^).`
      );
    }
  }

  public async execute(rawCode: string): Promise<void> {
    this.variables = {};
    this.functions = {};
    this.stepCount = 0;
    this.ctx.setActiveTractorIndex(0);

    const lines = this.preprocessLines(rawCode);
    if (lines.length === 0) {
      this.ctx.onLog(
        'warn',
        'Code editor is empty. Write Python commands like move(1), plow(), plant("wheat"), or harvest().'
      );
      return;
    }

    await this.runBlock(lines, 0, lines.length);
  }

  private preprocessLines(rawCode: string): ParsedLine[] {
    const rawLines = rawCode.split('\n');
    const result: ParsedLine[] = [];

    for (let i = 0; i < rawLines.length; i++) {
      const raw = rawLines[i];
      let cleaned = '';
      let inQuotes = false;
      let quoteChar = '';
      for (let c = 0; c < raw.length; c++) {
        const ch = raw[c];
        if ((ch === '"' || ch === "'") && (c === 0 || raw[c - 1] !== '\\')) {
          if (!inQuotes) {
            inQuotes = true;
            quoteChar = ch;
          } else if (ch === quoteChar) {
            inQuotes = false;
          }
        }
        if (ch === '#' && !inQuotes) {
          break;
        }
        cleaned += ch;
      }

      if (cleaned.trim().length === 0) continue;

      let indent = 0;
      for (let c = 0; c < cleaned.length; c++) {
        if (cleaned[c] === ' ') indent += 1;
        else if (cleaned[c] === '\t') indent += 4;
        else break;
      }

      result.push({
        lineNumber: i + 1,
        indent,
        text: cleaned.trim(),
      });
    }

    return result;
  }

  private findSubBlockEnd(lines: ParsedLine[], startIdx: number, parentIndent: number): number {
    let idx = startIdx;
    while (idx < lines.length && lines[idx].indent > parentIndent) {
      idx++;
    }
    return idx;
  }

  private async runBlock(lines: ParsedLine[], startIdx: number, endIdx: number): Promise<void> {
    let i = startIdx;

    while (i < endIdx) {
      if (this.ctx.shouldStop()) return;

      const current = lines[i];
      const { lineNumber, indent, text } = current;

      this.ctx.onActiveLine(lineNumber);
      await this.ctx.waitStepGate();
      if (this.ctx.shouldStop()) return;

      this.stepCount++;
      if (this.stepCount > 8000) {
        throw new Error(
          'Execution stopped automatically after 8000 steps to prevent an infinite loop without actions.'
        );
      }

      // 1. import random or import <script_window_name>
      if (text.startsWith('import ')) {
        const importedName = text.slice(7).trim();
        if (importedName === 'random') {
          this.checkSyntaxUnlock('kode_random', 'import random', lineNumber);
        } else if (this.ctx.getScriptCodeByName) {
          const extCode = this.ctx.getScriptCodeByName(importedName);
          if (extCode !== null) {
            const extLines = this.preprocessLines(extCode);
            await this.runBlock(extLines, 0, extLines.length);
          } else {
            throw new Error(`Line ${lineNumber}: No script window named '${importedName}' found.`);
          }
        }
        i++;
        continue;
      }

      // 2. def function_name(params):
      if (text.startsWith('def ')) {
        this.checkSyntaxUnlock('kode_def', 'def', lineNumber);
        const match = text.match(/^def\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*:$/);
        if (!match) {
          throw new Error(`Line ${lineNumber}: Invalid function syntax. Use: def function_name():`);
        }
        const fnName = match[1];
        const params = match[2]
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);

        const blockEnd = this.findSubBlockEnd(lines, i + 1, indent);
        if (blockEnd === i + 1) {
          throw new Error(`Line ${lineNumber}: Function '${fnName}' requires an indented body.`);
        }

        this.functions[fnName] = {
          params,
          body: lines.slice(i + 1, blockEnd),
        };
        i = blockEnd;
        continue;
      }

      // 3. while condition:
      if (text.startsWith('while ')) {
        this.checkSyntaxUnlock('kode_while', 'while', lineNumber);
        if (!text.endsWith(':')) {
          throw new Error(`Line ${lineNumber}: Missing colon ':' at the end of while statement.`);
        }
        const condExpr = text.slice(6, -1).trim();
        const blockEnd = this.findSubBlockEnd(lines, i + 1, indent);
        if (blockEnd === i + 1) {
          throw new Error(`Line ${lineNumber}: 'while' block requires indented statements.`);
        }

        let loopGuard = 0;
        while (!this.ctx.shouldStop() && Boolean(this.evalExpr(condExpr, lineNumber))) {
          const prevSteps = this.stepCount;
          await this.runBlock(lines, i + 1, blockEnd);
          if (this.ctx.shouldStop()) return;
          loopGuard++;
          if (this.stepCount === prevSteps || loopGuard % 25 === 0) {
            await new Promise((r) => setTimeout(r, 16));
          }
          this.ctx.onActiveLine(lineNumber);
        }

        i = blockEnd;
        continue;
      }

      // 4. for var in ...:
      if (text.startsWith('for ')) {
        this.checkSyntaxUnlock('kode_for', 'for', lineNumber);
        const match = text.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s+in\s+(.+):$/);
        if (!match) {
          throw new Error(`Line ${lineNumber}: Invalid 'for' syntax. Example: for i in range(4):`);
        }
        const varName = match[1];
        const iterExpr = match[2].trim();
        const blockEnd = this.findSubBlockEnd(lines, i + 1, indent);
        if (blockEnd === i + 1) {
          throw new Error(`Line ${lineNumber}: 'for' block requires indented statements.`);
        }

        const iterable = this.evalIterable(iterExpr, lineNumber);
        for (const item of iterable) {
          if (this.ctx.shouldStop()) return;
          this.variables[varName] = item;
          await this.runBlock(lines, i + 1, blockEnd);
        }

        i = blockEnd;
        continue;
      }

      // 5. if / elif / else chain
      if (text.startsWith('if ')) {
        this.checkSyntaxUnlock('kode_if', 'if / else', lineNumber);
        if (!text.endsWith(':')) {
          throw new Error(`Line ${lineNumber}: Missing colon ':' at the end of if statement.`);
        }

        let cursor = i;
        let branchTaken = false;

        while (cursor < endIdx) {
          const branchLine = lines[cursor];
          if (branchLine.indent !== indent) break;

          const bText = branchLine.text;
          if (bText.startsWith('if ') && cursor === i) {
            const cond = bText.slice(3, -1).trim();
            const subEnd = this.findSubBlockEnd(lines, cursor + 1, indent);
            if (!branchTaken && Boolean(this.evalExpr(cond, branchLine.lineNumber))) {
              branchTaken = true;
              await this.runBlock(lines, cursor + 1, subEnd);
            }
            cursor = subEnd;
          } else if (bText.startsWith('elif ')) {
            if (!bText.endsWith(':')) {
              throw new Error(`Line ${branchLine.lineNumber}: Missing ':' on elif.`);
            }
            const cond = bText.slice(5, -1).trim();
            const subEnd = this.findSubBlockEnd(lines, cursor + 1, indent);
            if (!branchTaken && Boolean(this.evalExpr(cond, branchLine.lineNumber))) {
              branchTaken = true;
              await this.runBlock(lines, cursor + 1, subEnd);
            }
            cursor = subEnd;
          } else if (bText === 'else:') {
            const subEnd = this.findSubBlockEnd(lines, cursor + 1, indent);
            if (!branchTaken) {
              branchTaken = true;
              await this.runBlock(lines, cursor + 1, subEnd);
            }
            cursor = subEnd;
            break;
          } else {
            break;
          }
        }

        i = cursor;
        continue;
      }

      // 6. Variable Assignment: x = expr
      const assignMatch = text.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([^=].*)$/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const rhs = assignMatch[2].trim();
        if (rhs.startsWith('[')) {
          this.checkSyntaxUnlock('kode_list', 'list ([...])', lineNumber);
        } else if (rhs.startsWith('{')) {
          this.checkSyntaxUnlock('kode_dict', 'dict ({...})', lineNumber);
        }
        this.variables[varName] = this.evalExpr(rhs, lineNumber);
        i++;
        continue;
      }

      // 7. Compound Assignment: x += expr, x -= expr, x *= expr
      const compoundMatch = text.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*(\+=|-=|\*=)\s*(.+)$/);
      if (compoundMatch) {
        const varName = compoundMatch[1];
        const op = compoundMatch[2];
        const rhsVal = Number(this.evalExpr(compoundMatch[3].trim(), lineNumber));
        const curVal = Number(this.variables[varName] ?? 0);
        if (op === '+=') this.variables[varName] = curVal + rhsVal;
        else if (op === '-=') this.variables[varName] = curVal - rhsVal;
        else if (op === '*=') this.variables[varName] = curVal * rhsVal;
        i++;
        continue;
      }

      // 8. Function or Method Call (including tractors[i].method())
      await this.executeStatementCall(text, lineNumber);
      i++;
    }
  }

  private evalIterable(expr: string, line: number): any[] {
    const rangeMatch = expr.match(/^range\s*\(([^)]+)\)$/);
    if (rangeMatch) {
      const parts = rangeMatch[1].split(',').map((s) => Number(this.evalExpr(s.trim(), line)));
      const result: number[] = [];
      if (parts.length === 1) {
        for (let k = 0; k < parts[0]; k++) result.push(k);
      } else if (parts.length >= 2) {
        const step = parts[2] ?? 1;
        if (step === 0) throw new Error(`Line ${line}: range() step cannot be 0.`);
        if (step > 0) {
          for (let k = parts[0]; k < parts[1]; k += step) result.push(k);
        } else {
          for (let k = parts[0]; k > parts[1]; k += step) result.push(k);
        }
      }
      return result;
    }

    const val = this.evalExpr(expr, line);
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object') return Object.keys(val);
    throw new Error(`Line ${line}: '${expr}' is not a list or range().`);
  }

  private async executeStatementCall(stmt: string, line: number): Promise<void> {
    if (stmt === 'pass') return;

    // Support indexed tractor method calls: tractors[1].move(1), tractors[i].plant("corn")
    const indexedTractorMatch = stmt.match(/^tractors\[(.+)\]\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\((.*)\)$/);
    let specificTractorIdx: number | undefined = undefined;
    let rawName = '';
    let rawArgs = '';

    if (indexedTractorMatch) {
      specificTractorIdx = Number(this.evalExpr(indexedTractorMatch[1], line));
      rawName = indexedTractorMatch[2];
      rawArgs = indexedTractorMatch[3].trim();
    } else {
      const callMatch = stmt.match(/^([a-zA-Z_][a-zA-Z0-9_.]*)\s*\((.*)\)$/);
      if (!callMatch) {
        throw new Error(
          `Line ${line}: Unrecognized Python statement '${stmt}'. Use functions like move(1), turn("right"), plow(), plant("wheat"), or harvest().`
        );
      }
      rawName = callMatch[1];
      rawArgs = callMatch[2].trim();
    }

    const args =
      rawArgs.length > 0 ? this.splitArgs(rawArgs).map((a) => this.evalExpr(a, line)) : [];

    const fnName = rawName.replace(/^(tractor|traktor)\./, '');
    const shortFnName = fnName.includes('.') ? fnName.split('.').pop()! : fnName;

    if (this.functions[fnName] || this.functions[shortFnName]) {
      const fnDef = this.functions[fnName] || this.functions[shortFnName];
      const prevVars = { ...this.variables };
      fnDef.params.forEach((p, idx) => {
        this.variables[p] = args[idx];
      });
      await this.runBlock(fnDef.body, 0, fnDef.body.length);
      this.variables = prevVars;
      return;
    }

    switch (fnName) {
      case 'print': {
        this.checkSyntaxUnlock('kode_print', 'print()', line);
        const msg = args
          .map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a)))
          .join(' ');
        this.ctx.onLog('print', msg, line);
        break;
      }
      case 'use_tractor':
      case 'select_tractor': {
        const idx = Number(args[0] ?? 0);
        this.ctx.setActiveTractorIndex(idx);
        this.ctx.onLog('info', `Switched active control to Tractor #${idx + 1}.`, line);
        break;
      }
      case 'start_helper':
      case 'spawn_helper': {
        const idx = Number(args[0] ?? 1);
        const seed = String(args[1] ?? 'wheat').toLowerCase();
        await this.ctx.startHelper(idx, seed);
        break;
      }
      case 'set_speed': {
        const spd = Math.max(0.5, Math.min(5, Number(args[0] ?? 1)));
        this.ctx.setSimSpeed(spd);
        this.ctx.onLog('info', `set_speed(${spd}x)`, line);
        break;
      }
      case 'fertilize':
      case 'pupuk': {
        this.checkSyntaxUnlock('alat_pupuk', 'fertilize()', line);
        await this.ctx.fertilize(specificTractorIdx);
        break;
      }
      case 'clear':
      case 'reset_field': {
        await this.ctx.clearField();
        break;
      }
      case 'move':
      case 'maju': {
        const arg0 = args[0];
        if (
          typeof arg0 === 'string' &&
          ['north', 'east', 'south', 'west', 'right', 'left'].includes(arg0.toLowerCase())
        ) {
          await this.ctx.move(arg0.toLowerCase(), specificTractorIdx);
        } else {
          const steps = arg0 !== undefined ? Number(arg0) : 1;
          await this.ctx.move(Math.max(1, Math.min(28, Math.round(steps))), specificTractorIdx);
        }
        break;
      }
      case 'turn':
      case 'belok': {
        const dir = String(args[0] ?? 'right').toLowerCase();
        await this.ctx.turn(dir, specificTractorIdx);
        break;
      }
      case 'equip':
      case 'pasang_alat': {
        const toolName = String(args[0] ?? 'plow').toLowerCase();
        await this.ctx.equip(toolName, specificTractorIdx);
        break;
      }
      case 'plow':
      case 'till':
      case 'bajak': {
        await this.ctx.plow(specificTractorIdx);
        break;
      }
      case 'plant':
      case 'tanam': {
        const seed = args[0] !== undefined ? String(args[0]).toLowerCase() : 'wheat';
        await this.ctx.plant(seed, specificTractorIdx);
        break;
      }
      case 'harvest':
      case 'panen': {
        await this.ctx.harvest(specificTractorIdx);
        break;
      }
      case 'refuel':
      case 'isi_bahan_bakar': {
        await this.ctx.refuel(specificTractorIdx);
        break;
      }
      case 'deliver':
      case 'unload':
      case 'kirim_ke_gudang': {
        await this.ctx.deliver(specificTractorIdx);
        break;
      }
      case 'go_to_fuel':
      case 'ke_pom_bensin': {
        await this.ctx.goToFuel(specificTractorIdx);
        break;
      }
      case 'go_to_barn':
      case 'ke_gudang': {
        await this.ctx.goToBarn(specificTractorIdx);
        break;
      }
      case 'goto':
      case 'go_to':
      case 'ke': {
        const tx = Number(args[0] ?? 0);
        const tz = Number(args[1] ?? 0);
        await this.ctx.goToCoord(tx, tz, specificTractorIdx);
        break;
      }
      case 'check_soil':
      case 'get_ground_type':
      case 'cek_tanah': {
        const res = this.ctx.checkSoil(specificTractorIdx);
        this.ctx.onLog('info', `check_soil() -> "${res}"`, line);
        break;
      }
      case 'can_harvest':
      case 'tanaman_siap': {
        const ready = this.ctx.canHarvest(specificTractorIdx);
        this.ctx.onLog('info', `can_harvest() -> ${ready ? 'True' : 'False'}`, line);
        break;
      }
      case 'measure': {
        const m = this.ctx.measureCrop(specificTractorIdx);
        this.ctx.onLog('info', `measure() -> ${m}%`, line);
        break;
      }
      case 'status': {
        const st = this.ctx.getTractorState(specificTractorIdx);
        this.ctx.onLog(
          'info',
          `status() -> pos=(${st.x}, ${st.z}), dir="${st.direction}", fuel=${Math.round(st.fuel)}/${st.max_fuel}, tool="${st.tool}", cargo=${st.cargo}/${st.max_cargo}`,
          line
        );
        break;
      }
      default:
        throw new Error(`Line ${line}: Unknown Python function '${rawName}()'.`);
    }
  }

  private splitArgs(raw: string): string[] {
    const result: string[] = [];
    let current = '';
    let depth = 0;
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < raw.length; i++) {
      const ch = raw[i];
      if ((ch === '"' || ch === "'") && (i === 0 || raw[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = ch;
        } else if (ch === quoteChar) {
          inQuotes = false;
        }
      }
      if (!inQuotes) {
        if (ch === '[' || ch === '(' || ch === '{') depth++;
        if (ch === ']' || ch === ')' || ch === '}') depth--;
        if (ch === ',' && depth === 0) {
          result.push(current.trim());
          current = '';
          continue;
        }
      }
      current += ch;
    }
    if (current.trim().length > 0) {
      result.push(current.trim());
    }
    return result;
  }

  private evalExpr(expr: string, line: number): any {
    const trimmed = expr.trim();
    if (!trimmed) return null;

    if (trimmed === 'True' || trimmed === 'true') return true;
    if (trimmed === 'False' || trimmed === 'false') return false;
    if (trimmed === 'None') return null;

    if (trimmed.includes(' or ')) {
      const parts = trimmed.split(/\s+or\s+/);
      return parts.some((p) => Boolean(this.evalExpr(p, line)));
    }
    if (trimmed.includes(' and ')) {
      const parts = trimmed.split(/\s+and\s+/);
      return parts.every((p) => Boolean(this.evalExpr(p, line)));
    }
    if (trimmed.startsWith('not ')) {
      return !Boolean(this.evalExpr(trimmed.slice(4), line));
    }

    const compOps = ['==', '!=', '<=', '>=', '<', '>'];
    for (const op of compOps) {
      const idx = this.findTopLevelOp(trimmed, op);
      if (idx !== -1) {
        const left = this.evalExpr(trimmed.slice(0, idx), line);
        const right = this.evalExpr(trimmed.slice(idx + op.length), line);
        switch (op) {
          case '==':
            return left === right;
          case '!=':
            return left !== right;
          case '<=':
            return Number(left) <= Number(right);
          case '>=':
            return Number(left) >= Number(right);
          case '<':
            return Number(left) < Number(right);
          case '>':
            return Number(left) > Number(right);
        }
      }
    }

    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      return trimmed.slice(1, -1);
    }

    if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
      return Number(trimmed);
    }

    // List literal [...]
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      this.checkSyntaxUnlock('kode_list', 'list ([...])', line);
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return [];
      return this.splitArgs(inner).map((item) => this.evalExpr(item, line));
    }

    // Tuple literal (x, y)
    if (trimmed.startsWith('(') && trimmed.endsWith(')') && trimmed.includes(',')) {
      const inner = trimmed.slice(1, -1).trim();
      return this.splitArgs(inner).map((item) => this.evalExpr(item, line));
    }

    // Dictionary literal {k: v}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      this.checkSyntaxUnlock('kode_dict', 'dict ({...})', line);
      const inner = trimmed.slice(1, -1).trim();
      if (!inner) return {};
      const entries = this.splitArgs(inner);
      const obj: Record<string, any> = {};
      for (const entry of entries) {
        const colonIdx = entry.indexOf(':');
        if (colonIdx !== -1) {
          const k = String(this.evalExpr(entry.slice(0, colonIdx), line));
          const v = this.evalExpr(entry.slice(colonIdx + 1), line);
          obj[k] = v;
        }
      }
      return obj;
    }

    // Indexing arr[idx] or dict[key]
    const indexMatch = trimmed.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\[(.+)\]$/);
    if (indexMatch) {
      const target = this.variables[indexMatch[1]];
      const keyOrIdx = this.evalExpr(indexMatch[2], line);
      if (Array.isArray(target)) {
        const idx = Number(keyOrIdx);
        return target[((idx % target.length) + target.length) % target.length];
      }
      if (target && typeof target === 'object') {
        return target[String(keyOrIdx)];
      }
      throw new Error(`Line ${line}: '${indexMatch[1]}' is not a list or dict.`);
    }

    const addIdx = this.findTopLevelOp(trimmed, '+');
    if (addIdx !== -1) {
      const l = this.evalExpr(trimmed.slice(0, addIdx), line);
      const r = this.evalExpr(trimmed.slice(addIdx + 1), line);
      if (typeof l === 'string' || typeof r === 'string') return String(l) + String(r);
      return Number(l) + Number(r);
    }
    const subIdx = this.findTopLevelOp(trimmed, '-');
    if (subIdx > 0) {
      const l = this.evalExpr(trimmed.slice(0, subIdx), line);
      const r = this.evalExpr(trimmed.slice(subIdx + 1), line);
      return Number(l) - Number(r);
    }
    const mulIdx = this.findTopLevelOp(trimmed, '*');
    if (mulIdx !== -1) {
      const l = this.evalExpr(trimmed.slice(0, mulIdx), line);
      const r = this.evalExpr(trimmed.slice(mulIdx + 1), line);
      return Number(l) * Number(r);
    }
    const floorDivIdx = this.findTopLevelOp(trimmed, '//');
    if (floorDivIdx !== -1) {
      const l = this.evalExpr(trimmed.slice(0, floorDivIdx), line);
      const r = this.evalExpr(trimmed.slice(floorDivIdx + 2), line);
      return Math.floor(Number(l) / Math.max(1, Number(r)));
    }
    const modIdx = this.findTopLevelOp(trimmed, '%');
    if (modIdx !== -1) {
      const l = this.evalExpr(trimmed.slice(0, modIdx), line);
      const r = this.evalExpr(trimmed.slice(modIdx + 1), line);
      return Number(l) % Number(r);
    }

    // Support tractors[i].can_harvest(), tractors[i].check_soil(), tractors[i].fuel, tractors[i].x, tractors[i].z
    const indexedPropMatch = trimmed.match(/^tractors\[(.+)\]\.([a-zA-Z_][a-zA-Z0-9_]*(\(\))?)$/);
    if (indexedPropMatch) {
      const tIdx = Number(this.evalExpr(indexedPropMatch[1], line));
      const member = indexedPropMatch[2];
      const tState = this.ctx.getTractorState(tIdx);
      if (member === 'can_harvest()') return this.ctx.canHarvest(tIdx);
      if (member === 'check_soil()' || member === 'get_ground_type()') return this.ctx.checkSoil(tIdx);
      if (member === 'measure()') return this.ctx.measureCrop(tIdx);
      if (member === 'fuel') return tState.fuel;
      if (member === 'max_fuel') return tState.max_fuel;
      if (member === 'x') return tState.x;
      if (member === 'z' || member === 'y') return tState.z;
      if (member === 'direction') return tState.direction;
      if (member === 'tool') return tState.tool;
      if (member === 'cargo') return tState.cargo;
      if (member === 'max_cargo') return tState.max_cargo;
    }

    const normalizedCall = trimmed.replace(/^(tractor|traktor)\./, '');
    if (normalizedCall === 'can_harvest()' || normalizedCall === 'tanaman_siap()') {
      return this.ctx.canHarvest();
    }
    if (
      normalizedCall === 'check_soil()' ||
      normalizedCall === 'get_ground_type()' ||
      normalizedCall === 'cek_tanah()'
    ) {
      return this.ctx.checkSoil();
    }
    if (normalizedCall === 'get_world_size()' || normalizedCall === 'ukuran_ladang()') {
      return this.ctx.getWorldSize();
    }
    if (normalizedCall === 'num_tractors()' || normalizedCall === 'get_tractor_count()') {
      return this.ctx.getTractorCount();
    }
    if (normalizedCall === 'measure()') {
      return this.ctx.measureCrop();
    }
    if (normalizedCall === 'get_time()') {
      return this.ctx.getElapsedTime();
    }
    if (normalizedCall === 'status()') {
      return this.ctx.getTractorState();
    }

    const lenMatch = trimmed.match(/^len\((.+)\)$/);
    if (lenMatch) {
      const target = this.evalExpr(lenMatch[1], line);
      if (Array.isArray(target) || typeof target === 'string') return target.length;
      if (target && typeof target === 'object') return Object.keys(target).length;
      return 0;
    }

    const randChoiceMatch = trimmed.match(/^random\.choice\((.+)\)$/);
    if (randChoiceMatch) {
      this.checkSyntaxUnlock('kode_random', 'import random', line);
      const arr = this.evalExpr(randChoiceMatch[1], line);
      if (Array.isArray(arr) && arr.length > 0) {
        return arr[Math.floor(Math.random() * arr.length)];
      }
      return DEFAULT_SEEDS[Math.floor(Math.random() * DEFAULT_SEEDS.length)];
    }

    const randIntMatch = trimmed.match(/^random\.randint\(([^,]+),([^)]+)\)$/);
    if (randIntMatch) {
      this.checkSyntaxUnlock('kode_random', 'import random', line);
      const min = Math.ceil(Number(this.evalExpr(randIntMatch[1], line)));
      const max = Math.floor(Number(this.evalExpr(randIntMatch[2], line)));
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    const st = this.ctx.getTractorState();
    const prop = trimmed.replace(/^(tractor|traktor)\./, '');
    if (prop === 'fuel' || prop === 'bahan_bakar') return st.fuel;
    if (prop === 'max_fuel' || prop === 'kapasitas_solar') return st.max_fuel;
    if (prop === 'x' || trimmed === 'get_pos_x()') return st.x;
    if (prop === 'z' || prop === 'y' || trimmed === 'get_pos_y()') return st.z;
    if (prop === 'direction' || prop === 'arah') return st.direction;
    if (prop === 'tool' || prop === 'alat') return st.tool;
    if (prop === 'cargo' || prop === 'muatan') return st.cargo;
    if (prop === 'max_cargo' || prop === 'kapasitas_muatan') return st.max_cargo;

    if (trimmed in this.variables) {
      return this.variables[trimmed];
    }

    if (
      [
        'wheat',
        'carrot',
        'corn',
        'jagung',
        'wood',
        'right',
        'left',
        'north',
        'east',
        'south',
        'west',
        'plow',
        'seeder',
        'harvester',
        'trailer',
      ].includes(trimmed.toLowerCase())
    ) {
      return trimmed.toLowerCase();
    }

    throw new Error(`Line ${line}: Unknown identifier or expression '${trimmed}'.`);
  }

  private findTopLevelOp(expr: string, op: string): number {
    let depth = 0;
    let inQuotes = false;
    let quoteChar = '';
    for (let i = 0; i <= expr.length - op.length; i++) {
      const ch = expr[i];
      if ((ch === '"' || ch === "'") && (i === 0 || expr[i - 1] !== '\\')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = ch;
        } else if (ch === quoteChar) {
          inQuotes = false;
        }
      }
      if (!inQuotes) {
        if (ch === '(' || ch === '[' || ch === '{') depth++;
        else if (ch === ')' || ch === ']' || ch === '}') depth--;
        else if (depth === 0 && expr.slice(i, i + op.length) === op) {
          if ((op === '<' || op === '>') && expr[i + 1] === '=') continue;
          return i;
        }
      }
    }
    return -1;
  }
}
