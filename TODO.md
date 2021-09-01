# Node Object Serializer - TODO List

- Support for additional file types
    - csv (returns array of objects, assuming header row)
    - txt (returns string) to allow for universal data parsing
- Figure out how to unit test missing optional dependencies
- Support for streamed parsing of files (all current core parsers requre a read-and-parse-string)
- Handling of circular references when serializing
- Document individual parsers
