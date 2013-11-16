var User = function() {
	this.saved_searches = [];
	
	this.asJson = function() {
		return {
			saved_searches : this.saved_searches,
		}
	}
};