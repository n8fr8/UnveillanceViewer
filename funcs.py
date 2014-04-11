import json, hashlib, os, base64, copy

from Crypto.Cipher import AES
from Crypto import Random

from conf import auth_root, user_root

credential_pack = {
	"username" : "",
	"saved_searches" : [],
	"session_log" : []
}

def getFileSalt():
	f = open(os.path.join(auth_root, "file_salt.txt"))
	file_salt = f.read().strip()
	f.close()
	return file_salt

def getPasswordSalt():
	f = open(os.path.join(auth_root, "password_salt.txt"))
	password_salt = f.read().strip()
	f.close()
	return password_salt

def getPrivateIV():
	f = open(os.path.join(auth_root, "iv.txt"))
	private_iv = f.read().strip()
	f.close()
	return private_iv

def createNewUser(username, password, as_admin=False):
	try:
		credentials = copy.deepcopy(credential_pack)
		credentials['username'] = username
		if as_admin:
			credentials['admin'] = True
			print "Creating %s as admin!" % username
		
		print credentials
		user_path = os.path.join(user_root, "%s.txt" % hashlib.sha1(username + getFileSalt()).hexdigest())
		print user_path
		
		try:
			f = open(user_path, 'rb')
			f.close()
			print "we already have this one... hmmm..."
			return False
		except IOError as e:
			print "THIS IS A GOOD ERROR! %s" % e
			pass
		
		f = open(os.path.join(user_root, "%s.txt" % hashlib.sha1(username + getFileSalt()).hexdigest()), 'wb+')
		f.write(encrypt(credentials, password, p_salt=getPasswordSalt(), iv=getPrivateIV()))
		f.close()
		return True
	except:
		print "but something went wrong?"
		return False

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
			getPrivateIV().decode('hex')

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