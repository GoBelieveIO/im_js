# -*- coding: utf-8 -*-
"""
"""
from flask import g
from umysql import ResultSet, Connection, Error
import socket
import re
from .func import init_logger

LOGGER = init_logger(__name__)


class MysqlError(Exception):
    pass


class Cursor(object):
    """
    umysql 执行结果代理
    """

    def __init__(self, result_set):
        self.rowcount = 0
        self.lastrowid = 0
        self.fields = None
        self.rows = None

        if isinstance(result_set, tuple):
            self.rowcount, self.lastrowid = result_set
        elif isinstance(result_set, ResultSet):
            self.rows = result_set.rows
            self.fields = [rs_field[0] for rs_field in result_set.fields]
            self.rowcount = len(self.rows)

    def __len__(self):
        return self.rowcount > 0

    def fetchone(self):
        """
        记录将组装成字典，如果select的时候字段为table1.id,table2.id将会导致重复的键，不适用此方法获取
        """
        if self.rows is not None and self.rowcount > 0:
            data = zip(self.fields, self.rows[0])
            return dict(data)

        return None

    def fetchall(self):
        """
        记录将组装成字典，如果select的时候字段为table1.id,table2.id将会导致重复的键，不适用此方法获取
        """
        if self.rows is not None:
            for row in self.rows:
                data = zip(self.fields, row)
                yield dict(data)

        else:
            raise StopIteration()


class Mysql(object):
    ESCAPE_REGEX = re.compile(r"[\0\n\r\032\'\"\\]")
    ESCAPE_MAP = {'\0': '\\0', '\n': '\\n', '\r': '\\r', '\032': '\\Z',
                  '\'': '\\\'', '"': '\\"', '\\': '\\\\'}

    _instances = {}

    @classmethod
    def instance(cls, *config):
        if cls._instances.get(config) is None:
            cls._instances[config] = cls(*config)

        return cls._instances.get(config)

    def __init__(self, *config):
        """
        :param host
        :param port
        :param user
        :param password
        :param db
        :param auto_commit
        :param charset
        """
        self._conn = Connection()
        self._config = config

    @property
    def conn(self):
        if not self._conn.is_connected():
            try:
                self._conn.connect(*self._config)
            except socket.gaierror:
                raise MysqlError('cannot resolve hostname')
            except socket.error:
                raise MysqlError('cannot connect to mysql')
        return self._conn

    def execute(self, sql, args=None):
        evt = {
            'sql': sql,
            'args': args
        }
        LOGGER.debug("sql_execute:{}".format(evt))

        if not isinstance(args, (tuple, list, set)):
            args = (args,)
        try:
            query = self.conn.query(sql, args)
        except (socket.error, Error), e:
            LOGGER.info("connection error:{}".format(e))
            self._conn = Connection()
            query = self.conn.query(sql, args)

        if query:
            return Cursor(query)
        else:
            return None

    def rows_found(self):
        result = Cursor(self.conn.query('SELECT FOUND_ROWS() AS rows_found'))
        row = result.fetchone()

        if row:
            return row['rows_found']

        return 0

    def escape_string(self, raw_str):
        if isinstance(raw_str, unicode):
            raw_str = raw_str.encode('utf8')

        return ("%s" % (self.ESCAPE_REGEX.sub(
            lambda match: self.ESCAPE_MAP.get(match.group(0)), raw_str),))

    @staticmethod
    def escape_table(table_name):
        return "`{}`".format(table_name)

    def begin(self):
        self.conn.query("BEGIN")

    def commit(self):
        if self._conn.is_connected():
            self._conn.query("COMMIT")

    def rollback(self):
        if self._conn.is_connected():
            self._conn.query("ROLLBACK")

    def close(self):
        if self._conn.is_connected():
            self._conn.close()


def get_mysql(cnf):
    if g:
        # http请求每个连接共用一个mysql连接
        mysql_instances = getattr(g, '_mysql_instances', None)
        if mysql_instances is None:
            mysql_instances = g._mysql_instances = {}

        mysql = mysql_instances.get(cnf)

        if mysql is None:
            mysql = mysql_instances[cnf] = Mysql(*cnf)
    else:
        # 全局共用一个mysql实例
        mysql = Mysql.instance(*cnf)

    return mysql