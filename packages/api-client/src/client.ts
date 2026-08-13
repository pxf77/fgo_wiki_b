import type {
  CardColor,
  DatasetMetadata,
  DatasetSnapshot,
  NoblePhantasmScope,
  RankingMode,
  RankingSnapshot,
  Servant,
  ServantClass,
} from "@fgo-wiki/domain";

export interface ServantQuery {
  query?: string;
  className?: ServantClass;
  npColor?: CardColor;
  npScope?: NoblePhantasmScope;
  minSelfCharge?: number;
  releasedOnly?: boolean;
}

export interface FgoWikiApiClientOptions {
  baseUrl: string;
  fetcher?: typeof fetch;
}

export class FgoWikiApiClient {
  private readonly baseUrl: string;
  private readonly fetcher: typeof fetch;

  public constructor(options: FgoWikiApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.fetcher = options.fetcher ?? fetch;
  }

  public getMeta(): Promise<DatasetMetadata> {
    return this.request<DatasetMetadata>("/api/v1/meta");
  }

  public listServants(query: ServantQuery = {}): Promise<Servant[]> {
    const params = new URLSearchParams();
    if (query.query) params.set("query", query.query);
    if (query.className) params.set("class", query.className);
    if (query.npColor) params.set("npColor", query.npColor);
    if (query.npScope) params.set("npScope", query.npScope);
    if (query.minSelfCharge !== undefined) {
      params.set("minSelfCharge", String(query.minSelfCharge));
    }
    if (query.releasedOnly !== undefined) {
      params.set("releasedOnly", String(query.releasedOnly));
    }

    const suffix = params.size ? `?${params.toString()}` : "";
    return this.request<Servant[]>(`/api/v1/servants${suffix}`);
  }

  public getServant(id: string): Promise<Servant> {
    return this.request<Servant>(`/api/v1/servants/${encodeURIComponent(id)}`);
  }

  public getRanking(mode: RankingMode): Promise<RankingSnapshot> {
    return this.request<RankingSnapshot>(`/api/v1/rankings/${mode}`);
  }

  public getLatestDataset(): Promise<DatasetSnapshot> {
    return this.request<DatasetSnapshot>("/api/v1/datasets/latest");
  }

  private async request<T>(path: string): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, {
      headers: {
        accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`FGO Wiki API request failed: ${response.status} ${path}`);
    }

    return (await response.json()) as T;
  }
}
