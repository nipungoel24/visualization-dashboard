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

  describe("URL scheme safety", () => {
    it("renders a clickable link for https URLs", () => {
      render(
        <RecordDetailSheet
          open
          record={{ ...RECORD, url: "https://example.com/article" }}
          isLoading={false}
          isError={false}
          errorMessage={null}
          onOpenChange={() => {}}
        />,
      );
      const link = screen.getByRole("link", { name: /View original source/ });
      expect(link).toHaveAttribute("href", "https://example.com/article");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("renders a clickable link for http URLs", () => {
      render(
        <RecordDetailSheet
          open
          record={{ ...RECORD, url: "http://example.com/article" }}
          isLoading={false}
          isError={false}
          errorMessage={null}
          onOpenChange={() => {}}
        />,
      );
      const link = screen.getByRole("link", { name: /View original source/ });
      expect(link).toHaveAttribute("href", "http://example.com/article");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    });

    it("omits the source link for mailto URLs", () => {
      render(
        <RecordDetailSheet
          open
          record={{ ...RECORD, url: "mailto:test@example.com" }}
          isLoading={false}
          isError={false}
          errorMessage={null}
          onOpenChange={() => {}}
        />,
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("omits the source link for javascript: URLs", () => {
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

    it("omits the source link for data: URLs", () => {
      render(
        <RecordDetailSheet
          open
          record={{ ...RECORD, url: "data:text/html,<script>alert(1)</script>" }}
          isLoading={false}
          isError={false}
          errorMessage={null}
          onOpenChange={() => {}}
        />,
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("omits the source link for malformed URLs", () => {
      render(
        <RecordDetailSheet
          open
          record={{ ...RECORD, url: "not-a-valid-url" }}
          isLoading={false}
          isError={false}
          errorMessage={null}
          onOpenChange={() => {}}
        />,
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("omits the source link for ftp: URLs", () => {
      render(
        <RecordDetailSheet
          open
          record={{ ...RECORD, url: "ftp://example.com/file" }}
          isLoading={false}
          isError={false}
          errorMessage={null}
          onOpenChange={() => {}}
        />,
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("omits the source link for file: URLs", () => {
      render(
        <RecordDetailSheet
          open
          record={{ ...RECORD, url: "file:///etc/passwd" }}
          isLoading={false}
          isError={false}
          errorMessage={null}
          onOpenChange={() => {}}
        />,
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });

    it("omits the source link for null/empty URLs", () => {
      render(
        <RecordDetailSheet
          open
          record={{ ...RECORD, url: null }}
          isLoading={false}
          isError={false}
          errorMessage={null}
          onOpenChange={() => {}}
        />,
      );
      expect(screen.queryByRole("link")).not.toBeInTheDocument();
    });
  });
});
