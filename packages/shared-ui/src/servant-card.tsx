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
    (np) =>
      `${colorLabels[np.color]} · ${np.scope === "single" ? "单体" : np.scope === "aoe" ? "全体" : "辅助"}${np.strengthened ? " · 已强化" : ""}`,
  );
  const latestStrengthening = (servant.strengthenings ?? [])
    .filter((event) => event.status === "released")
    .sort(
      (left, right) =>
        Date.parse(left.releasedAt) - Date.parse(right.releasedAt) ||
        left.id.localeCompare(right.id),
    )
    .at(-1);

  return (
    <article className={className} data-servant-id={servant.id}>
      <header>
        <span>{servant.rarity}★ {servant.className.toUpperCase()}</span>
        {ranking ? <strong>{ranking.tier}</strong> : null}
      </header>
      <h3>{servant.name}</h3>
      <p>{noblePhantasmLabels.join(" / ")}</p>
      <p>自充 {servant.charge.self}% · 群充 {servant.charge.team}%</p>
      {latestStrengthening ? (
        <p>
          最近强化 {latestStrengthening.releasedAt} · {latestStrengthening.target.type === "noble_phantasm" ? "宝具" : `技能${latestStrengthening.target.slot}`}
        </p>
      ) : null}
      <div aria-label="标签">{servant.tags.join(" · ")}</div>
      {ranking ? <p>{ranking.rationale}</p> : null}
    </article>
  );
}
