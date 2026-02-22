/**
 * Index Module - Basic Tests
 * Tests for the main entry point (currently a placeholder)
 */

import { describe, it, expect } from "vitest";
import { VERSION, main } from "../../src/index.js";

describe("Index Module", () => {
  it("should export VERSION constant", () => {
    expect(VERSION).toBe("0.1.0");
  });

  it("should export main function", () => {
    expect(typeof main).toBe("function");
  });

  it("should throw NOT_IMPLEMENTED error when main is called", () => {
    expect(() => main()).toThrow("NOT_IMPLEMENTED");
    expect(() => main()).toThrow("MCP server not yet implemented");
  });
});
