#Unveillance viewer

after cloning, run:

	git submodule update --init --recursive

install dependencies (not included in package):

	sudo apt-get install python-dev python-setuptools

install mako, requests, tornado:

	cd packages/[package]
	sudo python setup.py install

install pycrypto:

	cd packages/pyCrypto
	sudo python setup.py build
	sudo python setup.py install

Modify conf.py.example to suit your needs, and save it as:

	conf.py

Open up the files in auth, and change them as necessary.  While file_salt.txt and password_salt.txt can be whatever you want, iv.txt must be a hex-encoded string of AES.block_size (16 bytes).  Since you already have PyCrypto installed, generate one to your liking by running (in a python shell):

	from Crypto.Cipher import AES
	from Crypto import Random
	
	print Random.new().read(AES.block_size).encode('hex')

To run:
	
	python index.py

