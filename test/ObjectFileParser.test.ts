
import fsmock from "./fsmock";
import * as Lib from "../src/index";
import LibDefault from "../src/index";
import path from "path";
import fs from "fs"

const baseDir = "/__UNIT__TESTS__";
beforeAll(() => {
    fsmock.populate(
        {
            "test-read/test-json.json": '{ "test": "json" }',
            "test-read/test-json5.json5": '// Test\n{ test: "json5" }',
            "test-read/test-yaml.yaml": '# Test\ntest: yaml',
            "test-read/test-yml.yml": '# Test\ntest: yml',
            "test-read/test-hybrid.json": '// Test\n{ "test": "hjson" }',
            "test-read/test-nomatch.xyz": 'xyzzy',
            "test-read/foo": null,
            "test-write": null
        },
        baseDir
    );
});

afterAll(() => {
    fsmock.reset();
});


test("Verify Exports", () => {
    expect(Lib.ObjectFileParser).not.toBeNull();
    expect(Lib.JsonParser).not.toBeNull();
    expect(Lib.HybridJsonParser).not.toBeNull();
    expect(Lib.YamlParser).not.toBeNull();
    expect(Lib.Json5Parser).not.toBeNull();
    expect(Lib.ObjectSerializer).not.toBeNull();

    expect(LibDefault).not.toBeNull();
    expect(LibDefault).toBeInstanceOf(Lib.ObjectSerializer);
})

test("Verify Default Config", () => {
    let t = new Lib.ObjectSerializer();
    expect(t["config"].parsers).toEqual({
        json: Lib.HybridJsonParser.singleton,
        yml: Lib.YamlParser.singleton,
        yaml: Lib.YamlParser.singleton,
        json5: Lib.Json5Parser.singleton
    });

    t = new Lib.ObjectSerializer({});
    expect(t["config"].parsers).toEqual({
        json: Lib.HybridJsonParser.singleton,
        yml: Lib.YamlParser.singleton,
        yaml: Lib.YamlParser.singleton,
        json5: Lib.Json5Parser.singleton
    });
})

test("Verify parsers option", () => {
    let t = new Lib.ObjectSerializer({ parsers: {} });
    expect(t["config"].parsers).toEqual({
        json: Lib.HybridJsonParser.singleton,
        yml: Lib.YamlParser.singleton,
        yaml: Lib.YamlParser.singleton,
        json5: Lib.Json5Parser.singleton
    });

    t = new Lib.ObjectSerializer({ parsers: { foo: undefined, bar: Lib.JsonParser.singleton } });
    expect(t["config"].parsers).toEqual({
        json: Lib.HybridJsonParser.singleton,
        yml: Lib.YamlParser.singleton,
        yaml: Lib.YamlParser.singleton,
        json5: Lib.Json5Parser.singleton,
        foo: undefined,
        bar: Lib.JsonParser.singleton
    });
});

test("File type parser", () => {
    const t = new Lib.ObjectSerializer();

    expect(t.extFromFilename("foo.json")).toEqual("json");
    expect(t.extFromFilename("FoO.jSOn")).toEqual("json");
    expect(t.extFromFilename("foo")).toEqual("");
    expect(t.extFromFilename(".json")).toEqual("");
    expect(t.extFromFilename("")).toEqual("");
})

test("Unknown formats handling", async () => {
    const t = new Lib.ObjectSerializer();

    await expect(t.fromFileAsync(`${baseDir}/t.foo`)).rejects.toThrowError("Unknown type for file: /__UNIT__TESTS__/t.foo");
    expect(() => t.fromFileSync(`${baseDir}/t.foo`)).toThrowError("Unknown type for file: /__UNIT__TESTS__/t.foo");

    await expect(t.toFileAsync(`${baseDir}/t.foo`, {})).rejects.toThrowError("Unknown type for file: /__UNIT__TESTS__/t.foo");
    expect(() => t.toFileSync(`${baseDir}/t.foo`, {})).toThrowError("Unknown type for file: /__UNIT__TESTS__/t.foo");

    expect(() => t.parse("foo", "")).toThrowError("Unknown type: foo");
    expect(() => t.stringify("foo", {})).toThrowError("Unknown type: foo");
});

async function performReadTest(type: string, str: string, expected: unknown, opts?: Lib.ObjectSerializerConfig) {
    const fnPrefix = `${baseDir}/test-read/test-${type}`;
    const fn = `${fnPrefix}.${type}`;
    const t = new Lib.ObjectSerializer(opts);

    await expect(t.fromFileAsync(fn)).resolves.toEqual(expected);
    expect(t.fromFileSync(fn)).toEqual(expected);

    await expect(t.findAndLoadAsync(fnPrefix)).resolves.toEqual(expected);
    expect(t.findAndLoadSync(fnPrefix)).toEqual(expected);

    expect(t.parse(type, str)).toEqual(expected);
}
test("Reading json (hybrid)", () => performReadTest("json", '{ "test": "json" }', { test: "json" }));
test("Reading json (standard)", () => performReadTest("json", '{ "test": "json" }', { test: "json" }, { parsers: { json: Lib.JsonParser.singleton } }));
test("Reading json5", () => performReadTest("json5", '//Test\n{ test: "json5" }', { test: "json5" }));
test("Reading yaml", () => performReadTest("yaml", '# Test\ntest: yaml', { test: "yaml" }));
test("Reading yml", () => performReadTest("yml", '# Test\ntest: yml', { test: "yml" }));
test("Reading hybrid json", async () => {
    const fn = `${baseDir}/test-read/test-hybrid.json`;
    const t = new Lib.ObjectSerializer();
    const expected = { test: "hjson" };

    await expect(t.fromFileAsync(fn)).resolves.toEqual(expected);
    expect(t.fromFileSync(fn)).toEqual(expected);
    expect(t.parse("json", '// Test\n{ "test": "hjson" }')).toEqual(expected);
});

