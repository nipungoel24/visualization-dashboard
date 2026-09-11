import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RecordsExplorer } from "@/components/records/RecordsExplorer";
import type { RecordItem, RecordsPage } from "@/lib/api";
import { parseFilterState } from "@/lib/filters";

const mockUseRecordsQuery = vi.hoisted(() => vi.fn());
const mockUseRecordQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/query", () => ({
  useRecordsQuery: mockUseRecordsQuery,
  useRecordQuery: mockUseRecordQuery,
}));

const RECORD: RecordItem = {
  id: "a".repeat(64),
  source_row_index: 7,
  end_year: 2020,
  intensity: 8,
  sector: "Energy",
  topic: "oil",
  insight: "Oil prices climb on supply cuts.",
  url: "https://example.com/oil",
  region: "World",
  start_year: 2015,
  impact: 5,
  added: "January, 20 2017 03:51:25",
  published: "January, 20 2017 03:51:25",
  country: "India",
  relevance: 2,
  pestle: "Economic",
  source: "CNBC",
  title: "Oil market update",
  likelihood: 3,
};

const PAGE: RecordsPage = {
  items: [RECORD],
  total: 1,
  page: 1,
  page_size: 25,
  total_pages: 1,
};

describe("RecordsExplorer", () => {
  function renderExplorer(
    overrides: {
      filters?: ReturnType<typeof parseFilterState>;
      page?: RecordsPage | undefined;
      noData?: boolean;
      total?: number;
      loading?: boolean;
    } = {},
  ) {
    const handlers = {
      onChangePage: vi.fn(),
      onChangeSort: vi.fn(),
      onOpenRecord: vi.fn(),
      onCloseRecord: vi.fn(),
    };
    mockUseRecordsQuery.mockReturnValue({
      data: overrides.noData ? undefined : (overrides.page ?? PAGE),
      isPending: overrides.loading ?? false,
      isError: false,
      error: null,
      isFetching: false,
    });
    mockUseRecordQuery.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: false,
      error: null,
    });
    const renderResult = render(
      <RecordsExplorer
        filters={overrides.filters ?? parseFilterState("")}
        params={[]}
        total={overrides.total ?? 1}
        isLoading={overrides.loading ?? false}
        onChangePage={handlers.onChangePage}
        onChangeSort={handlers.onChangeSort}
        onOpenRecord={handlers.onOpenRecord}
        onCloseRecord={handlers.onCloseRecord}
      />,
    );
    return { ...renderResult, ...handlers };
  }

  it("renders the table with column headers and record rows", () => {
    const { container } = renderExplorer();
    expect(
      screen.getByRole("heading", { name: "Records Explorer" }),
    ).toBeInTheDocument();
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.getByText("Topic")).toBeInTheDocument();
    expect(screen.getByText("Sector")).toBeInTheDocument();
    expect(screen.getByText("Oil prices climb on supply cuts.")).toBeInTheDocument();
  });

  it("marks the active sort column with aria-sort and toggles order on click", async () => {
    const user = userEvent.setup();
    const handlers = renderExplorer({
      filters: parseFilterState("sort=intensity&order=desc"),
    });
    const th = screen.getByText("Int").closest("th");
    expect(th?.getAttribute("aria-sort")).toBe("descending");

    await user.click(screen.getByRole("button", { name: /Sorted by Int/ }));
    expect(handlers.onChangeSort).toHaveBeenCalledWith("intensity", "asc");
  });

  it("starts an ascending sort when a new column is selected", async () => {
    const user = userEvent.setup();
    const handlers = renderExplorer();
    await user.click(screen.getByRole("button", { name: "Sort by Int" }));
    expect(handlers.onChangeSort).toHaveBeenCalledWith("intensity", "asc");
  });

  it("opens a record on row click and via Enter key", async () => {
    const user = userEvent.setup();
    const handlers = renderExplorer();
    await user.click(
      screen.getAllByRole("button", { name: "Open record Oil market update" })[0],
    );
    expect(handlers.onOpenRecord).toHaveBeenCalledWith(RECORD.id);

    handlers.onOpenRecord.mockClear();
    const row = screen.getAllByRole("button", { name: "Open record Oil market update" })[0];
    row.focus();
    await user.keyboard("{Enter}");
    expect(handlers.onOpenRecord).toHaveBeenCalledWith(RECORD.id);
  });

  it("shows the page summary and pagination controls", async () => {
    const user = userEvent.setup();
    const handlers = renderExplorer({
      filters: parseFilterState("page=1"),
      page: { items: [RECORD], total: 60, page: 1, page_size: 25, total_pages: 3 },
    });
    expect(screen.getByText("60 matching")).toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(handlers.onChangePage).toHaveBeenCalledWith(2);
  });

  it("shows the empty message when no records match", () => {
    renderExplorer({
      page: { items: [], total: 0, page: 1, page_size: 25, total_pages: 0 },
    });
    expect(
      screen.getByText("No records match the current filters."),
    ).toBeInTheDocument();
  });

  it("renders skeletons while loading with no prior data", () => {
    const { container } = renderExplorer({ loading: true, noData: true, total: 0 });
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });
});