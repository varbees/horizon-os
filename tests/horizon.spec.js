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

  test("validates Strategy writes and exposes Forge catalog stats through the API", async ({ request }) => {
    const invalid = await request.post("http://127.0.0.1:8787/api/strategy", { data: { project_id: "" } });
    expect(invalid.status()).toBe(400);

    const strategy = await request.post("http://127.0.0.1:8787/api/strategy", {
      data: {
        project_id: "photoselect",
        tam_sam_som: "TAM: wedding photo delivery. SAM: Indian studio workflows. SOM: first 50 studios.",
        beachhead_market: "High-volume Indian wedding studios selling selection galleries.",
        moats: "Payment history, client gallery workflow, switching cost.",
        market_strategy: "Narrow beachhead first, category language later.",
        business_model: "Vertical SaaS plus pack revenue.",
      },
    });
    expect(strategy.ok()).toBeTruthy();

    const saved = await request.get("http://127.0.0.1:8787/api/strategy/photoselect");
    expect(saved.ok()).toBeTruthy();
    const savedJson = await saved.json();
    expect(savedJson.strategy.project_id).toBe("photoselect");
    expect(savedJson.strategy.completeness.completed).toBeGreaterThanOrEqual(5);

    const forge = await request.get("http://127.0.0.1:8787/api/forge");
    expect(forge.ok()).toBeTruthy();
    const forgeJson = await forge.json();
    expect(Array.isArray(forgeJson.agents)).toBeTruthy();
    expect(forgeJson.stats).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        categories: expect.any(Array),
        revenueModels: expect.any(Array),
      }),
    );
  });

  test("renders Strategy and Forge without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of ["/strategy", "/forge"]) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, `${route} overflow`).toBeLessThanOrEqual(2);
    }

    await expect(page.getByRole("heading", { name: "Agent Forge" })).toBeVisible();
    await page.goto("/strategy");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: "Startup Incubation Engine" })).toBeVisible();
    await expect(page.getByText("Strategy completeness")).toBeVisible();
  });

  test("surfaces native agents and MCP providers in the integration hub", async ({ page }) => {
    await page.goto("/connectors");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Integration hub for agents, MCP, and skills." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Local Agents" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Claude Code" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Codex" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Hugging Face" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Higgsfield" })).toBeVisible();

    await page.getByRole("button", { name: /Check Codex health/ }).click();
    await expect(page.getByText(/codex is ready|codex is unavailable/i)).toBeVisible();
  });

  test("lists every tool returned by a connected MCP provider", async ({ page }) => {
    await page.route("**/api/connectors", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          connectors: [
            {
              id: "google-drive",
              kind: "mcp",
              name: "Google Drive",
              category: "Files",
              provides: "Recent documents and search.",
              url: "https://drivemcp.googleapis.com/mcp/v1",
              state: "connected",
              sort_order: 0,
            },
          ],
        }),
      });
    });
    await page.route("**/api/connectors/google-drive/tools", async (route) => {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          ok: true,
          tools: [
            "copy_file",
            "create_file",
            "download_file_content",
            "get_file_metadata",
            "get_file_permissions",
            "list_recent_files",
            "search_files",
            "update_file",
          ].map((name) => ({ name, description: `${name} description` })),
        }),
      });
    });

    await page.goto("/connectors");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "List Google Drive tools" }).click();

    const drive = page.getByRole("article", { name: "Google Drive" });
    await expect(drive.getByText("8 tools loaded")).toBeVisible();
    await expect(drive.getByRole("button", { name: /copy_file/ })).toBeVisible();
    await expect(drive.getByRole("button", { name: /create_file/ })).toBeVisible();
    await expect(drive.getByRole("button", { name: /download_file_content/ })).toBeVisible();
    await expect(drive.getByRole("button", { name: /get_file_metadata/ })).toBeVisible();
    await expect(drive.getByRole("button", { name: /get_file_permissions/ })).toBeVisible();
    await expect(drive.getByRole("button", { name: /list_recent_files/ })).toBeVisible();
    await expect(drive.getByRole("button", { name: /search_files/ })).toBeVisible();
    await expect(drive.getByRole("button", { name: /update_file/ })).toBeVisible();
  });

  test("runs the content engine manual-publish flow", async ({ page }) => {
    const title = `PhotoSelect delivery reel ${Date.now()}`;

    await page.goto("/content");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Content Engine" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Generate in the backyard" })).toBeVisible();
    await expect(page.getByText("Higgsfield · generate_image")).toBeVisible();
    await page.getByLabel("Brief title").fill(title);
    await page.getByLabel("Engine").selectOption("photoselect");
    await page.getByLabel("Source artifact").fill("PhotoSelect checkout and delivery build log");
    await page.getByLabel("Hook").fill("Shot Sunday. Delivered Monday.");
    await page.getByLabel("Audience").fill("Indian wedding studio owners");
    await page.getByLabel("Channels").fill("instagram,whatsapp");
    await page.getByRole("button", { name: "Save brief" }).click();

    const brief = page.getByRole("article", { name: title });
    await expect(brief).toBeVisible();

    // The native Auto-draft button runs Claude Code (minutes) — too slow for e2e. Exercise the
    // fast template-package manual-publish path here; the autonomous lane is covered server-side.
    await brief.getByRole("button", { name: "Plan still" }).click();
    await expect(page.getByRole("status").getByText("huggingface still planned")).toBeVisible();

    await brief.getByRole("button", { name: "Template package" }).click();
    await expect(page.getByText("content package")).toBeVisible();

    await brief.getByRole("button", { name: "Mark published" }).click();
    await expect(page.getByRole("status").getByText("published manually")).toBeVisible();
  });

  test("spreads connector actions into relevant work surfaces", async ({ page }) => {
    await page.goto("/signals");
    await page.waitForLoadState("networkidle");

    await expect(page.getByRole("heading", { name: "Turn inbox and files into action fuel" })).toBeVisible();
    await expect(page.getByText("Gmail · search_threads")).toBeVisible();
    await expect(page.getByText("Google Drive · list_recent_files")).toBeVisible();
    await expect(page.getByText("Google Calendar · list_events")).toBeVisible();
  });
});
