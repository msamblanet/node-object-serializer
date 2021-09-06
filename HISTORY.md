# Node Object Serializer - Revision History

- UNRELEASED
    - Better handling of optional libraries
    - Use hybrid json by default, remove hybrid parser option (breaking but not bumping major version because I am the only user of this currentl)
    - Add formatting options for JSON, YAML, JSON5 and Hybrid parsers

- 2021-09-06 - 1.1.1 - Migrated to @msamblanet/node-project-settings, fixes to make consistent with other modules on configuration
- 2021-08-31 - 1.1.0 - Added findAndLoad methods, cleaned up unit tests
- 2021-08-30 - Initial release
