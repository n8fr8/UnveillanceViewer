function addNewUser(callback) {
	$("#ic_bad_user_holder").css('display','none');
	$("#ic_bad_password_holder").css('display','none');
	$("#ic_short_password_holder").css('display','none');
	
	if($("#ic_username").val().length <= 3) {
		$("#ic_bad_user_holder").css('display','block');
		return;
	}
	
	if($("#ic_password").val() != $("#ic_password_check").val()) {
		$("#ic_bad_password_holder").css('display','block');
		return;
	}
	
	if($("#ic_password").val().length <= 5) {
		$("#ic_short_password_holder").css('display','block');
		return;
	}
	
	$.ajax({
		url : "/upanel/",
		dataType: "json",
		type: "POST",
		data: {
			username: $("#ic_username").val(),
			password: $("#ic_password").val(),
			_xsrf: getCookie("_xsrf")
		},
		success: function(json) {
			if(json.ok) {
				$("#new_user_name").html($("#ic_username").val());
				$("#ic_user_success_holder").css('display','block');
				$("#ic_username").val("");
				$("#ic_password").val("");
				$("#ic_password_check").val("");
				
				window.setTimeout(function() {
					$("#ic_user_success_holder").css('display','none');
					if(callback != undefined) {
						callback.call();
					}
				}, 3000);
			} else {
				$("#ic_bad_user_holder").css('display','block');
			}
		}
	});
}