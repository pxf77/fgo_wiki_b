export interface NoblePhantasmDamageInput {
  attack: number;
  npMultiplier: number;
  cardModifier: number;
  cardPerformanceUp?: number;
  attackUp?: number;
  defenseDown?: number;
  noblePhantasmDamageUp?: number;
  specialAttackModifier?: number;
  classAdvantage?: number;
  attributeAdvantage?: number;
  flatDamage?: number;
}

export interface DamageRange {
  minimum: number;
  average: number;
  maximum: number;
}

function percent(value: number | undefined): number {
  return 1 + (value ?? 0) / 100;
}

/**
 * Deterministic comparison kernel for the first vertical slice.
 * It intentionally models the main multiplicative groups only. Enemy-specific
 * fixed defense, event multipliers and special stacking rules belong in later adapters.
 */
export function estimateNoblePhantasmDamage(input: NoblePhantasmDamageInput): DamageRange {
  if (input.attack < 0 || input.npMultiplier < 0 || input.cardModifier < 0) {
    throw new RangeError("Damage inputs must be non-negative");
  }

  const base =
    input.attack *
      input.npMultiplier *
      input.cardModifier *
      percent(input.cardPerformanceUp) *
      percent((input.attackUp ?? 0) + (input.defenseDown ?? 0)) *
      percent(input.noblePhantasmDamageUp) *
      (input.specialAttackModifier ?? 1) *
      (input.classAdvantage ?? 1) *
      (input.attributeAdvantage ?? 1) +
    (input.flatDamage ?? 0);

  return {
    minimum: Math.floor(base * 0.9),
    average: Math.floor(base),
    maximum: Math.floor(base * 1.099),
  };
}
