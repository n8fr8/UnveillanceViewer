import requests, signal, sys, re, os, hashlib, base64, json, copy

import tornado.ioloop
import tornado.web
import tornado.httpserver
from mako.template import Template

from conf import server_port, use_ssl, cert_file, key_file, auth_root, user_root, uurl, assets_path, cookie_tag, admin_cookie_tag, cookie_secret, no_access_cookie
from funcs import createNewUser, getPrivateIV, getFileSalt, getPasswordSalt, encrypt, pad, unpad, decrypt

def terminationHandler(signal, frame):
	sys.exit(0)

def getStatus(req):
	# if you have a NO_ACCESS cookie, well, that's too bad
	try:
		for cookie in req.request.cookies:
			if cookie == no_access_cookie:
				return 0
	except KeyError as e:
		pass

	access = req.get_secure_cookie(cookie_tag)
	if access is not None:
		admin = req.get_secure_cookie(admin_cookie_tag)
		if admin is not None:
			return 3
			
		return 2

	return 1

def getDefaultHome(req):
	user = req.get_secure_cookie(cookie_tag)
	if user is not None:
		user = json.loads(base64.b64decode(user))
		try:
			return user['default_home']
		except KeyError as e:
			print e
			pass
	
	try:
		from conf import default_home
		return default_home
	except ImportError as e:
		print e
		pass
	
	return "submissions"

def checkForAdminParty():
	for root_, dir_, files in os.walk(user_root):
		for f in files:
			return False
	
	return True

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
	def validateUnprivilegedQuery(self, q_string):
		if q_string == "":
			return True
			
		allowed_queries = ["public_hash", "get_all", "capturedOn"]
		
		for kvp in q_string[1:].split("&"):
			key_val = kvp.split("=")
			if key_val[0] not in allowed_queries:
				return False
				
		return True
		
	def getExtraScriptsByStatus(self, status, route):
		exts = []
		
		if status == 2 or status == 3:
			if route is not None:
				if route[0] == "submission":
					exts.append(Template(filename="%s/layout/opts/media_browser.html" % static_path).render())
		
		return exts
	
	def getExtraTemplatesByStatus(self, status, route, as_search_result=False):
		extra_tmpls = []
		
		if status == 0:
			if route == "submission":
				extra_tmpls.append(Template(
					filename="%s/layout/opts/download_options.html" % static_path
				).render())
				extra_tmpls.append(Template(
					filename="%s/layout/opts/j3mviewer_public.html" % static_path
				).render())
		
		if status == 2 or status == 3:
			if route == "submission":
				extra_tmpls.append(Template(
					filename="%s/layout/opts/download_options.html" % static_path
				).render())
				extra_tmpls.append(Template(
					filename="%s/layout/opts/j3mviewer_user.html" % static_path
				).render())
			
			# no annotations for now please	
			#	extra_tmpls.append(Template(
			#		filename="%s/layout/opts/annotate_submission.html" % static_path
			#	).render())
			
			if as_search_result:
				extra_tmpls.append(Template(
					filename="%s/layout/opts/save_search.html" % static_path
				).render())
		
		return extra_tmpls
	
	def initialize(self, route):
		self.route = route

	def get(self, route):
		auth_layout = None
		q_string = self.request.query
		extra_scripts = []
		
		status = getStatus(self)
		if status == 1:
			auth_layout = Template(filename="%s/layout/authentication/login_ctrl.html" % static_path).render()
			
			# first, let's see if you have any user files
			if checkForAdminParty():
				auth_stopgap = Template(
					filename="%s/layout/authentication/admin_party.html" % static_path
				).render()
			else:
				auth_stopgap = Template(
					filename="%s/layout/errors/error_not_logged_in.html" % static_path
				).render()
			
			extra_scripts = Template(
				filename="%s/layout/authentication/disable_user.html" % static_path
			).render()
			
			self.finish(main_layout.render(
				template_content=auth_stopgap,
				authentication_holder='',
				search_ctrl='',
				extra_scripts=extra_scripts,
				authentication_ctrl=auth_layout,
				data=''
			))
			return
		
		if route is not None:
			url = "%s%s" % (uurl, route)
		else:				
			url = "%s%s/" % (uurl, getDefaultHome(self))
			
		print url	
		format = None
		as_search_result = False
		
		if q_string != "":
			for kvp in self.request.query.split("&"):
				key_val = kvp.split("=")
				if key_val[0] == "format":
					format = key_val[1]
					q_string = q_string.replace("format=%s" % key_val[1], "")
					break
		
			if not q_string.startswith("?"):
				q_string = "?%s" % q_string
			
			if re.search(r'&&', q_string):
				q_string = q_string.replace("&&","&")
			
			if re.search(r'.*&$', q_string):
				q_string = q_string[:-1]
			
			if re.search(r'^\?&.*', q_string):
				q_string = q_string.replace("?&","?")
			
			if q_string == "?":
				q_string = ""
			
			if q_string != "":
				as_search_result = True
		
		if status == 0 and not self.validateUnprivilegedQuery(q_string):
			print self.validateUnprivilegedQuery(q_string)
			self.redirect('/')
			return
		
		print "%s%s" % (url, q_string)
		try:
			r = requests.get("%s%s" % (url, q_string))
		except requests.exceptions.ConnectionError as e:
			error_tmpl = Template(filename="%s/layout/errors/error_no_api.html" % static_path)
			self.finish(main_layout.render(
				template_content=error_tmpl.render(),
				data={},
				authentication_holder='',
				search_ctrl='',
				extra_scripts='',
				authentication_ctrl=''
			))
			return
		
		tmpl_extras = []
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
				tmpl_extras.extend(self.getExtraTemplatesByStatus(status, route[0], as_search_result))
				
			else:
				if status == 0:
					layout = "main_public"
				else:
					layout = "main"
				
				layout = "%s_%s" % (getDefaultHome(self), layout)

			if status == 2 or status == 3:
				auth_layout = "logout_ctrl"
				extra_scripts.append(Template(
					filename="%s/layout/authentication/enable_user.html" % static_path
				).render())
			else:
				extra_scripts.append(Template(
					filename="%s/layout/authentication/disable_user.html" % static_path
				).render())
			
			tmpl = Template(filename="%s/layout/%s.html" % (static_path, layout))

			authentication_holder = ''
			if status != 0:
				auth_tmpl = Template(filename="%s/layout/authentication/%s.html" % (static_path, auth_layout))
				authentication_holder = auth_tmpl.render()
			
			authentication_ctrl = ''
			if status == 3:
				authentication_ctrl = Template(
					filename="%s/layout/authentication/admin_ctrl.html" % static_path
				).render()

			search_ctrl = Template(
				filename="%s/layout/searches/search_ctrl.html" % static_path
			).render()
			
			extra_scripts.extend(self.getExtraScriptsByStatus(status, route))
						
			data = json.loads(r.text.replace(assets_path, ""))
			self.finish(main_layout.render(
				template_content=tmpl.render(extras="".join(tmpl_extras)),
				authentication_holder=authentication_holder,
				search_ctrl=search_ctrl,
				extra_scripts="".join(extra_scripts),
				authentication_ctrl=authentication_ctrl,
				data=json.dumps(data)
			))
			print extra_scripts

