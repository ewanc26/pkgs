import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { onStopRequest, requestStop, setTui, stopRequested } from "../utils/tui.js";
import { select } from "../utils/input.js";
import type { Tui } from "@ewanc26/tui";

describe("jasper terminal interface", () => {
  afterEach(() => {
    setTui(null);
    onStopRequest(null);
  });

  it("exits on Ctrl+C unless an import is running", () => {
    assert.equal(requestStop(), false);
    let cancelled = 0;
    onStopRequest(() => cancelled++);
    assert.equal(requestStop(), true);
    assert.equal(stopRequested(), true);
    assert.equal(cancelled, 1);
    onStopRequest(null);
    assert.equal(stopRequested(), false);
  });

  it("returns the chosen position from a menu", async () => {
    setTui({
      select: async (_m: string, options: { value: number }[], initial: number) =>
        options[initial + 1]!.value,
    } as unknown as Tui);
    assert.equal(await select("Import to:", ["Grain", "Spark"], 0), 1);
  });
});
