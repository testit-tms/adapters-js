import { AdapterConfig, BaseConverter, LinkType } from "./index";

function makeConfig(): AdapterConfig {
  return {
    url: "http://localhost:8080",
    privateToken: "token",
    projectId: "11111111-1111-1111-1111-111111111111",
    configurationId: "22222222-2222-2222-2222-222222222222",
    testRunId: "33333333-3333-3333-3333-333333333333",
  };
}

const ALL_LINK_TYPES: LinkType[] = [
  "Related",
  "BlockedBy",
  "Defect",
  "Issue",
  "Requirement",
  "Repository",
];

describe("BaseConverter link types", () => {
  const converter = new BaseConverter(makeConfig());

  it.each(ALL_LINK_TYPES)("toOriginLink keeps link type %s", (type) => {
    const model = converter.toOriginLink({
      url: "https://test.example",
      title: "Example",
      type,
    });

    expect(model.type).toBe(type);
    expect(model.hasInfo).toBe(true);
  });

  it("toOriginLink defaults to Related when type is omitted", () => {
    const model = converter.toOriginLink({ url: "https://test.example", title: "Example" });

    expect(model.type).toBe("Related");
  });

  it("toOriginLink falls back to Related for unknown type", () => {
    const model = converter.toOriginLink({
      url: "https://test.example",
      title: "Example",
      type: "NotALinkType" as LinkType,
    });

    expect(model.type).toBe("Related");
  });

  it.each(ALL_LINK_TYPES)("toLocalLink keeps link type %s", (type) => {
    const link = converter.toLocalLink({
      url: "https://test.example",
      title: "Example",
      description: "Example description",
      type,
    });

    expect(link.type).toBe(type);
  });

  it("toLocalLink defaults title to url and type to Related", () => {
    const link = converter.toLocalLink({ url: "https://test.example" });

    expect(link.title).toBe("https://test.example");
    expect(link.type).toBe("Related");
  });
});
