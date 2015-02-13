# -*- coding: utf-8 -*-
""" 程序入口
"""
import config

# 无阻塞httplib, urllib, requests
# import geventhttpclient.httplib
# geventhttpclient.httplib.patch()

from flask import Flask, json, render_template, send_from_directory
from main import init_app
from utils.sentry import Sentry
import markdown
import os
import demo

app = Flask(__name__)
app.config.from_object(config)
if not app.debug:
    app.use_x_sendfile = True

app.register_blueprint(demo.app)

@app.route('/')
def index():
    return render_template('index.html')


@app.route('/favicon.ico')
def favicon():
    return send_from_directory(app.root_path,
                               'favicon.ico', mimetype='image/vnd.microsoft.icon')


@app.route('/doc')
def doc():
    with open(os.path.join(config.APP_ROOT, 'README.md')) as f:
        return markdown.markdown(f.read().decode('utf8'))


@app.route("/site_map")
def site_map():
    func_list = {}
    for rule in app.url_map.iter_rules():
        if rule.endpoint != 'static':
            func_list[rule.rule] = app.view_functions[rule.endpoint].__doc__
    return json.dumps(func_list)


init_app(app)
Sentry.init_app(app)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8083, debug=True)
