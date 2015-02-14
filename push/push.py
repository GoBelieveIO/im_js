# -*- coding: utf-8 -*-
import time
import logging
import sys
import redis
import json
import traceback
import requests
import base64
import threading
import config
import mysql
from ios_push import update_p12_thread
import ios_push
import android_push

mysql = mysql.Mysql.instance(*config.MYSQL_GC)
rds = redis.StrictRedis(host=config.REDIS_HOST, port=config.REDIS_PORT, db=config.REDIS_DB)

android_push.mysql = mysql
ios_push.mysql = mysql

def get_user_token(rds, appid, uid):
    key = "users_%d_%d"%(appid, uid)
    apns_token, ng_token, apns_ts, ng_ts = rds.hmget(key, "apns_device_token", "ng_device_token", "apns_timestamp", "ng_timestamp")
    apns_ts = int(apns_ts) if apns_ts else 0
    ng_ts = int(ng_ts) if ng_ts else 0

    #使用最近登录的token
    if apns_ts > ng_ts:
        ng_token = None
    else:
        apns_token = None
    return apns_token, ng_token

def receive_offline_message():
    while True:
        item = rds.blpop("push_queue")
        if not item:
            continue
        _, msg = item
        logging.debug("offline message:%s", msg)
        obj = json.loads(msg)
        appid = obj["appid"]
        receiver = obj["receiver"]
        apns_token, ng_token = get_user_token(rds, appid, receiver)
        if apns_token:
            obj["sandbox"] = True
            obj["token"] = apns_token
            ios_push.send(obj)
        elif ng_token:
            obj["token"] = ng_token
            android_push.send(obj)
        else:
            logging.debug("no token binded:%s", msg)
            continue

def main():
    t = threading.Thread(target=update_p12_thread, args=())
    t.setDaemon(True)
    t.start()

    logging.info("startup")
    while True:
        try:
            receive_offline_message()
        except Exception, e:
            print_exception_traceback()
            time.sleep(1)
            continue

def print_exception_traceback():
    exc_type, exc_value, exc_traceback = sys.exc_info()
    logging.warn("exception traceback:%s", traceback.format_exc())

def init_logger(logger):
    root = logger
    root.setLevel(logging.DEBUG)
    logging.basicConfig(level=logging.DEBUG,
                        format='%(filename)s:%(lineno)d- %(asctime)s-%(levelname)s - %(message)s')


if __name__ == "__main__":
    init_logger(logging.getLogger(''))
    main()
