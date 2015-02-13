# -*- coding: utf-8 -*-

import time
import logging
import sys
import redis
from apns import APNs, Payload
import json
import uuid
import subprocess
from OpenSSL import crypto
import os
import traceback
import threading
import config
import mysql

mysql = None

class APNSConnectionManager:
    def __init__(self):
        self.apns_connections = {}
        self.sandbox_apns_connections = {}
        self.lock = threading.Lock()

    def get_apns_connection(self, appid, sandbox):
        self.lock.acquire()
        try:
            if sandbox:
                connections = self.sandbox_apns_connections
            else:
                connections = self.apns_connections

            apns = connections[appid] if connections.has_key(appid) else None
        finally:
            self.lock.release()
        return apns

    def remove_apns_connection(self, appid, sandbox):
        self.lock.acquire()
        try:
            if sandbox:
                connections = self.sandbox_apns_connections
            else:
                connections = self.apns_connections

            if connections.has_key(appid):
                logging.debug("pop client:%s", appid)
                connections.pop(appid)
        finally:
            self.lock.release()

    def set_apns_connection(self, appid, sandbox, connection):
        self.lock.acquire()
        try:
            if sandbox:
                self.sandbox_apns_connections[appid] = connection
            else:
                self.apns_connections[appid] = connection
        finally:
            self.lock.release()


apns_manager = APNSConnectionManager()

def get_p12(appid, sandbox):
    for i in range(2):
        try:
            sql = "select sandbox_key, sandbox_key_secret, sandbox_key_utime, production_key, production_key_secret, production_key_utime from client, client_apns where client.app_id=%s and client.id=client_apns.client_id"
            cursor = mysql.execute(sql, appid)
            obj = cursor.fetchone()
            logging.debug("obj keys:%s", obj.keys())
            if sandbox:
                p12 = obj["sandbox_key"]
                secret = obj["sandbox_key_secret"]
                timestamp = obj["sandbox_key_utime"]
            else:
                p12 = obj["production_key"]
                secret = obj["production_key_secret"]
                timestamp = obj["production_key_utime"]
         
            logging.info("get p12 success")
            return p12, secret, timestamp
        except Exception, e:
            logging.info("exception:%s", str(e))
            continue

    return None, None, None

def gen_pem(p12, secret):
    p12 = crypto.load_pkcs12(p12, str(secret))
    priv_key = crypto.dump_privatekey(crypto.FILETYPE_PEM, p12.get_privatekey())
    pub_key = crypto.dump_certificate(crypto.FILETYPE_PEM, p12.get_certificate())
    return priv_key + pub_key


def connect_apns(appid, sandbox):
    logging.debug("connecting apns")
    p12, secret, timestamp = get_p12(appid, sandbox)
    if not p12:
        return None

    if sandbox:
        pem_file = "/tmp/client_%s_sandbox_%s.pem" % (appid, timestamp)
    else:
        pem_file = "/tmp/client_%s_%s.pem" % (appid, timestamp)

    logging.debug("pemfile:%s", pem_file)
    if not os.path.isfile(pem_file):
        pem = gen_pem(p12, secret)
        f = open(pem_file, "wb")
        f.write(pem)
        f.close()

    apns = APNs(use_sandbox=sandbox, cert_file=pem_file)
    return apns


def ios_payload(content):
    try:
        content = json.load(content)
        payload = None
        if content.has_key("text"):
            payload = Payload(alert=content["text"], sound="default", badge=0)
        elif content.has_key("audio"):
            payload = Payload(alert=u"收到一条语音", sound="default", badge=0)
        elif content.has_key("image"):
            payload = Payload(alert=u"收到一张图片", sound="default", badge=0)
        else:
            payload = Payload(alert=u"您收到一条新信息，快来看看吧。", sound="default", badge=0)

        return payload
    except ValueError, e:
        logging.info("im message content is't json format")
        payload = Payload(alert=u"您收到一条新信息，快来看看吧。", sound="default", badge=0)
        return payload

    except Exception, e:
        logging.info("im message content is't dict json object")
        payload = Payload(alert=u"您收到一条新信息，快来看看吧。", sound="default", badge=0)
        return payload
        

def send(obj):
    appid = obj["appid"]
    content = obj["content"]
    token = obj.get('token', None)
    sandbox = obj.get("sandbox", False)


    if not token or len(token) != 64:
        logging.warn("invalid token:%s", token)
        return

    payload = ios_payload(content)
    for i in range(2):
        if i == 1:
            logging.warn("resend notification")

        apns = apns_manager.get_apns_connection(appid, sandbox)

        if not apns:
            apns = connect_apns(appid, sandbox)
            if not apns:
                logging.warn("get p12 fail app id:%s", appid)
                break
            apns_manager.set_apns_connection(appid, sandbox, apns)

        try:
            logging.debug("send apns:%s", token)
            apns.gateway_server.send_notification(token, payload)
            break
        except Exception, e:
            logging.warn("send notification exception:%s", str(e))
            apns_manager.remove_apns_connection(appid, sandbox)


def receive_p12_update_message():
    chan_rds = redis.StrictRedis(host=config.REDIS_HOST, port=config.REDIS_PORT, db=config.REDIS_DB)
    sub = chan_rds.pubsub()
    sub.subscribe("apns_update_p12_channel")
    for msg in sub.listen():
        if msg['type'] == 'message':
            data = msg['data']
            try:
                appid = int(data)
            except:
                logging.warn("invalid client id:%s", data)
                continue
            logging.info("update app:%s p12", appid)
            apns_manager.remove_apns_connection(appid, True)
            apns_manager.remove_apns_connection(appid, False)


def update_p12_thread():
    while True:
        try:
            receive_p12_update_message()
        except Exception, e:
            print_exception_traceback()



def print_exception_traceback():
    exc_type, exc_value, exc_traceback = sys.exc_info()
    logging.warn("exception traceback:%s", traceback.format_exc())


