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


IM_URL = "http://127.0.0.1:23002"

ANDROID_APP_ID = 11035
ANDROID_APP_SECRET = 'HS5NVruwDJxFwUPEdzqo7gBrQCSFsIhA'

IOS_APP_ID = 11036
IOS_APP_SECRET = 'X608P9EM7BBsIA9Sx076SQQVmvK7KMhv'


