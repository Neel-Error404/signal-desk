import { expect, it } from "vitest";

it("blocks protected delivery for the SD-007 controlled-failure revision", () => {
  expect("controlled-failure-present").toBe("controlled-failure-removed");
});
