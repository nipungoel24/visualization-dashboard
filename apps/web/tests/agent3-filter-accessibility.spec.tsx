import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ActiveFilterChips } from "@/components/filters/ActiveFilterChips";
import { DisabledDimension } from "@/components/filters/DisabledDimension";
import { MultiSelectFilter } from "@/components/filters/MultiSelectFilter";
import { RangeFilter } from "@/components/filters/RangeFilter";
import { SearchField } from "@/components/filters/SearchField";
import { EMPTY_FILTERS, parseFilterState } from "@/lib/filters";

const OPTIONS = [
  { value: "oil", count: 403 },
  { value: "gas", count: 89 },
  { value: "renewable", count: 120 },
];

describe("MultiSelectFilter accessibility", () => {
  it("has accessible name on trigger button", () => {
    render(
      <MultiSelectFilter
        label="Topic"
        options={OPTIONS}
        selected={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Filter by Topic" })).toBeInTheDocument();
  });

  it("announces expanded state", async () => {
    const user = userEvent.setup();
    render(
      <MultiSelectFilter
        label="Topic"
        options={OPTIONS}
        selected={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );
    const trigger = screen.getByRole("button", { name: "Filter by Topic" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("provides accessible names for options with counts", async () => {
    const user = userEvent.setup();
    render(
      <MultiSelectFilter
        label="Topic"
        options={OPTIONS}
        selected={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter by Topic" }));
    expect(screen.getByRole("option", { name: "oil, 403 records" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "gas, 89 records" })).toBeInTheDocument();
  });

  it("announces selected state in option label", async () => {
    const user = userEvent.setup();
    render(
      <MultiSelectFilter
        label="Topic"
        options={OPTIONS}
        selected={["oil"]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter by Topic" }));
    expect(screen.getByRole("option", { name: "oil, 403 records, selected" })).toBeInTheDocument();
  });

  it("badge is decorative (aria-hidden) since trigger text communicates count", () => {
    render(
      <MultiSelectFilter
        label="Topic"
        options={OPTIONS}
        selected={["oil", "gas"]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );
    const badge = screen.getByText("2");
    expect(badge).toHaveAttribute("aria-hidden", "true");
  });

  it("clear button is keyboard accessible", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <MultiSelectFilter
        label="Topic"
        options={OPTIONS}
        selected={["oil"]}
        onToggle={() => {}}
        onClear={onClear}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter by Topic" }));
    await user.click(screen.getByRole("button", { name: "Clear topic" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("search input has accessible label", async () => {
    const user = userEvent.setup();
    render(
      <MultiSelectFilter
        label="Topic"
        options={OPTIONS}
        selected={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter by Topic" }));
    expect(screen.getByRole("combobox", { name: "Search Topic options" })).toBeInTheDocument();
  });

  it("shows empty message when no options match search", async () => {
    const user = userEvent.setup();
    render(
      <MultiSelectFilter
        label="Topic"
        options={OPTIONS}
        selected={[]}
        onToggle={() => {}}
        onClear={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Filter by Topic" }));
    await user.type(screen.getByRole("combobox", { name: "Search Topic options" }), "zzz");
    expect(screen.getByText("No matching options.")).toBeInTheDocument();
  });
});

describe("RangeFilter accessibility", () => {
  function Harness() {
    const [range, setRange] = useState<{ min: number | null; max: number | null }>({
      min: null,
      max: null,
    });
    return (
      <RangeFilter
        label="Intensity"
        min={range.min}
        max={range.max}
        onChange={(min, max) => setRange({ min, max })}
      />
    );
  }

  it("min input has accessible label", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Minimum Intensity")).toBeInTheDocument();
  });

  it("max input has accessible label", () => {
    render(<Harness />);
    expect(screen.getByLabelText("Maximum Intensity")).toBeInTheDocument();
  });

  it("validation error is announced with role=alert", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Minimum Intensity"), "50");
    await user.tab();
    await user.type(screen.getByLabelText("Maximum Intensity"), "10");
    await user.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("Minimum cannot exceed maximum.");
  });

  it("separator is decorative", () => {
    render(<Harness />);
    expect(screen.getByText("–")).toHaveAttribute("aria-hidden", "true");
  });
});

describe("SearchField accessibility", () => {
  it("input has accessible label", () => {
    render(<SearchField value="" onChange={() => {}} />);
    expect(screen.getByRole("searchbox", { name: "Search records" })).toBeInTheDocument();
  });

  it("clear button has accessible label", async () => {
    render(<SearchField value="test" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Clear search" })).toBeInTheDocument();
  });

  it("search icon is decorative", () => {
    const { container } = render(<SearchField value="" onChange={() => {}} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("clear button is keyboard accessible", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SearchField value="test" onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("type=search enables native clear behavior", () => {
    render(<SearchField value="" onChange={() => {}} />);
    expect(screen.getByRole("searchbox")).toHaveAttribute("type", "search");
  });
});

describe("ActiveFilterChips accessibility", () => {
  const handlers = {
    onRemoveValue: vi.fn(),
    onClearRange: vi.fn(),
    onClearSearch: vi.fn(),
    onReset: vi.fn(),
  };

  it("container has accessible label", () => {
    const filters = parseFilterState("topic=oil");
    render(<ActiveFilterChips filters={filters} {...handlers} />);
    expect(screen.getByLabelText("Active filters")).toBeInTheDocument();
  });

  it("remove buttons have accessible labels", () => {
    const filters = parseFilterState("topic=oil&country=India");
    render(<ActiveFilterChips filters={filters} {...handlers} />);
    expect(screen.getByRole("button", { name: "Remove filter Topic: oil" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Remove filter Country: India" })).toBeInTheDocument();
  });

  it("reset button has accessible label with count", () => {
    const filters = parseFilterState("topic=oil&country=India");
    render(<ActiveFilterChips filters={filters} {...handlers} />);
    expect(screen.getByRole("button", { name: /Reset filters \(2\)/ })).toBeInTheDocument();
  });

  it("remove buttons have adequate touch target size on mobile", () => {
    const filters = parseFilterState("topic=oil");
    render(<ActiveFilterChips filters={filters} {...handlers} />);
    const removeBtn = screen.getByRole("button", { name: "Remove filter Topic: oil" });
    expect(removeBtn.className).toContain("min-w-8");
    expect(removeBtn.className).toContain("h-8");
  });

  it("renders nothing when no filters are active", () => {
    const { container } = render(<ActiveFilterChips filters={EMPTY_FILTERS} {...handlers} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("summarizes long selections", () => {
    const filters = parseFilterState(
      Array.from({ length: 12 }, (_, i) => `topic=t${i}`).join("&"),
    );
    render(<ActiveFilterChips filters={filters} {...handlers} />);
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });
});

describe("DisabledDimension accessibility", () => {
  it("has aria-disabled", () => {
    render(<DisabledDimension label="City" />);
    expect(screen.getByText("All city").closest("[aria-disabled]")).toHaveAttribute("aria-disabled", "true");
  });

  it("explanation is linked via aria-describedby", () => {
    render(<DisabledDimension label="City" />);
    const container = screen.getByText("All city").closest("[aria-describedby]");
    const descriptionId = container?.getAttribute("aria-describedby");
    expect(descriptionId).toBeTruthy();
    const description = document.getElementById(descriptionId!);
    expect(description).toHaveTextContent("Not present in supplied dataset");
  });

  it("explanation text is visible", () => {
    render(<DisabledDimension label="SWOT" />);
    expect(screen.getByText("Not present in supplied dataset")).toBeInTheDocument();
  });

  it("no interactive elements inside", () => {
    render(<DisabledDimension label="City" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("has reduced opacity for disabled visual treatment", () => {
    render(<DisabledDimension label="City" />);
    const container = screen.getByText("All city").closest("[aria-disabled]");
    expect(container).toHaveClass("opacity-60");
  });

  it("cursor-not-allowed on the control area", () => {
    render(<DisabledDimension label="City" />);
    const control = screen.getByText("All city");
    expect(control.parentElement).toHaveClass("cursor-not-allowed");
  });
});
