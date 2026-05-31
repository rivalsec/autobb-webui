// Structured filter tree built by FilterBuilder and serialized into the
// `filter` query param. The backend (app/filters.py) validates + translates it.

export type Operator =
  | "eq"
  | "ne"
  | "contains"
  | "not_contains"
  | "matches"
  | "not_matches"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "exists"
  | "not_exists";

export interface Condition {
  kind: "condition";
  field: string;
  operator: Operator | "";
  value: string;
}

export interface Group {
  kind: "group";
  op: "and" | "or";
  rules: Node[];
}

export type Node = Group | Condition;

export const OPERATORS: Record<Operator, { symbol: string; label: string; noValue?: boolean }> = {
  eq: { symbol: "=", label: "equals" },
  ne: { symbol: "≠", label: "not equals" },
  contains: { symbol: "~", label: "contains" },
  not_contains: { symbol: "!~", label: "not contains" },
  matches: { symbol: "=~", label: "matches regex" },
  not_matches: { symbol: "!=~", label: "not matches regex" },
  gt: { symbol: ">", label: "greater than" },
  gte: { symbol: "≥", label: "at least" },
  lt: { symbol: "<", label: "less than" },
  lte: { symbol: "≤", label: "at most" },
  exists: { symbol: "∃", label: "exists", noValue: true },
  not_exists: { symbol: "∄", label: "not exists", noValue: true },
};

export function emptyCondition(): Condition {
  return { kind: "condition", field: "", operator: "", value: "" };
}

export function emptyGroup(): Group {
  return { kind: "group", op: "and", rules: [emptyCondition()] };
}

function conditionComplete(c: Condition): boolean {
  if (!c.field || !c.operator) return false;
  if (OPERATORS[c.operator as Operator]?.noValue) return true;
  return c.value !== "";
}

export function countConditions(n: Node): number {
  if (n.kind === "group") return n.rules.reduce((a, r) => a + countConditions(r), 0);
  return conditionComplete(n) ? 1 : 0;
}

// Strip incomplete conditions / empty groups and emit the wire shape the API
// expects: groups become {op, rules}, conditions {field, operator[, value]}.
function pruneWire(n: Node): unknown | null {
  if (n.kind === "group") {
    const rules = n.rules.map(pruneWire).filter((r): r is object => r !== null);
    if (rules.length === 0) return null;
    return { op: n.op, rules };
  }
  if (!conditionComplete(n)) return null;
  const op = n.operator as Operator;
  if (OPERATORS[op]?.noValue) return { field: n.field, operator: op };
  return { field: n.field, operator: op, value: n.value };
}

/** Serialize to the `filter` param value, or undefined when there's nothing to send. */
export function serialize(root: Group): string | undefined {
  const wire = pruneWire(root);
  return wire ? JSON.stringify(wire) : undefined;
}
