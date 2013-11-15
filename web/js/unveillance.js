var j3m_viewer = null;

function toggleElement(el) {
	console.info($(el));
	if($(el).css('display') == "block") {
		$(el).css('display','none');
		return false;
	} else {
		$(el).css('display','block');
		return true;
	}
}

function swapImage(el, swap) {
	console.info($(el));
	if(swap) {
		$($(el).children('img')[0]).attr('src', "/web/images/" + $(el).attr('swap_a'));
	} else {
		$($(el).children('img')[0]).attr('src', "/web/images/" + $(el).attr('swap_b'));
	}
}

function setAsUsed(el) {
	$(el).removeClass("unused");
}

function translate(el) {
	var root = $(".translatable");
	if(el != undefined) {
		root = $(el + " .translatable");
	}
	
	$.each(root, function(idx, item) {
		if($(item).hasClass('ic_date')) {
			var date = moment(Number($(item).html()));
			$(item).html(date.format("MM-DD-YYYY HH:mm"));
		}
		
		if($(item).hasClass('ic_status_value')) {
			var status_icon = "/web/images/" + $(item).html() + "_icn.png";
			$(item).empty();
			$(item).append(
				$(document.createElement('img'))
					.attr({
						'src': status_icon,
						'class' : "ic_icon"
					})
			);
		}
		
		if($(item).hasClass('ic_user_alias') && u_user != undefined) {
			$(item).html(u_user.username);
		}
		
		if($(item).hasClass('ic_search_term')) {
			var term_holder = $(document.createElement('div'));
			var whole_term = $(item).html().split("?")[1].split("&");
			$.each(whole_term, function(idx, term) {
				console.info(term);
				var kvp = term.split("=");
				term_holder.append(
					$(document.createElement('span')).html(kvp[0] + ": " + kvp[1])
				);
			});
			$(item).empty();
			$(item).append(term_holder);
		}
	});
}

function massageData(data) {
	$.each(data, function(idx, item) {
		// 1. if we are missing an id, get it from assetPath
		if(item._id == undefined && item.asset_path) {
			seg = item.asset_path.split("/");
			data[idx]._id = seg[seg.length - 1];
		}
	});
	
	return data;
}

function renderUi(data) {
	html = $("#content").html();
	$("#content").html(Mustache.to_html(html, massageData(data)));
}

function renderData(data) {
	u_user = new User();
	
	if(data.result == 200) {
		console.info(data.data);
		renderUi(data.data);
	} else {
		$.ajax({
			url : "/web/layout/errors/error_no_results.html",
			dataType: "html",
			success: function(html) {
				$("#content").html(html);
			}
		});		
	}	
}

function renderJ3M(data) {
	j3m_viewer = new J3MViewer();
	j3m_viewer.parse(data);
}

function renderJ3MMap(points) {
	$("#map").css('height', $("#footer").position().top * .93);
	var cloudmadeApiKey = '23c00ae936704081ab019253c36a55b3';
	
	map = L.map('map').setView([0,0], 2);
	L.tileLayer('http://{s}.tile.cloudmade.com/' + cloudmadeApiKey + '/110483/256/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
	}).addTo(map);	
	
	var myIcon = L.icon({
	    iconUrl: '/web/images/ic_marker.png',
	    iconRetinaUrl: '/web/images/ic_marker.png',
	    iconSize: [36, 36]
	   
	})
	
	var absorbed = new Array();
	$.each(points, function(idx, item) {
		
		point = [item.location[1].toFixed(3), item.location[0].toFixed(3)];
		if(absorbed.indexOf(point.join()) == -1) {
			
			var marker = L.marker(point);
			marker.setIcon(myIcon);
			
			
			marker.addTo(map);
			
			marker.addEventListener('click',function(e)
					{
				location.href='/submission/' + item.id + '/';
					});
			
			absorbed.push(point.join());
		}
	});
	
}

function renderAuxContent(html) {
	$("#aux_popup").empty();
	$("#aux_popup").html(html);
	if($("#aux_popup").css('display') != "block") {
		$("#aux_popup").css('display','block');
		translate("#aux_popup");
	}
}

function killAuxPopup() {
	$("#aux_popup").css('display', 'none');
	window.history.back();
}

(function($) {
	var app = $.sammy('#aux_popup', function() {
		this.get('#login', function(context) {
			$.ajax({
				url: "/web/layout/authentication/do_login.html",
				dataType: "html",
				success: function(html) {
					renderAuxContent(html);
				}
			});
		});
		
		this.get('#logout', function(context) {
			$.ajax({
				url: "/web/layout/authentication/do_logout.html",
				dataType: "html",
				success: function(html) {
					renderAuxContent(html);
				}
			});
		});

		this.get('#about', function(context) {
			$.ajax({
				url: "/web/layout/static/about.html",
				dataType: "html",
				success: function(html) {
					renderAuxContent(html);
				}
			});
		});
		
		this.get('#help', function(context) {
			$.ajax({
				url: "/web/layout/static/help.html",
				dataType: "html",
				success: function(html) {
					renderAuxContent(html);
				}
			});
		});
		
		this.get('#admin', function(context) {
			doAdmin();
		});

	});

	$(function() {
		app.run();
		
		$("#aux_popup").on('click', '.ic_exit', killAuxPopup);
		
		$("#ic_lookup_hash").keypress(function(evt) {
			if(evt.which == 13) {
				window.location = "/submissions/?public_hash=" + $("#ic_lookup_hash").val();
			}
		});
	});

})(jQuery);