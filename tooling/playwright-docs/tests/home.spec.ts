import { expect, test } from "@playwright/test";

test.describe("home page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders the getting started content", async ({ page }) => {
    await expect(page).toHaveTitle("Create Next App");
    await expect(page.getByRole("main")).toContainText(
      "Get started by editing apps/docs/app/page.tsx",
    );
  });

  test("links to the Turborepo docs in a new tab", async ({ page }) => {
    const docsLink = page.getByRole("link", { name: "Read our docs" });

    await expect(docsLink).toHaveAttribute("href", /turborepo\.dev\/docs/);
    await expect(docsLink).toHaveAttribute("target", "_blank");
  });

  test("shows an alert naming the app when the button is clicked", async ({
    page,
  }) => {
    // alert() blocks the click until the dialog is handled, so register the
    // handler before clicking rather than awaiting the dialog afterwards.
    let message: string | undefined;
    page.once("dialog", async (dialog) => {
      message = dialog.message();
      await dialog.dismiss();
    });

    await page.getByRole("button", { name: "Open alert" }).click();

    await expect.poll(() => message).toBe("Hello from your docs app!");
  });
});
