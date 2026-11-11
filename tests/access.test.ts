import { describe, expect, it } from "vitest";
import { canAccessRole } from "../lib/access";

describe("permissões por perfil", () => {
it("students may use student routes but not administrator routes", () => {
  expect(canAccessRole("STUDENT", "STUDENT")).toBe(true);
  expect(canAccessRole("STUDENT", "ADMIN")).toBe(false);
});

it("administrators may use administrator and student routes", () => {
  expect(canAccessRole("ADMIN", "ADMIN")).toBe(true);
  expect(canAccessRole("ADMIN", "STUDENT")).toBe(true);
});
});
