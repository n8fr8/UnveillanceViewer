import requests, signal, sys, re, os, hashlib, base64, json
from Crypto.Cipher import AES
from Crypto import Random

import tornado.ioloop
import tornado.web
import tornado.httpserver
from mako.template import Template

from conf import cert_file, key_file, auth_root, uurl, assets_path

def terminationHandler(signal, frame):
	sys.exit(0)

def encrypt(plaintext, password, iv=None, p_salt=None):
	if p_salt is not None:
		password = password + p_salt
		
	if iv is None:
		iv = Random.new().read(AES.block_size)
	else:
		iv = iv.decode('hex')
			
	aes = AES.new(
		hashlib.md5(password).hexdigest(), 
		AES.MODE_CBC,
		iv
	)
	
	ciphertext = {
		'iv' : iv.encode('hex'),
		'data' : aes.encrypt(pad(json.dumps(plaintext))).encode('hex')
	}
	
	return base64.b64encode(json.dumps(ciphertext))

def pad(plaintext):
	pad = len(plaintext) % AES.block_size
	
	if pad != 0:
		pad_from = len(plaintext) - pad
		pad_size = (pad_from + AES.block_size) - len(plaintext)
		plaintext = "".join(["*" for x in xrange(pad_size)]) + plaintext
	
	return plaintext

def unpad(plaintext):
	return plaintext[plaintext.index("{"):]
	
def decrypt(ciphertext, password, iv=None, p_salt=None):
	try:
		ct_json = json.loads(base64.b64decode(ciphertext))
		print ct_json
		
		ciphertext = ct_json['data'].decode('hex')

		if p_salt is not None:
			password = password + p_salt
		if iv is None:
			iv = ct_json['iv'].decode('hex')
		else:
			private_iv.decode('hex')

		aes = AES.new(
			hashlib.md5(password).hexdigest(),
			AES.MODE_CBC,
			iv
		)
		
		cookie_data = json.loads(unpad(aes.decrypt(ciphertext)))
		if cookie_data['username']:
			return cookie_data
	except KeyError as e:
		print e
	except ValueError as e:
		print e
		
	return None	

class PingHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def get(self):
		try:
			r = requests.get(uurl)	
			self.write(r.text)
		except requests.exceptions.ConnectionError as e:
			print e
			self.write({'result':404})
		
		self.finish()

class RouteHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def getStatus(self):
		# if you have a NO_ACCESS cookie, well, that's too bad
		try:
			for cookie in self.request.cookies:
				if cookie == "unveillance_":
					return 0
		except KeyError as e:
			pass
	
		access = self.get_secure_cookie(cookie_tag)
		if access is not None:
			return 2

		return 1
			
	def initialize(self, route):
		self.route = route

	def get(self, route):
		status = self.getStatus()
		if route is not None:
			url = "%s%s" % (uurl, route)
		else:
			url = "%ssubmissions/" % uurl
		print url	
		format = None
		q_string = self.request.query
		
		if q_string != "":
			for kvp in self.request.query.split("&"):
				key_val = kvp.split("=")
				if key_val[0] == "format":
					format = key_val[1]
					q_string = q_string.replace("format=%s" % key_val[1], "")
					break
		
			if not q_string.startswith("?"):
				q_string = "?%s" % q_string
			
			if re.search(r'^\?&.*', q_string):
				q_string = q_string.replace("?&","?")
			
			if q_string == "?":
				q_string = ""
		
		if status == 0 and len(q_string) > 0:
			self.redirect('/')
			self.finish()
			return
		
		try:
			r = requests.get("%s%s" % (url, q_string))
		except requests.exceptions.ConnectionError as e:
			error_tmpl = Template(filename="%s/layout/error_no_api.html" % static_path)
			self.finish(main_layout.render(
				template_content=error_tmpl.render(),
				data={},
				authentication_holder=''
			))
			return
			
		if format:
			self.write(r.text.replace(assets_path, ""))
		else:
			if route is not None:
				route = route.split("/")
				route[:] = [word for word in route if word != '']
				
				if len(route) >= 3 and route[0] == "submission" and route[2] in media_routes:
					if route[2] == media_routes[0]:
						self.finish(r.text.replace(assets_path, ""))
					elif route[2] == media_routes[1]:
						self.set_header("Content-Type", r.headers['content-type'])
						self.finish(r.content)
					return
				
				layout = route[0]
				
			else:
				layout = "main"

			auth_layout = None
			if status == 1:
				auth_layout = "login_ctrl"
			elif status == 2:
				auth_layout = "search_ctrl"
			
			tmpl = Template(filename="%s/layout/%s.html" % (static_path, layout))

			authentication_holder = ''
			if status != 0:
				auth_tmpl = Template(filename="%s/layout/authentication/%s.html" % (static_path, auth_layout))
				authentication_holder = auth_tmpl.render()
			
			data = json.loads(r.text.replace(assets_path, ""))
			self.finish(main_layout.render(
				template_content=tmpl.render(),
				authentication_holder=authentication_holder,
				data=json.dumps(data)
			))

