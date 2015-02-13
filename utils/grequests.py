# -*- coding: utf-8 -*-

"""
requests
~~~~~~~~~~~~

This module implements the Requests API.

"""
from geventhttpclient import HTTPClient
from requests import PreparedRequest, Response
from requests.packages.urllib3.util import parse_url
from requests.utils import get_encoding_from_headers
from requests.cookies import extract_cookies_to_jar
from requests.structures import CaseInsensitiveDict
import ssl


class Session(object):

    timeout = 30

    def request(self, method, url, **kwargs):
        """
            :param method: method for the new :class:`HTTPClient` object.
            :param url: URL for the new :class:`HTTPClient` object.
            :param params: (optional) Dictionary, or bytes to send in the url.
            :param data: (optional) Dictionary, bytes, or file-like object to send in the body.
            :param headers: (optional) Dictionary of HTTP Headers to send with the :class:`HTTPClient`.
            :param timeout: (optional) Float describing the timeout of the HTTPClient.
            :param verify: (optional) if ``True``, the SSL cert will be verified. A CA_BUNDLE path can also be provided.
            :param cert: (optional) if String, path to ssl client cert file (.pem).
        """
        params = kwargs.get('params', {})
        data = kwargs.get('data', b"")
        headers = kwargs.get('headers', {})
        files = kwargs.get('files', [])
        hooks = kwargs.get('hooks', {})
        stream = kwargs.get('stream', False)

        p = PreparedRequest()
        p.prepare(method=method, url=url, headers=headers, data=data, params=params, files=files, hooks=hooks)

        # 设置默认超时时间
        timeout = kwargs.get('timeout', self.timeout)

        # 使用requests的parse_url, geventhttpclient.url的URL会把url中的空参数过滤掉
        url_parse = parse_url(p.url)

        if url_parse.scheme == 'https':
            ssl_options = {
                'ssl_version': ssl.PROTOCOL_TLSv1,
            }
            if 'cert' in kwargs:
                ssl_options.update({'ca_certs': kwargs['cert']})
            insecure = not kwargs.get('verify', True)
        else:
            # 非HTTPS请求忽略SSL相关参数
            ssl_options = None
            insecure = False

        http = HTTPClient(host=url_parse.host, port=url_parse.port, ssl_options=ssl_options,
                          insecure=insecure,
                          connection_timeout=timeout, network_timeout=timeout)

        resp = http.request(p.method, url_parse.request_uri, body=p.body, headers=p.headers)

        r = self.build_response(p, resp)
        if not stream:
            r.content
        return r

    def build_response(self, req, resp):
        """Builds a :class:`Response <requests.Response>` object from a urllib3
        response. This should not be called from user code, and is only exposed
        for use when subclassing the
        :class:`HTTPAdapter <requests.adapters.HTTPAdapter>`

        :param req: The :class:`PreparedRequest <PreparedRequest>` used to generate the response.
        :param resp: The urllib3 response object.
        """
        response = Response()

        # Fallback to None if there's no status_code, for whatever reason.
        response.status_code = resp.get_code()
        headers = dict(resp.headers)
        # Make headers case-insensitive.
        response.headers = CaseInsensitiveDict(headers)

        # Set encoding.
        response.encoding = get_encoding_from_headers(headers)
        response.raw = resp
        response.reason = ''

        if isinstance(req.url, bytes):
            response.url = req.url.decode('utf-8')
        else:
            response.url = req.url

        # Add new cookies from the server.
        extract_cookies_to_jar(response.cookies, req, resp)

        # Give the Response some context.
        response.request = req
        response.connection = self

        return response


def request(method, url, **kwargs):
    """Constructs and sends a :class:`Request <Request>`.
    Returns :class:`Response <Response>` object.

    :param method: method for the new :class:`Request` object.
    :param url: URL for the new :class:`Request` object.
    :param params: (optional) Dictionary or bytes to be sent in the query string for the :class:`Request`.
    :param data: (optional) Dictionary, bytes, or file-like object to send in the body of the :class:`Request`.
    :param headers: (optional) Dictionary of HTTP Headers to send with the :class:`Request`.
    :param cookies: (optional) Dict or CookieJar object to send with the :class:`Request`.
    :param files: (optional) Dictionary of 'name': file-like-objects (or {'name': ('filename', fileobj)}) for multipart encoding upload.
    :param auth: (optional) Auth tuple to enable Basic/Digest/Custom HTTP Auth.
    :param timeout: (optional) Float describing the timeout of the request in seconds.
    :param allow_redirects: (optional) Boolean. Set to True if POST/PUT/DELETE redirect following is allowed.
    :param proxies: (optional) Dictionary mapping protocol to the URL of the proxy.
    :param verify: (optional) if ``True``, the SSL cert will be verified. A CA_BUNDLE path can also be provided.
    :param stream: (optional) if ``False``, the response content will be immediately downloaded.
    :param cert: (optional) if String, path to ssl client cert file (.pem). If Tuple, ('cert', 'key') pair.

    Usage::

      >>> from utils import grequests as requests
      >>> req = requests.request('GET', 'http://httpbin.org/get')
      >>> print req
      <Response [200]>
    """

    session = Session()
    return session.request(method=method, url=url, **kwargs)


def get(url, **kwargs):
    """Sends a GET request. Returns :class:`Response` object.

    :param url: URL for the new :class:`Request` object.
    :param \*\*kwargs: Optional arguments that ``request`` takes.
    """

    kwargs.setdefault('allow_redirects', True)
    return request('get', url, **kwargs)


def post(url, data=None, **kwargs):
    """Sends a POST request. Returns :class:`Response` object.

    :param url: URL for the new :class:`Request` object.
    :param data: (optional) Dictionary, bytes, or file-like object to send in the body of the :class:`Request`.
    :param \*\*kwargs: Optional arguments that ``request`` takes.
    """

    return request('post', url, data=data, **kwargs)


def put(url, data=None, **kwargs):
    """Sends a PUT request. Returns :class:`Response` object.

    :param url: URL for the new :class:`Request` object.
    :param data: (optional) Dictionary, bytes, or file-like object to send in the body of the :class:`Request`.
    :param \*\*kwargs: Optional arguments that ``request`` takes.
    """

    return request('put', url, data=data, **kwargs)


def patch(url, data=None, **kwargs):
    """Sends a PATCH request. Returns :class:`Response` object.

    :param url: URL for the new :class:`Request` object.
    :param data: (optional) Dictionary, bytes, or file-like object to send in the body of the :class:`Request`.
    :param \*\*kwargs: Optional arguments that ``request`` takes.
    """

    return request('patch', url,  data=data, **kwargs)


def delete(url, **kwargs):
    """Sends a DELETE request. Returns :class:`Response` object.

    :param url: URL for the new :class:`Request` object.
    :param \*\*kwargs: Optional arguments that ``request`` takes.
    """

    return request('delete', url, **kwargs)