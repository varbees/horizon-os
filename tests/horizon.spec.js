import { expect, test } from "@playwright/test";

test.describe("Horizon OS command center", () => {
  test("renders the Journey Ledger with capital targets and field evidence", async ({ page }) => {
    await page.goto("/journey");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Climb the two-year route, leg by leg." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "February 2027 gap" })).toBeVisible();
    await expect(page.getByText("₹11,50,000")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Routes and branch legs" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "West Hill ridge scout" })).toBeVisible();
    await expect(page.getByText("13.711845")).toBeVisible();
    await expect(page.getByText("79.711627")).toBeVisible();
    await expect(page.getByText("211.6m")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Research to action" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Free tool as lead magnet" })).toBeVisible();
  });

  test("navigates from the command deck to Journey and Documents", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page.getByRole("link", { name: /Journey/ }).click();
    await expect(page).toHaveURL(/\/journey$/);
    await expect(page.getByRole("heading", { name: "Vertical slices only" })).toBeVisible();

    await page.getByRole("link", { name: /Docs/ }).click();
    await expect(page).toHaveURL(/\/documents$/);
    await expect(page.getByRole("heading", { name: "Documents, presentations, and connectors." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Journey Log System" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Capital Goals Through February 2027" })).toBeVisible();
  });

  test("exposes new command graph nodes through the local SQLite API", async ({ request }) => {
    const response = await request.get("http://127.0.0.1:8787/api/command-base");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.nodes).toHaveLength(15);
    expect(data.edges).toHaveLength(30);
    expect(data.tasks).toHaveLength(39);
    expect(data.nodes.map((node) => node.id)).toEqual(
      expect.arrayContaining(["journey-log", "capital-targets", "playbook-engine"]),
    );
    expect(data.tasks.map((task) => task.id)).toEqual(
      expect.arrayContaining(["action-journey-west-hill-template", "action-capital-baseline"]),
    );
  });
});
