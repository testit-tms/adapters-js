echo $(grep -o 'VERSION = "[^"]*"' testit-js-commons/src/services/syncstorage/syncstorage.runner.ts | cut -d'"' -f2)
