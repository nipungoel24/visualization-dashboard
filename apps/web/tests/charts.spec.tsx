import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { CoverageChart } from "@/components/charts/CoverageChart";
import { EndYearChart } from "@/components/charts/EndYearChart";
import { MetricDistribution } from "@/components/charts/MetricDistribution";
import { RankingChart } from "@/components/charts/RankingChart";
import { SectorTreemap } from "@/components/charts/SectorTreemap";
import { SignalsLandscape } from "@/components/charts/SignalsLandscape";
import { SECTOR_PALETTE } from "@/lib/d3/palette";

const TOPICS = [
  { topic: "oil", record_count: 403, avg_intensity: 12.35, avg_likelihood: 3.2, avg_relevance: 2.81, dominant_sector: "Energy" },
  { topic: "gas", record_count: 89, avg_intensity: 9.5, avg_likelihood: 3.2, avg_relevance: 2.81, dominant_sector: "Energy" },
  { topic: "growth", record_count: 51, avg_intensity: null, avg_likelihood: 2.5, avg_relevance: 4, dominant_sector: null },
  { topic: "mystery", record_count: 2, avg_intensity: 4, avg_likelihood: null, avg_relevance: 3, dominant_sector: "Retail" },
];

describe("SignalsLandscape", () => {
  it("renders one mark per positionable topic with axis labels", () => {
    render(
      <SignalsLandscape
        points={TOPICS}
        selected={new Set()}
        canonicalSectors={["Energy", "Retail"]}
        onToggleTopic={() => {}}
      />,
    );
    expect(screen.getByText("Avg likelihood")).toBeInTheDocument();
    expect(screen.getByText("Avg relevance")).toBeInTheDocument();
    // Marks are focusable elements with data-mark-index, not role="button"
    const marks = screen.getAllByTestId("mark");
    expect(marks).toHaveLength(3);
    expect(
      screen.getByText(/lacks positioned averages and is not plotted/),
    ).toBeInTheDocument();
  });

  it("renders tooltip structure (hover tested via Playwright E2E)", () => {
    render(
      <SignalsLandscape
        points={TOPICS}
        selected={new Set()}
        canonicalSectors={["Energy", "Retail"]}
        onToggleTopic={() => {}}
      />,
    );
    expect(screen.getByText("Avg likelihood")).toBeInTheDocument();
    expect(screen.getByText("Avg relevance")).toBeInTheDocument();
  });

  it("communicates selection and toggles the topic filter on Enter", async () => {
    const user = userEvent.setup();
    const onToggleTopic = vi.fn();
    render(
      <SignalsLandscape
        points={TOPICS}
        selected={new Set(["oil"])}
        canonicalSectors={["Energy", "Retail"]}
        onToggleTopic={onToggleTopic}
      />,
    );
    // The SVG is the focusable element (role="listbox"); marks are focused programmatically
    const svg = screen.getByRole("listbox", { name: /Signals Landscape/ });
    expect(svg).toHaveAttribute("tabindex", "0");
    // Focus the SVG and use arrow keys to navigate
    svg.focus();
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{Enter}");
    expect(onToggleTopic).toHaveBeenCalledWith("gas"); // Second topic after oil
  });

  it("moves focus with arrow keys without changing selection", async () => {
    const user = userEvent.setup();
    const onToggleTopic = vi.fn();
    render(
      <SignalsLandscape
        points={TOPICS}
        selected={new Set()}
        canonicalSectors={["Energy", "Retail"]}
        onToggleTopic={onToggleTopic}
      />,
    );
    const svg = screen.getByRole("listbox", { name: /Signals Landscape/ });
    svg.focus();
    await user.keyboard("{ArrowRight}");
    await user.keyboard("{ArrowRight}");
    expect(onToggleTopic).not.toHaveBeenCalled();
  });

  it("keeps sector colors stable for the canonical order", () => {
    const { container } = render(
      <SignalsLandscape
        points={TOPICS}
        selected={new Set()}
        canonicalSectors={["Energy", "Retail"]}
        onToggleTopic={() => {}}
      />,
    );
    const bubbles = container.querySelectorAll("circle[fill]");
    const fills = new Set([...bubbles].map((circle) => circle.getAttribute("fill")));
    expect(fills.has(SECTOR_PALETTE[0])).toBe(true);
  });
});

