import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { ActiveFilterChips } from "@/components/filters/ActiveFilterChips";
import { DisabledDimension } from "@/components/filters/DisabledDimension";
import { MultiSelectFilter } from "@/components/filters/MultiSelectFilter";
import { RangeFilter } from "@/components/filters/RangeFilter";
import { EMPTY_FILTERS, parseFilterState } from "@/lib/filters";

const OPTIONS = [
  { value: "oil", count: 403 },
  { value: "gas", count: 89 },
];

describe("MultiSelectFilter", () => {
  it("selects an option from the searchable list", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <MultiSelectFilter
        label="Topic"
        options={OPTIONS}
        selected={[]}
        onToggle={onToggle}
        onClear={() => {}}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Filter by Topic" }));
    await user.click(screen.getByRole("option", { name: "oil, 403 records" }));
    expect(onToggle).toHaveBeenCalledWith("oil");
  });

  it("shows the selected count and clears the field", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(
      <MultiSelectFilter
        label="Topic"
        options={OPTIONS}
        selected={["oil", "gas"]}
        onToggle={() => {}}
        onClear={onClear}
      />,
    );

    expect(screen.getByText("2 selected")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Filter by Topic" }));
    await user.click(screen.getByRole("button", { name: "Clear topic" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("filters options through the search box", async () => {
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
    await user.type(screen.getByRole("combobox", { name: "Search Topic options" }), "ga");
    expect(screen.getByRole("option", { name: "gas, 89 records" })).toBeInTheDocument();
    expect(
      screen.queryByRole("option", { name: "oil, 403 records" }),
    ).not.toBeInTheDocument();
  });
});

describe("DisabledDimension", () => {
  it("renders City as unavailable with the mandated explanation", () => {
    render(<DisabledDimension label="City" />);
    expect(screen.getByText("Not present in supplied dataset")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("RangeFilter", () => {
  function Harness({
    initialMin = null,
    initialMax = null,
  }: {
    initialMin?: number | null;
    initialMax?: number | null;
  }) {
    const [range, setRange] = useState<{ min: number | null; max: number | null }>({
      min: initialMin,
      max: initialMax,
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

  it("commits valid pairs", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(screen.getByLabelText("Minimum Intensity"), "10");
    await user.tab();
    expect(screen.getByLabelText("Minimum Intensity")).toHaveValue("10");
  });

  it("rejects inverted ranges without committing", async () => {
    const user = userEvent.setup();
    render(<Harness initialMin={20} />);
    await user.type(screen.getByLabelText("Maximum Intensity"), "5");
    await user.tab();
    expect(screen.getByRole("alert")).toHaveTextContent("Minimum cannot exceed maximum.");
    expect(screen.getByLabelText("Minimum Intensity")).toHaveValue("20");
  });
});

describe("ActiveFilterChips", () => {
  const handlers = {
    onRemoveValue: vi.fn(),
    onClearRange: vi.fn(),
    onClearSearch: vi.fn(),
    onReset: vi.fn(),
  };

  it("removes an individual filter and resets all", async () => {
    const user = userEvent.setup();
    const filters = parseFilterState("topic=oil&country=India");
    render(<ActiveFilterChips filters={filters} {...handlers} />);

    await user.click(screen.getByRole("button", { name: "Remove filter Topic: oil" }));
    expect(handlers.onRemoveValue).toHaveBeenCalledWith("topic", "oil");
    await user.click(screen.getByRole("button", { name: /Reset filters \(2\)/ }));
    expect(handlers.onReset).toHaveBeenCalled();
  });

  it("renders nothing when no filters are active", () => {
    const { container } = render(<ActiveFilterChips filters={EMPTY_FILTERS} {...handlers} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("summarizes long selections instead of filling the viewport", () => {
    const filters = parseFilterState(
      Array.from({ length: 12 }, (_, i) => `topic=t${i}`).join("&"),
    );
    render(<ActiveFilterChips filters={filters} {...handlers} />);
    expect(screen.getByText("+2 more")).toBeInTheDocument();
  });
});
