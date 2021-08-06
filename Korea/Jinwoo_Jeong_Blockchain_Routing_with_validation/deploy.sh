#!/bin/bash
#SRC_DIR="coding-challenge/edgeworker_example"
SRC_DIR="built"
CODE_DIR_OPT="--codeDir built"
EDGE_WORKER_ID=5845
NETWORK="STAGING"

yarn build

VERSION=`cat ${SRC_DIR}/bundle.json| jq -r '."edgeworker-version"'`
BUNDLE_FILE_OPT="--bundle ${SRC_DIR}_tar/ew_${EDGE_WORKER_ID}_${VERSION}.tgz"

akamai edgeworkers upload $BUNDLE_FILE_OPT --section ewcc $EDGE_WORKER_ID

sleep 3;

akamai edgeworkers activate --section ewcc $EDGE_WORKER_ID $NETWORK $VERSION

while true;
do
    STATUS=`akamai edgeworkers status --section ewcc $EDGE_WORKER_ID | grep "${VERSION}" | awk '{print $4}'`
    if [[ $STATUS == "COMPLETE" ]];then
        echo "DEPLOYMENT COMPLETE"
        say "DEPLOYMENT COMPLETE"
        break
    fi
    sleep 1;
done
