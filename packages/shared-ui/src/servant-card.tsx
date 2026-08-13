import type { RankingEntry, Servant } from "@fgo-wiki/domain";

export interface ServantCardProps {
  servant: Servant;
  ranking?: RankingEntry | undefined;
  className?: string | undefined;
}

const colorLabels = {
  quick: "Quick",
  arts: "Arts",
  buster: "Buster",
} as const;

export function ServantCard({ servant, ranking, className }: ServantCardProps) {
  const noblePhantasmLabels = servant.noblePhantasms.map(
    (np) => `${colorLabels[np.color]} · ${np.scope === "single" ? "单体" : np.scope === "aoe" ? "全体" : "辅助"}`,
  );

  return (
    <article className={className} data-servant-id={servant.id}>
      <header>
        <span>{servant.rarity}★ {servant.className.toUpperCase()}</span>
        {ranking ? <strong>{ranking.tier}</strong> : null}
      </header>
      <h3>{servant.name}</h3>
      <p>{noblePhantasmLabels.join(" / ")}</p>
      <p>自充 {servant.charge.self}% · 群充 {servant.charge.team}%</p>
      <div aria-label="标签">{servant.tags.join(" · ")}</div>
      {ranking ? <p>{ranking.rationale}</p> : null}
    </article>
  );
}
