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

MYSQL_HOST = "172.25.1.111"
MYSQL_PORT = 3306
MYSQL_AUTOCOMMIT = True
MYSQL_CHARSET = 'utf8'

# 游戏中心数据库
MYSQL_USER = "ngds_user"
MYSQL_PASSWD = "ngds_user.mysql"
MYSQL_DATABASE = "im"

REDIS_HOST = "172.25.1.111"
REDIS_PORT = 6379
REDIS_DB = 5
REDIS_PASSWORD = None

# 日志目录
LOG_DIR = '/data/logs/im.gameservice.com'

# host,port,user,password,db,auto_commit,charset
MYSQL = (MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWD, MYSQL_DATABASE, MYSQL_AUTOCOMMIT, MYSQL_CHARSET)
# 默认数据库

APP_MODE = 'Production'


# -- celery --#
# format redis://:password@hostname:port/db_number
if REDIS_PASSWORD:
    BROKER_URL = 'redis://:%s@%s:%s/6' % (REDIS_PASSWORD, REDIS_HOST, REDIS_PORT)
else:
    BROKER_URL = 'redis://%s:%s/6' % (REDIS_HOST, REDIS_PORT)

CELERY_RESULT_BACKEND = BROKER_URL

CELERY_TIMEZONE = 'Asia/Shanghai'
CELERY_ENABLE_UTC = False

CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_ACCEPT_CONTENT = ['json']

ALLOW_IP = []

SENTRY_DSN = 'http://4ad309a577dc4f34adf0b5310c25088e:2c485b993f5547ada28bf6d523da017e@101.71.44.39:9000/5'