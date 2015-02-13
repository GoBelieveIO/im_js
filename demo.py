# -*- coding: utf-8 -*-

from flask import request, Blueprint
from flask import Flask
from flask import g
from functools import wraps
import flask
import random
import md5
import json
import logging
import sys
import os
import redis
import base64
import requests
import config


app = Blueprint('demo', __name__)


def INVALID_PARAM():
    e = {"error":"非法输入"}
    return make_response(400, e)

def LOGIN_FAIL():
    e = {"error":"登陆失败"}
    return make_response(400, e)

def  FORBIDDEN():
    e = {"error":"forbidden"}
    return make_response(403, e)

def make_response(status_code, data = None):
    if data:
        res = flask.make_response(json.dumps(data), status_code)
        res.headers['Content-Type'] = "application/json"
    else:
        res = flask.make_response("", status_code)

    return res


def login(uid, uname):
    url = config.IM_URL + "/auth/grant"
    obj = {"uid":uid, "user_name":uname}
    basic = base64.b64encode(str(config.ANDROID_APP_ID) + ":" + config.ANDROID_APP_SECRET)
    headers = {'Content-Type': 'application/json; charset=UTF-8',
               'Authorization': 'Basic ' + basic}
     
    res = requests.post(url, data=json.dumps(obj), headers=headers)
    if res.status_code != 200:
        return None
    obj = json.loads(res.text)
    return obj["token"]

@app.route("/auth/token", methods=["POST"])
def access_token():
    if not request.data:
        return INVALID_PARAM()

    obj = json.loads(request.data)
    uid = obj["uid"] if obj.has_key("uid") else None
    user_name = obj["user_name"] if obj.has_key("user_name") else ""
    if not uid:
        return INVALID_PARAM()

    token = login(uid, user_name)
    if not token:
        return LOGIN_FAIL()

    obj = {"token":token}
    return make_response(200, obj)

def init_logger(logger):
    root = logger
    root.setLevel(logging.DEBUG)

    ch = logging.StreamHandler(sys.stdout)
    ch.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(filename)s:%(lineno)d -  %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    root.addHandler(ch)    

if __name__ == '__main__':
    log = logging.getLogger('')
    init_logger(log)
    app.run(host="0.0.0.0", port=8080)
