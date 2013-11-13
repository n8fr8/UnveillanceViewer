var u_user = null;
var User = function() {
	var user = JSON.parse(localStorage.getItem('user'));
	this.session_log = new Array();
	this.username = user.username;
	this.saved_searches = user.saved_searches;
	
	this.asJson = function() {
		return {
			username : this.username,
			saved_searches : this.saved_searches,
			session_log : this.session_log
		}
	}
	
	this.save = function() {
		localStorage.setItem('user', JSON.stringify(this.asJson()));
	}
};

function doAdmin() {
	$.ajax({
		url: "/web/layout/static/admin.html",
		dataType: "html",
		success: function(html) {
			renderAuxContent(Mustache.to_html(html, u_user.asJson()));
		}
	});
}

function doLogout() {
	$.ajax({
		url : "/logout/",
		dataType: "json",
		data: u_user.asJson(),
		success: function(json) {
			window.location.reload();
		}
	});
}

function doLogin() {
	$.ajax({
		url : "/login/",
		dataType: "json",
		type: "POST",
		data: {
			username: $("#ic_username").val(),
			password: $("#ic_password").val()
		},
		success: function(json) {
			if(json.ok) {
				// save to local storage
				localStorage.setItem('user', JSON.stringify(json.user));
				window.history.back();
				window.location.reload();
			} else {
				$("#ic_bad_login_holder").css('display','block');
			}
		}
	});
}

function unpackCredentials() {
	// un b64
	// aes decrypt
}