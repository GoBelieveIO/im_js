#!/bin/bash

uwsgi=/usr/local/bin/uwsgi
home=/usr/local
app_dir=/vagrant/production/gobelieve/im_js


$uwsgi --uid nobody --gid nobody --chdir $app_dir --http :5001 -M  -p 1 -w demo --callable app -t 60 --max-requests 5000 --vacuum --home $home --daemonize /tmp/im_demo.log --pidfile /tmp/im_demo.pid --touch-reload /tmp/im_demo.touch


