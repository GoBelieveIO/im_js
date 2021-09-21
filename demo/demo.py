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


import hashlib


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


def md5(s):
    return hashlib.md5(s.encode(encoding='utf8')).hexdigest()


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

def login(uid, uname, platform_id, device_id):
    url = config.IM_URL + "/auth/grant"
    obj = {"uid":uid, "user_name":uname}
    
    logging.debug("platform:%s device:%s", platform_id, device_id)
    if platform_id and device_id:
        obj['platform_id'] = platform_id
        obj['device_id'] = device_id

    secret = md5(config.APP_SECRET)

    basic = base64.b64encode((str(config.APP_ID) + ":" + secret).encode(encoding="utf8"))
    basic = basic.decode("utf-8")
    headers = {'Content-Type': 'application/json; charset=UTF-8',
               'Authorization': 'Basic ' + basic}
     
    res = requests.post(url, data=json.dumps(obj), headers=headers)
    if res.status_code != 200:
        return None
    obj = json.loads(res.text)
    return obj["data"]["token"]


@app.route("/login", methods=["POST"])
def login_session():
    sender = int(request.form['sender']) if 'sender' in request.form else 0
    receiver = int(request.form['receiver']) if 'receiver' in request.form else 0          

    if sender == 0 or receiver == 0:
        return error_html

    token = login(sender, '', None, None)
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
    sender = int(request.form['sender']) if 'sender' in request.form else 0
    receiver = int(request.form['receiver']) if 'receiver' in request.form else 0        

    if sender == 0 or receiver == 0:
        return error_html

    token = login(sender, '', None, None)
    if not token:
        return error_html

    response = flask.make_response(redirect(url_for('.customer_chat', sender=sender, receiver=receiver)))
    response.set_cookie('token', token)
    return response

@app.route('/customer')
def customer():
    return render_template('customer.html')


@app.route('/room/chat')
def room_chat():
    return render_template('room_chat.html', host=config.HOST)


@app.route('/room/login', methods=["POST"])
def room_login():
    sender = int(request.form['sender']) if 'sender' in request.form else 0
    receiver = int(request.form['receiver']) if 'receiver' in request.form else 0

    if sender == 0 or receiver == 0:
        return error_html

    token = login(sender, '', None, None)
    if not token:
        return error_html

    response = flask.make_response(redirect(url_for('.room_chat', sender=sender, receiver=receiver)))
    response.set_cookie('token', token)
    return response

@app.route('/room')
def room_index():
    return render_template('room_index.html')



@app.route('/group/chat')
def group_chat():
    return render_template('group_chat.html', host=config.HOST)


@app.route('/group/login', methods=["POST"])
def group_login():
    sender = int(request.form['sender']) if 'sender' in request.form else 0
    receiver = int(request.form['receiver']) if 'receiver' in request.form else 0    

    if sender == 0 or receiver == 0:
        return error_html

    token = login(sender, '', None, None)
    if not token:
        return error_html

    response = flask.make_response(redirect(url_for('.group_chat', sender=sender, receiver=receiver)))
    response.set_cookie('token', token)
    return response

@app.route('/group')
def group_index():
    return render_template('group_index.html')


@app.route('/voip')
def voip_chat():
    sender = int(request.args.get('sender')) if request.args.get('sender') else 0
    if not sender:
        return error_html

    token = login(sender, '', None, None)
    if not token:
        return error_html

    response = flask.make_response(render_template('voip_chat.html', host=config.HOST))
    response.set_cookie('token', token)
    return response

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(app.root_path,
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')


@app.route("/auth/token", methods=["POST"])
def access_token():
    if not request.data:
        return INVALID_PARAM()

    obj = json.loads(request.data)
    uid = obj.get("uid", None)
    user_name = obj.get("user_name", "")
    if not uid:
        return INVALID_PARAM()
    if int(uid) > 10000:
        return INVALID_PARAM()
    
    logging.debug("obj:%s", obj)
    token = login(uid, user_name, obj.get('platform_id'), obj.get('device_id'))
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

log = logging.getLogger('')
init_logger(log)
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001)
