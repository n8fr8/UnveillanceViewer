var j3m_viewer = null;

function renderUi(route) {
	$("#ic_content").empty();
	
	// get template, and load into dom
	$.ajax({
		url: '/layout/' + route + '.html',
		dataType: 'html',
		success: function(html) {
			$("#ic_content").append(html);
			renderData(route);
		}
	});
}

function translate() {
	$.each($(".translatable"), function() {
		if($(this).hasClass('as_date')) {
			var date = moment(Number($(this).html()));
			$(this).html(date.format("MM-DD-YYYY HH:mm"));
		}
	});
}

function toggleElement(el, replacement_text, replacement_el) {
	var rt = 0;
	if($(el).css('display') == 'none') {
		$(el).css('display', 'block');
		rt = 1;
	} else {
		$(el).css('display', 'none');
	}
	
	if(replacement_text != undefined && replacement_text != null) {
		$(replacement_el).html(replacement_text[rt]);
	}
}

function getRegistration() {
	$("#load_registration").prop('src','http://icdev.guardianproject.info/informacam/');
}

function renderData(route, params) {
	var data_pack = [];
	
	switch(route) {
		case 'main':
			data_pack.push(
				{
					data : "recent/", 
					render : {
						template: "list_submissions_item",
						root: $("#recent_submissions_holder")
					},
					callback: function() {
						$(".submission_thumb_holder").on('mouseover', function() {
							var rollover = $(this)
								.children(".submission_thumb_rollover")[0];
							
							$(rollover).css('display','block');
							$(rollover).on('mouseleave', function() {
								$(this).css('display', 'none');
							});
						});
						
						$(".submission_thumb_holder").on('mouseleave', function() {
							var rollover = $(this).
								children(".submission_thumb_rollover")[0];
							$(rollover).css('display','none');
						});
					}
				}
			);
			break;
		case 'submissions':
			data_pack.push(
				{
					data: "submissions/",
					render: {
						template: "list_submissions_item",
						root: $("#submissions_holder")
					},
					callback: function() {
						$(".submission_thumb_holder").on('mouseover', function() {
							var rollover = $(this)
								.children(".submission_thumb_rollover")[0];
							
							$(rollover).css('display','block');
							$(rollover).on('mouseleave', function() {
								$(this).css('display', 'none');
							});
						});
						
						$(".submission_thumb_holder").on('mouseleave', function() {
							var rollover = $(this).
								children(".submission_thumb_rollover")[0];
							$(rollover).css('display','none');
						});
					}
				}
			);
			break;
		case 'submission':
			data_pack.push(
				{
					data: location.pathname.substring(1),
					render: {
						template: "view_submission",
						root: $("#submission_holder")
					}
				}
			);
			break;
		case 'sources':
			data_pack.push(
				{
					data: "sources/",
					render: {
						template: "list_sources_item",
						root: $("#sources_holder")
					}
				}
			);
			break;
		case 'source':
			break;
		case 'search':
			if(params != null && params != undefined) {
				console.info(params);
				
				data_pack.push(
					{
						data: "submissions/?" + params.q,
						render: {
							template: params.t,
							root: $(params.r)
						}
					}
				);
			}
			break;
	}
	
	for(dp in data_pack) {
		// call for data
		$.ajax({
			url: "/api/" + data_pack[dp].data,
			dataType: 'json',
			success: function(data) {
			
				// render into template
				if(data.result == 200) {
					data_pack[dp].render.root.empty();
					$.ajax({
						url: "/layout/" + data_pack[dp].render.template + ".html",
						dataType: "html",
						success: function(html) {
							var obj = Object.prototype.toString.call(data.data);
							var data_ = [];
							
							if(obj == "[object Object]") {
								data_.push(data.data);
							} else if(obj == "[object Array]") {
								data_ = data.data;
							}
							
							$.each(data_, function() {
								data_pack[dp].render.root.append(
									Mustache.to_html(html, this)
								);
							});
							
							if(data_pack[dp].callback != undefined) {
								data_pack[dp].callback.call();
							}
							
							translate();
						}
					});
				}
			}
		});
		
		
	}
}

