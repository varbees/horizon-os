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

  test("defaults the action board to the current revenue phase", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const board = page.getByLabel("Action control board");
    await expect(board.getByRole("heading", { name: "Make the plan move" })).toBeVisible();
    await expect(board.getByRole("heading", { name: "Write the 30-day PhotoSelect implementation offer" })).toBeVisible();
    await expect(board.getByRole("heading", { name: "Turn DialysisSaathi docs into the source-of-truth runbook" })).toHaveCount(0);
  });

  test("exposes new command graph nodes through the local SQLite API", async ({ request }) => {
    let data;
    await expect
      .poll(async () => {
        const response = await request.get("http://127.0.0.1:8787/api/command-base").catch(() => null);
        if (!response?.ok()) return "offline";
        data = await response.json();
        return "ready";
      })
      .toBe("ready");

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

  test("keeps only current generated revenue actions active", async ({ request }) => {
    let data;
    await expect
      .poll(async () => {
        const response = await request.get("http://127.0.0.1:8787/api/action-queue").catch(() => null);
        if (!response?.ok()) return "offline";
        data = await response.json();
        return "ready";
      })
      .toBe("ready");

    const todayKey = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const activeGenerated = data.actions.filter(
      (action) => action.source === "revenue-engine" && !["dismissed", "done"].includes(action.status),
    );

    expect(activeGenerated).toHaveLength(5);
    expect(activeGenerated.every((action) => action.id.startsWith(`rev-${todayKey}-`))).toBeTruthy();
    expect(activeGenerated.find((action) => action.project_id === "photoselect")?.project_path).toBe(
      "/home/driftr/Desktop/bolting/01-revenue/photoselect",
    );
  });

  test("surfaces the read-only doctor contract in the command center", async ({ page }) => {
    await page.goto("/command");
    await page.waitForLoadState("networkidle");

    const doctor = page.getByRole("region", { name: "System doctor" });
    await expect(doctor.getByText("System doctor")).toBeVisible();
    await expect(doctor.getByText("Loop status", { exact: true })).toBeVisible();
    await expect(doctor.getByText("Wiki graph", { exact: true })).toBeVisible();
    await expect(doctor.getByText("Source registry", { exact: true })).toBeVisible();
    await expect(doctor.getByText("Dispatch outbox", { exact: true })).toBeVisible();
    await expect(doctor.getByText("Horizon self WIP", { exact: true })).toBeVisible();
  });

  test("shows the codebase monetization lens for active and archived projects", async ({ page }) => {
    await page.goto("/projects");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Codebase monetization lens" })).toBeVisible();
    await expect(page.getByText("Actual codebase families audited")).toBeVisible();
    await expect(page.getByText("Active lanes are still only PhotoSelect and RateGuard.")).toBeVisible();

    await page.getByRole("button", { name: /BBS Agent Platforms/ }).click();
    await expect(page.getByText("~/Desktop/bolting/07-archive/bbs-agents")).toBeVisible();
    await expect(page.getByText("WhatsApp and omnichannel agent patterns are reusable")).toBeVisible();

    await page.getByRole("button", { name: /LiquiLogic POS Archive/ }).click();
    await expect(page.getByText("Point-of-sale and inventory flows are real")).toBeVisible();
  });

  test("does not create horizontal document overflow on core mobile routes", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/projects", "/project/photoselect", "/project/rateguard", "/journey", "/capital"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} overflow`).toBeLessThanOrEqual(2);
    }
  });

  test("keeps mobile primary navigation touch targets reachable", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const targets = await page.locator('nav[aria-label="Mobile primary"] a').evaluateAll((links) =>
      links.map((link) => {
        const box = link.getBoundingClientRect();
        return { label: link.textContent?.trim(), width: box.width, height: box.height };
      }),
    );
    expect(targets.length).toBeGreaterThan(8);
    for (const target of targets) {
      expect(target.width, `${target.label} width`).toBeGreaterThanOrEqual(44);
      expect(target.height, `${target.label} height`).toBeGreaterThanOrEqual(44);
    }
  });
});
