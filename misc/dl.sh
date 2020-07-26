#!/bin/bash
CMD=${1:-"just download.js"}
DL=${2:-"https://codeload.github.com/just-js/modules/tar.gz/0.0.1"}
shift
JUST_MODULES=/home/andrew/Documents/source/github/just-js/modules
LIBS="$JUST_MODULES/openssl:$JUST_MODULES/picohttp"
#LD_LIBRARY_PATH=$LIBS $CMD --inspector -L -o modules.tar.gz https://codeload.github.com/just-js/modules/tar.gz/0.0.1 $@
LD_LIBRARY_PATH=$LIBS $CMD -L -o modules.tar.gz $DL $@
