import type {
  ServantCapabilities,
  ServantCharge,
  ServantProfile,
} from "@fgo-wiki/domain";
import type { AtlasNiceFunction, AtlasNiceSkill } from "./atlas-schema.js";
import type { AtlasNoblePhantasmCandidate } from "./normalize-atlas.js";

const token = (value: string) => value.replace(/[^a-z0-9]/gi, "").toLowerCase();
const sets = {
  offense: new Set(["upatk", "upcommandall", "upnpdamage", "updamage", "updamageindividuality", "updamageindividualityactiveonly"]),
  critical: new Set(["upcriticaldamage", "upcriticalrate", "upcriticalpoint", "upstarweight", "regainstar"]),
  survival: new Set(["avoidance", "invincible", "specialinvincible", "guts", "updefence", "addmaxhp", "regainhp", "avoidinstantdeath", "uptolerance"]),
  control: new Set(["donotact", "donotnoble", "donotskill", "downcriticalrate"]),
  cleanse: new Set(["avoidstate", "uptolerancesubstate"]),
  pierce: new Set(["pierceinvincible", "piercespecialinvincible", "piercedefence", "breakavoidance"]),
};

export function currentSkills(skills: readonly AtlasNiceSkill[]): AtlasNiceSkill[] {
  const current = new Map<number, AtlasNiceSkill>();
  for (const skill of skills) {
    const existing = current.get(skill.num);
    if (!existing || skill.priority > existing.priority || (skill.priority === existing.priority && skill.id > existing.id)) {
      current.set(skill.num, skill);
    }
  }
  return [...current.values()].sort((left, right) => left.num - right.num);
}

function targetFactor(func: AtlasNiceFunction): number {
  const target = token(func.funcTargetType);
  const team = token(func.funcTargetTeam ?? "");
  if (target === "self") return 0.25;
  if (target.includes("all")) return 1;
  if (target.includes("one") || target.includes("individual") || target === "enemy") return 0.7;
  if (team.includes("enemy")) return 0.7;
  return 0.5;
}

function hasAny(values: readonly string[], expected: Set<string>): boolean {
  return values.some((value) => expected.has(token(value)));
}

export function deriveCapabilities(skills: readonly AtlasNiceSkill[]): ServantCapabilities {
  const result: ServantCapabilities = { offense: 0, support: 0, survival: 0, control: 0, cleanse: 0, pierce: 0, cooldown: 0, critical: 0 };
  for (const skill of currentSkills(skills)) {
    for (const func of skill.functions) {
      const factor = targetFactor(func);
      const type = token(func.funcType);
      const categories = new Set<keyof ServantCapabilities>();
      if (hasAny(func.buffTypes, sets.offense)) categories.add("offense");
      if (hasAny(func.buffTypes, sets.critical) || type === "gainstar") categories.add("critical");
      if (hasAny(func.buffTypes, sets.survival) || type === "gainhp") categories.add("survival");
      if (hasAny(func.buffTypes, sets.control) || type === "delaynpturn" || type === "lossnp") categories.add("control");
      if (hasAny(func.buffTypes, sets.cleanse) || type === "substate" || type === "movestate") categories.add("cleanse");
      if (hasAny(func.buffTypes, sets.pierce)) categories.add("pierce");
      if (type === "shortenskill") categories.add("cooldown");
      for (const category of categories) result[category] += 10 * factor;
      if (factor >= 0.7 && [...categories].some((category) => ["offense", "critical", "survival", "cleanse"].includes(category))) {
        result.support += 7 * factor;
      }
      if (type === "gainnp" && factor >= 0.7) result.support += 8 * factor;
    }
  }
  for (const key of Object.keys(result) as Array<keyof ServantCapabilities>) {
    result[key] = Math.min(100, Math.round(result[key]));
  }
  return result;
}

export function deriveProfile(
  noblePhantasms: readonly AtlasNoblePhantasmCandidate[],
  charge: ServantCharge,
  capabilities: ServantCapabilities,
): ServantProfile {
  const attacks = noblePhantasms.filter((np) => np.scope !== "support");
  if (attacks.length === 0) return "support";
  const hasSingle = attacks.some((np) => np.scope === "single");
  const hasAoe = attacks.some((np) => np.scope === "aoe");
  const supportSignal = capabilities.support + charge.team + (charge.target ?? 0) * 0.8;
  if ((hasSingle && hasAoe) || supportSignal >= 35) return "hybrid";
  return hasAoe ? "attacker_aoe" : "attacker_single";
}