class LeafletHandler(tornado.web.RequestHandler):
	def initialize(self, route):
		self.route = route
	
	def get(self, route):
		r = requests.get("http://cdn.leafletjs.com/leaflet-0.6.4/%s" % route)
		self.finish(r.content)

class EaselHandler(tornado.web.RequestHandler):
	def initialize(self, route):
		self.route = route
	
	def get(self, route):
		r = requests.get("http://code.createjs.com/%s" % route)
		self.finish(r.content)

class LoginHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def post(self):
		if getStatus(self) == 0:
			self.finish({'ok':False})
			return
		
		username = None
		password = None
		
		credentials = self.request.body
		for kvp in credentials.split("&"):
			kv = kvp.split("=")
			if kv[0] == "username":
				username = kv[1]
			elif kv[0] == "password":
				password = kv[1]
		
		if username is "" or password is "" or username is None or password is None:
			self.finish({'ok':False})
			return
		
		#createNewUser(username, password)
		auth = "%s.txt" % hashlib.sha1(username + getFileSalt()).hexdigest()
		
		# if this file exists,
		try:
			f = open(os.path.join(user_root, auth), 'rb')
			ciphertext = f.read()
			f.close()
			
			# decrypt it using supplied password.
			plaintext = decrypt(ciphertext, password, p_salt=getPasswordSalt())			
			
			# if that works, send back plaintext
			if plaintext is not None:
				try:
					if plaintext['admin']:
						del plaintext['admin']
						self.set_secure_cookie(admin_cookie_tag, "true", path="/", expires_days=1)
				except KeyError as e:
					pass

				new_cookie = base64.b64encode(json.dumps(plaintext))
				if new_cookie is not None:
					self.set_secure_cookie(cookie_tag, new_cookie, path="/", expires_days=1)
					self.finish({'ok':True, 'user' : plaintext})
					return
			
		except IOError as e:
			print e
			pass
		
		self.finish({'ok':False})

