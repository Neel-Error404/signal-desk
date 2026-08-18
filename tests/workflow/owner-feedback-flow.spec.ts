import { expect, test } from "@playwright/test";

test("local operator creates, inspects, triages, and reloads a signal", async ({
  page
}, testInfo) => {
  const browserErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      const location = message.location();
      browserErrors.push(
        `${message.text()}${location.url.length > 0 ? ` at ${location.url}` : ""}`
      );
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      browserErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("pageerror", (error) => browserErrors.push(error.message));

  const feedback = `${testInfo.project.name}: Export loses the selected date range.`;
  const pullRequestNumber = testInfo.project.name === "desktop-chrome" ? 3 : 4;
  const pullRequestUrl = `https://github.com/Neel-Error404/signal-desk/pull/${pullRequestNumber}`;
  await page.goto("/");
  await expect(page.getByText("SignalDesk", { exact: true })).toBeVisible();
  await expect(page.getByText("No authentication or verified identity")).toBeVisible();

  await page.getByRole("textbox", { name: "Customer feedback" }).fill(feedback);
  await page
    .getByLabel(/I acknowledge this content will be stored locally/)
    .check();
  await page.getByRole("button", { name: "Create feedback and signal" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Feedback accepted and one signal created."
  );

  const row = page.locator(".signal-row").filter({ hasText: feedback });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByRole("heading", { name: "Source and decision history" })).toBeVisible();
  await expect(page.locator(".signal-detail .statement")).toHaveText(feedback);
  await expect(page.locator(".signal-detail dd").nth(1)).not.toBeEmpty();

  await page.getByLabel("State").selectOption("reviewing");
  await page.getByLabel("Local operator label (unverified)").fill("Neel");
  await page.getByLabel("Rationale").fill("Confirm the reporting workflow impact.");
  await page
    .getByLabel(/I acknowledge this persisted triage content/)
    .check();
  await page.getByRole("button", { name: "Append event" }).click();
  await expect(page.getByRole("status")).toContainText("Manual triage event appended.");
  await expect(page.locator(".signal-meta")).toContainText("revision 1");
  await expect(page.getByRole("button", { name: "Append event" })).toBeEnabled();
  await expect(page.getByText("new to reviewing")).toBeVisible();
  await expect(page.getByText("Confirm the reporting workflow impact.")).toBeVisible();

  await page.getByLabel("State").selectOption("accepted");
  await page.getByLabel("Local operator label (unverified)").fill("Neel");
  await page.getByLabel("Rationale").fill("Customer impact confirmed for prioritization.");
  await page
    .getByLabel(/I acknowledge this persisted triage content/)
    .check();
  await page.getByRole("button", { name: "Append event" }).click();
  await expect(page.locator(".signal-meta")).toContainText("revision 2");
  await expect(page.getByRole("button", { name: "Append event" })).toBeEnabled();
  await expect(page.getByText("reviewing to accepted")).toBeVisible();

  await page
    .getByRole("textbox", { name: "Issue title" })
    .fill("Preserve the selected date range during export");
  await page.getByRole("combobox", { name: "Priority", exact: true }).selectOption("high");
  await page
    .getByRole("textbox", { name: "Priority rationale" })
    .fill("The confirmed reporting workflow loses an explicit user selection.");
  await page
    .getByRole("textbox", {
      name: "Local operator label (unverified) for issue promotion"
    })
    .fill("Neel");
  await page
    .getByLabel(/I acknowledge this persisted issue content/)
    .check();
  await page.getByRole("button", { name: "Create prioritized issue" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Prioritized product issue created with source lineage preserved."
  );
  await expect(
    page.getByRole("heading", { name: "Prioritized product issue" })
  ).toBeVisible();
  await expect(page.getByText("Preserve the selected date range during export")).toBeVisible();
  await expect(page.locator(".priority")).toHaveText("high");

  await page
    .getByRole("textbox", { name: "Implementation objective" })
    .fill("Preserve the selected date range when a report is exported.");
  await page
    .getByRole("textbox", { name: "Acceptance criteria (one per line)" })
    .fill(
      "The export uses the date range visible when export begins.\nReloading does not change the completed exported artifact."
    );
  await page
    .getByRole("textbox", { name: "Constraints (optional, one per line)" })
    .fill("Do not change report retention.");
  await page
    .getByRole("textbox", { name: "Local approver label (unverified)" })
    .fill("Neel");
  await page
    .getByLabel(/I acknowledge this approved brief content/)
    .check();
  await page.getByRole("button", { name: "Approve implementation brief" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Implementation brief approved with acceptance criteria and lineage preserved."
  );
  await expect(
    page.getByRole("heading", { name: "Approved implementation brief" })
  ).toBeVisible();
  await expect(
    page.getByText("The export uses the date range visible when export begins.")
  ).toBeVisible();
  await expect(page.getByText("Do not change report retention.")).toBeVisible();

  await page
    .getByRole("textbox", { name: "Base branch" })
    .fill("work/sd-003-approved-implementation-brief");
  await page
    .getByRole("textbox", { name: "Head branch" })
    .fill("work/sd-004-review-delivery");
  await page
    .getByRole("textbox", { name: "Commit SHA" })
    .fill("0123456789abcdef0123456789abcdef01234567");
  await page
    .getByRole("textbox", { name: "SignalDesk pull-request URL" })
    .fill(pullRequestUrl);
  await page
    .getByRole("textbox", { name: "Verification summary" })
    .fill("Foundation through Stress passed for the exact review commit.");
  await page
    .getByRole("textbox", { name: "Local delivery label (unverified)" })
    .fill("Neel");
  await page.getByLabel(/I acknowledge this delivery trace/).check();
  await page.getByRole("button", { name: "Record review delivery" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Review delivery recorded with implementation lineage preserved."
  );
  await expect(page.getByRole("heading", { name: "Review delivery" })).toBeVisible();
  await expect(page.getByText("immutable operator-supplied trace")).toBeVisible();
  await expect(page.getByRole("link", { name: `#${pullRequestNumber}` })).toHaveAttribute(
    "href",
    pullRequestUrl
  );

  const mergedCommit = "89abcdef0123456789abcdef0123456789abcdef";
  await page.getByRole("textbox", { name: "Merged commit SHA" }).fill(mergedCommit);
  await page
    .getByRole("textbox", { name: "Completion summary" })
    .fill("The human owner merged the reviewed fix after all required checks passed.");
  await page
    .getByRole("textbox", { name: "Local completion label (unverified)" })
    .fill("Neel");
  await page.getByLabel(/I confirm a human merged this change outside SignalDesk/).check();
  await page.getByLabel(/I acknowledge this completion evidence/).check();
  await page.getByRole("button", { name: "Record completed fix" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Completed fix recorded with review and product lineage preserved."
  );
  await expect(page.getByRole("heading", { name: "Completed fix" })).toBeVisible();
  await expect(page.getByText("immutable human-confirmed outcome")).toBeVisible();
  await expect(page.getByText(mergedCommit)).toBeVisible();

  await page.reload();
  const reloadedRow = page.locator(".signal-row").filter({ hasText: feedback });
  await expect(reloadedRow).toBeVisible();
  await reloadedRow.click();
  await expect(page.getByText("new to reviewing")).toBeVisible();
  await expect(page.getByText("Confirm the reporting workflow impact.")).toBeVisible();
  await expect(page.getByText("reviewing to accepted")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Prioritized product issue" })
  ).toBeVisible();
  await expect(page.getByText("Preserve the selected date range during export")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Approved implementation brief" })
  ).toBeVisible();
  await expect(
    page.getByText("Reloading does not change the completed exported artifact.")
  ).toBeVisible();
  await expect(page.getByText("work/sd-004-review-delivery", { exact: false })).toBeVisible();
  await expect(
    page.getByText("Foundation through Stress passed for the exact review commit.")
  ).toBeVisible();
  await expect(
    page.getByText("The human owner merged the reviewed fix after all required checks passed.")
  ).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth
  );
  expect(hasHorizontalOverflow).toBe(false);
  expect(browserErrors).toEqual([]);
});
