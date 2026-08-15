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

const atlasCnFaceBaseUrl = "https://static.atlasacademy.io/CN/Faces";

export function servantFaceUrl(servant: Pick<Servant, "atlasId">): string | undefined {
  const atlasId = servant.atlasId;
  if (!Number.isInteger(atlasId) || (atlasId ?? 0) <= 0) return undefined;
  return `${atlasCnFaceBaseUrl}/f_${atlasId}0.png`;
}

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
  const faceUrl = servantFaceUrl(servant);

  return (
    <article className={className} data-servant-id={servant.id}>
      <header>
        <span>{servant.rarity}★ {servant.className.toUpperCase()}</span>
        {ranking ? <strong>{ranking.tier}</strong> : null}
      </header>
      <div className="servant-card-identity">
        <div className="servant-avatar" aria-hidden="true">
          <span>{servant.name.slice(0, 1)}</span>
          {faceUrl ? <img src={faceUrl} alt="" loading="lazy" decoding="async" /> : null}
        </div>
        <div className="servant-card-title">
          <h3>{servant.name}</h3>
          {servant.profile ? <span>{servant.profile.replaceAll("_", " ")}</span> : null}
        </div>
      </div>
      <p>{noblePhantasmLabels.join(" / ")}</p>
      <p>自充 {servant.charge.self}% · 群充 {servant.charge.team}%</p>
      {latestStrengthening ? (
        <p>
          最近强化 {latestStrengthening.releasedAt} · {latestStrengthening.target.type === "noble_phantasm" ? "宝具" : `技能${latestStrengthening.target.slot}`}
        </p>
      ) : null}
      <div className="servant-tags" aria-label="标签">{servant.tags.join(" · ")}</div>
      {ranking ? <p className="servant-rationale">{ranking.rationale}</p> : null}
    </article>
  );
}
