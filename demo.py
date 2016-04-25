# -*- coding: utf-8 -*-

from flask import request, Blueprint, redirect, url_for
from flask import render_template, send_from_directory
from flask import Flask
from flask import Response
from flask import g
import flask
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


app = Flask(__name__)
app.debug = config.DEBUG


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

error_html = """<!DOCTYPE html>
<html>
<head>
<title>Chat Demo</title>
</head>
<body>


<p>error.</p>

</body>
</html>"""

def login(uid, uname):
    url = config.IM_URL + "/auth/grant"
    obj = {"uid":uid, "user_name":uname}
    
    m = md5.new(config.APP_SECRET)
    secret = m.hexdigest()

    basic = base64.b64encode(str(config.APP_ID) + ":" + secret)
    headers = {'Content-Type': 'application/json; charset=UTF-8',
               'Authorization': 'Basic ' + basic}
     
    res = requests.post(url, data=json.dumps(obj), headers=headers)
    if res.status_code != 200:
        print res
        return None
    obj = json.loads(res.text)
    return obj["data"]["token"]


@app.route("/login", methods=["POST"])
def login_session():
    sender = int(request.form['sender']) if request.form.has_key('sender') else 0
    receiver = int(request.form['receiver']) if request.form.has_key('receiver') else 0

    if sender == 0 or receiver == 0:
        return error_html

    token = login(sender, '')
    if not token:
        return error_html

    response = flask.make_response(redirect(url_for('.chat', sender=sender, receiver=receiver)))
    response.set_cookie('token', token)
    return response


@app.route("/chat")
def chat():
    return render_template('chat.html', host=config.HOST)

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/customer/chat')
def customer_chat():
    return render_template('customer_chat.html', host=config.HOST)

@app.route('/customer/login', methods=["POST"])
def customer_login():
    sender = int(request.form['sender']) if request.form.has_key('sender') else 0
    receiver = int(request.form['receiver']) if request.form.has_key('receiver') else 0

    if sender == 0 or receiver == 0:
        return error_html

    token = login(sender, '')
    if not token:
        return error_html

    response = flask.make_response(redirect(url_for('.customer_chat', sender=sender, receiver=receiver)))
    response.set_cookie('token', token)
    return response

@app.route('/customer')
def customer():
    return render_template('customer.html')


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(app.root_path,
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')


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
    app.run(host="0.0.0.0", port=5001)
