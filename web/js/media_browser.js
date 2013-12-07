var media_browser = null;

var MediaBrowser = function() {
	var ctx;
	var origHeight, origWidth, canvasHeight, canvasWidth;
	var heightMult, widthMult;
	
	this.form_holders = [];
	
	this.drawFormData = function(formData) {
		this.ctx.beginPath();
					
		this.ctx.rect(
			formData.formRegion.displayLeft, 
			formData.formRegion.displayTop, 
			formData.formRegion.displayWidth, 
			formData.formRegion.displayHeight
		);
	
		if (formData.formValues.answerData!=undefined) {
			console.info(formData.formValues.answerData);
			var formText = formData.formValues.answerData.iW_free_text;
		
			  // set line color
			this.ctx.strokeStyle = '#0000ff';
			this.ctx.stroke();
		
			this.ctx.fillStyle = '#ffffff';
			this.ctx.font = '30pt Calibri';
			this.ctx.fillText(
				formText, 
				parseInt(formData.formRegion.left / this.widthMult), 
				parseInt(formData.formRegion.top / this.heightMult)
			);
		}
	}
	
	this.init = function() {
		media_browser.ctx = $('#media_image').get(0).getContext('2d');
		media_browser.origHeight = j3m_viewer.data.exif["height"];
	
		media_browser.origWidth = j3m_viewer.data.exif["width"];
		media_browser.canvasWidth = $('#media_image').width();
		media_browser.canvasHeight = $('#media_image').height();

		media_browser.heightMult = media_browser.origHeight / media_browser.canvasHeight;
		media_browser.widthMult = (media_browser.origWidth/media_browser.origHeight)*media_browser.heightMult;
	
		media_browser.ctx.beginPath();
	
		var imageObj = new Image();
		imageObj.onload = function() {
			media_browser.ctx.drawImage(
				imageObj, 0,0,
				media_browser.origWidth / media_browser.widthMult,
				media_browser.origHeight/media_browser.heightMult
			);
			if (j3m_viewer.data.userAppendedData != undefined) {
				console.log("found user data");
			
				for (idx = 0; idx < j3m_viewer.data.userAppendedData.length; idx++) {
					var formValues = j3m_viewer.data.userAppendedData[idx]["associatedForms"][0];
					var formRegion = j3m_viewer.data.userAppendedData[idx]["regionBounds"];
				
					if(formRegion == undefined) {
						formRegion = {
							top: 0,
							left: 0,
							width: j3m_viewer.data.exif["width"],
							height: j3m_viewer.data.exif["height"]
						}
					}
					
					formRegion.displayLeft = parseInt(formRegion.left / media_browser.widthMult);
					formRegion.displayTop = parseInt(formRegion.top / media_browser.heightMult);
					formRegion.displayWidth = parseInt(formRegion.width / media_browser.widthMult);
					formRegion.displayHeight = parseInt(formRegion.height / media_browser.heightMult);
					
					media_browser.form_holders.push({
						formValues : formValues,
						formRegion : formRegion
					});
					
					media_browser.drawFormData(media_browser.form_holders[idx]);
				}
			}
		};
		imageObj.src = "media/high/";
	}
}