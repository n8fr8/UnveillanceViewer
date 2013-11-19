var current_search;

function initSearch() {
	if(toggleElement('#admin_advanced_search_holder')) {
		current_search = new ICSearch();
		current_search.init();
	}
}

var ICSearch = function() {
	var clause_template;
	$.ajax({
		url: "/web/layout/searches/clause_template.html",
		dataType: "html",
		success: function(html) {
			clause_template = html;
		}
	});
	
	var Clause = function(root_type) {
		this.id = "clause_" + (new Date()).getTime();
		this.render = $(clause_template).clone();
		
		$(this.render).attr('id', this.id);
		
		var submission_clause_selectors = [
			{
				label: "were created on or between...",
				tmpl: "by_dateCreated.html",
			},
			{
				label: "were taken near...",
				tmpl: "by_location.html",
			},
			{
				label: "were taken by...",
				tmpl: "by_sourceID.html",
			},
			{
				label: "were taken in view of...",
				tmpl: "by_broadcast.html"
			}
		];
		
		var source_clause_selectors = [
			{
				label: "goes by alias...",
				tmpl: "by_source_alias.html",
			}
		];
		
		var clause_selector = submission_clause_selectors;
		if(root_type == "sources") {
			clause_selector = source_clause_selectors;
		}
		
		var clause_selector_holder = $(this.render).children(".clause_selector")[0];
		$(clause_selector_holder).append(
			$(document.createElement('option'))
				.html("______________________")
				.val("null")
		);
		
		$.each(clause_selector, function(idx, item) {
			$(clause_selector_holder).append(
				$(document.createElement('option'))
					.html(item.label)
					.val(item.tmpl)
			);
		});
		$(clause_selector_holder).change(function() {
			var filter_holder = $(this).parent().children(".clause_filter_holder")[0];
			$(filter_holder).empty();
			
			if($(this).val() != "null") {
				$.ajax({
					url: "/web/layout/searches/" + $(this).val(),
					dataType: "html",
					success: function(html) {
						$(clause_selector_holder).remove();
						$(filter_holder).html(html);
					}
				});				
			}
		});
		
		$("#ic_search_clause_holder").append(this.render);
	}
	
	this.clauses = [];
	this.root_type;
	
	$("#search_root_type").change(function() {
		current_search.setRootType($(this).val());
	});
	
	this.init = function() {
		$("#ic_add_clause").addClass("unused");
		$("#ic_search_clause_holder").empty();
		
		this.setRootType($($("#search_root_type option")[0]).val());
	}
	
	this.setRootType = function(root_type) {
		this.root_type = root_type;
		$.each(this.clauses, function(idx, clause) {
			$("#" + clause.id).remove();
		});
		this.clauses = [];
		$("#ic_add_clause").addClass("unused");
	}
	
	this.addClause = function() {
		this.clauses.push(new Clause(this.root_type));
	}
	
	this.removeClause = function(clause_element, clause_id) {
		if((clause_id == undefined || clause_id == null) && clause_element != undefined) {
			clause_id = $($($(clause_element).parent()).parent()).attr('id');
		}
		
		var idx = this.getClauseIndex(clause_id);
		
		if(idx >= 0) {
			this.clauses.splice(idx, 1);
			$("#" + clause_id).remove();
		}
		
		if(this.clauses.length == 0) {
			$("#ic_add_clause").addClass("unused");
		}
	}
	
	this.getClauseIndex = function(clause_id) {
		for(var idx=0; idx<this.clauses.length; idx++) {
			if(this.clauses[idx].id == clause_id) {
				return idx;
			}
		}
		
		return -1;
	}
	
	this.hasClause = function(clause_id) {
		var found_clause = $.grep(this.clauses, function(clause) {
			return clause.id == clause_id;
		});
		
		if(found_clause.length == 1) {
			return found_clause[0];
		}
		
		return false;
	}
	
	this.massageInput = function(clause_obj) {
		for(key in clause_obj) {
			var val = clause_obj[key];
			if(val == "") {
				delete clause_obj[key]
			}
			
			switch(key) {
			case "dateCreated_lower":
				clause_obj.date = moment(val, "MM/DD/YYYY HH:mm").unix() * 1000;
				delete clause_obj[key];
				break;
			case "dateCreated_upper":
				if(val == "") {
					val = 0;
				} else {
					var upper = moment(val, "MM/DD/YYYY HH:mm").unix() * 1000;
					val = Math.abs(clause_obj.date - upper);
				}
				
				clause_obj.upper = val;
				delete clause_obj[key];
				break;
			case "HH":
				delete clause_obj[key];
				break;
			case "MM":
				delete clause_obj[key];
				break;
			case "radius":
				clause_obj[key] = Number(val);
				break;
			case "latitude":
				clause_obj[key] = Number(val);
				break;
			case "longitude":
				clause_obj[key] = Number(val);
				break;
			case "sourceID":
				clause_obj = val;
				break;
			case "bssid":
				clause_obj = val;
				break;
			}
			
			
		}
		return clause_obj;
	}
	
	this.submit = function() {
		var query = [];
		var ctx = this;
		
		if(this.root_type != "any") {
			query.push("mime_type=\"" + this.root_type + "\"");
		}
		
		$.each(this.clauses, function(idx, item) {			
			$.each($(item.render).find("input[type=hidden]"), function(idx_, item_) {
				var tag = $(item_).val();
				var clause = {}
				
				$.each($(item.render).find("input[type=text][rel='" + tag + "']"), function(idx__, item__) {
					clause[$(item__).attr('name')] = $(item__).val();
				});
				
				val = ctx.massageInput(clause);
				if(typeof val == "object") {
					val = JSON.stringify(val);
				}
				query.push(tag + "=" + val);
			});
		});
		
		for(var q=0; q<query.length; q++) {			
			if(query[q].split("=")[1] == "" || query[q].split("=")[1] == "{}") {
				query.splice(q, 1);
			}
		}
		
		var q_string = "/submissions/";
		if(this.root_type == "sources") {
			q_string = "/sources/";
		}
		
		console.info(q_string + "?" + query.join("&"));
		window.location = q_string + "?" + query.join("&");	
	}
}