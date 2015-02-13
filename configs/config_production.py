# -*- coding: utf-8 -*-
"""
http://flask.pocoo.org/docs/config/
"""
import os

APP_ROOT = os.path.dirname(os.path.abspath(__file__))

DEBUG = True
TESTING = True
SECRET_KEY = 'nN<]9Ss32b%GCc,T8q*.^+65A47@=)'
TOKEN_SALT = '20140606'

MAX_CONTENT_LENGTH = 67108864

TIMEOUT = 30

MYSQL_HOST = "127.0.0.1"
MYSQL_PORT = 3306
MYSQL_AUTOCOMMIT = True
MYSQL_CHARSET = 'utf8'

# 游戏中心数据库
MYSQL_GC_DATABASE = "smart_push"
MYSQL_GC_USER = "ngds_push"
MYSQL_GC_PASSWD = "7F9tnQPqZCQs"

REDIS_HOST = "127.0.0.1"
REDIS_PORT = 6379
REDIS_DB = 0
REDIS_PASSWORD = None

# 日志目录
LOG_DIR = '/data/logs/im.gameservice.com'

# host,port,user,password,db,auto_commit,charset
MYSQL_GC = (MYSQL_HOST, MYSQL_PORT, MYSQL_GC_USER, MYSQL_GC_PASSWD, MYSQL_GC_DATABASE, MYSQL_AUTOCOMMIT, MYSQL_CHARSET)
# 默认数据库
MYSQL = MYSQL_GC

APP_MODE = 'Production'

ALLOW_IP = []

SENTRY_DSN = ''

NAME = "测试"

ANDROID_APP_ID = 8
ANDROID_APP_SECRET = 'sVDIlIiDUm7tWPYWhi6kfNbrqui3ez44'

IOS_APP_ID = 9
IOS_APP_SECRET = '0WiCxAU1jh76SbgaaFC7qIaBPm2zkyM1'

URL = 'http://dev.api.gameservice.com:8000/push-v1'
CONTENT = "您收到一条新信息，快来看看吧。"
