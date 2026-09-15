import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { KpiStrip } from "@/components/dashboard/KpiStrip";
import { SectionFrame } from "@/components/dashboard/SectionFrame";
import { ZeroResults } from "@/components/dashboard/ZeroResults";
import type { SummarySection } from "@/lib/api";

const SUMMARY: SummarySection = {
  filtered_count: 403,
  avg_intensity: 12.3457,
  intensity_populated: 390,
  avg_likelihood: null,
  likelihood_populated: 0,
  avg_relevance: 3.5,
  relevance_populated: 403,
  complete_metrics_populated: 300,
  complete_metrics_percentage: 74.44,
  top_sector: null,
};

describe("KpiStrip", () => {
  it("renders real aggregates with nulls as em-dashes", () => {
    render(<KpiStrip summary={SUMMARY} isLoading={false} error={null} onRetry={() => {}} />);
    expect(screen.getByText("403")).toBeInTheDocument();
    expect(screen.getByText("12.35")).toBeInTheDocument();
    // Only avg_likelihood is null (1 em-dash); complete_metrics_percentage has a value
    expect(screen.getAllByText("—")).toHaveLength(1);
  });

  it("renders skeletons while loading", () => {
    render(<KpiStrip summary={undefined} isLoading error={null} onRetry={() => {}} />);
    expect(screen.getByLabelText("Loading summary metrics")).toBeInTheDocument();
  });

  it("renders the API error with a retry action, not fake zeros", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(
      <KpiStrip summary={undefined} isLoading={false} error="Service down." onRetry={onRetry} />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Service down.");
    expect(screen.queryByText("0")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("SectionFrame", () => {
  it("switches between loading, error, empty and content states", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<SectionFrame title="Signals Landscape" status="loading" />);
    expect(screen.getByLabelText("Loading Signals Landscape")).toBeInTheDocument();

    rerender(
      <SectionFrame title="Signals Landscape" status="error" error="Boom." onRetry={onRetry} />,
    );
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();

    rerender(<SectionFrame title="Signals Landscape" status="empty" />);
    expect(screen.getByText("No records match the current filters.")).toBeInTheDocument();

    rerender(
      <SectionFrame title="Signals Landscape">
        <p>Chart goes here</p>
      </SectionFrame>,
    );
    expect(screen.getByText("Chart goes here")).toBeInTheDocument();
  });
});

describe("ZeroResults", () => {
  it("offers a single reset action", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    render(<ZeroResults onReset={onReset} />);
    expect(
      screen.getByRole("heading", { name: "No signals match these filters" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(onReset).toHaveBeenCalled();
  });
});
