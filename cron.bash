#!/bin/bash

DIR=$(dirname "$0")

cd $DIR

npm run scrapper | tee -a "cron.log"
