
import fsmock from "./fsmock";
import * as ObjSerializer from "../src/index";
import defObjSerializer from "../src/index";
import path from "path";
import fs from "fs"

beforeAll(() => {
    fsmock.populate(
        {
            "test-read/test-json.json": '{ "test": "json" }',
            "test-read/test-json5.json5": '// Test\n{ test: "json5" }',
            "test-read/test-yaml.yaml": '# Test\ntest: yaml',
            "test-read/test-yaml.yml": '# Test\ntest: yml',
            "test-read/test-hybrid.json": '// Test\n{ "test": "hjson" }',
            "test-read/test-nomatch.xyz": 'xyzzy',
            "test-read/foo": null,
            "test-write": null
        },
        "/__UNIT__TESTS__"
    );
});

afterAll(() => {
    fsmock.reset();
});


test("Verify Exports", () => {
    expect(ObjSerializer.ObjectFileParser).not.toBeNull();
    expect(ObjSerializer.JsonParser).not.toBeNull();
    expect(ObjSerializer.HybridJsonParser).not.toBeNull();
    expect(ObjSerializer.YamlParser).not.toBeNull();
    expect(ObjSerializer.Json5Parser).not.toBeNull();
    expect(ObjSerializer.ObjectSerializer).not.toBeNull();

    expect(defObjSerializer).not.toBeNull();
    expect(defObjSerializer).toBeInstanceOf(ObjSerializer.ObjectSerializer);
})

test("Verify Default Config", () => {
    let t = new ObjSerializer.ObjectSerializer();
    expect(t.fileParsers).toEqual({
        json: ObjSerializer.JsonParser.singleton,
        yml: ObjSerializer.YamlParser.singleton,
        yaml: ObjSerializer.YamlParser.singleton,
        json5: ObjSerializer.Json5Parser.singleton
    });

    t = new ObjSerializer.ObjectSerializer({});
    expect(t.fileParsers).toEqual({
        json: ObjSerializer.JsonParser.singleton,
        yml: ObjSerializer.YamlParser.singleton,
        yaml: ObjSerializer.YamlParser.singleton,
        json5: ObjSerializer.Json5Parser.singleton
    });

    t = new ObjSerializer.ObjectSerializer().configure({});
    expect(t.fileParsers).toEqual({
        json: ObjSerializer.JsonParser.singleton,
        yml: ObjSerializer.YamlParser.singleton,
        yaml: ObjSerializer.YamlParser.singleton,
        json5: ObjSerializer.Json5Parser.singleton
    });
})

test("Verify Json5 option", () => {
    let t = new ObjSerializer.ObjectSerializer().configure({ useHybridJsonParser: false });
    expect(t.fileParsers).toEqual({
        json: ObjSerializer.JsonParser.singleton,
        yml: ObjSerializer.YamlParser.singleton,
        yaml: ObjSerializer.YamlParser.singleton,
        json5: ObjSerializer.Json5Parser.singleton
    });

    t = new ObjSerializer.ObjectSerializer().configure({ useHybridJsonParser: true });
    expect(t.fileParsers).toEqual({
        json: ObjSerializer.HybridJsonParser.singleton,
        yml: ObjSerializer.YamlParser.singleton,
        yaml: ObjSerializer.YamlParser.singleton,
        json5: ObjSerializer.Json5Parser.singleton
    });
})

test("Verify parsers option", () => {
    let t = new ObjSerializer.ObjectSerializer().configure({ parsers: {} });
    expect(t.fileParsers).toEqual({
        js: undefined,
        json: ObjSerializer.JsonParser.singleton,
        yml: ObjSerializer.YamlParser.singleton,
        yaml: ObjSerializer.YamlParser.singleton,
        json5: ObjSerializer.Json5Parser.singleton
    });

    t = new ObjSerializer.ObjectSerializer().configure({ parsers: { foo: undefined, bar: ObjSerializer.JsonParser.singleton } });
    expect(t.fileParsers).toEqual({
        js: undefined,
        json: ObjSerializer.JsonParser.singleton,
        yml: ObjSerializer.YamlParser.singleton,
        yaml: ObjSerializer.YamlParser.singleton,
        json5: ObjSerializer.Json5Parser.singleton,
        foo: undefined,
        bar: ObjSerializer.JsonParser.singleton
    });
});

