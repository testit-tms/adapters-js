#!/bin/bash

VERSION=4.0.3-TMS-5.7
API_CLIENT_VERSION=7.2.6-TMS-5.7

node update_version.js $VERSION

# Update testit-api-client version in package.json using sed
sed -i "s/\"testit-api-client\": \".*\"/\"testit-api-client\": \"$API_CLIENT_VERSION\"/g" testit-js-commons/package.json
