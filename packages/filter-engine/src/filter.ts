import type {
  CardColor,
  NoblePhantasmScope,
  Servant,
  ServantClass,
} from "@fgo-wiki/domain";

export interface ServantFilter {
  query?: string;
  classes?: ServantClass[];
  rarities?: Array<1 | 2 | 3 | 4 | 5>;
  npColors?: CardColor[];
  npScopes?: NoblePhantasmScope[];
  npStrengthened?: boolean;
  minSelfCharge?: number;
  minTeamCharge?: number;
  tags?: string[];
  releasedOnly?: boolean;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase("zh-CN");
}

export function matchesServant(servant: Servant, filter: ServantFilter): boolean {
  if (filter.releasedOnly && servant.release.status !== "released") {
    return false;
  }

  if (filter.classes?.length && !filter.classes.includes(servant.className)) {
    return false;
  }

  if (filter.rarities?.length && !filter.rarities.includes(servant.rarity)) {
    return false;
  }

  const hasNoblePhantasmFilter =
    Boolean(filter.npColors?.length) ||
    Boolean(filter.npScopes?.length) ||
    filter.npStrengthened !== undefined;
  if (
    hasNoblePhantasmFilter &&
    !servant.noblePhantasms.some(
      (np) =>
        (!filter.npColors?.length || filter.npColors.includes(np.color)) &&
        (!filter.npScopes?.length || filter.npScopes.includes(np.scope)) &&
        (filter.npStrengthened === undefined ||
          np.strengthened === filter.npStrengthened),
    )
  ) {
    return false;
  }

  if (filter.minSelfCharge !== undefined && servant.charge.self < filter.minSelfCharge) {
    return false;
  }

  if (filter.minTeamCharge !== undefined && servant.charge.team < filter.minTeamCharge) {
    return false;
  }

  if (filter.tags?.length) {
    const servantTags = new Set(servant.tags.map(normalize));
    if (!filter.tags.every((tag) => servantTags.has(normalize(tag)))) {
      return false;
    }
  }

  if (filter.query) {
    const query = normalize(filter.query);
    const searchable = [servant.name, ...servant.aliases, ...servant.tags]
      .map(normalize)
      .join(" ");
    if (!searchable.includes(query)) {
      return false;
    }
  }

  return true;
}

export function filterServants(servants: readonly Servant[], filter: ServantFilter): Servant[] {
  return servants.filter((servant) => matchesServant(servant, filter));
}
