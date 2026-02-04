#!/bin/bash

VERSION=3.6.1-TMS-5.6
API_CLIENT_VERSION=7.1.0-TMS-5.6

node update_version.js $VERSION

# Update testit-api-client version in package.json using sed
sed -i "s/\"testit-api-client\": \".*\"/\"testit-api-client\": \"$API_CLIENT_VERSION\"/g" testit-js-commons/package.json
