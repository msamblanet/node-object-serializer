// This defines the exports available when importing this project as a library

import fs from "fs";
import path from "path";
import type JSON5 from "json5";
import type JSYAML from "js-yaml";
import extend from "extend";

import { optionalRequire } from "optional-require";
const json5 = optionalRequire("json5") as typeof JSON5 | undefined;
const jsYaml = optionalRequire("js-yaml") as typeof JSYAML | undefined;

export abstract class ObjectFileParser {
    //
    // Note: parse/stringify must be synchronous...
    //
    public abstract parse<X>(raw: string): X;
    public abstract stringify<X>(val: X): string;

    //
    // Both sync and async methods are defined to ensure
    // implementations can choose to implement them as best for
    // each library
    //
    // Default implementation is a simple read-file-and-pass-to-parse/stringify
    //
    public async fromFileAsync<X>(filename: string): Promise<X> {
        const raw = await fs.promises.readFile(filename, { encoding: "utf8" });
        return this.parse(raw);
    }
    public fromFileSync<X>(filename: string): X {
        const raw = fs.readFileSync(filename, { encoding: "utf8" });
        return this.parse(raw);
    }

    public async toFileAsync<X>(filename: string, val: X): Promise<X> {
        const raw = this.stringify(val);
        await fs.promises.writeFile(filename, raw, { encoding: "utf8" });
        return val;
    }
    public toFileSync<X>(filename: string, val: X): X {
        const raw = this.stringify(val);
        fs.writeFileSync(filename, raw, { encoding: "utf8" });
        return val;
    }
}

export type JsonParserOptions = {
    reviver?: (this: any, key: string, value: any) => any,
    replacer?:  (this: any, key: string, value: any) => any,
    space?: string | number
}
export class JsonParser extends ObjectFileParser {
    public static readonly singleton = new JsonParser();
    protected readonly options: JsonParserOptions
    public constructor(options?: JsonParserOptions) {
        super();
        this.options = { space: 2, ...options };
    }

    public parse<X>(raw: string): X { return JSON.parse(raw, this.options.reviver); }
    public stringify<X>(val: X): string { return JSON.stringify(val, this.options.replacer, this.options.space); }
}

export class YamlParser extends ObjectFileParser {
    public static readonly singleton = jsYaml ? new YamlParser(jsYaml) : /* istanbul ignore next */ undefined;
    public readonly lib: typeof JSYAML;
    protected readonly loadOptions?: JSYAML.LoadOptions;
    protected readonly dumpOptions?: JSYAML.DumpOptions;
    public constructor(lib?: typeof JSYAML, loadOptions?: JSYAML.LoadOptions, dumpOptions?: JSYAML.DumpOptions) {
        super();
        /* istanbul ignore if */
        if (!lib && !jsYaml) throw new Error("No JSYAML library provided or found");
        this.lib = (lib ?? jsYaml) as typeof JSYAML;
        this.loadOptions = loadOptions;
        this.dumpOptions = dumpOptions;
    }

    public parse<X>(raw: string): X { return this.lib.load(raw, this.loadOptions) as X; }
    public stringify<X>(val: X): string { return this.lib.dump(val, this.dumpOptions); }
}

export class Json5Parser extends ObjectFileParser {
    public static readonly singleton = json5 ? new Json5Parser(json5) : /* istanbul ignore next */ undefined
    public readonly lib: typeof JSON5
    protected readonly options: JsonParserOptions
    public constructor(lib?: typeof JSON5, options?: JsonParserOptions) {
        super();
        /* istanbul ignore if */
        if (!lib && !json5) throw new Error("No JSON5 library provided or found");
        this.lib = (lib ?? json5) as typeof JSON5;
        this.options = { space: 2, ...options };
    }

    public parse<X>(raw: string): X { return this.lib.parse(raw, this.options.reviver) as X; }
    public stringify<X>(val: X): string { return this.lib.stringify(val, this.options.replacer, this.options.space); }
}

export class HybridJsonParser extends Json5Parser {
    public static readonly singleton = json5 ? new HybridJsonParser(json5) : /* istanbul ignore next */ undefined;
    public constructor(lib: typeof JSON5, options?: JsonParserOptions) { super(lib, options); }

