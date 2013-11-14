var CurrentSearch = null;
var j3m_viewer = null;

function Searcher() {
	var clause_types = [
		{
			layout: "by_dateCreated",
			label: "were created on/between"
		},
		{
			layout: "by_sourceID",
			label: "were taken by"
		},
		{
			layout: "by_location",
			label: "were taken near"
		}
	];
	
	function renderClauseSelector(root) {
		console.info("render clause: " + root);
		
		var clause_holder = $(document.createElement('div'))
			.attr('id', root + "_params")
			
		var param_selector = $(document.createElement('div'))
			.attr('class', 'parameter_holder');

		var clause_selector = $(document.createElement('select'))
			.append($(document.createElement('option'))
				.html("______________")
				.attr('rel', 'null')
			)
			.change(function() {
				var sel = $(this).find('option:selected')[0];
				if ($(sel).attr('rel') == "null") {
					return;
				}
				
				$.ajax({
					url: "/web/layout/searches/" + clause_types[parseInt($(sel).attr('rel'))].layout + ".html",
					dataType: 'html',
					success: function(html) {
						var p_root = $("#clause_" + $(sel).attr('rel') + "_params")
							.attr('class','ic_clause_params_holder');
						console.info(p_root);
						p_root.empty();
						p_root.html(html);
						p_root.append(
							$(document.createElement('a'))
								.html("x")
								.click(function() {
									$($(this).parent()).parent().remove();
								})
								.attr('class','ic_button ic_negate')
						);
						p_root.append(
							$(document.createElement('a'))
								.html("+")
								.click(function() {
									CurrentSearch.addClause();
									$(this).remove();
								})
								.attr('class', 'ic_button unused')
							
						);
					}
				});
			});
	
		$.each(clause_types, function(idx, item) {
			clause_selector.append(
				$(document.createElement('option'))
					.val(item.layout)
					.html(item.label)
					.attr("rel", idx)
			)
		});
		clause_holder.append(clause_selector)
		clause_holder.append(param_selector)
		
		
		return clause_holder;
	}
	
	this.clauses = [];
	this.addClause = function(called_by) {
		if($(called_by).hasClass('unused')) {
			$(called_by).removeClass('unused');
		}
		
		$("#search_clause_holder").append(
			$(document.createElement('div'))
				.attr('id', 'clause_' + this.clauses.length)
				.append(renderClauseSelector('clause_' + this.clauses.length))
		);
		this.clauses.push({
			clause: this.clauses.length + 1
		})
	}
}

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

function initSearch() {
	if(toggleElement('#ic_search')) {
		$("#ic_search_ctrl").addClass('ic_selected');
		
		$("#ic_search").empty();
		$.ajax({
			url : "/web/layout/search.html",
			dataType: "html",
			success: function(html) {
				$("#ic_search").html(html);
				CurrentSearch = new Searcher();
				$($("#search_submit").children('a')[0]).addClass('ic_selected');
			}
		});
	} else {
		if($("#ic_search_ctrl").hasClass('ic_selected')) {
			$("#ic_search_ctrl").removeClass('ic_selected');
		}
		
		if($($("#search_submit").children('a')[0]).hasClass('ic_selected')) {
			$($("#search_submit").children('a')[0]).removeClass('ic_selected');
		}
	}
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
		renderUi(data.data);
	} else {
		$.ajax({
			url : "/web/layout/error_no_results.html",
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
	$("#map").css('height', $("#footer").position().top * 0.8);
	var cloudmadeApiKey = '23c00ae936704081ab019253c36a55b3';
	
	map = L.map('map').setView([0,0], 6);
	L.tileLayer('http://{s}.tile.cloudmade.com/' + cloudmadeApiKey + '/110483/256/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
	}).addTo(map);	
	
	var absorbed = new Array();
	$.each(points, function(idx, item) {
		point = [item[1].toFixed(3), item[0].toFixed(3)];
		if(absorbed.indexOf(point.join()) == -1) {
			L.marker(point).addTo(map);
			absorbed.push(point.join());
		}
	});
	
	map.setZoom(1);
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