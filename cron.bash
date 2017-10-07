#!/bin/bash

DIR=$(dirname "$0")

npm run scrapper | tee -a "$DIR/cron.log"
