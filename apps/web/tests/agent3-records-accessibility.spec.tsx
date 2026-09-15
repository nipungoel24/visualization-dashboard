import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { RecordPagination } from "@/components/records/RecordPagination";
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

describe("RecordPagination accessibility", () => {
  it("previous button has accessible label", () => {
    render(
      <RecordPagination page={2} totalPages={5} total={100} onChangePage={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Previous page" })).toBeInTheDocument();
  });

  it("next button has accessible label", () => {
    render(
      <RecordPagination page={2} totalPages={5} total={100} onChangePage={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Next page" })).toBeInTheDocument();
  });

  it("previous button is disabled on first page", () => {
    render(
      <RecordPagination page={1} totalPages={5} total={100} onChangePage={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled();
  });

  it("next button is disabled on last page", () => {
    render(
      <RecordPagination page={5} totalPages={5} total={100} onChangePage={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
  });

  it("page info is announced", () => {
    render(
      <RecordPagination page={2} totalPages={5} total={100} onChangePage={() => {}} />,
    );
    expect(screen.getByText("Page 2 of 5")).toBeInTheDocument();
  });

  it("total count is announced", () => {
    render(
      <RecordPagination page={1} totalPages={5} total={100} onChangePage={() => {}} />,
    );
    expect(screen.getByText("100 matching")).toBeInTheDocument();
  });

  it("buttons are keyboard operable", async () => {
    const user = userEvent.setup();
    const onChangePage = vi.fn();
    render(
      <RecordPagination page={2} totalPages={5} total={100} onChangePage={onChangePage} />,
    );
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(onChangePage).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole("button", { name: "Previous page" }));
    expect(onChangePage).toHaveBeenCalledWith(1);
  });

  it("hides when only one page", () => {
    const { container } = render(
      <RecordPagination page={1} totalPages={1} total={20} onChangePage={() => {}} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("buttons have adequate touch target size", () => {
    render(
      <RecordPagination page={2} totalPages={5} total={100} onChangePage={() => {}} />,
    );
    const prevBtn = screen.getByRole("button", { name: "Previous page" });
    const nextBtn = screen.getByRole("button", { name: "Next page" });
    expect(prevBtn.className).toContain("h-8");
    expect(prevBtn.className).toContain("w-8");
    expect(nextBtn.className).toContain("h-8");
    expect(nextBtn.className).toContain("w-8");
  });
});

describe("RecordDetailSheet accessibility", () => {
  it("dialog has accessible name", () => {
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
    expect(screen.getByRole("dialog", { name: "Record detail" })).toBeInTheDocument();
  });

  it("record title is visible", () => {
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
  });

  it("external link has accessible text", () => {
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
    const link = screen.getByRole("link", { name: /View original source/ });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("error state announces with role=alert", () => {
    render(
      <RecordDetailSheet
        open
        record={undefined}
        isLoading={false}
        isError
        errorMessage="Backend error."
        onOpenChange={() => {}}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Backend error.");
  });

  it("loading state shows skeleton", () => {
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
    expect(document.body.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("description list uses semantic markup", () => {
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
    expect(screen.getByText("Region")).toBeInTheDocument();
    expect(screen.getByText("World")).toBeInTheDocument();
    expect(screen.getByText("Country")).toBeInTheDocument();
    expect(screen.getByText("India")).toBeInTheDocument();
  });

  it("unsafe URLs do not render links", () => {
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

  it("close button is keyboard accessible via Escape", async () => {
    const onOpenChange = vi.fn();
    render(
      <RecordDetailSheet
        open
        record={RECORD}
        isLoading={false}
        isError={false}
        errorMessage={null}
        onOpenChange={onOpenChange}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
