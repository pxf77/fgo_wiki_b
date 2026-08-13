import type { DatasetSnapshot, RankingSnapshot, Servant } from "./model.js";

export const bootstrapServants: Servant[] = [
  {
    id: "archer-baobhan-sith",
    name: "妖精骑士崔斯坦（芭万·希）",
    aliases: ["芭万·希", "妖崔"],
    className: "archer",
    rarity: 4,
    release: {
      region: "CN",
      status: "released",
    },
    noblePhantasms: [
      {
        id: "baobhan-sith-quick-single",
        name: "痛幻的哭奏",
        color: "quick",
        scope: "single",
        strengthened: true,
        targetTraits: ["诅咒状态"],
        effects: ["必中", "诅咒", "按诅咒层数获得特攻"],
      },
    ],
    charge: {
      self: 60,
      team: 0,
    },
    tags: ["单体宝具", "Quick", "诅咒", "必中", "高自充", "混沌", "恶"],
    role: ["main_dps", "sub_dps"],
    updatedAt: "2026-08-13",
  },
  {
    id: "archer-tutankhamun",
    name: "图坦卡蒙",
    aliases: ["图坦"],
    className: "archer",
    rarity: 5,
    release: {
      region: "CN",
      status: "released",
    },
    noblePhantasms: [
      {
        id: "tutankhamun-arts-single",
        name: "暝暗之匣",
        color: "arts",
        scope: "single",
        strengthened: false,
        targetTraits: ["魔性"],
        effects: ["魔性特攻", "宝具后自身退场"],
      },
    ],
    charge: {
      self: 60,
      team: 20,
    },
    tags: ["单体宝具", "Arts", "魔性特攻", "群充", "主动退场", "多核"],
    role: ["main_dps", "sub_dps", "plug_in"],
    updatedAt: "2026-08-13",
  },
  {
    id: "archer-ptolemy",
    name: "托勒密",
    aliases: ["老托", "托勒密"],
    className: "archer",
    rarity: 5,
    release: {
      region: "CN",
      status: "released",
    },
    noblePhantasms: [
      {
        id: "ptolemy-buster-single",
        name: "月は知らず、久遠の光",
        color: "buster",
        scope: "single",
        strengthened: false,
        effects: ["无视防御"],
      },
      {
        id: "ptolemy-arts-aoe",
        name: "王之书库",
        color: "arts",
        scope: "aoe",
        strengthened: false,
        effects: ["形态切换", "全体攻击"],
      },
    ],
    charge: {
      self: 50,
      team: 0,
    },
    tags: ["单体宝具", "全体宝具", "Buster", "Arts", "形态切换", "变则"],
    role: ["main_dps", "sub_dps"],
    updatedAt: "2026-08-13",
  },
];

export const bootstrapRankings: RankingSnapshot[] = [
  {
    id: "cn-2026-08-13-farming-90pp-r1-bootstrap",
    region: "CN",
    mode: "farming_90pp",
    asOf: "2026-08-13",
    revision: 1,
    assumptions: {
      npLevel: 1,
      swapAllowed: true,
      craftEssenceProfile: "event_50",
      eventDamageBonus: false,
    },
    entries: [
      {
        servantId: "archer-baobhan-sith",
        tier: "T0",
        conditions: ["可施加诅咒"],
        strengths: ["60% 自充", "单体 Quick", "诅咒特攻"],
        weaknesses: ["弱化无效会降低上限"],
        rationale: "高启动性且能在单体高血面扩展特攻倍率。",
        confidence: "provisional",
      },
      {
        servantId: "archer-tutankhamun",
        tier: "T0",
        conditions: ["魔性目标时升档"],
        strengths: ["高额充能", "团队充能", "主动退场"],
        weaknesses: ["宝具后自身退场"],
        rationale: "单体处理、充能插件和自动换人集中在一个编成位。",
        confidence: "provisional",
      },
      {
        servantId: "archer-ptolemy",
        tier: "T0",
        conditions: ["根据波次切换形态"],
        strengths: ["单双体切换", "团队增益", "变则泛用"],
        weaknesses: ["技能时序需要规划"],
        rationale: "一个位置覆盖单体与多人波次。",
        confidence: "provisional",
      },
    ],
  },
  {
    id: "cn-2026-08-13-high-difficulty-r1-bootstrap",
    region: "CN",
    mode: "high_difficulty",
    asOf: "2026-08-13",
    revision: 1,
    assumptions: {
      npLevel: 1,
      swapAllowed: true,
      craftEssenceProfile: "none",
      eventDamageBonus: false,
    },
    entries: [
      {
        servantId: "archer-baobhan-sith",
        tier: "T0.5",
        conditions: ["敌方可被弱化"],
        strengths: ["必中", "控制", "持续输出"],
        weaknesses: ["部分机制依赖敌方 Debuff"],
        rationale: "兼顾生存、控制和对回避处理。",
        confidence: "provisional",
      },
    ],
  },
];

export const bootstrapSnapshot: DatasetSnapshot = {
  metadata: {
    region: "CN",
    datasetVersion: "2026-08-13-r1-bootstrap",
    rankingRevision: 1,
    publishedAt: "2026-08-13T00:00:00.000Z",
    minimumAppVersion: "0.1.0",
    sourceStatus: "bootstrap",
  },
  servants: bootstrapServants,
  rankings: bootstrapRankings,
  changelog: [
    "建立弓阶垂直切片。",
    "加入职介、宝具范围、色卡、自充和榜单模式筛选。",
  ],
};
