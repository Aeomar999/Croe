import { describe, it, expect } from "vitest";
import {
  validateTransition,
  InvalidTransitionError,
  VALID_TRANSITIONS,
  TERMINAL_STATES,
} from "./state-machine.js";
import type { EscrowState } from "../types/domain.js";

describe("state machine", () => {
  describe("VALID_TRANSITIONS completeness", () => {
    it("every non-terminal state has at least one outgoing transition", () => {
      for (const [state, targets] of Object.entries(VALID_TRANSITIONS)) {
        expect(Object.keys(targets!).length).toBeGreaterThan(0);
      }
    });
  });

  describe("TERMINAL_STATES", () => {
    it("FUNDS_RELEASED is terminal", () => {
      expect(TERMINAL_STATES.has("FUNDS_RELEASED")).toBe(true);
    });
    it("FUNDS_REFUNDED is terminal", () => {
      expect(TERMINAL_STATES.has("FUNDS_REFUNDED")).toBe(true);
    });
    it("FRAUD_LOCKOUT is terminal", () => {
      expect(TERMINAL_STATES.has("FRAUD_LOCKOUT")).toBe(true);
    });
    it("EXPIRED is terminal", () => {
      expect(TERMINAL_STATES.has("EXPIRED")).toBe(true);
    });
    it("CANCELLED is terminal", () => {
      expect(TERMINAL_STATES.has("CANCELLED")).toBe(true);
    });
    it("LINK_CREATED is NOT terminal", () => {
      expect(TERMINAL_STATES.has("LINK_CREATED")).toBe(false);
    });
  });

  describe("happy-path transitions", () => {
    it("LINK_CREATED → AWAITING_DEPOSIT returns BUYER_CLAIMED", () => {
      expect(validateTransition("LINK_CREATED", "AWAITING_DEPOSIT")).toBe("BUYER_CLAIMED");
    });

    it("LINK_CREATED → CANCELLED returns null (no ledger event)", () => {
      expect(validateTransition("LINK_CREATED", "CANCELLED")).toBeNull();
    });

    it("AWAITING_DEPOSIT → FUNDS_SECURED returns FUNDS_DEPOSITED", () => {
      expect(validateTransition("AWAITING_DEPOSIT", "FUNDS_SECURED")).toBe("FUNDS_DEPOSITED");
    });

    it("FUNDS_SECURED → SHIPPED returns SHIPPED", () => {
      expect(validateTransition("FUNDS_SECURED", "SHIPPED")).toBe("SHIPPED");
    });

    it("SHIPPED → DELIVERED_CONFIRMED returns DELIVERY_CONFIRMED", () => {
      expect(validateTransition("SHIPPED", "DELIVERED_CONFIRMED")).toBe("DELIVERY_CONFIRMED");
    });

    it("DELIVERED_CONFIRMED → FUNDS_RELEASED returns FUNDS_RELEASED", () => {
      expect(validateTransition("DELIVERED_CONFIRMED", "FUNDS_RELEASED")).toBe("FUNDS_RELEASED");
    });

    it("SHIPPED → FUNDS_RELEASED returns FUNDS_RELEASED (auto-release)", () => {
      expect(validateTransition("SHIPPED", "FUNDS_RELEASED")).toBe("FUNDS_RELEASED");
    });

    it("SHIPPED → DISPUTE_OPENED returns DISPUTE_OPENED", () => {
      expect(validateTransition("SHIPPED", "DISPUTE_OPENED")).toBe("DISPUTE_OPENED");
    });

    it("FUNDS_SECURED → DISPUTE_OPENED returns DISPUTE_OPENED", () => {
      expect(validateTransition("FUNDS_SECURED", "DISPUTE_OPENED")).toBe("DISPUTE_OPENED");
    });
  });

  describe("dispute pipeline", () => {
    it("DISPUTE_OPENED → AI_PROCESSING returns null", () => {
      expect(validateTransition("DISPUTE_OPENED", "AI_PROCESSING")).toBeNull();
    });

    it("DISPUTE_OPENED → FRAUD_LOCKOUT returns FRAUD_FLAGGED", () => {
      expect(validateTransition("DISPUTE_OPENED", "FRAUD_LOCKOUT")).toBe("FRAUD_FLAGGED");
    });

    it("AI_PROCESSING → RESOLVED_AUTO returns null", () => {
      expect(validateTransition("AI_PROCESSING", "RESOLVED_AUTO")).toBeNull();
    });

    it("AI_PROCESSING → UNDER_HUMAN_REVIEW returns null", () => {
      expect(validateTransition("AI_PROCESSING", "UNDER_HUMAN_REVIEW")).toBeNull();
    });

    it("RESOLVED_AUTO → FUNDS_RELEASED returns FUNDS_RELEASED", () => {
      expect(validateTransition("RESOLVED_AUTO", "FUNDS_RELEASED")).toBe("FUNDS_RELEASED");
    });

    it("RESOLVED_AUTO → FUNDS_REFUNDED returns REFUND_ISSUED", () => {
      expect(validateTransition("RESOLVED_AUTO", "FUNDS_REFUNDED")).toBe("REFUND_ISSUED");
    });

    it("UNDER_HUMAN_REVIEW → FUNDS_RELEASED returns FUNDS_RELEASED", () => {
      expect(validateTransition("UNDER_HUMAN_REVIEW", "FUNDS_RELEASED")).toBe("FUNDS_RELEASED");
    });

    it("UNDER_HUMAN_REVIEW → FUNDS_REFUNDED returns REFUND_ISSUED", () => {
      expect(validateTransition("UNDER_HUMAN_REVIEW", "FUNDS_REFUNDED")).toBe("REFUND_ISSUED");
    });
  });

  describe("invalid transitions throw", () => {
    it("LINK_CREATED → FUNDS_SECURED throws", () => {
      expect(() => validateTransition("LINK_CREATED", "FUNDS_SECURED")).toThrow(InvalidTransitionError);
    });

    it("AWAITING_DEPOSIT → SHIPPED throws", () => {
      expect(() => validateTransition("AWAITING_DEPOSIT", "SHIPPED")).toThrow(InvalidTransitionError);
    });

    it("LINK_CREATED → DELIVERED_CONFIRMED throws", () => {
      expect(() => validateTransition("LINK_CREATED", "DELIVERED_CONFIRMED")).toThrow(InvalidTransitionError);
    });

    it("SHIPPED → LINK_CREATED throws (no backwards transitions)", () => {
      expect(() => validateTransition("SHIPPED", "LINK_CREATED")).toThrow(InvalidTransitionError);
    });

    it("FUNDS_RELEASED → anything throws (terminal state)", () => {
      const states: EscrowState[] = ["LINK_CREATED", "AWAITING_DEPOSIT", "FUNDS_SECURED", "SHIPPED"];
      for (const s of states) {
        expect(() => validateTransition("FUNDS_RELEASED", s)).toThrow(InvalidTransitionError);
      }
    });
  });

  describe("InvalidTransitionError", () => {
    it("contains from and to state names", () => {
      try {
        validateTransition("LINK_CREATED", "FUNDS_SECURED");
        expect.fail("should throw");
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidTransitionError);
        const e = err as InvalidTransitionError;
        expect(e.from).toBe("LINK_CREATED");
        expect(e.to).toBe("FUNDS_SECURED");
        expect(e.message).toContain("LINK_CREATED");
        expect(e.message).toContain("FUNDS_SECURED");
      }
    });
  });
});
