import { describe, expect, it } from "vitest";
import { classifyContact, detectMapping, mapChannel, mapPriority, mapStatus, parseLooseDate, splitBusinessRole } from "./import-mapping";

describe("warm-list import mapping", () => {
  it("auto-detects every column of the known warm-list layout", () => {
    const headers = [
      "Name",
      "Business / Role",
      "Source",
      "Reach Via",
      "Contact",
      "How I Know Them",
      "Last Interaction",
      "Priority",
      "Status",
      "Next Action",
      "Follow-up Date",
      "Notes",
    ];
    const m = detectMapping(headers);
    expect(m["Name"]).toBe("fullName");
    expect(m["Business / Role"]).toBe("businessRole");
    expect(m["Source"]).toBe("source");
    expect(m["Reach Via"]).toBe("reachVia");
    expect(m["Contact"]).toBe("contact");
    expect(m["How I Know Them"]).toBe("howKnown");
    expect(m["Last Interaction"]).toBe("lastInteraction");
    expect(m["Priority"]).toBe("priority");
    expect(m["Status"]).toBe("status");
    expect(m["Next Action"]).toBe("nextAction");
    expect(m["Follow-up Date"]).toBe("followUpDate");
    expect(m["Notes"]).toBe("notes");
  });

  it("splits 'Founder – GlowSkin' into title and company", () => {
    expect(splitBusinessRole("Founder – GlowSkin")).toEqual({ jobTitle: "Founder", companyName: "GlowSkin" });
  });

  it("splits 'Head of Growth at Fernway' via the 'at' pattern", () => {
    expect(splitBusinessRole("Head of Growth at Fernway")).toEqual({ jobTitle: "Head of Growth", companyName: "Fernway" });
  });

  it("keeps a bare role as jobTitle and a bare company as companyName", () => {
    expect(splitBusinessRole("Shopify developer").jobTitle).toBe("Shopify developer");
    expect(splitBusinessRole("Northbay Digital").companyName).toBe("Northbay Digital");
  });

  it("classifies contact cells by content", () => {
    expect(classifyContact("jane@brand.co.uk").email).toBe("jane@brand.co.uk");
    expect(classifyContact("linkedin.com/in/jane").linkedinUrl).toContain("linkedin.com/in/jane");
    expect(classifyContact("07700 900123").phone).toBeTruthy();
  });

  it("maps channels, priorities and statuses tolerantly", () => {
    expect(mapChannel("LinkedIn DM")).toBe("linkedin");
    expect(mapChannel("WhatsApp")).toBe("phone");
    expect(mapPriority("P1")).toBe("p1_contact_now");
    expect(mapPriority("high")).toBe("p1_contact_now");
    expect(mapStatus("Contacted").stage).toBe("contacted");
    expect(mapStatus("Replied").stage).toBe("replied");
    expect(mapStatus("weird custom thing").stage).toBe("imported");
    expect(mapStatus("weird custom thing").note).toMatch(/kept in notes/);
  });

  it("parses UK dd/mm/yyyy dates correctly", () => {
    const d = parseLooseDate("12/06/2026")!;
    expect(d.getMonth()).toBe(5); // June
    expect(d.getDate()).toBe(12);
    expect(parseLooseDate("not a date")).toBeNull();
  });
});
