# -*- coding: utf-8 -*-

import time
import logging
import sys
import redis
import json
import uuid
import subprocess
from OpenSSL import crypto
import os
import traceback
import threading
import socket
import binascii
import config
import npush

mysql = None

class AppManager:
    def __init__(self):
        self.apps = {}
        
    def set_app(self, appid, app):
        self.apps[appid] = app

    def get_app(self, appid):
        return self.apps[appid] if self.apps.has_key(appid) else None

app_manager = AppManager()

class APNSConnectionManager:
    def __init__(self):
        self.apns_connections = {}
        self.lock = threading.Lock()

    def get_apns_connection(self, appid):
        self.lock.acquire()
        try:
            connections = self.apns_connections
            apns = connections[appid] if connections.has_key(appid) else None
        finally:
            self.lock.release()
        return apns

    def remove_apns_connection(self, appid):
        self.lock.acquire()
        try:
            connections = self.apns_connections
            if connections.has_key(appid):
                logging.debug("pop client:%s", appid)
                connections.pop(appid)
        finally:
            self.lock.release()

    def set_apns_connection(self, appid, connection):
        self.lock.acquire()
        try:
            self.apns_connections[appid] = connection
        finally:
            self.lock.release()

apns_manager = APNSConnectionManager()


class DB:
    @classmethod
    def get_app(self, appid):
        for i in range(2):
            try:
                sql = "select name, platform_identity from client, app where app.id=%s and client.app_id =app.id"
                cursor = mysql.execute(sql, appid)
                obj = cursor.fetchone()
         
                name = obj["name"]
                package_name = obj["platform_identity"]
                return name, package_name
            except Exception, e:
                logging.info("exception:%s", str(e))
                continue
         
        return None, None
    
    @classmethod
    def get_cer(self, appid):
        for i in range(2):
            try:
                sql = "select c.cer as cer, c.pkey as pkey from client, client_certificate as c where client.app_id=%s and client.id =c.client_id"
                cursor = mysql.execute(sql, appid)
                obj = cursor.fetchone()
     
                cer = obj["cer"]
                pkey = obj["pkey"]
                return cer, pkey
            except Exception, e:
                logging.info("exception:%s", str(e))
                continue
     
        return None, None

def get_app(appid):
    app = app_manager.get_app(appid)
    if not app:
        name, package_name = DB.get_app(appid)
        if name and package_name:
            app_manager.set_app(appid, (name, package_name))
    else:
        name, package_name = app

    return name, package_name

    
def connect_gateway(appid):
    logging.debug("appid:%s", appid)
    cer, key = DB.get_cer(appid)
    cer_file = "/tmp/%s_android.cer"%appid
    key_file = "/tmp/%s_android.key"%appid

    if not os.path.isfile(cer_file):
        f = open(cer_file, "wb")
        f.write(cer)
        f.close()

    if not os.path.isfile(key_file):
        f = open(key_file, "wb")
        f.write(key)
        f.close()

    conn = npush.Connection(cer_file, key_file)

    return conn


def android_payload(name, package_name, content):
    obj = {}
    obj["push_type"] = 1
    obj["is_ring"] = True
    obj["is_vibrate"] = True
    if name:
        obj["title"] = name
    if package_name:
        obj["package_name"] = package_name
    obj["app_params"] = {}

    try:
        content = json.loads(content)
        if content.has_key("text"):
            obj["content"] = content["text"]
        elif content.has_key("audio"):
            obj["content"] = u"收到一条语音"
        elif content.has_key("image"):
            obj["content"] = u"收到一张图片"
        else:
            obj["content"] = u"您收到一条新信息，快来看看吧。"

        return json.dumps(obj)
    except ValueError, e:
        logging.info("im message content is't json format")
        obj["content"] = u"您收到一条新信息，快来看看吧。"
        return json.dumps(obj)
    except Exception, e:
        logging.info("im message content is't dict json object")
        obj["content"] = u"您收到一条新信息，快来看看吧。"
        return json.dumps(obj)


def send(obj):
    appid = obj["appid"]
    content = obj["content"]
    token = obj.get('token', None)

    if not token or len(token) != 32:
        logging.warn("invalid token:%s", token)
        return

    name, package_name = get_app(appid)

    payload = android_payload(name, package_name, content)
    for i in range(2):
        if i == 1:
            logging.warn("resend notification")

        sock = apns_manager.get_apns_connection(appid)

        if not sock:
            sock = connect_gateway(appid)
            apns_manager.set_apns_connection(appid, sock)
        try:
            logging.debug("push notification:%s appid:%s", token, appid)
            notification = npush.EnhancedNotification()
            notification.payload = payload
            notification.expiry = int(time.time()+3600*48)
            notification.identifier = 0
            notification.token = binascii.a2b_hex(token)
            s = notification.to_data()
            s = npush.ENHANCED_NOTIFICATION_COMMAND + s
            sock.write(s)
            break
        except Exception, e:
            logging.warn("send notification exception:%s", str(e))
            apns_manager.remove_apns_connection(appid)


