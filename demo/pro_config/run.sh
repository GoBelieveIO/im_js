#!/bin/bash
project="im_js"

app_dir="/data/wwwroot/${project}"
log_dir="/data/logs/${project}"
image="python_dev"

cp -f pro_config/config.py ./config.py

mkdir -p ${log_dir}

docker restart ${project} || docker run -d --restart=always --name=${project} --net=host -v ${log_dir}:/logs  -v ${app_dir}/pro_config/supervisord.conf:/etc/supervisord.conf -v ${app_dir}:/app ${image} /usr/local/python/bin/supervisord
