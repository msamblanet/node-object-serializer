// This defines the exports available when importing this project as a library

import fs from "fs";
import path from "path";

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

export class JsonParser extends ObjectFileParser {
    static readonly singleton = new JsonParser();

    parse<X>(raw: string): X { return JSON.parse(raw); }
    stringify<X>(val: X): string { return JSON.stringify(val, undefined, 2); }
}

export class HybridJsonParser extends ObjectFileParser {
    static readonly singleton = new HybridJsonParser();

    parse<X>(raw: string): X { return Json5Parser.singleton.parse(raw); }
    stringify<X>(val: X): string { return JSON.stringify(val, undefined, 2); }
}

export class YamlParser extends ObjectFileParser {
    static readonly singleton = new YamlParser();

    libName = "js-yaml";
    lib: any;
    loadLib(): any { return this.lib ??= require(this.libName); }

    parse<X>(raw: string): X {  return this.loadLib().load(raw); }
    stringify<X>(val: X): string { return this.loadLib().dump(val); }
}

export class Json5Parser extends ObjectFileParser {
    static readonly singleton = new Json5Parser();

    libName = "json5";
    lib: any;
    loadLib(): any { return this.lib ??= require(this.libName); }

    parse<X>(raw: string): X {  return this.loadLib().parse(raw); }
    stringify<X>(val: X): string { return this.loadLib().stringify(val, undefined, 2); }
}

export type FileParsersMap = { [key: string]: ObjectFileParser|undefined };

export type ObjectSerializerOptions = {
    useHybridJsonParser?: boolean,
    parsers?: FileParsersMap
}

export class ObjectSerializer {
    fileParsers: FileParsersMap  = {
        json: JsonParser.singleton,
        yml: YamlParser.singleton,
        yaml: YamlParser.singleton,
        json5: Json5Parser.singleton
    }

    constructor(opts?: ObjectSerializerOptions) {
        if (opts) this.configure(opts);
    }

    configure(opts: ObjectSerializerOptions) {
        if (opts.parsers) this.fileParsers = { ...this.fileParsers, ...opts.parsers };

        if (opts.useHybridJsonParser) this.fileParsers.json = HybridJsonParser.singleton;

        return this;
    }

    extFromFilename(filename: string): string {
        return path.extname(filename).replace(/^\./, "").toLowerCase();
    }

    fromFileAsync<X>(filename: string): Promise<X> {
        const parser = this.fileParsers[this.extFromFilename(filename)];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return parser.fromFileAsync<X>(filename);

    }
    toFileAsync<X>(filename: string, val: X): Promise<X> {
        const parser = this.fileParsers[this.extFromFilename(filename)];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return parser.toFileAsync<X>(filename, val);
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

    async findFileAsync(baseName: string, errorIfNotFound = false): Promise<string|null> {
        const dir = path.dirname(baseName);

        for (const file of await fs.promises.readdir(dir)) {
            if (this.fileParsers[this.extFromFilename(file)]) {
                return path.join(dir, file);
            }
        }

        if (errorIfNotFound) throw new Error(`No such directory: ${dir}`);
        return null;
    }

    findFileSync(baseName: string, errorIfNotFound = false): string|null {
        const dir = path.dirname(baseName);

        for (const file of fs.readdirSync(dir)) {
            if (this.fileParsers[this.extFromFilename(file)]) {
                return path.join(dir, file);
            }
        }

        if (errorIfNotFound) throw new Error(`No such directory: ${dir}`);
        return null;
    }
}

export default new ObjectSerializer();
