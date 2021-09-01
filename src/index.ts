// This defines the exports available when importing this project as a library

import fs from "fs";
import path from "path";
import type JSON5 from "json5";
import type JSYAML from "js-yaml";

import { optionalRequire } from "optional-require";
const json5 = optionalRequire("json5") as typeof JSON5 | undefined;
const jsYaml = optionalRequire("js-yaml") as typeof JSYAML | undefined;

export abstract class ObjectFileParser {
    //
    // Note: parse/stringify must be synchronous...
    //
    abstract parse<X>(raw: string): X;
    abstract stringify<X>(val: X): string;

    //
    // Both sync and async methods are defined to ensure
    // implementations can choose to implement them as best for
    // each library
    //
    // Default implementation is a simple read-file-and-pass-to-parse/stringify
    //
    async fromFileAsync<X>(filename: string): Promise<X> {
        const raw = await fs.promises.readFile(filename, { encoding: "utf8" });
        return this.parse(raw);
    }
    fromFileSync<X>(filename: string): X {
        const raw = fs.readFileSync(filename, { encoding: "utf8" });
        return this.parse(raw);
    }

    async toFileAsync<X>(filename: string, val: X): Promise<X> {
        const raw = this.stringify(val);
        await fs.promises.writeFile(filename, raw, { encoding: "utf8" });
        return val;
    }
    toFileSync<X>(filename: string, val: X): X {
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
    static readonly singleton = new JsonParser();
    readonly options: JsonParserOptions
    constructor(options?: JsonParserOptions) {
        super();
        this.options = { space: 2, ...options };
    }

    parse<X>(raw: string): X { return JSON.parse(raw, this.options.reviver); }
    stringify<X>(val: X): string { return JSON.stringify(val, this.options.replacer, this.options.space); }
}

export class YamlParser extends ObjectFileParser {
    static readonly singleton = jsYaml ? new YamlParser(jsYaml) : /* istanbul ignore next */ undefined;
    readonly lib: typeof JSYAML;
    readonly loadOptions?: JSYAML.LoadOptions;
    readonly dumpOptions?: JSYAML.DumpOptions;
    constructor(lib?: typeof JSYAML, loadOptions?: JSYAML.LoadOptions, dumpOptions?: JSYAML.DumpOptions) {
        super();
        /* istanbul ignore if */
        if (!lib && !jsYaml) throw new Error("No JSYAML library provided or found");
        this.lib = (lib ?? jsYaml) as typeof JSYAML;
        this.loadOptions = loadOptions;
        this.dumpOptions = dumpOptions;
    }

    parse<X>(raw: string): X { return this.lib.load(raw, this.loadOptions) as X; }
    stringify<X>(val: X): string { return this.lib.dump(val, this.dumpOptions); }
}

export class Json5Parser extends ObjectFileParser {
    static readonly singleton = json5 ? new Json5Parser(json5) : /* istanbul ignore next */ undefined
    readonly lib: typeof JSON5
    readonly options: JsonParserOptions
    constructor(lib?: typeof JSON5, options?: JsonParserOptions) {
        super();
        /* istanbul ignore if */
        if (!lib && !json5) throw new Error("No JSON5 library provided or found");
        this.lib = (lib ?? json5) as typeof JSON5;
        this.options = { space: 2, ...options };
    }

    parse<X>(raw: string): X { return this.lib.parse(raw, this.options.reviver) as X; }
    stringify<X>(val: X): string { return this.lib.stringify(val, this.options.replacer, this.options.space); }
}

export class HybridJsonParser extends Json5Parser {
    static readonly singleton = json5 ? new HybridJsonParser(json5) : /* istanbul ignore next */ undefined;
    constructor(lib: typeof JSON5, options?: JsonParserOptions) { super(lib, options); }

    stringify<X>(val: X): string { return JSON.stringify(val, this.options.replacer, this.options.space); }
}

export type FileParsersMap = { [key: string]: ObjectFileParser|undefined };

export type ObjectSerializerOptions = {
    useStandardJsonParser?: boolean,
    parsers?: FileParsersMap
}

export class ObjectSerializer {
    fileParsers: FileParsersMap  = {
        json: HybridJsonParser.singleton ?? /* istanbul ignore next */ JsonParser.singleton,
        yml: YamlParser.singleton,
        yaml: YamlParser.singleton,
        json5: Json5Parser.singleton
    }

    constructor(opts?: ObjectSerializerOptions) {
        if (opts) this.configure(opts);
    }

    configure(opts: ObjectSerializerOptions): ObjectSerializer {
        if (opts.parsers) this.fileParsers = { ...this.fileParsers, ...opts.parsers };
        return this;
    }

    extFromFilename(filename: string): string {
        return path.extname(filename).replace(/^\./, "").toLowerCase();
    }

    async fromFileAsync<X>(filename: string): Promise<X> {
        const parser = this.fileParsers[this.extFromFilename(filename)];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return await parser.fromFileAsync<X>(filename);

    }
    async toFileAsync<X>(filename: string, val: X): Promise<X> {
        const parser = this.fileParsers[this.extFromFilename(filename)];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return await parser.toFileAsync<X>(filename, val);
    }

    fromFileSync<X>(filename: string): X {
        const parser = this.fileParsers[this.extFromFilename(filename)];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return parser.fromFileSync<X>(filename);

    }
    toFileSync<X>(filename: string, val: X): X {
        const parser = this.fileParsers[this.extFromFilename(filename)];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return parser.toFileSync<X>(filename, val);
    }

    parse<X>(format: string, raw: string): X {
        const parser = this.fileParsers[format];
        if (!parser) throw new Error(`Unknown type: ${format}`);
        return parser.parse<X>(raw);

    }
    stringify<X>(format: string, val: X): string {
        const parser = this.fileParsers[format];
        if (!parser) throw new Error(`Unknown type: ${format}`);
        return parser.stringify<X>(val);
    }

    async findAndLoadAsync<X>(baseName: string, errorIfNotFound = false): Promise<X|null> {
        const filename = await this.findFileAsync(baseName, errorIfNotFound);
        if (filename) return await this.fromFileAsync(filename);
        return null;
    }

    findAndLoadSync<X>(baseName: string, errorIfNotFound = false): X|null {
        const filename = this.findFileSync(baseName, errorIfNotFound);
        if (filename) return this.fromFileSync(filename);
        return null;
    }

    async findFileAsync(baseName: string, errorIfNotFound = false): Promise<string|null> {
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

    findFileSync(baseName: string, errorIfNotFound = false): string|null {
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
