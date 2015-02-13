# -*- coding: utf-8 -*-
"""使用
from flask import current_app
sentry = current_app.extensions.get('sentry')
sentry.captureException()
sentry.captureMessage('hello, world!')
"""

import os
import logging

try:

    from raven.contrib.flask import Sentry as _Sentry

except ImportError:
    pass


class Sentry(object):
    @classmethod
    def init_app(cls, app):
        sentry_dsn = app.config.get('SENTRY_DSN', os.getenv('SENTRY_DSN'))
        if '_Sentry' in globals() and sentry_dsn != '':
            state = _Sentry(app, dsn=sentry_dsn,
                            logging=True, level=logging.ERROR)

            app.extensions = getattr(app, 'extensions', {})
            app.extensions['sentry'] = state
            return state
        return None


