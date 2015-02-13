import struct
from socket import socket, timeout, AF_INET, SOCK_STREAM
from socket import error as socket_error
import socket as msocket
import sys
import ssl
try:
    from ssl import wrap_socket, SSLError
except ImportError:
    from socket import ssl as wrap_socket, sslerror as SSLError

from _ssl import SSL_ERROR_WANT_READ, SSL_ERROR_WANT_WRITE

NOTIFICATION_COMMAND = "\x00"
ENHANCED_NOTIFICATION_COMMAND = "\x01"

class Notification:
    def __init__(self):
        self.token = ""
        self.payload = ""

    def to_data(self):
        p = struct.pack("!h32sh", 32, self.token, len(self.payload))
        return p + self.payload
    

class EnhancedNotification:
    def __init__(self):
        self.identifier = 0
        self.expiry = 0
        self.token = ""
        self.payload = ""

    def to_data(self):
        p = struct.pack("!iih32sh", self.identifier, self.expiry, 32, self.token, len(self.payload))
        return p + self.payload

def set_socket_keepalive(sock):
    sock.setsockopt(msocket.SOL_SOCKET, msocket.SO_KEEPALIVE, 1)
    if sys.platform.find("linux") == 0:
        after_idle_sec=10*60
        interval_sec=10*60
        max_fails=3
        sock.setsockopt(msocket.IPPROTO_TCP, msocket.TCP_KEEPIDLE, after_idle_sec)
        sock.setsockopt(msocket.IPPROTO_TCP, msocket.TCP_KEEPINTVL, interval_sec)
        sock.setsockopt(msocket.IPPROTO_TCP, msocket.TCP_KEEPCNT, max_fails)

class Connection(object):
    """
    A generic connection class for communicating with the APNs
    """
    def __init__(self, cert_file=None, key_file=None, timeout=60):
        super(Connection, self).__init__()
        self.cert_file = cert_file
        self.key_file = key_file
        self.timeout = timeout
        self._socket = None
        self._ssl = None
        self.server = "gateway.push.gameservice.com"
        self.port = 6228

    def __del__(self):
        self._disconnect();

    def _connect(self):
        # Establish an SSL connection

        # Fallback for socket timeout.
        for i in xrange(3):
            try:
                self._socket = socket(AF_INET, SOCK_STREAM)
                self._socket.settimeout(self.timeout)
                self._socket.connect((self.server, self.port))
                set_socket_keepalive(self._socket)
                break
            except timeout:
                pass
            except:
                raise

        # Fallback for 'SSLError: _ssl.c:489: The handshake operation timed out'
        for i in xrange(3):
            try:
                self._ssl = wrap_socket(self._socket, self.key_file, self.cert_file, ssl_version=ssl.PROTOCOL_TLSv1)
                break
            except SSLError, ex:
                if ex.args[0] == SSL_ERROR_WANT_READ:
                    sys.exc_clear()
                elif ex.args[0] == SSL_ERROR_WANT_WRITE:
                    sys.exc_clear()
                else:
                    raise

    def _disconnect(self):
        if self._socket:
            self._socket.close()
            self._connection().close()

    def _connection(self):
        if not self._ssl:
            self._connect()
        return self._ssl

    def _reconnect(self):
        _logger.info("rebuilding connection to APNS")
        self._disconnect()
        self._connect()

    def read(self, n=None):
        return self._connection().read(n)

    def write(self, string):
        return self._connection().write(string)

