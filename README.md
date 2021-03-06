# Node Object Serializer
[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

This repository is part of a collection of my personal node.js libraries and templates.  I am making them available to the public - feel free to offer suggestions, report issues, or make PRs via GitHub.

This project provides a library to read JS objects from a file.  It supports multiple file formats and automatically selects based on extensions.  It can be extended by registing new marshlaing objects.

## Supported file formats

- JSON (using JSON.parse and JSON.stringify)
    - **NOTE:** Circular references are not handled by the current implementation
    - If the ```json5``` library is available, the library will use a hybrid parser for json, using JSON5 to parse and JSON.serialize to write
    - JSON5 is backwards compatible with JSON.  If you wish to use the JSON parser, specify it as the parser in your options: ```const options = { parsers: { json: Parser.JsonParser.singleton } }```
- JSON5 (requires an optional dependency of [json5](https://github.com/json5/json5))
    - **NOTE:** Circular references are not handled by the current implementation
- YAML (requires an optional dependency of [js-yaml](https://github.com/nodeca/js-yaml))
    - **NOTE:** Circular references are not handled by the current implementation

Make sure to install the JSON5 and YAML modules in your project if you plan to use them:

```
npm install js-yaml json5
```

## Usage:

### Using the default instance

The module exports a default instance by default.  Any configuration of this instance is shared across all code using the deault.

```
// Import the default instance
import objSerializer from "@msamblanet/node-object-serializer";

// If necessary, configure it here
const options = { useHybridJsonParser: true };
objSerializer.configure(options)

// Load data...
const a = await objSerializer.fromFileAsync("foo.json");
const b = objSerializer.fromFileSync("bar.yml");
const c = objSerializer.parse("json5", '{ a: 42 }');

// These methods look for a file matching this name with a known extension
const d = await objSerializer.findAndLoadAsync("foo/bar/config");
const e = await objSerializer.findAndLoadSync("foo/bar/config");

// Save data
const data = { a: 1, b: { c: 3 }};
await objSerializer.toFileAsync("foo2.json");
objSerializer.toFileSync("bar2.yml");
const t = objSerializer.stringify("json5", data);
```

### Using a custom instance

To have a separate configuration:

```
import { ObjectSerializer } from "@msamblanet/node-object-serializer";
const objSerializer = new ObjectSerializer();
// Proceed to use this just like above...
```

## API

### ObjectSerializer

An object which contains the marshaling functions and configuration data.  The default export of the module is a singleton instance of ObjectSerializer.  If multiple configurations are required, instantiate separate instance of ObjectSerializer and do not use the singleton.

The constructor takes an optional options to preconfigure the object.

### ObjectSerializer.configure

Method to configure the serializer.  Available options are:

    - ```useHybridJsonParser``` - Replaces the JSON parser with the hybrid JSON parser.  The hybrid parser uses JSON5 for reading files but the standard ```JSON.stringify``` for writing.  This allow reading JSON files with comments and other JSON5 extensions while still writing JSON compatible files.
    - ```parsers``` - A hash of parsers to add to the default parsers.  To disable an existing parser, add it to the map with a value of ```undefined```
        - Custom parsers can be added by implementing the ```ObjectFileParser``` abstract class.  See [src/index.ts](src/index.ts) for the interface specification and examples.

### ObjectSerializer.fromFileAsync(filename)

Returns a promise which resolves to the object data loaded from ```filename```.  Throws an exception if the extension of filename is unknown.

### ObjectSerializer.toFileAsync(filename, val)

Returns a promise which resolves to ```val``` after the data has been written to ```filename```.  Throws an exception if the extension of filename is unknown.

### ObjectSerializer.fromFileSync(filename)

Returns the object data loaded from ```filename```..  Throws an exception if the format of extension is unknown.

**Note:** This performs synchronous file IO and will block javascript execution.

### ObjectSerializer.toFileSync(filename, val)

Returns ```val``` after the data has been written to ```filename```.  Throws an exception if the extension of filename is unknown.

**Note:** This performs synchronous file IO and will block javascript execution.

### ObjectSerializer.parse(format, raw)

Parses ```raw``` from the specified ```format``` into a javascript object.  Throws an exception if the format is unknown.

### ObjectSerializer.stringify(format, val)

Stringifies ```val``` into the specified ```format```.  Throws an exception if the format is unknown.

### ObjectSerializer.findFileAsync(baseName, errorIfNotFound = false)

Locates a file of ```baseName``` with an extension matching on of the registered matching extensions and returns a promise resolving to the filename.  If ``errorIfNotFound``` is set, it throws an exception if no files are found.  Otherwise it returns a null of no files are found.

**Note:** if multiple matching files are found, there is no guarentee of the order.

### ObjectSerializer.findFileSync(baseName, errorIfNotFound = false)

Locates a file of ```baseName``` with an extension matching on of the registered matching extensions and returns the filename.  If ``errorIfNotFound``` is set, it throws an exception if no files are found.  Otherwise it returns a null of no files are found.

**Note:** if multiple matching files are found, there is no guarentee of the order.

**Note:** This performs synchronous file IO and will block javascript execution.

### ObjectSerializer.findAndLoadAsync<X>(baseName, errorIfNotFound = false)

Convience methods to do a findFile and fromFile.

### ObjectSerializer.findAndLoadSync<X>(baseName, errorIfNotFound = false)

Convience methods to do a findFile and fromFile.

**Note:** This performs synchronous file IO and will block javascript execution.
