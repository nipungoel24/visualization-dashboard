from pydantic import BaseModel, Field

API_VERSION = "0.1.0"


class ErrorResponse(BaseModel):
    error: "ErrorDetail"


class ErrorDetail(BaseModel):
    code: str
    message: str


class MetaSchema(BaseModel):
    fields: list[str]
    field_availability: dict[str, bool]
    populated: dict[str, int]


class MetaResponse(BaseModel):
    source_filename: str
    source_sha256: str
    source_row_count: int
    document_count: int
    imported_at: str
    import_version: int
    normalization_version: int
    api_version: str
    dataset_schema: MetaSchema = Field(serialization_alias="schema")


class FacetValue(BaseModel):
    value: str | int
    count: int


class FacetDimension(BaseModel):
    values: list[FacetValue]
    missing_count: int


class FacetsResponse(BaseModel):
    end_year: FacetDimension
    start_year: FacetDimension
    topic: FacetDimension
    sector: FacetDimension
    region: FacetDimension
    pestle: FacetDimension
    source: FacetDimension
    country: FacetDimension


class SummarySection(BaseModel):
    filtered_count: int
    avg_intensity: float | None
    intensity_populated: int
    avg_likelihood: float | None
    likelihood_populated: int
    avg_relevance: float | None
    relevance_populated: int
    complete_metrics_populated: int
    complete_metrics_percentage: float
    top_sector: str | None


class YearCount(BaseModel):
    year: int
    count: int


class YearsSection(BaseModel):
    values: list[YearCount]
    missing_count: int


class MetricBin(BaseModel):
    label: str
    min: int
    max: int
    count: int


class MetricDistribution(BaseModel):
    bins: list[MetricBin]
    not_specified: int


class TopicAnalytics(BaseModel):
    topic: str
    record_count: int
    avg_intensity: float | None
    avg_likelihood: float | None
    avg_relevance: float | None


class TopicsSection(BaseModel):
    values: list[TopicAnalytics]
    missing_count: int


class SectorAnalytics(BaseModel):
    sector: str
    record_count: int
    avg_intensity: float | None


class SectorsSection(BaseModel):
    values: list[SectorAnalytics]
    missing_count: int


class PestleAnalytics(BaseModel):
    pestle: str
    record_count: int
    avg_intensity: float | None
    avg_likelihood: float | None
    avg_relevance: float | None


class PestleSection(BaseModel):
    values: list[PestleAnalytics]
    missing_count: int


class RegionAnalytics(BaseModel):
    region: str
    record_count: int
    avg_intensity: float | None


class RegionsSection(BaseModel):
    values: list[RegionAnalytics]
    missing_count: int


class CountryAnalytics(BaseModel):
    country: str
    record_count: int
    avg_intensity: float | None


class CountriesSection(BaseModel):
    values: list[CountryAnalytics]
    missing_count: int


class SourceAnalytics(BaseModel):
    source: str
    record_count: int


class SourcesSection(BaseModel):
    values: list[SourceAnalytics]
    missing_count: int
    total_unique: int
    limit: int
    limited: bool


class LandscapeTopic(BaseModel):
    topic: str
    record_count: int
    avg_intensity: float | None
    avg_likelihood: float | None
    avg_relevance: float | None
    dominant_sector: str | None


class LandscapeSection(BaseModel):
    values: list[LandscapeTopic]


class CoverageField(BaseModel):
    field: str
    populated_count: int
    missing_count: int
    populated_percentage: float


class DataCoverageSection(BaseModel):
    values: list[CoverageField]


class OverviewResponse(BaseModel):
    summary: SummarySection
    intensity: MetricDistribution
    likelihood: MetricDistribution
    relevance: MetricDistribution
    years: YearsSection
    topics: TopicsSection
    sectors: SectorsSection
    pestle: PestleSection
    regions: RegionsSection
    countries: CountriesSection
    sources: SourcesSection
    landscape: LandscapeSection
    data_coverage: DataCoverageSection


class RecordItem(BaseModel):
    id: str
    source_row_index: int
    end_year: int | None
    intensity: int | None
    sector: str | None
    topic: str | None
    insight: str | None
    url: str | None
    region: str | None
    start_year: int | None
    impact: int | None
    added: str | None
    published: str | None
    country: str | None
    relevance: int | None
    pestle: str | None
    source: str | None
    title: str | None
    likelihood: int | None


class RecordsPage(BaseModel):
    items: list[RecordItem]
    total: int
    page: int
    page_size: int
    total_pages: int