test("File type parser", () => {
    const t = new ObjSerializer.ObjectSerializer();

    expect(t.extFromFilename("foo.json")).toEqual("json");
    expect(t.extFromFilename("FoO.jSOn")).toEqual("json");
    expect(t.extFromFilename("foo")).toEqual("");
    expect(t.extFromFilename(".json")).toEqual("");
    expect(t.extFromFilename("")).toEqual("");
})

test("Unknown formats handling", async () => {
    const t = new ObjSerializer.ObjectSerializer();

    await expect(t.fromFileAsync("/__UNIT__TESTS__/t.foo")).rejects.toThrowError("Unknown type for file: /__UNIT__TESTS__/t.foo");
    expect(() => t.fromFileSync("/__UNIT__TESTS__/t.foo")).toThrowError("Unknown type for file: /__UNIT__TESTS__/t.foo");

    await expect(t.toFileAsync("/__UNIT__TESTS__/t.foo", {})).rejects.toThrowError("Unknown type for file: /__UNIT__TESTS__/t.foo");
    expect(() => t.toFileSync("/__UNIT__TESTS__/t.foo", {})).toThrowError("Unknown type for file: /__UNIT__TESTS__/t.foo");

    expect(() => t.parse("foo", "")).toThrowError("Unknown type: foo");
    expect(() => t.stringify("foo", {})).toThrowError("Unknown type: foo");
});

test("Reading json", async () => {
    const t = new ObjSerializer.ObjectSerializer();

    let rv = await t.fromFileAsync("/__UNIT__TESTS__/test-read/test-json.json");
    expect(rv).toEqual({ test: "json" });

    rv = t.fromFileSync("/__UNIT__TESTS__/test-read/test-json.json");
    expect(rv).toEqual({ test: "json" });

    rv = t.parse("json", '{ "test": "json" }');
    expect(rv).toEqual({ test: "json" });
});

test("Writing json", async () => {
    const t = new ObjSerializer.ObjectSerializer();
    const val = { test: "out.json" };
    const expected = '{\n  "test": "out.json"\n}';

    let fn = "/__UNIT__TESTS__/test-write/json-1.json";
    expect(await t.toFileAsync(fn, val)).toEqual(val);
    expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);

    fn = "/__UNIT__TESTS__/test-write/json-2.json";
    expect(t.toFileSync(fn, val)).toEqual(val);
    expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);

    expect(t.stringify("json", val)).toEqual(expected);
});

test("Reading json5", async () => {
    const t = new ObjSerializer.ObjectSerializer();

    let rv = await t.fromFileAsync("/__UNIT__TESTS__/test-read/test-json5.json5");
    expect(rv).toEqual({ test: "json5" });

    rv = t.fromFileSync("/__UNIT__TESTS__/test-read/test-json5.json5");
    expect(rv).toEqual({ test: "json5" });

    rv = t.parse("json5", '//Test\n{ test: "json5" }');
    expect(rv).toEqual({ test: "json5" });
});

test("Writing json5", async () => {
    const t = new ObjSerializer.ObjectSerializer();
    const val = { test: "out.json5" };
    const expected = "{\n  test: 'out.json5',\n}";

    let fn = "/__UNIT__TESTS__/test-write/json5-1.json5";
    expect(await t.toFileAsync(fn, val)).toEqual(val);
    expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);

    fn = "/__UNIT__TESTS__/test-write/json5-2.json5";
    expect(t.toFileSync(fn, val)).toEqual(val);
    expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);

    expect(t.stringify("json5", val)).toEqual(expected);
});

test("Reading yaml", async () => {
    const t = new ObjSerializer.ObjectSerializer();

    let rv = await t.fromFileAsync("/__UNIT__TESTS__/test-read/test-yaml.yaml");
    expect(rv).toEqual({ test: "yaml" });

    rv = t.fromFileSync("/__UNIT__TESTS__/test-read/test-yaml.yaml");
    expect(rv).toEqual({ test: "yaml" });

    rv = t.parse("yaml", '# Test\ntest: yaml');
    expect(rv).toEqual({ test: "yaml" });
});

test("Writing yaml", async () => {
    const t = new ObjSerializer.ObjectSerializer();
    const val = { test: "out.yaml" };
    const expected = 'test: out.yaml\n';

    let fn = "/__UNIT__TESTS__/test-write/yaml-1.yaml";
    expect(await t.toFileAsync(fn, val)).toEqual(val);
    expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);

    fn = "/__UNIT__TESTS__/test-write/yaml-1.yaml";
    expect(t.toFileSync(fn, val)).toEqual(val);
    expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);

    expect(t.stringify("yaml", val)).toEqual(expected);
});