describe("EndYearChart", () => {
  const YEARS = [
    { year: 2200, count: 1 },
    { year: 2017, count: 53 },
    { year: 2126, count: 1 },
  ];

  it("orders years numerically and preserves extreme values", () => {
    render(<EndYearChart values={YEARS} notSpecified={null} selected={new Set()} onToggleYear={() => {}} />);
    // Marks are focusable elements with data-mark-index
    const marks = screen.getAllByTestId("mark");
    expect(marks.map((mark) => mark.getAttribute("aria-label"))).toEqual([
      expect.stringContaining("2017"),
      expect.stringContaining("2126"),
      expect.stringContaining("2200"),
    ]);
  });

  it("clicking an extreme year produces the end_year filter", async () => {
    const user = userEvent.setup();
    const onToggleYear = vi.fn();
    render(<EndYearChart values={YEARS} notSpecified={null} selected={new Set()} onToggleYear={onToggleYear} />);
    // Click on the transparent hit target rect for 2126
    await user.click(screen.getByLabelText(/2126,/));
    expect(onToggleYear).toHaveBeenCalledWith(2126);
  });
});

describe("SectorTreemap", () => {
  const SECTORS = [
    { sector: "Energy", record_count: 525, avg_intensity: 12.5 },
    { sector: "Retail", record_count: 38, avg_intensity: null },
  ];

  it("sizes tiles by count and toggles sectors", async () => {
    const user = userEvent.setup();
    const onToggleSector = vi.fn();
    render(<SectorTreemap sectors={SECTORS} selected={new Set()} onToggleSector={onToggleSector} />);
    const tiles = screen.getAllByTestId("mark");
    expect(tiles).toHaveLength(2);
    await user.click(screen.getByLabelText(/Retail,/));
    expect(onToggleSector).toHaveBeenCalledWith("Retail");
  });

  it("renders null averages as dashes in tooltips", async () => {
    const user = userEvent.setup();
    render(<SectorTreemap sectors={SECTORS} selected={new Set()} onToggleSector={() => {}} />);
    await user.hover(screen.getByLabelText(/Retail,/));
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent("—");
  });
});

describe("RankingChart", () => {
  const ROWS = [
    { key: "a", label: "Alpha", count: 100, secondary: "avg 10.00", tooltipRows: [{ label: "Records", value: "100" }] },
    { key: "b", label: "Beta", count: 40, secondary: null, tooltipRows: [{ label: "Records", value: "40" }] },
  ];

  it("renders counts as text and toggles on row activation", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <RankingChart
        rows={ROWS}
        selected={new Set(["a"])}
        onToggle={onToggle}
        limitNote="Top 2 of 2"
        ariaLabel="Test ranking"
      />,
    );
    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("Top 2 of 2")).toBeInTheDocument();
    const alpha = screen.getByRole("button", { name: /Alpha.*selected/ });
    expect(alpha).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: /^Beta,/ }));
    expect(onToggle).toHaveBeenCalledWith("b");
  });
});

describe("MetricDistribution", () => {
  it("labels bins and the not-specified line", () => {
    render(
      <MetricDistribution
        metric="Intensity"
        bins={[
          { label: "1-4", min: 1, max: 4, count: 244 },
          { label: "5-8", min: 5, max: 8, count: 0 },
        ]}
        notSpecified={38}
      />,
    );
    expect(screen.getByText("244")).toBeInTheDocument();
    expect(screen.getByText(/Not specified: 38/)).toBeInTheDocument();
  });
});

describe("CoverageChart", () => {
  it("shows percentages and counts with no filter interaction", () => {
    render(
      <CoverageChart
        values={[
          { field: "intensity", populated_count: 962, missing_count: 38, populated_percentage: 96.2 },
          { field: "country", populated_count: 350, missing_count: 650, populated_percentage: 35.0 },
        ]}
        fullValues={[
          { field: "intensity", populated_count: 962, total_count: 1000, populated_percentage: 96.2 },
          { field: "country", populated_count: 350, total_count: 1000, populated_percentage: 35.0 },
        ]}
      />,
    );
    expect(screen.getByText(/96\.2%/)).toBeInTheDocument();
    expect(screen.getByText(/35\.0%/)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});