var J3MViewer = function(j3m_path, media_path) {
	var cloudmadeApiKey = '23c00ae936704081ab019253c36a55b3';
	
	this.map;
	this.sensorData = new Array();
	this.j3mPath = j3m_path;
	this.media_path = media_path;

        var VIEWER_WIDTH = 968;
	
	this.loadMap = function(lat,lon) {
		map = L.map('map').setView([lat,lon], 6);
		L.tileLayer('http://{s}.tile.cloudmade.com/' + cloudmadeApiKey + '/110483/256/{z}/{x}/{y}.png', {
			maxZoom: 18,
			attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
		}).addTo(map);
		var marker = L.marker([lat,lon]).addTo(map);
		map.setZoom(16);
	}
	
	this.addMapPoint = function(lat,lon) {
		if (!map) {
			loadMap(lat, lon)
  		} else {
			var marker = L.marker([lat,lon]).addTo(map);
  		}
	}
	
	this.addList = function(name, arraySensorData) {
		var list = $(document.createElement('div'))
			.addClass('span12')
			.attr('id', name + "List")
			.append($(document.createElement('h3')).html(name));
			
		$("#main-row").append(
			$(document.createElement('div'))
				.addClass('row-fluid')
				.append(list)
		);

		$.each(arraySensorData,function(id, item){
			if(item instanceof Array) {
				$.each(item,function(id2, item2) {
					$("#" + name + "List").append(
						$(document.createElement('div')).html(id + ": " + item2)
					);
                
                });
            } else if (typeof item =='object') {
            	var date = moment(Number(item.timestamp));
            	
            	if(name != "UserData") {
					$("#" + name + "List").append(
						$(document.createElement('div'))
							.html(id + ": " + item.value + " at " + date.format("HH:mm:ss"))
					);
				} else {
					var parsedData = [];
					$.each(item.associatedForms, function(idx, form) {
						$.each(Object.keys(form.answerData), function(idx_, key) {
							
							parsedData.push($(document.createElement('p'))
								.append(
									$(document.createElement('span'))
										.addClass('ic_label')
										.html(key + ": ")
								)
								.append(
									$(document.createElement('span'))
										.html(form.answerData[key])
								)
							);
						});
					});
										
					$.each(parsedData, function(idx, pd) {
						$("#" + name + "List").append(pd);
					});
					
				}
            } else {
                $("#" + name + "List").append(
                	$(document.createElement('div')).html(id + ": " + item)
                );
            }
	  });

	};
	this.addRadarChart = function(name,arraySensorData) {

		var inner_span = $(document.createElement('div'))
			.addClass('span12')
			.append($(document.createElement('h3')).html(name))
			.append(
				$(document.createElement('canvas'))
					.attr('id', name + 'Chart')
					.prop({
						'height' : 300,
						'width': 300
					})
			);
  		$("#main-row").append(
  			$(document.createElement('div'))
  				.addClass('row-fluid')
  				.append(inner_span)
  		);

		var ctx = $("#" + name + "Chart").get(0).getContext("2d");

  		var sensordata = new Array ();

		$.each( arraySensorData, function(idx, sensorItem ) {
			sensordata[sensorItem.value] = 1 + (sensordata[sensorItem.value]||0);
		});

		var chartData = {
		labels :[],
		datasets : [
		{
			fillColor : "rgba(220,220,220,0.5)",
			strokeColor : "rgba(220,220,220,1)",
			pointColor : "rgba(220,220,220,1)",
			pointStrokeColor : "#fff",
			data :[]
		} ]
		};

		for(var sensorid in sensordata) {
		  if(sensordata.hasOwnProperty(sensorid)) {

			chartData.labels.push(sensorid);
			chartData.datasets[0].data.push(sensordata[sensorid]);
			console.log("adding " + sensorid + "=" + sensordata[sensorid]);
  		  }
		};

  		var newChart = new Chart(ctx).Radar(chartData);
	};

	this.addDonutChart = function(name,arraySensorData) {

		arraySensorData.sort(function(a,b){return a.timestamp-b.timestamp});

		var inner_span = $(document.createElement('div'))
			.addClass('span12')
			.append($(document.createElement('h3')).html(name))
			.append(
				$(document.createElement('canvas'))
					.attr('id', name + 'Chart')
					.prop({
						'height' : 300,
						'width': 300
					})
			);
  		$("#main-row").append(
  			$(document.createElement('div'))
  				.addClass('row-fluid')
  				.append(inner_span)
  		);

		var ctx = $("#" + name + "Chart").get(0).getContext("2d");

  		var sensordata = new Array ();

		$.each( arraySensorData, function(idx, sensorItem ) {
			var key = sensorItem.value.split(" (")[0];
			sensordata[key] = 1 + (sensordata[key]||0);
		});
		
  		var data = new Array ();
		for(var sensorid in sensordata) {
		  if(sensordata.hasOwnProperty(sensorid)) {
			var chartEntry = new Object();
			chartEntry.value = sensordata[sensorid];
			chartEntry.color = get_random_color();
			data.push(chartEntry);
			console.log("adding " + sensorid + "=" + sensordata[sensorid]);
  		  }
		};


  		var newChart = new Chart(ctx).Doughnut(data);
	};
	
	this.addLineChart = function(name, chartType, arraySensorData) {
		arraySensorData.sort(function(a,b){return a.timestamp-b.timestamp});

		var inner_span = $(document.createElement('div'))
			.addClass('span12')
			.append($(document.createElement('h3')).html(name))
			.append(
				$(document.createElement('canvas'))
					.attr('id', name + 'Chart')
					.prop({
						'height' : 300,
						'width': VIEWER_WIDTH
					})
			);
  		$("#main-row").append(
  			$(document.createElement('div'))
  				.addClass('row-fluid')
  				.append(inner_span)
  		);

		var ctx = $("#" + name + "Chart").get(0).getContext("2d");

  		var labels = new Array(); 
  		var datas = new Array ();

		var interval = 20;
		var idx = 0;

   		$.each(arraySensorData, function(id, item) {
			
			if (idx == 0) {
				var date = moment(Number(item.timestamp));
				labels[labels.length] = date.format("HH:mm:ss");
           		 	datas[datas.length] = item.value;
	        	}

			idx++;

			if (idx == interval)
				idx = 0; 
      		});

  		var data = {
    		labels : labels,
		    datasets : [
		    	{
					fillColor : "rgba(151,187,205,0.5)",
        			strokeColor : "rgba(151,187,205,1)",
        			pointColor : "rgba(151,187,205,1)",
       				pointStrokeColor : "#fff",
        			data : datas
      			}
			]
  		};

  		var newChat = new Chart(ctx).Line(data);
	};
	
	this.addMultiChart = function(name, chartType, arraySensorData1,arraySensorData2,arraySensorData3
	) {
		arraySensorData1.sort(function(a,b){return a.timestamp-b.timestamp});
		arraySensorData2.sort(function(a,b){return a.timestamp-b.timestamp});
		arraySensorData3.sort(function(a,b){return a.timestamp-b.timestamp});

		var inner_span = $(document.createElement('div'))
			.addClass('span12')
			.append($(document.createElement('h3')).html(name))
			.append($(document.createElement('canvas'))
				.attr('id', name + "Chart")
				.prop({
					'height' : 300,
					'width' : VIEWER_WIDTH
				})
			);
		$("#main-row").append(
			$(document.createElement('div'))
				.addClass('row-fluid')
				.append(inner_span)
		);
		
		var ctx = $("#" + name + "Chart").get(0).getContext("2d");
		var myNewChart = new Chart(ctx);

		var labels = new Array(); 
		var datas1 = new Array();
		var datas2 = new Array();
		var datas3 = new Array();

		var interval = 20;
		var idx = 0;

		$.each(arraySensorData1, function(id, item) {
			if (idx == 0) {
				var date = moment(Number(item.timestamp));
				labels[labels.length] = date.format("HH:mm:ss");
				datas1[datas1.length] = item.value;
			}

			idx++;

			if (idx == interval)
				idx = 0;	
		});

		idx = 0;
		$.each(arraySensorData2,function(id, item){
				if (idx++ == 0)
					datas2[datas2.length] = item.value;

				if (idx == interval) idx = 0;
		});

		$.each(arraySensorData3,function(id, item){
				if (idx++ == 0)
				datas3[datas3.length] = item.value;
				if (idx == interval) idx = 0;
		});

 		var data = {
			labels : labels,
			datasets : [
				{
        			fillColor : "rgba(151,187,205,0)",
        			strokeColor : "rgba(151,0,0,1)",
        			pointColor : "rgba(151,187,205,0)",
        			pointStrokeColor : "rgba(151,187,205,0)",
        			data : datas1
      			},
      			{
              		fillColor : "rgba(205,187,205,0)",
      				strokeColor : "rgba(0,151,0,1)",
      				pointColor : "rgba(151,187,205,0)",
        			pointStrokeColor : "rgba(151,187,205,0)",
        			data : datas2
      			},
      			{
        			fillColor : "rgba(151,205,187,0)",
        			strokeColor : "rgba(0,0,151,1)",
        			pointColor : "rgba(151,187,205,0)",
        			pointStrokeColor : "rgba(151,187,205,0)",
        			data : datas3
      			}

			]
		};

  		var newChart = new Chart(ctx).Line(data);
	}
	
	this.parse = function() {
		$.getJSON(this.j3mPath, function(j3m) {
			var SensorEvent = function(type, value, timestamp) {
				this.type = type;
				this.value = value;
				this.timestamp = timestamp;
			}
			
			$('#content_title').text(j3m.genealogy.hashes[0]);

			if (j3m.data.exif.location) {
				j3m_viewer.loadMap(j3m.data.exif.location[0],j3m.data.exif.location[1]);
			}

			j3m_viewer.addList("Intent",j3m.intent);
			j3m_viewer.addList("Camera",j3m.data.exif);
			j3m_viewer.addList("Genealogy",j3m.genealogy);

			if (j3m.data.userAppendedData) {
				console.info(j3m.data.userAppendedData);
				j3m_viewer.addList("UserData", j3m.data.userAppendedData);
			}
	
			var timestamp = 0;
			$.each(j3m.data.sensorCapture, function(id, item) {
				$.each(item,function(id, item) {
					if(typeof item =='object') {
						$.each(item,function(id, item) {
							if(typeof item =='object') {
								$.each(item,function(id2, item2) {
									if(item2.bssid) {
										if(!j3m_viewer.sensorData['ssid']) {
											j3m_viewer.sensorData['ssid'] = new Array();
										}

										var sensorEvent = new SensorEvent(
											'ssid', 
											item2.ssid + " (" + item2.bssid + ")", 
											timestamp
										);

										j3m_viewer.sensorData['ssid'][j3m_viewer.sensorData['ssid'].length] = sensorEvent;    
									} else {
										if (!j3m_viewer.sensorData[id]) {
											j3m_viewer.sensorData[id] = new Array();
										}

										var sensorEvent = new SensorEvent(id, item, timestamp);
									j3m_viewer.sensorData[id][j3m_viewer.sensorData[id].length] = sensorEvent;
									}
								});
							} else {
								if (!j3m_viewer.sensorData[id]) {
									j3m_viewer.sensorData[id] = new Array();
								}

								var sensorEvent = new SensorEvent(id, item, timestamp);
								j3m_viewer.sensorData[id][j3m_viewer.sensorData[id].length] = sensorEvent;
							}
						});
					} else {
						if (id == "timestamp") {
							timestamp = item;
						}
					}
				});
			});


			j3m_viewer.addLineChart(
				"lightMeterValue","",j3m_viewer.sensorData["lightMeterValue"]
			);
			if (j3m_viewer.sensorData["pressureHPAOrMBAR"])
			{
				j3m_viewer.addLineChart(
					"pressureHPAOrMBAR","",j3m_viewer.sensorData["pressureHPAOrMBAR"]
				);
			}
			j3m_viewer.addMultiChart(
				"PitchRollAzimuth","",
				j3m_viewer.sensorData["pitch"],
				j3m_viewer.sensorData["roll"],
				j3m_viewer.sensorData["azimuth"]
			);
			j3m_viewer.addMultiChart(
				"Accelerometer","",
				j3m_viewer.sensorData["acc_x"],
				j3m_viewer.sensorData["acc_y"],
				j3m_viewer.sensorData["acc_z"]
			);

			if (j3m_viewer.sensorData["bluetoothDeviceName"]){	
				j3m_viewer.addDonutChart("bluetoothDeviceName",j3m_viewer.sensorData["bluetoothDeviceName"]);
			}
			
			if(j3m_viewer.sensorData["cellTowerId"] != undefined) {
				j3m_viewer.addDonutChart("cellTowerId",j3m_viewer.sensorData["cellTowerId"]);
			}
			
			if(j3m_viewer.sensorData["ssid"] != undefined) {
				j3m_viewer.addDonutChart("ssid",j3m_viewer.sensorData["ssid"]);
			}

  		});
	}
}

$(document).ready(function() {
	var route = $('body').attr('class');
	renderUi(route);
});

function get_random_color() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.round(Math.random() * 15)];
    }
    return color;
}