class LeafletHandler(tornado.web.RequestHandler):
	def initialize(self, route):
		self.route = route
	
	def get(self, route):
		r = requests.get("http://cdn.leafletjs.com/leaflet-0.6.4/%s" % route)
		self.finish(r.content)

class LoginHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def post(self):
		print "LOG IN REQUEST"
		
		username = None
		password = None
		
		credentials = self.request.body
		for kvp in credentials.split("&"):
			kv = kvp.split("=")
			if kv[0] == "username":
				username = kv[1]
			elif kv[0] == "password":
				password = kv[1]
		
		if username is None or password is None:
			self.write({'ok':False})
			self.finish()
		
		auth = "%s.txt" % hashlib.sha1(username + file_salt).hexdigest()
		print auth
		
		# if this file exists,
		try:
			f = open(os.path.join(auth_root, auth), 'rb')
			ciphertext = f.read()
			f.close()
			
			# decrypt it using supplied password.
			plaintext = decrypt(ciphertext, password, p_salt=password_salt)			
			
			# if that works, reencrypt plaintext with random IV and send it back
			# if you can decrypt it on your end, that's your cookie for now on.
			if plaintext is not None:
				new_cookie = encrypt(plaintext, password)
				if new_cookie is not None:
					self.set_secure_cookie(cookie_tag, new_cookie, expires_days=1)
					self.write({'ok':True})
					self.finish()
			
		except IOError as e:
			pass
		
		self.write({'ok':False})
		self.finish()

class LogoutHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def get(self):
		self.clear_cookie(cookie_tag)
		self.redirect('/')
		self.finish()

static_path = os.path.join(os.path.dirname(__file__), "web")
main_layout = Template(filename="%s/index.html" % static_path)
media_routes = ["j3m", "media"]

f = open(os.path.join(auth_root, "file_salt.txt"))
file_salt = f.read().strip()
f.close()

f = open(os.path.join(auth_root, "password_salt.txt"))
password_salt = f.read().strip()
f.close()

f = open(os.path.join(auth_root, "iv.txt"))
private_iv = f.read().strip()
f.close()

cookie_tag = "unveillance_auth"
cookie_secret = "this is a temp secret for cookies"

routes = [
	(r"/([^web/|login/|logout/|ping/|leaflet/][a-zA-Z0-9/]*/$)?", RouteHandler, dict(route=None)),
	(r"/web/([a-zA-Z0-9\-/\._]+)", tornado.web.StaticFileHandler, {"path" : static_path }),
	(r"/leaflet/(.*)", LeafletHandler, dict(route=None)),
	(r"/login/", LoginHandler),
	(r"/logout/", LogoutHandler),
	(r"/ping/", PingHandler)
]

app = tornado.web.Application(routes, **{'cookie_secret':cookie_secret})
signal.signal(signal.SIGINT, terminationHandler)

if __name__ == "__main__":	
	server = tornado.httpserver.HTTPServer(app, ssl_options={
		'certfile' : os.path.join(auth_root, cert_file),
		'keyfile': os.path.join(auth_root, key_file)
	})
	server.bind(6666)
	server.start(5)
	
	tornado.ioloop.IOLoop.instance().start()