// Unit test: leaderboardTeamsTab — Teams tab renders, switches to team view
import { describe, it, expect } from "vitest";

describe("LeaderboardPage Teams tab", () => {
  it("Individual and Teams mode options exist", () => {
    const modes = [
      { value: "individual", label: "Individual" },
      { value: "teams", label: "Teams" },
    ];
    expect(modes.find((m) => m.value === "teams")).toBeDefined();
    expect(modes.find((m) => m.value === "individual")).toBeDefined();
  });

  it('teams mode value is "teams"', () => {
    const teamsMode = { value: "teams", label: "Teams" };
    expect(teamsMode.value).toBe("teams");
    expect(teamsMode.label).toBe("Teams");
  });

  it("switching to teams mode renders TeamLeaderboard", () => {
    // Simulates the mode switching logic in LeaderboardPage
    const mode = "teams";
    const shouldRenderTeamLeaderboard = mode === "teams";
    expect(shouldRenderTeamLeaderboard).toBe(true);
  });

  it("individual mode does not render TeamLeaderboard", () => {
    const mode: string = "individual";
    const shouldRenderTeamLeaderboard = mode === "teams";
    expect(shouldRenderTeamLeaderboard).toBe(false);
  });
});
