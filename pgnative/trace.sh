#!/bin/bash
LD_LIBRARY_PATH=/usr/local/lib/just just --trace-gc --trace-gc-ignore-scavenger --trace-gc-verbose --trace-opt --trace-opt-verbose --trace-file-names --print-opt-source bench.js 6 1>out.log
