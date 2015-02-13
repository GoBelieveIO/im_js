# -*- coding: utf-8 -*-
import time
import datetime
import flask
import json

DAY = 24 * 3600


def zero_of_day(ts):
    date = datetime.datetime.fromtimestamp(int(ts))
    return int(ts) - (date.hour * 3600 + date.minute * 60 + date.second)


def datetime_to_timestamp(dt):
    t = dt.timetuple()
    return int(time.mktime(t))


def timestamp_to_datetime(ts):
    return datetime.datetime.fromtimestamp(int(ts))


def date_to_timestamp(date):
    year, month, day = date[:4], date[4:6], date[6:8]
    dt = datetime.datetime(int(year), int(month), int(day))
    return datetime_to_timestamp(dt)


def make_response(status_code=200, code=None, data=None, msg=None, pagination=None):
    meta = {}
    if msg:
        meta["message"] = msg
    if code:
        meta["code"] = str(code)

    obj = {"meta": meta}
    if data is not None:
        obj["data"] = data

    if pagination is not None:
        obj["pagination"] = pagination

    res = flask.make_response(json.dumps(obj), status_code)
    res.headers['Content-Type'] = "application/json"
    return res
