import clsx from "clsx";
import { FolderPlus, Plus, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  OPERATORS,
  countConditions,
  emptyCondition,
  emptyGroup,
  serialize,
  type Condition,
  type Group,
  type Node,
  type Operator,
} from "../lib/filterTree";
import { useSchema, type SchemaField } from "../lib/schema";

const MAX_DEPTH = 4; // mirrors backend cap (5), counting the root as 0

export function FilterBuilder({
  collection,
  onChange,
}: {
  collection: string;
  onChange: (filter: string | undefined) => void;
}) {
  const { data, isLoading } = useSchema(collection);
  const fields = data?.fields ?? [];
  const [root, setRoot] = useState<Group>(emptyGroup);
  const [open, setOpen] = useState(false);

  // Push the serialized tree up whenever it changes (parent debounces it).
  useEffect(() => {
    onChange(serialize(root));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  const count = countConditions(root);
  const clear = () => setRoot(emptyGroup());

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="flex items-center gap-2 px-3 py-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-sm font-medium text-zinc-300 hover:text-zinc-100"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Advanced filter
          {count > 0 && (
            <span className="rounded-full bg-emerald-600/30 px-1.5 text-xs text-emerald-300 ring-1 ring-inset ring-emerald-600/40">
              {count}
            </span>
          )}
        </button>
        <span className="text-xs text-zinc-600">{open ? "" : count > 0 ? "active" : "off"}</span>
        {count > 0 && (
          <button onClick={clear} className="ml-auto text-xs text-zinc-500 hover:text-zinc-300">
            clear
          </button>
        )}
      </div>

      {open && (
        <div className="border-t border-zinc-800 p-3">
          {isLoading ? (
            <div className="h-8 w-48 animate-pulse rounded bg-zinc-800" />
          ) : (
            <GroupEditor group={root} fields={fields} depth={0} isRoot onChange={setRoot} />
          )}
        </div>
      )}
    </div>
  );
}

function GroupEditor({
  group,
  fields,
  depth,
  isRoot,
  onChange,
  onRemove,
}: {
  group: Group;
  fields: SchemaField[];
  depth: number;
  isRoot?: boolean;
  onChange: (g: Group) => void;
  onRemove?: () => void;
}) {
  const replaceAt = (i: number, node: Node) =>
    onChange({ ...group, rules: group.rules.map((r, j) => (j === i ? node : r)) });
  const removeAt = (i: number) => onChange({ ...group, rules: group.rules.filter((_, j) => j !== i) });
  const addCondition = () => onChange({ ...group, rules: [...group.rules, emptyCondition()] });
  const addGroup = () => onChange({ ...group, rules: [...group.rules, emptyGroup()] });

  return (
    <div
      className={clsx(
        "rounded-md border-l-2 pl-3",
        group.op === "and" ? "border-sky-700/70" : "border-amber-700/70",
        !isRoot && "mt-2 border border-l-2 border-zinc-800 bg-zinc-950/30 p-2",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <div className="inline-flex overflow-hidden rounded border border-zinc-700 text-xs">
          {(["and", "or"] as const).map((op) => (
            <button
              key={op}
              onClick={() => onChange({ ...group, op })}
              className={clsx(
                "px-2 py-0.5 font-medium uppercase",
                group.op === op ? "bg-zinc-700 text-zinc-50" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              {op}
            </button>
          ))}
        </div>
        <span className="text-xs text-zinc-600">{group.rules.length} rule(s)</span>
        {!isRoot && onRemove && (
          <button onClick={onRemove} className="ml-auto text-zinc-500 hover:text-red-400" title="Remove group">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="space-y-1.5">
        {group.rules.map((rule, i) =>
          rule.kind === "group" ? (
            <GroupEditor
              key={i}
              group={rule}
              fields={fields}
              depth={depth + 1}
              onChange={(g) => replaceAt(i, g)}
              onRemove={() => removeAt(i)}
            />
          ) : (
            <ConditionRow
              key={i}
              condition={rule}
              fields={fields}
              onChange={(c) => replaceAt(i, c)}
              onRemove={group.rules.length > 1 ? () => removeAt(i) : undefined}
            />
          ),
        )}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          onClick={addCondition}
          className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
        >
          <Plus className="h-3 w-3" /> condition
        </button>
        {depth < MAX_DEPTH && (
          <button
            onClick={addGroup}
            className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            <FolderPlus className="h-3 w-3" /> group
          </button>
        )}
      </div>
    </div>
  );
}

function ConditionRow({
  condition,
  fields,
  onChange,
  onRemove,
}: {
  condition: Condition;
  fields: SchemaField[];
  onChange: (c: Condition) => void;
  onRemove?: () => void;
}) {
  const fd = fields.find((f) => f.name === condition.field);
  const ops = fd?.operators ?? [];
  const noValue = condition.operator ? OPERATORS[condition.operator as Operator]?.noValue : false;

  const onField = (name: string) => {
    const next = fields.find((f) => f.name === name);
    const op = next?.operators[0] ?? "";
    const value = next?.type === "bool" ? "true" : "";
    onChange({ ...condition, field: name, operator: op as Operator, value });
  };

  const onOperator = (op: Operator) => {
    let value = condition.value;
    if (fd?.type === "bool" && !OPERATORS[op]?.noValue && value === "") value = "true";
    onChange({ ...condition, operator: op, value });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <select
        value={condition.field}
        onChange={(e) => onField(e.target.value)}
        className="w-40 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none"
      >
        <option value="">field…</option>
        {fields.map((f) => (
          <option key={f.name} value={f.name}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        value={condition.operator}
        onChange={(e) => onOperator(e.target.value as Operator)}
        disabled={!fd}
        className="w-36 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 focus:border-zinc-500 focus:outline-none disabled:opacity-40"
      >
        <option value="">op…</option>
        {ops.map((op) => (
          <option key={op} value={op}>
            {OPERATORS[op].symbol} {OPERATORS[op].label}
          </option>
        ))}
      </select>

      {!noValue && (
        <ValueInput
          type={fd?.type}
          operator={condition.operator as Operator}
          value={condition.value}
          onChange={(v) => onChange({ ...condition, value: v })}
        />
      )}

      {onRemove && (
        <button onClick={onRemove} className="text-zinc-500 hover:text-red-400" title="Remove condition">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function ValueInput({
  type,
  operator,
  value,
  onChange,
}: {
  type?: SchemaField["type"];
  operator?: Operator;
  value: string;
  onChange: (v: string) => void;
}) {
  const base =
    "w-44 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none";
  const isRegex = operator === "matches" || operator === "not_matches";

  if (type === "bool") {
    return (
      <select value={value || "true"} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    );
  }
  if (isRegex) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="regex — case-sensitive, (?i) for i"
        className={clsx(base, "w-56 font-mono")}
        spellCheck={false}
        title="Regular expression. Case-sensitive by default; prefix (?i) for case-insensitive."
      />
    );
  }
  if (type === "number") {
    return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder="number" className={base} />;
  }
  if (type === "date") {
    return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="YYYY-MM-DD or 7d" className={base} />;
  }
  return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="value" className={base} />;
}
