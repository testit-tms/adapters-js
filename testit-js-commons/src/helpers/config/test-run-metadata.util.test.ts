import {
  mergeLinkLists,
  mergeTagLists,
  parseTestRunLinks,
  parseTestRunTags,
} from "./test-run-metadata.util";
import { ConfigComposer } from "./config.helper";

describe("parseTestRunTags", () => {
  it("parses comma-separated tags", () => {
    expect(parseTestRunTags("smoke, nightly")).toEqual(["smoke", "nightly"]);
  });

  it("parses JSON array tags", () => {
    expect(parseTestRunTags('["smoke","nightly"]')).toEqual(["smoke", "nightly"]);
  });

  it("returns undefined for empty / invalid", () => {
    expect(parseTestRunTags("")).toBeUndefined();
    expect(parseTestRunTags("   ")).toBeUndefined();
    expect(parseTestRunTags("[not-json]")).toBeUndefined();
    expect(parseTestRunTags('{"a":1}')).toEqual(['{"a":1}']);
  });
});

describe("parseTestRunLinks", () => {
  it("parses JSON links and defaults type/title", () => {
    expect(
      parseTestRunLinks(
        '[{"url":"https://ci.example/job/1","title":"CI Job","type":"Related"}]'
      )
    ).toEqual([
      {
        url: "https://ci.example/job/1",
        title: "CI Job",
        description: undefined,
        type: "Related",
      },
    ]);
  });

  it("skips links without url and invalid JSON", () => {
    expect(parseTestRunLinks('[{"title":"no-url"}]')).toBeUndefined();
    expect(parseTestRunLinks("not-json")).toBeUndefined();
  });
});

describe("mergeTagLists / mergeLinkLists", () => {
  it("merges tags without duplicates", () => {
    expect(mergeTagLists(["smoke"], ["smoke", "nightly"])).toEqual(["smoke", "nightly"]);
  });

  it("merges links by url keeping existing", () => {
    const existing = [{ url: "https://a", title: "A" }];
    const incoming = [
      { url: "https://a", title: "A-new" },
      { url: "https://b", title: "B" },
    ];
    expect(mergeLinkLists(existing, incoming)).toEqual([
      { url: "https://a", title: "A" },
      { url: "https://b", title: "B" },
    ]);
  });
});

describe("ConfigComposer test run metadata", () => {
  const base = {
    url: "http://localhost:8080",
    privateToken: "token",
    projectId: "11111111-1111-1111-1111-111111111111",
    configurationId: "22222222-2222-2222-2222-222222222222",
    testRunId: "33333333-3333-3333-3333-333333333333",
  };

  it("reads tags and links from env", () => {
    const config = new ConfigComposer().merge(
      {
        TMS_TEST_RUN_TAGS: "smoke,nightly",
        TMS_TEST_RUN_LINKS:
          '[{"url":"https://gitlab.example.com/jobs/1","title":"CI Job","type":"Related"}]',
      },
      base
    );

    expect(config.testRunTags).toEqual(["smoke", "nightly"]);
    expect(config.testRunLinks).toEqual([
      {
        url: "https://gitlab.example.com/jobs/1",
        title: "CI Job",
        description: undefined,
        type: "Related",
      },
    ]);
  });

  it("prefers base over env", () => {
    const config = new ConfigComposer().merge(
      { TMS_TEST_RUN_TAGS: "from-env" },
      { ...base, testRunTags: ["from-base"] }
    );
    expect(config.testRunTags).toEqual(["from-base"]);
  });
});