test("Reading yaml", async () => {
    const t = new ObjSerializer.ObjectSerializer();

    let rv = await t.fromFileAsync("/__UNIT__TESTS__/test-read/test-yaml.yml");
    expect(rv).toEqual({ test: "yml" });

    rv = t.fromFileSync("/__UNIT__TESTS__/test-read/test-yaml.yml");
    expect(rv).toEqual({ test: "yml" });

    rv = t.parse("yaml", '# Test\ntest: yml');
    expect(rv).toEqual({ test: "yml" });
});

test("Writing yml", async () => {
    const t = new ObjSerializer.ObjectSerializer();
    const val = { test: "out.yml" };
    const expected = 'test: out.yml\n';

    let fn = "/__UNIT__TESTS__/test-write/yaml-1.yml";
    expect(await t.toFileAsync(fn, val)).toEqual(val);
    expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);

    fn = "/__UNIT__TESTS__/test-write/yaml-1.yml";
    expect(t.toFileSync(fn, val)).toEqual(val);
    expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);

    expect(t.stringify("yml", val)).toEqual(expected);
});


test("Reading hybrid json", async () => {
    const t = new ObjSerializer.ObjectSerializer({ useHybridJsonParser: true });

    let rv = await t.fromFileAsync("/__UNIT__TESTS__/test-read/test-hybrid.json");
    expect(rv).toEqual({ test: "hjson" });

    rv = t.fromFileSync("/__UNIT__TESTS__/test-read/test-hybrid.json");
    expect(rv).toEqual({ test: "hjson" });

    rv = t.parse("json", '// Test\n{ "test": "hjson" }');
    expect(rv).toEqual({ test: "hjson" });
});

test("Writing hybrid json", async () => {
    const t = new ObjSerializer.ObjectSerializer({ useHybridJsonParser: true });
    const val = { test: "out.json" };
    const expected = '{\n  "test": "out.json"\n}';

    let fn = "/__UNIT__TESTS__/test-write/hjson-1.json";
    expect(await t.toFileAsync(fn, val)).toEqual(val);
    expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);

    fn = "/__UNIT__TESTS__/test-write/hjson-2.json";
    expect(t.toFileSync(fn, val)).toEqual(val);
    expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);

    expect(t.stringify("json", val)).toEqual(expected);
});

test("Verify findFileAsync", async () => {
    const dir = "/__UNIT__TESTS__/test-read";
    const t = new ObjSerializer.ObjectSerializer();
    await expect(t.findFileAsync(`${dir}/test-json`)).resolves.toEqual(path.join(dir, "test-json.json"));
    await expect(t.findFileAsync(`${dir}/test-nomatch`)).resolves.toBeNull();
    await expect(t.findFileAsync(`${dir}/test-json.`)).resolves.toBeNull();
    await expect(t.findFileAsync(`${dir}/test-jso`)).resolves.toBeNull();
    await expect(t.findFileAsync(`${dir}/foo`)).resolves.toBeNull();
    // Note: These errors may not be exactly the same as runtime since we are mocking the FS and errors can vary some
    await expect(t.findFileAsync(`${dir}/foo/bar`, true)).rejects.toThrowError(`No matching file found: ${dir}/foo/bar`);
    await expect(t.findFileAsync(`${dir}/foo`, true)).rejects.toThrowError(`No matching file found: ${dir}/foo`);
});

test("Verify findFileSync", () => {
    const t = new ObjSerializer.ObjectSerializer();
    expect(t.findFileSync("/__UNIT__TESTS__/test-read/test-json")).toEqual(path.join("/__UNIT__TESTS__", "test-read", "test-json.json"));
    expect(t.findFileSync(`/__UNIT__TESTS__/test-read/test-nomatch`)).toBeNull();
    expect(t.findFileSync("/__UNIT__TESTS__/test-read/test-json.")).toBeNull();
    expect(t.findFileSync("/__UNIT__TESTS__/test-read/test-jso")).toBeNull();
    expect(t.findFileSync("/__UNIT__TESTS__/test-read/foo")).toBeNull();
    // Note: These errors may not be exactly the same as runtime since we are mocking the FS and errors can vary some
    expect(() => t.findFileSync("/__UNIT__TESTS__/foo/bar", true)).toThrowError(/^ENOENT:/);
    expect(() => t.findFileSync("/__UNIT__TESTS__/foo", true)).toThrowError("No matching file found: /__UNIT__TESTS__/foo");
});