    public stringify<X>(val: X): string { return JSON.stringify(val, this.options.replacer, this.options.space); }
}

export type FileParsersMap = { [key: string]: ObjectFileParser|undefined };

export type ObjectSerializerConfig = {
    parsers: FileParsersMap
}
export type ObjectSerializerConfigOverrides = undefined | null | {
    parsers?: FileParsersMap
}

export class ObjectSerializer {
    public static readonly DEFAULT_OPTIONS: ObjectSerializerConfig = {
        parsers: {
            json: HybridJsonParser.singleton ?? /* istanbul ignore next */ JsonParser.singleton,
            yml: YamlParser.singleton,
            yaml: YamlParser.singleton,
            json5: Json5Parser.singleton
        }
    }

    protected fileParsers: FileParsersMap = {}

    public constructor(...opts: ObjectSerializerConfigOverrides[]) {
        this.configure(...opts);
    }

    public configure(...opts: ObjectSerializerConfigOverrides[]): ObjectSerializer {
        const mergedOpts: ObjectSerializerConfig = extend(true, {}, ObjectSerializer.DEFAULT_OPTIONS, ...opts);
        this.fileParsers = { ...this.fileParsers, ...mergedOpts.parsers };
        return this;
    }

    public extFromFilename(filename: string): string {
        return path.extname(filename).replace(/^\./, "").toLowerCase();
    }

    public async fromFileAsync<X>(filename: string): Promise<X> {
        const parser = this.fileParsers[this.extFromFilename(filename)];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return await parser.fromFileAsync<X>(filename);

    }
    public async toFileAsync<X>(filename: string, val: X): Promise<X> {
        const parser = this.fileParsers[this.extFromFilename(filename)];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return await parser.toFileAsync<X>(filename, val);
    }

    public fromFileSync<X>(filename: string): X {
        const parser = this.fileParsers[this.extFromFilename(filename)];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return parser.fromFileSync<X>(filename);

    }
    public toFileSync<X>(filename: string, val: X): X {
        const parser = this.fileParsers[this.extFromFilename(filename)];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return parser.toFileSync<X>(filename, val);
    }

    public parse<X>(format: string, raw: string): X {
        const parser = this.fileParsers[format];
        if (!parser) throw new Error(`Unknown type: ${format}`);
        return parser.parse<X>(raw);

    }
    public stringify<X>(format: string, val: X): string {
        const parser = this.fileParsers[format];
        if (!parser) throw new Error(`Unknown type: ${format}`);
        return parser.stringify<X>(val);
    }

    public async findAndLoadAsync<X>(baseName: string, errorIfNotFound = false): Promise<X|null> {
        const filename = await this.findFileAsync(baseName, errorIfNotFound);
        if (filename) return await this.fromFileAsync(filename);
        return null;
    }

    public findAndLoadSync<X>(baseName: string, errorIfNotFound = false): X|null {
        const filename = this.findFileSync(baseName, errorIfNotFound);
        if (filename) return this.fromFileSync(filename);
        return null;
    }

    public async findFileAsync(baseName: string, errorIfNotFound = false): Promise<string|null> {
        const dir = path.dirname(baseName);
        const name = `${path.basename(baseName)}.`;

        const asyncIterator = await fs.promises.opendir(dir);
        for await (const dirent of asyncIterator) {
            if (!dirent.isFile()) continue;
            const file = dirent.name;
            if (!file.startsWith(name)) continue;
            if (this.fileParsers[this.extFromFilename(file)]) {
                return path.join(dir, file);
            }
        }

        if (errorIfNotFound) throw new Error(`No matching file found: ${baseName}`);
        return null;
    }

    public findFileSync(baseName: string, errorIfNotFound = false): string|null {
        const dir = path.dirname(baseName);
        const name = `${path.basename(baseName)}.`;

        for (const file of fs.readdirSync(dir)) {
            if (!file.startsWith(name)) continue;
            if (this.fileParsers[this.extFromFilename(file)]) {
                return path.join(dir, file);
            }
        }

        if (errorIfNotFound) throw new Error(`No matching file found: ${baseName}`);
        return null;
    }
}

export default new ObjectSerializer();
