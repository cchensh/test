#!/bin/bash

MIN_DENO_VERSION="1.31.1"
SKIP_DENO_INSTALL='false'
SLACK_CLI_NAME="slack"
FINGERPRINT="d41d8cd98f00b204e9800998ecf8427e" 

while getopts "v:skip-deno-install" flag; do
        case "$flag" in
                v) 
                        export SLACK_CLI_VERSION=$OPTARG
                        ;;
                skip-deno-install) 
                        export SKIP_DENO_INSTALL='true'
                        ;;
        esac
done

if [ $(( $# - $OPTIND )) -lt 1 ]; then
    SLACK_CLI_NAME=${@:$OPTIND:1}
fi

echo "SLACK_CLI_VERSION: $SLACK_CLI_VERSION";
echo "SKIP_DENO_INSTALL: $SKIP_DENO_INSTALL";
echo "SLACK_CLI_NAME: $SLACK_CLI_NAME";
