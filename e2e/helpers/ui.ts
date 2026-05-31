import { expect, type Locator, type Page } from "@playwright/test";

/** Client list rows navigate on click — they are not `<a>` links. */
export async function openClientFromList(page: Page, name: string) {
  await page.getByRole("row").filter({ hasText: name }).click();
  await expect(page).toHaveURL(/\/clients\//);
}

/** Radix/shadcn Select exposes a combobox trigger, not a native `<select>`. */
export async function selectComboboxOption(
  page: Page,
  combobox: Locator,
  optionLabel: string | RegExp,
) {
  await combobox.click();
  const option = page.getByRole("option", { name: optionLabel });
  await expect(option).toBeVisible();
  await option.click();
}

export async function selectDealStage(page: Page, stageLabel: string | RegExp) {
  await selectComboboxOption(page, page.locator("#deal-stage"), stageLabel);
}

export async function selectPipelineDealStage(
  page: Page,
  dealTitle: string,
  stageLabel: string | RegExp,
) {
  await selectComboboxOption(
    page,
    page.getByRole("combobox", { name: new RegExp(`Move ${dealTitle} to stage`, "i") }),
    stageLabel,
  );
}

export async function selectConversationReassign(page: Page, teamMemberName: string) {
  await selectComboboxOption(
    page,
    page.getByRole("combobox", { name: "Reassign to" }),
    teamMemberName,
  );
}

export async function selectDealOwnerReassign(page: Page, teamMemberName: string) {
  await selectComboboxOption(
    page,
    page.getByRole("combobox", { name: "Reassign owner" }),
    teamMemberName,
  );
}
