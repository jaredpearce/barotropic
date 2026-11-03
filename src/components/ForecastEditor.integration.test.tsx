import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { renderWithProviders } from "../../tests/utils/render";
import ForecastEditor from "./ForecastEditor";
import { forecastDatabase } from "../lib/forecast-workspace/db";

describe("ForecastEditor integration", () => {
  beforeEach(async () => {
    await forecastDatabase.transaction(
      "rw",
      forecastDatabase.locations,
      forecastDatabase.forecasts,
      forecastDatabase.revisions,
      async () => {
        await forecastDatabase.revisions.clear();
        await forecastDatabase.forecasts.clear();
        await forecastDatabase.locations.clear();
      },
    );
  });

  it("Use Case: renders structured fields and source guidance", () => {
    renderWithProviders(<ForecastEditor />);

    expect(screen.getByRole("heading", { name: "New Forecast" })).toBeInTheDocument();
    for (const field of ["High", "Low", "Probability of precipitation", "Wind", "Sky", "Hazards"]) {
      expect(screen.getByLabelText(field)).toBeInTheDocument();
      expect(screen.getByRole("status", { name: `${field} official` })).toHaveTextContent(
        "Unavailable",
      );
      expect(screen.getByRole("status", { name: `${field} model` })).toHaveTextContent(
        "Unavailable",
      );
    }
    expect(screen.getByLabelText("Reasoning")).toBeInTheDocument();
  });

  it("Use Case: autosaves edits as new immutable revisions", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ForecastEditor />);

    await user.type(screen.getByRole("textbox", { name: "Location" }), "Boston");
    await user.type(screen.getByRole("spinbutton", { name: "High" }), "25");
    await user.type(screen.getByRole("textbox", { name: "Reasoning" }), "Warm air arrives.");

    expect(
      await screen.findByText("Saved · revision 1", {}, { timeout: 5000 }),
    ).toBeInTheDocument();

    await user.clear(screen.getByRole("spinbutton", { name: "High" }));
    await user.type(screen.getByRole("spinbutton", { name: "High" }), "28");

    expect(
      await screen.findByText("Saved · revision 2", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    const history = screen.getByRole("region", {
      name: "Saved revision history",
    });
    expect(history).toHaveTextContent("Revision 1 · High: 25");
    expect(history).toHaveTextContent("Revision 2 · High: 28");
  });
});
