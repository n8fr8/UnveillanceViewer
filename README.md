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