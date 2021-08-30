import * as ObjSerializer from "../src/index";
import defObjSerializer from "../src/index";
import tmp from "tmp-promise";
import fs from "fs";

tmp.setGracefulCleanup();

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

test("File type parser", ()=>{
    const t = new ObjSerializer.ObjectSerializer();

    expect (t.extFromFilename("foo.json")).toEqual("json");
    expect (t.extFromFilename("FoO.jSOn")).toEqual("json");
    expect (t.extFromFilename("foo")).toEqual("");
    expect (t.extFromFilename(".json")).toEqual("");
    expect (t.extFromFilename("")).toEqual("");
})

test("Unknown formats handling", async () => {
    const t = new ObjSerializer.ObjectSerializer();

    expect(() => t.fromFileAsync("t.foo")).toThrowError("Unknown type for file: t.foo");
    expect(() => t.fromFileSync("t.foo")).toThrowError("Unknown type for file: t.foo");

    expect(() => t.toFileAsync("t.foo", {})).toThrowError("Unknown type for file: t.foo");
    expect(() => t.toFileSync("t.foo", {})).toThrowError("Unknown type for file: t.foo");

    expect(() => t.parse("foo", "")).toThrowError("Unknown type: foo");
    expect(() => t.stringify("foo", {})).toThrowError("Unknown type: foo");
});

test("Reading json", async () => {
    const t = new ObjSerializer.ObjectSerializer();

    let rv = await t.fromFileAsync("./test/test.json");
    expect(rv).toEqual({ test: "json" });

    rv = t.fromFileSync("./test/test.json");
    expect(rv).toEqual({ test: "json" });

    rv = t.parse("json", '{ "test": "json" }');
    expect(rv).toEqual({ test: "json" });
});

test("Writing json", async () => {
    const t = new ObjSerializer.ObjectSerializer();
    const val = { test: "out.json" };
    const expected = '{\n  "test": "out.json"\n}';

    let fn = await tmp.tmpName({ postfix: ".json" });
    try {
        const rv = await t.toFileAsync(fn, val);
        expect(rv).toEqual(val);
        expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);
    } finally {
        await fs.promises.unlink(fn);
    }

    fn = await tmp.tmpName({ postfix: ".json" });
    try {
        const rv = t.toFileSync(fn, val);
        expect(rv).toEqual(val);
        expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);
    } finally {
        await fs.promises.unlink(fn);
    }

    let rv = t.stringify("json", val) as any;
    expect(rv).toEqual(expected);
});

test("Reading json5", async () => {
    const t = new ObjSerializer.ObjectSerializer();

    let rv = await t.fromFileAsync("./test/test.json5");
    expect(rv).toEqual({ test: "json5" });

    rv = t.fromFileSync("./test/test.json5");
    expect(rv).toEqual({ test: "json5" });

    rv = t.parse("json5", '{ test: "json5" }');
    expect(rv).toEqual({ test: "json5" });
});

test("Writing json5", async () => {
    const t = new ObjSerializer.ObjectSerializer();
    const val = { test: "out.json5" };
    const expected = "{\n  test: 'out.json5',\n}";

    let fn = await tmp.tmpName({ postfix: ".json5" });
    try {
        const rv = await t.toFileAsync(fn, val);
        expect(rv).toEqual(val);
        expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);
    } finally {
        await fs.promises.unlink(fn);
    }

    fn = await tmp.tmpName({ postfix: ".json5" });
    try {
        const rv = t.toFileSync(fn, val);
        expect(rv).toEqual(val);
        expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);
    } finally {
        await fs.promises.unlink(fn);
    }

    let rv = t.stringify("json5", val) as any;
    expect(rv).toEqual(expected);
});

test("Reading yaml", async () => {
    const t = new ObjSerializer.ObjectSerializer();

    let rv = await t.fromFileAsync("./test/test.yaml");
    expect(rv).toEqual({ test: "yaml" });

    rv = t.fromFileSync("./test/test.yaml");
    expect(rv).toEqual({ test: "yaml" });

    rv = t.parse("yaml", '{ test: "yaml" }');
    expect(rv).toEqual({ test: "yaml" });
});

test("Writing yaml", async () => {
    const t = new ObjSerializer.ObjectSerializer();
    const val = { test: "out.yaml" };
    const expected = 'test: out.yaml\n';

    let fn = await tmp.tmpName({ postfix: ".yaml" });
    try {
        const rv = await t.toFileAsync(fn, val);
        expect(rv).toEqual(val);
        expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);
    } finally {
        await fs.promises.unlink(fn);
    }

    fn = await tmp.tmpName({ postfix: ".yaml" });
    try {
        const rv = t.toFileSync(fn, val);
        expect(rv).toEqual(val);
        expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);
    } finally {
        await fs.promises.unlink(fn);
    }

    let rv = t.stringify("yaml", val) as any;
    expect(rv).toEqual(expected);
});

test("Reading yml", async () => {
    const t = new ObjSerializer.ObjectSerializer();

    let rv = await t.fromFileAsync("./test/test.yml");
    expect(rv).toEqual({ test: "yml" });

    rv = t.fromFileSync("./test/test.yml");
    expect(rv).toEqual({ test: "yml" });

    rv = t.parse("yml", '{ test: "yml" }');
    expect(rv).toEqual({ test: "yml" });
});

test("Writing yml", async () => {
    const t = new ObjSerializer.ObjectSerializer();
    const val = { test: "out.yml" };
    const expected = 'test: out.yml\n';

    let fn = await tmp.tmpName({ postfix: ".yml" });
    try {
        const rv = await t.toFileAsync(fn, val);
        expect(rv).toEqual(val);
        expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);
    } finally {
        await fs.promises.unlink(fn);
    }

    fn = await tmp.tmpName({ postfix: ".yml" });
    try {
        const rv = t.toFileSync(fn, val);
        expect(rv).toEqual(val);
        expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);
    } finally {
        await fs.promises.unlink(fn);
    }

    let rv = t.stringify("yml", val) as any;
    expect(rv).toEqual(expected);
});

test("Reading hybrid json", async () => {
    const t = new ObjSerializer.ObjectSerializer({ useHybridJsonParser: true });

    let rv = await t.fromFileAsync("./test/test-hybrid.json");
    expect(rv).toEqual({ test: "hjson" });

    rv = t.fromFileSync("./test/test-hybrid.json");
    expect(rv).toEqual({ test: "hjson" });

    rv = t.parse("json", '// Test\n{ "test": "hjson" }');
    expect(rv).toEqual({ test: "hjson" });
});

test("Writing hybrid json", async () => {
    const t = new ObjSerializer.ObjectSerializer({ useHybridJsonParser: true });
    const val = { test: "out.json" };
    const expected = '{\n  "test": "out.json"\n}';

    let fn = await tmp.tmpName({ postfix: ".json" });
    try {
        const rv = await t.toFileAsync(fn, val);
        expect(rv).toEqual(val);
        expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);
    } finally {
        await fs.promises.unlink(fn);
    }

    fn = await tmp.tmpName({ postfix: ".json" });
    try {
        const rv = t.toFileSync(fn, val);
        expect(rv).toEqual(val);
        expect(await fs.promises.readFile(fn, "utf8")).toEqual(expected);
    } finally {
        await fs.promises.unlink(fn);
    }

    let rv = t.stringify("json", val) as any;
    expect(rv).toEqual(expected);
});

