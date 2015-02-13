# -*- coding: utf-8 -*-
""" 接口加载器
包含相对路径import的python脚本不能直接运行，只能作为module被引用。
"""
from flask import g
from utils.func import init_logger
import logging
from config import APP_MODE
from utils.util import make_response

LOGGER = init_logger(__name__)


def response_meta_handler(response_meta):
    return response_meta.get_response()


def generic_error_handler(err):
    logging.exception(err)
    return make_response(status_code=500, msg='Server Internal Error!' if APP_MODE == 'Production' else str(err))


def app_teardown(exception):
    # 捕获teardown时的mysql异常
    try:
        mysql_instances = getattr(g, '_mysql_instances', None)
        if mysql_instances is not None:
            for mysql in mysql_instances.values():
                mysql.commit()
                mysql.close()
    except Exception:
        pass


# 初始化接口
def init_app(app):
    app.teardown_appcontext(app_teardown)
    app.register_error_handler(Exception, generic_error_handler)

    from .notify import notify

    # 注册接口
    app.register_blueprint(notify)