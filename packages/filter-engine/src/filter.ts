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

  if (
    filter.npColors?.length &&
    !servant.noblePhantasms.some((np) => filter.npColors?.includes(np.color))
  ) {
    return false;
  }

  if (
    filter.npScopes?.length &&
    !servant.noblePhantasms.some((np) => filter.npScopes?.includes(np.scope))
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
