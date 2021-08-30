# Node Object Serializer

This repository is part of a collection of my personal node.js libraries and templates.  I am making them available to the public - feel free to offer suggestions, report issues, or make PRs via GitHub.

This project provides a library to read JS objects from a file.  It supports multiple file formats and automatically selects based on extensions.  It can be extended by registing new marshlaing objects.

## Supported file formats

- JSON (using JSON.parse and JSON.stringify)
    - **NOTE:** Circular references are not handled by the current implementation
- JSON5 (requires an optional dependency of [json5](https://github.com/json5/json5))
    - JSON5 is backwards compatible with JSON.  If you wish to use the JSON5 file for JSON files, configure with the ```useJson5ForJson``` option set to true.
    - **NOTE:** Circular references are not handled by the current implementation
- YAML (requires an optional dependency of [js-yaml](https://github.com/nodeca/js-yaml))
    - **NOTE:** Circular references are not handled by the current implementation
- JS (only works for reading files via ```require```)
    - **NOTE:** JS presents a security risk and, as such, is disabled by default.  Configure with the ```enableJs``` option set to true to enable this support.

## Usage:

### Using the default instance

The module exports a default instance by default.  Any configuration of this instance is shared across all code using the deault.

```
// Import the default instance
import objSerializer from "@msamblanet/node-object-serializer";

// If necessary, configure it here
const options = { useJson5ForJson: true };
objSerializer.configure(options)

// Load data...
const a = await objSerializer.fromFileAsync("foo.json");
const b = objSerializer.fromFileSync("bar.yml");
const c = objSerializer.fromString("json5", '{ a: 42 }');

// Save data
const data = { a: 1, b: { c: 3 }};
await objSerializer.toFileAsync("foo2.json");
objSerializer.toFileSync("bar2.yml");
const t = objSerializer.toString("json5", data);
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

    - ```useJson5ForJson``` - Replaces the JSON parser with the JSON5 parser
    - ```enableJs``` - The JS parser will be disabled unless this is set to true
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

### ObjectSerializer.fromString(format, raw)

Parses ```raw``` from the specified ```format``` into a javascript object.  Throws an exception if the format is unknown.

### ObjectSerializer.toString(format, val)

Stringifies ```val``` into the specified ```format```.  Throws an exception if the format is unknown.
