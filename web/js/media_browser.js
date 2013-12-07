var media_browser = null;

var MediaBrowser = function() {
	var ctx;
	var origHeight, origWidth, canvasHeight, canvasWidth;
	var heightMult, widthMult;
	
	this.form_holders = [];
	
	this.drawFormData = function(formData) {
		var formHolder = new createjs.Shape();
		formHolder.graphics.s("#09BDFF").r(
			formData.formRegion.displayLeft, 
			formData.formRegion.displayTop, 
			formData.formRegion.displayWidth, 
			formData.formRegion.displayHeight
		);
		
		if(formData.formValues.answerData != undefined) {
			var pt = formHolder.localToGlobal(
				formData.formRegion.displayLeft + formData.formRegion.displayWidth, 
				formData.formRegion.displayTop + (formData.formRegion.displayHeight/2)
			);
			
			var render = $(document.createElement('div'))
				.attr({
					'class':"ic_formdata_holder"
				})
				.css({
					'left' : Math.round(pt.x + this.ctx.canvas.offsetLeft - 10),
					'top' : Math.round(pt.y + this.ctx.canvas.offsetTop - 10),
				});
			
			for(key in formData.formValues.answerData) {
				$(render).append(
					$(document.createElement('p'))
						.append(
							$(document.createElement('span'))
								.html(key + ": ")
								.attr('class',"ic_label")
						)
						.append(
							$(document.createElement('span'))
								.html(formData.formValues.answerData[key])
								.attr('class',"ic_value")
						)
				);
			}
			
			$("#media").append($(render));
		}
		
		
		this.ctx.addChild(formHolder);
		this.ctx.update();
	}
	
	this.init = function() {
		media_browser.ctx = new createjs.Stage(document.getElementById("media_image"));
		
		media_browser.origHeight = j3m_viewer.data.exif["height"];
		media_browser.origWidth = j3m_viewer.data.exif["width"];
		media_browser.canvasWidth = $('#media_image').width();
		media_browser.canvasHeight = $('#media_image').height();

		media_browser.heightMult = media_browser.origHeight / media_browser.canvasHeight;
		media_browser.widthMult = (media_browser.origWidth/media_browser.origHeight)*media_browser.heightMult;
		
		var imageObj = new Image();
		imageObj.onload = function() {
			
			var image = new createjs.Bitmap(this);
			image.scaleX = 1/media_browser.widthMult;
			image.scaleY = 1/media_browser.heightMult;
		
			media_browser.ctx.addChild(image);
			media_browser.ctx.update();
		
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
		}
		imageObj.src = "media/high/";
	}
}