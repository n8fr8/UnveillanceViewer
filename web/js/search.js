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
	
	var Clause = function(append) {
		this.id = "clause_" + (new Date()).getTime();
		this.render = $(clause_template).clone();
		
		$(this.render).attr('id', this.id);		
		$("#ic_search_clause_holder").append(this.render);
	}
	
	this.clauses = [];
	this.root_type;
	
	$("#search_root_type").change(function() {
		console.info("changing root type: " + $(this).val());
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
			this.removeClause(clause.id);
		});
		// if clauses are compatible with root type...
	}
	
	this.addClause = function() {
		this.clauses.push(new Clause());
	}
	
	this.removeClause = function(clause_element) {
		var clause_id = $($($(clause_element).parent()).parent()).attr('id');
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
	
	this.submit = function() {
	
	}
}