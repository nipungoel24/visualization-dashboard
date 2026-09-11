import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { RecordDetailSheet } from "@/components/records/RecordDetailSheet";
import type { RecordItem } from "@/lib/api";

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

describe("RecordDetailSheet", () => {
  it("renders record fields and a safe external link with opener protection", () => {
    render(
      <RecordDetailSheet
        open
        record={RECORD}
        isLoading={false}
        isError={false}
        errorMessage={null}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByText("Oil market update")).toBeInTheDocument();
    expect(screen.getByText("Economic")).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /View original source/ });
    expect(link).toHaveAttribute("href", "https://example.com/oil");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("omits the source link when the URL uses an unsafe scheme", () => {
    render(
      <RecordDetailSheet
        open
        record={{ ...RECORD, url: "javascript:alert(1)" }}
        isLoading={false}
        isError={false}
        errorMessage={null}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("renders the error state instead of fabricated data", () => {
    render(
      <RecordDetailSheet
        open
        record={undefined}
        isLoading={false}
        isError
        errorMessage="Backend exploded."
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Backend exploded.");
    expect(screen.queryByText("Oil market update")).not.toBeInTheDocument();
  });

  it("shows skeletons while the detail is loading", () => {
    render(
      <RecordDetailSheet
        open
        record={undefined}
        isLoading
        isError={false}
        errorMessage={null}
        onOpenChange={() => {}}
      />,
    );
    expect(screen.queryByText("Oil market update")).not.toBeInTheDocument();
    expect(
      document.body.querySelectorAll(".animate-pulse").length,
    ).toBeGreaterThan(0);
  });
});