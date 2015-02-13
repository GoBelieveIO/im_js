# -*- coding: utf-8 -*-
from flask import request, Blueprint
from functools import wraps
from base64 import b64decode
import pickle
import redis

from utils.util import make_response
from utils.mysql import get_mysql
import config

notify = Blueprint('notify', __name__, url_prefix='/notify')


def check_request(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # 采用IP限制
        # print request.remote_addr
        if config.ALLOW_IP and request.remote_addr not in config.ALLOW_IP:
            return make_response(status_code=403, msg='Forbidden')
        return f(*args, **kwargs)

    return decorated_function


@notify.route('', methods=['POST'])
@check_request
def add_rule():
    req = request.json.get('data', '')
    data = pickle.loads(b64decode(req))
    client_id = data.get('client_id')
    res = save_data(data.get('db', {}))
    if res is True:
        if client_id != 0:
            if send(client_id):
                return make_response()
            else:
                return make_response(status_code=500, msg="send notice fail")
        else:
            return make_response()
    else:
        return make_response(status_code=500, msg="update db fail")


def save_data(data):
    if data:
        mysql = get_mysql(config.MYSQL)
        mysql.begin()
        for table, rows in data.iteritems():
            if isinstance(rows, list):
                for row in rows:
                    save(mysql, table, row)
            else:
                save(mysql, table, rows)

        mysql.commit()
    return True


def save(mysql, table, data):
    """ 保存对象

    :return:
    :rtype:
    """
    print data
    keys = data.keys()
    values = data.values()

    sql = "REPLACE INTO %s (%s) VALUES (%s)" % (
        mysql.escape_table(table), ','.join(keys), ','.join(['%s'] * len(keys)))

    if sql:
        mysql.execute(sql=sql, args=values)


def send(client_id):
    chan_rds = redis.StrictRedis(host=config.REDIS_HOST,
                                 port=config.REDIS_PORT,
                                 db=config.REDIS_DB,
                                 password=config.REDIS_PASSWORD)
    chan_rds.publish("apns_update_p12_channel", client_id)
    return True
