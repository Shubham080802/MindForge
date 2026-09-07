import { describe, expect, it } from "vitest";
import { validateMaterialBatch } from "@/lib/material-ingestion";

describe("material ingestion policy", () => {
  it("rejects unsupported file types through the public validation seam", () => {
    const file = new File(["binary"], "archive.zip", { type: "application/zip" });
    expect(() => validateMaterialBatch([file])).toThrowError(Response);
  });

  it("limits each batch to five materials", () => {
    const files = Array.from({ length: 6 }, (_, index) => new File(["notes"], `notes-${index}.txt`, { type: "text/plain" }));
    expect(() => validateMaterialBatch(files)).toThrowError(Response);
  });
});