async function performWriteTest(type: string, expected: string, val: unknown, opts?: Lib.ObjectSerializerConfig) {
    const fn1 = `${baseDir}/test-write/test-${type}-1.${type}`;
    const fn2 = `${baseDir}/test-write/test-${type}-2.${type}`;
    const t = new Lib.ObjectSerializer(opts);

    await expect(t.toFileAsync(fn1, val)).resolves.toEqual(val);
    await expect(fs.promises.readFile(fn1, "utf8")).resolves.toEqual(expected);

    expect(t.toFileSync(fn2, val)).toEqual(val);
    await expect(fs.promises.readFile(fn2, "utf8")).resolves.toEqual(expected);

    expect(t.stringify(type, val)).toEqual(expected);
}
test("Writing json (hybrid)", () => performWriteTest("json", '{\n  "test": "out.json"\n}', { test: "out.json" }));
test("Writing json (standard)", () => performWriteTest("json", '{\n  "test": "out.json"\n}', { test: "out.json" }, { parsers: { json: Lib.JsonParser.singleton } }));
test("Writing json5", () => performWriteTest("json5", "{\n  test: 'out.json5',\n}", { test: "out.json5" }));
test("Writing yaml", () => performWriteTest("yaml", 'test: out.yaml\n', { test: "out.yaml" }));
test("Writing yml", () => performWriteTest("yml", 'test: out.yml\n', { test: "out.yml" }));

test("Verify findFileAsync", async () => {
    const t = new Lib.ObjectSerializer();
    await expect(t.findFileAsync(`${baseDir}/test-read/test-json`)).resolves.toEqual(path.join(baseDir, "test-read", "test-json.json"));
    await expect(t.findFileAsync(`${baseDir}/test-read/test-nomatch`)).resolves.toBeNull();
    await expect(t.findFileAsync(`${baseDir}/test-read/test-json.`)).resolves.toBeNull();
    await expect(t.findFileAsync(`${baseDir}/test-read/test-jso`)).resolves.toBeNull();
    await expect(t.findFileAsync(`${baseDir}/test-read/foo`)).resolves.toBeNull();
    // Note: These errors may not be exactly the same as runtime since we are mocking the FS and errors can vary some
    await expect(t.findFileAsync(`${baseDir}/test-read/foo/bar`, true)).rejects.toThrowError(`No matching file found: ${baseDir}/test-read/foo/bar`);
    await expect(t.findFileAsync(`${baseDir}/test-read/foo`, true)).rejects.toThrowError(`No matching file found: ${baseDir}/test-read/foo`);
});

test("Verify findFileSync", () => {
    const t = new Lib.ObjectSerializer();
    expect(t.findFileSync(`${baseDir}/test-read/test-json`)).toEqual(path.join(baseDir, "test-read", "test-json.json"));
    expect(t.findFileSync(`${baseDir}/test-read/test-nomatch`)).toBeNull();
    expect(t.findFileSync(`${baseDir}/test-read/test-json.`)).toBeNull();
    expect(t.findFileSync(`${baseDir}/test-read/test-jso`)).toBeNull();
    expect(t.findFileSync(`${baseDir}/test-read/foo`)).toBeNull();
    // Note: These errors may not be exactly the same as runtime since we are mocking the FS and errors can vary some
    expect(() => t.findFileSync(`${baseDir}/test-read/foo/bar`, true)).toThrowError(/^ENOENT:/);
    expect(() => t.findFileSync(`${baseDir}/test-read/foo`, true)).toThrowError(`No matching file found: ${baseDir}/test-read/foo`);
});

test("Verify findAndLoad missing files", async () => {
    const t = new Lib.ObjectSerializer();

    await expect(t.findAndLoadAsync(`${baseDir}/test-read/foo`)).resolves.toBeNull();
    expect(t.findAndLoadSync(`${baseDir}/test-read/foo`)).toBeNull();

    await expect(t.findAndLoadAsync(`${baseDir}/test-read/foo`, true)).rejects.toThrowError(`No matching file found: ${baseDir}/test-read/foo`);
    expect(() => t.findAndLoadSync(`${baseDir}/test-read/foo`, true)).toThrowError(`No matching file found: ${baseDir}/test-read/foo`);
});

test("Test json with options", async () => {
    const t = new Lib.ObjectSerializer({ parsers: { json: new Lib.JsonParser({ space: 0 }) } });
    expect(t.stringify("json", {test: "StdJson"} )).toEqual('{"test":"StdJson"}');
    // @todo Enhance unit tests to verify other options
});

test("Test json5 with options", async () => {
    const t = new Lib.ObjectSerializer({ parsers: { json5: new Lib.Json5Parser(undefined, { space: 0 }) } });
    expect(t.stringify("json5", {test: "StdJson"} )).toEqual("{test:'StdJson'}");
    // @todo Enhance unit tests to verify other options
});

test("Test jsyaml with options", async () => {
    const t = new Lib.ObjectSerializer({ parsers: { yaml: new Lib.YamlParser(undefined, undefined, { forceQuotes: true }) } });
    expect(t.stringify("yaml", {test: "StdJson"} )).toEqual("test: 'StdJson'\n");
    // @todo Enhance unit tests to verify other options
});
