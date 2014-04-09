var User = function() {
	var user = JSON.parse(localStorage.getItem('user'));
	if(user == null) {
		return;
	}
	
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
	
	this.saveSearch = function(path_to_search) {
		this.saved_searches.push(path_to_search);
		this.save();
	}
	
	this.removeSearch = function(path_to_search) {
		if(this.hasSearch(path_to_search)) {
			var idx = this.saved_searches.indexOf(path_to_search);
			this.saved_searches.splice(idx, 1);
		}
		this.save();
	}
	
	this.hasSearch = function(path_to_search) {
		if(this.saved_searches.indexOf(path_to_search) >= 0) {
			return true;
		}

		return false;
	}
	
	this.saveDataAndLogout = function() {
		var data = {
			user : this.asJson(),
			password: $("#ic_password").val()
		};
		console.info(data);
		
		$.ajax({
			url : "/logout/",
			type: "POST",
			data: JSON.stringify(data),
			dataType: "json",
			success: function(json) {
				u_user = null;
				localStorage.clear();
				window.location = '/';
			}
		});
	}
};

function doAdmin() {
	if(u_user != undefined && u_user != null) {
		$.ajax({
			url: "/web/layout/static/admin.html",
			dataType: "html",
			success: function(html) {
				renderAuxContent(Mustache.to_html(html, u_user.asJson()));
			}
		});
	}
}

function doAnnotate() {
	if(u_user != undefined && u_user != null) {
		$.ajax({
			url: "/web/layout/static/annotate.html",
			dataType: "html",
			success: function(html) {
				renderAuxContent(Mustache.to_html(html, u_user.asJson()));
			}
		});
	}
}

function saveAnnotation() {
	if(u_user != undefined && u_user != null) {
		console.info(window.location.href);
	}
}