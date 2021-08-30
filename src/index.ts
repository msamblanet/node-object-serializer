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

export class JsParser extends ObjectFileParser {
    static readonly singleton = new JsParser();

    parse<X>(raw: string): X { throw new Error("String parsing of JS not supported"); }
    stringify<X>(val: X): string { throw new Error("Writing of JS not supported"); }

    async fromFileAsync<X>(filename: string): Promise<X> { return require(filename); }
    fromFileSync<X>(filename: string): X { return require(filename); }

    async toFileAsync<X>(filename: string, val: X): Promise<X> { throw new Error("Writing of JS not supported"); }
    toFileSync<X>(filename: string, val: X): X { throw new Error("Writing of JS not supported"); }
}

export class JsonParser extends ObjectFileParser {
    static readonly singleton = new JsonParser();

    parse<X>(raw: string): X { return JSON.parse(raw); }
    stringify<X>(val: X): string { return JSON.stringify(val, undefined, 2); }
}

export class YamlParser extends ObjectFileParser {
    static readonly singleton = new YamlParser();

    lib: any;
    loadLib(): any { return this.lib ??= require("js-yaml"); }

    parse<X>(raw: string): X {  return this.loadLib().load(raw); }
    stringify<X>(val: X): string { return this.loadLib().dump(val); }
}

export class Json5Parser extends ObjectFileParser {
    static readonly singleton = new Json5Parser();

    lib: any;
    loadLib(): any { return this.lib ??= require("json5"); }

    parse<X>(raw: string): X {  return this.loadLib().parse(raw); }
    stringify<X>(val: X): string { return this.loadLib().stringify(val, undefined, 2); }
}

export type FileParsersMap = { [key: string]: ObjectFileParser|undefined };

export type ObjectSerializerOptions = {
    useJson5ForJson?: boolean,
    enableJs?: boolean
    parsers?: FileParsersMap
}

export class ObjectSerializer {
    fileParsers: FileParsersMap  = {
        js: undefined, // Disable by default for safety - must be enabled
        json: JsonParser.singleton,
        yml: YamlParser.singleton,
        yaml: YamlParser.singleton,
        json5: Json5Parser.singleton
    }

    constructor(opts?: ObjectSerializerOptions) {
        if (opts) this.configure(opts);
    }

    configure(opts: ObjectSerializerOptions = {}) {
        if (opts.parsers) this.fileParsers = { ...this.fileParsers, ...opts.parsers };

        if (opts.enableJs) this.fileParsers.js ??= JsParser.singleton;
        else this.fileParsers.js = undefined;

        if (opts.useJson5ForJson) this.fileParsers.json = this.fileParsers.json5;
    }

    fromFileAsync<X>(filename: string): Promise<X> {
        const parser = this.fileParsers[path.extname(filename)?.toLowerCase()];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return parser.fromFileAsync<X>(filename);

    }
    toFileAsync<X>(filename: string, val: X): Promise<X> {
        const parser = this.fileParsers[path.extname(filename)?.toLowerCase()];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return parser.toFileAsync<X>(filename, val);
    }

    fromFileSync<X>(filename: string): X {
        const parser = this.fileParsers[path.extname(filename)?.toLowerCase()];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return parser.fromFileSync<X>(filename);

    }
    toFileSync<X>(filename: string, val: X): X {
        const parser = this.fileParsers[path.extname(filename)?.toLowerCase()];
        if (!parser) throw new Error(`Unknown type for file: ${filename}`);
        return parser.toFileSync<X>(filename, val);
    }

    fromString<X>(format: string, raw: string): X {
        const parser = this.fileParsers[format];
        if (!parser) throw new Error(`Unknown type for file: ${format}`);
        return parser.parse<X>(raw);

    }
    toString<X>(format: string, val: X): string {
        const parser = this.fileParsers[format];
        if (!parser) throw new Error(`Unknown type: ${format}`);
        return parser.stringify<X>(val);
    }
}

export default new ObjectSerializer();
