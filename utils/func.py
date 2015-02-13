# -*- coding: utf-8 -*-
import re
import string
import urllib
import urlparse
import random
import base64
from itertools import izip, cycle
import logging
from logging.handlers import TimedRotatingFileHandler
import os


LETTERS = 0b001
DIGITS = 0b010
PUNCTUATION = 0b100

LOGGERS = {}


def valid_email(email):
    email = str(email)
    if len(email) > 7:
        pattern = r"[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
        if re.match(pattern, email) is not None:
            return True

    return False


def random_ascii_string(length, mask=None):
    if mask is None:
        mask = LETTERS | DIGITS

    unicode_ascii_characters = ''
    if mask & LETTERS:
        unicode_ascii_characters += string.ascii_letters.decode('ascii')
    if mask & DIGITS:
        unicode_ascii_characters += string.digits.decode('ascii')
    if mask & PUNCTUATION:
        unicode_ascii_characters += string.punctuation.decode('ascii')

    if not unicode_ascii_characters:
        return ''

    rnd = random.SystemRandom()
    return ''.join([rnd.choice(unicode_ascii_characters) for _ in xrange(length)])


def url_query_params(url):
    """
    从特定的url中提取出query string字典
    """
    return dict(urlparse.parse_qsl(urlparse.urlparse(url).query, True))


def url_dequery(url):
    """
    去掉url中query string
    """
    url = urlparse.urlparse(url)
    return urlparse.urlunparse((url.scheme,
                                url.netloc,
                                url.path,
                                url.params,
                                '',
                                url.fragment))


def build_url(base, additional_params=None):
    """
    url中增加query string参数
    """
    url = urlparse.urlparse(base)
    query_params = {}
    query_params.update(urlparse.parse_qsl(url.query, True))
    if additional_params is not None:
        query_params.update(additional_params)
        for k, v in additional_params.iteritems():
            if v is None:
                query_params.pop(k)

    return urlparse.urlunparse((url.scheme,
                                url.netloc,
                                url.path,
                                url.params,
                                urllib.urlencode(query_params),
                                url.fragment))


def xor_crypt_string(data, key, encode=False, decode=False):
    if decode:
        missing_padding = 4 - len(data) % 4
        if missing_padding:
            data += b'=' * missing_padding
        data = base64.decodestring(data)
    xored = ''.join(chr(ord(x) ^ ord(y)) for (x, y) in izip(data, cycle(key)))
    if encode:
        return base64.encodestring(xored).strip().strip('=')
    return xored


def init_logger(name):
    log_dir = getattr(init_logger, 'log_dir', None)
    log_formatter = logging.Formatter('%(levelname)s %(asctime)s %(name)s %(funcName)s %(lineno)d: %(message)s')

    if not log_dir:
        if 'stdout' not in LOGGERS:
            LOGGERS['stdout'] = logger = logging.getLogger()
            stream_handler = logging.StreamHandler()
            stream_handler.setFormatter(log_formatter)
            logger.addHandler(stream_handler)
            logger.setLevel(logging.DEBUG)

        return LOGGERS['stdout']

    logger = LOGGERS.get(name)
    if logger is not None:
        return logger

    if name is None:
        logfile_name = 'root'
    else:
        logfile_name = name

    file_handler = TimedRotatingFileHandler(
        os.path.join(log_dir, logfile_name),
        'midnight', 1, 15)
    file_handler.suffix = '%Y%m%d'
    file_handler.setFormatter(log_formatter)
    file_handler.setLevel(logging.DEBUG)
    logger = logging.getLogger(name)
    logger.addHandler(file_handler)
    logger.setLevel(logging.DEBUG)

    LOGGERS[name] = logger

    return logger


COUNTRY_ZONE = ('86',)


def parse_mobile(mobile_str):
    match = re.findall(r'^(\+({0}))?(\d+)$'.format('|'.join(COUNTRY_ZONE)), mobile_str)
    if match:
        zone, mobile = match[0][-2:]
        if '+' in mobile_str and not zone:
            return None
        if not zone:
            zone = '86'
        return valid_mobile(zone, mobile)
    return None


def valid_mobile(mobile_zone, mobile):
    if mobile_zone == '86' and re.match(r'^1\d{10}$', mobile) is not None:
        return mobile_zone, mobile

    return None
