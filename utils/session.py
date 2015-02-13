"""
SESSION_COOKIE_NAME = 'sid_dev'
SESSION_COOKIE_DOMAIN = 'dev.developers.gameservice.com'
SESSION_COOKIE_PATH = '/'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False
PERMANENT_SESSION_LIFETIME = 7200

SESSION_KEY_PREFIX = 'session:gameservice:developers:'
SESSION_REDIS_HOST = '127.0.0.1'
SESSION_REDIS_PORT = 6379
SESSION_REDIS_DB = 0
SESSION_REDIS_PASSWORD = None
"""
import pickle
from uuid import uuid4
from redis import Redis
from werkzeug.datastructures import CallbackDict
from flask.sessions import SessionInterface, SessionMixin


class ServerSideSession(CallbackDict, SessionMixin):
    def __init__(self, initial=None, sid=None):
        def on_update(sess):
            sess.modified = True

        CallbackDict.__init__(self, initial, on_update)
        self.sid = sid
        self.permanent = True
        self.modified = False


class RedisSession(SessionInterface):
    """Uses the Redis key-value store as a session backend.

    :param redis: A ``redis.Redis`` instance.
    :param key_prefix: A prefix that is added to all Redis store keys.
    """

    serializer = pickle
    session_class = ServerSideSession

    def __init__(self, redis, key_prefix):
        self.redis = redis
        self.key_prefix = key_prefix

    @classmethod
    def init_app(cls, app):
        redis = Redis(host=app.config.get('SESSION_REDIS_HOST', '172.25.1.111'),
                      port=app.config.get('SESSION_REDIS_PORT', 6379),
                      db=app.config.get('SESSION_REDIS_DB', 0),
                      password=app.config.get('SESSION_REDIS_PASSWORD'),
                      retry_on_timeout=True)
        app.session_interface = cls(redis, app.config.get('SESSION_KEY_PREFIX', 'session:'))

    @staticmethod
    def _generate_sid():
        return str(uuid4())

    def open_session(self, app, request):
        sid = request.cookies.get(app.session_cookie_name)
        if not sid:
            sid = self._generate_sid()
            return self.session_class(sid=sid)

        val = self.redis.get(self.key_prefix + sid)
        if val is not None:
            try:
                data = self.serializer.loads(val)
                return self.session_class(data, sid=sid)
            except:
                return self.session_class(sid=sid)

        return self.session_class(sid=sid)

    def save_session(self, app, session, response):
        domain = self.get_cookie_domain(app)
        path = self.get_cookie_path(app)
        if not session:
            if session.modified:
                self.redis.delete(self.key_prefix + session.sid)
                response.delete_cookie(app.session_cookie_name,
                                       domain=domain, path=path)
            return

        # Modification case.  There are upsides and downsides to
        # emitting a set-cookie header each request.  The behavior
        # is controlled by the :meth:`should_set_cookie` method
        # which performs a quick check to figure out if the cookie
        # should be set or not.  This is controlled by the
        # SESSION_REFRESH_EACH_REQUEST config flag as well as
        # the permanent flag on the session itself.
        # if not self.should_set_cookie(app, session):
        #    return

        http_only = self.get_cookie_httponly(app)
        secure = self.get_cookie_secure(app)
        expires = self.get_expiration_time(app, session)
        val = self.serializer.dumps(dict(session))
        self.redis.setex(self.key_prefix + session.sid, val,
                         int(app.permanent_session_lifetime.total_seconds()))
        response.set_cookie(app.session_cookie_name, session.sid,
                            expires=expires, httponly=http_only,
                            domain=domain, path=path, secure=secure)


if __name__ == '__main__':
    from flask import Flask, session

    app = Flask(__name__)
    RedisSession.init_app(app)

    @app.route('/')
    def index():
        session['test'] = {"test": "test"}
        return 'set session ok'

    @app.route('/dump')
    def dump():
        print session
        return 'dump session ok'

    with app.test_client() as c:
        print c.get('/')
        print c.get('/dump')