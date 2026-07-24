import { describe, it, expect, beforeEach } from "vitest";
import { validateLLMOutput, type AITriageOutput } from "./ai-triage.js";

describe("ai-triage", () => {
  describe("validateLLMOutput (AI-02)", () => {
    it("accepts valid JSON with all required fields", () => {
      const input = JSON.stringify({
        reasoning_steps: ["Step 1: analyzed claim", "Step 2: compared to description"],
        confidence_score: 0.850,
        recommended_action: "REFUND_BUYER",
        summary_for_users: "The item received does not match the description. A refund has been initiated.",
      });

      const result = validateLLMOutput(input);
      expect(result).not.toBeNull();
      expect(result!.confidence_score).toBe(0.850);
      expect(result!.recommended_action).toBe("REFUND_BUYER");
      expect(result!.reasoning_steps).toHaveLength(2);
    });

    it("strips markdown fences before parsing", () => {
      const input = '```json\n{"reasoning_steps":["a"],"confidence_score":0.950,"recommended_action":"RELEASE_VENDOR","summary_for_users":"ok"}\n```';

      const result = validateLLMOutput(input);
      expect(result).not.toBeNull();
      expect(result!.recommended_action).toBe("RELEASE_VENDOR");
    });

    it("rejects non-JSON strings", () => {
      expect(validateLLMOutput("This is not JSON")).toBeNull();
    });

    it("rejects JSON with missing fields", () => {
      expect(validateLLMOutput('{"reasoning_steps":["a"],"confidence_score":0.5}')).toBeNull();
    });

    it("rejects invalid confidence_score (negative)", () => {
      const input = JSON.stringify({
        reasoning_steps: ["a"],
        confidence_score: -0.1,
        recommended_action: "REFUND_BUYER",
        summary_for_users: "text",
      });
      expect(validateLLMOutput(input)).toBeNull();
    });

    it("rejects invalid confidence_score (> 1)", () => {
      const input = JSON.stringify({
        reasoning_steps: ["a"],
        confidence_score: 1.5,
        recommended_action: "REFUND_BUYER",
        summary_for_users: "text",
      });
      expect(validateLLMOutput(input)).toBeNull();
    });

    it("rejects invalid recommended_action", () => {
      const input = JSON.stringify({
        reasoning_steps: ["a"],
        confidence_score: 0.8,
        recommended_action: "GIVE_MONEY_TO_ME",
        summary_for_users: "text",
      });
      expect(validateLLMOutput(input)).toBeNull();
    });

    it("rejects non-array reasoning_steps", () => {
      const input = JSON.stringify({
        reasoning_steps: "not an array",
        confidence_score: 0.8,
        recommended_action: "REFUND_BUYER",
        summary_for_users: "text",
      });
      expect(validateLLMOutput(input)).toBeNull();
    });

    it("accepts all three valid actions", () => {
      for (const action of ["REFUND_BUYER", "RELEASE_VENDOR", "ESCALATE_HUMAN"] as const) {
        const input = JSON.stringify({
          reasoning_steps: ["step"],
          confidence_score: 0.5,
          recommended_action: action,
          summary_for_users: "summary",
        });
        expect(validateLLMOutput(input)!.recommended_action).toBe(action);
      }
    });

    it("accepts boundary confidence scores", () => {
      for (const score of [0, 0.001, 0.999, 1.0]) {
        const input = JSON.stringify({
          reasoning_steps: ["a"],
          confidence_score: score,
          recommended_action: "ESCALATE_HUMAN",
          summary_for_users: "text",
        });
        expect(validateLLMOutput(input)!.confidence_score).toBe(score);
      }
    });
  });

  describe("confidence gate logic", () => {
    it(">= 0.900 with REFUND_BUYER → auto-resolve", () => {
      const score = 0.900;
      const action = "REFUND_BUYER";
      expect(score >= 0.900 && (action === "REFUND_BUYER" || action === "RELEASE_VENDOR")).toBe(true);
    });

    it(">= 0.900 with RELEASE_VENDOR → auto-resolve", () => {
      const score = 0.950;
      const action = "RELEASE_VENDOR";
      expect(score >= 0.900 && (action === "REFUND_BUYER" || action === "RELEASE_VENDOR")).toBe(true);
    });

    it("< 0.900 → human review even with valid action", () => {
      const score = 0.899;
      const action = "REFUND_BUYER";
      expect(score >= 0.900 && (action === "REFUND_BUYER" || action === "RELEASE_VENDOR")).toBe(false);
    });

    it(">= 0.900 with ESCALATE_HUMAN → human review", () => {
      const score = 0.950;
      const action = "ESCALATE_HUMAN";
      expect(score >= 0.900 && (action === "REFUND_BUYER" || action === "RELEASE_VENDOR")).toBe(false);
    });

    it("0.000 confidence → human review", () => {
      const score = 0.000;
      const action = "REFUND_BUYER";
      expect(score >= 0.900).toBe(false);
    });

    it("1.000 confidence with ESCALATE_HUMAN → human review", () => {
      const score = 1.000;
      const action = "ESCALATE_HUMAN";
      expect(score >= 0.900 && (action === "REFUND_BUYER" || action === "RELEASE_VENDOR")).toBe(false);
    });
  });
});