class LogoutHandler(tornado.web.RequestHandler):
	@tornado.web.asynchronous
	def post(self):
		if getStatus(self) == 0:
			self.finish({'ok':False})
			return
			
		self.clear_cookie(cookie_tag)
		self.clear_cookie(admin_cookie_tag)
		
		if self.request.body != "":		
			try:			
				credentials = json.loads(self.request.body)
				
				auth = "%s.txt" % hashlib.sha1(credentials['user']['username'] + getFileSalt()).hexdigest()
				
				f = open(os.path.join(user_root, auth), 'rb')
				ciphertext = f.read()
				f.close()
			
				# decrypt it using supplied password.
				plaintext = decrypt(ciphertext, credentials['password'], p_salt=getPasswordSalt())
			
				# if that works, encrypt new data
				if plaintext is not None:
					new_data = copy.deepcopy(plaintext)
					new_data['saved_searches'] = credentials['user']['saved_searches']
					# also, new_data might have ['default_home']
					
					f = open(os.path.join(user_root, auth), 'wb+')
					f.write(encrypt(
						new_data, 
						credentials['password'],
						iv=getPrivateIV(),
						p_salt=getPasswordSalt()
					))
					f.close()
				else:
					self.finish({'ok':False})
					return
					
			except ValueError as e:
				print e
				self.finish({'ok':False})
				return
			except TypeError as e:
				print e
				self.finish({'ok':False})
				return
		
		self.finish({'ok':True})

class ImportHandler(tornado.web.RequestHandler):
	def post(self):
		status = getStatus(self)
		if status != 3:
			self.finish({'ok':False})
			return
		
		try:
			file = {
				'file' : (
					self.request.files['file'][0]['filename'], 
					self.request.files['file'][0]['body']
				)
			}
			r = requests.post("%simport/" % uurl, files=file)
			self.finish(json.loads(r.content))
			return
			
		except requests.exceptions.ConnectionError as e:
			print e
			pass
			
		self.finish({'ok':False})

class UserHandler(tornado.web.RequestHandler):
	def post(self):		
		status = getStatus(self)
		if status != 3:
			if not checkForAdminParty() and status == 1:
				self.finish({'ok':False})
				return
		
		username = None
		password = None
		
		credentials = self.request.body
		for kvp in credentials.split("&"):
			kv = kvp.split("=")
			if kv[0] == "username":
				username = kv[1]
			elif kv[0] == "password":
				password = kv[1]
		
		if username is "" or password is "" or username is None or password is None:
			self.finish({'ok':False})
			return
			
		if not re.match(r'[a-zA-Z0-9_\-]', username):
			print "THIS DOES NOT MATCH THE SPEC!"
			self.finish({'ok':False})
			return
		
		if createNewUser(username, password, as_admin=checkForAdminParty()):
			self.finish({'ok' : True})
			return
		
		self.finish({'ok':False})

static_path = os.path.join(os.path.dirname(__file__), "web")
main_layout = Template(filename="%s/index.html" % static_path)
media_routes = ["j3m", "media"]

routes = [
	(r"/([^web/|login/|logout/|ping/|leaflet/|upanel/|import/][a-zA-Z0-9/]*/$)?", RouteHandler, dict(route=None)),
	(r"/web/([a-zA-Z0-9\-/\._]+)", tornado.web.StaticFileHandler, {"path" : static_path }),
	(r"/leaflet/(.*)", LeafletHandler, dict(route=None)),
	(r"/easel/(.*)", EaselHandler, dict(route=None)),
	(r"/login/", LoginHandler),
	(r"/logout/", LogoutHandler),
	(r"/upanel/", UserHandler),
	(r"/import/", ImportHandler),
	(r"/ping/", PingHandler)
]

app = tornado.web.Application(routes, **{'cookie_secret':cookie_secret})
signal.signal(signal.SIGINT, terminationHandler)

if __name__ == "__main__":	
	if (use_ssl == False):
	  	app.listen(server_port)
	else:
		server = tornado.httpserver.HTTPServer(app, ssl_options={
			'certfile' : os.path.join(auth_root, cert_file),
			'keyfile': os.path.join(auth_root, key_file)

		})
	
		server.bind(server_port)
		server.start(50)
	
	tornado.ioloop.IOLoop.instance().start()
