import { ConfigComposer } from "./config.helper";

describe("ConfigComposer sync-storage defaults", () => {
  const env = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
    delete process.env.TMS_SYNC_STORAGE_ENABLED;
    delete process.env.TMS_SYNC_STORAGE_PORT;
  });

  afterAll(() => {
    process.env = env;
  });

  it("should enable sync-storage by default", () => {
    const config = new ConfigComposer().merge(undefined, {
      url: "http://localhost:8080",
      privateToken: "token",
      projectId: "11111111-1111-1111-1111-111111111111",
      configurationId: "22222222-2222-2222-2222-222222222222",
      testRunId: "33333333-3333-3333-3333-333333333333",
    });

    expect(config.syncStorageEnabled).toBe(true);
    expect(config.syncStoragePort).toBe("49152");
  });

  it("should allow disabling sync-storage via env", () => {
    const config = new ConfigComposer().merge(
      {
        TMS_SYNC_STORAGE_ENABLED: "false",
        TMS_SYNC_STORAGE_PORT: "59999",
      },
      {
        url: "http://localhost:8080",
        privateToken: "token",
        projectId: "11111111-1111-1111-1111-111111111111",
        configurationId: "22222222-2222-2222-2222-222222222222",
        testRunId: "33333333-3333-3333-3333-333333333333",
      }
    );

    expect(config.syncStorageEnabled).toBe(false);
    expect(config.syncStoragePort).toBe("59999");
  });
});
