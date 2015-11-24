var globals = {
	stops: {
		all: [],
		vis: [],
		hidden: false
	},
	lastcall: {
		date: null,
		hour: null,
		res: null,
		vis: null,
		max: {val: 0, id: null},
	}
}

function plotStops (res) {
	res.forEach(function (stop) {
		var s = L.circle([stop.stop_lat, stop.stop_lon], 2, {color: "#00c3c3", weight: 1});
		s.properties = stop;
		globals.stops.all.push(s);
	});
	redrawStops();
};

function redrawStops () {
	if (globals.stops.hidden) {
		globals.stops.vis.forEach(function (stop) {
			map.removeLayer(stop);
			globals.stops.all.push(stop);
		});
		globals.stops.vis = [];
	} else {
		var replacement_visible_stops = [];
		globals.stops.vis.forEach(function (stop) {
			if ( !map.getBounds().contains(stop.getLatLng()) ) {
				map.removeLayer(stop);
			} else {
				replacement_visible_stops.push(stop);
			}
		});

		globals.stops.vis = replacement_visible_stops;
		replacement_visible_stops = null;
		
		globals.stops.all.forEach(function (stop) {
			if (map.getBounds().contains(stop.getLatLng())) {
				if ( !checkIfAlreadyAdded(stop._leaflet_id) ) {
					globals.stops.vis.push(stop);
					stop.addTo(map);
				}
			}
		});
	}

	if (globals.lastcall.vis !== null) {
		Object.keys(globals.lastcall.vis).forEach(function (k) {
			Object.keys(globals.lastcall.vis[k]).forEach(function (a) {
				if (globals.lastcall.vis[k][a].properties.vis) {
					var ll = globals.lastcall.vis[k][a].getLatLng();
					if (map.getBounds().contains(ll)) {
						if (globals.lastcall.vis[k][a].properties.onmap == false) {
							globals.lastcall.vis[k][a].addTo(map);
							globals.lastcall.vis[k][a].properties.onmap = true;
						}
					} else {
						if (globals.lastcall.vis[k][a].properties.onmap) {
							map.removeLayer(globals.lastcall.vis[k][a]);
							globals.lastcall.vis[k][a].properties.onmap = false;
						}
					}
				} else {
					if (globals.lastcall.vis[k][a].properties.onmap) {
						map.removeLayer(globals.lastcall.vis[k][a]);
						globals.lastcall.vis[k][a].properties.onmap = false;
					}
				}
			});
		});	
	}
};

function checkIfAlreadyAdded (id) {
	var already_added = false;
	for (var i = 0; i < globals.stops.vis.length; i++) {
		var stop = globals.stops.vis[i];
		if (stop._leaflet_id == id) {
			already_added = true;
			break;
		}
	};
	return already_added;
};

function toggleStops (argument) {
	globals.stops.hidden = !globals.stops.hidden;
	redrawStops();
};

function query () {
	var date = $("#param_date")[0].value;
	var hour = $("#param_hour")[0].value.split(":")[0];

	if (date !== globals.lastcall.date || hour !== globals.lastcall.hour) {
		toggleLoad("on");
		$.ajax({
		  url: "api/arrivals",
		  type: "get",
		  data: {date: date, hour: hour},
		  success: function (res) {
		  	globals.lastcall.date = date;
		  	globals.lastcall.hour = hour;
		  	globals.lastcall.res = res;

		  	renderQuery();
		  	toggleLoad("off");
		  },
		  error: function (err) {
		    alert("Error: ", err);
		  }
		});
	} else {
		renderQuery();
	}
};

function renderQuery () {
	if (globals.lastcall.vis !== null) {
		Object.keys(globals.lastcall.vis).forEach(function (k) {
			Object.keys(globals.lastcall.vis[k]).forEach(function (a) {
				map.removeLayer(globals.lastcall.vis[k][a]);
			});
		});
		globals.lastcall.vis = null;
	}

	var res = globals.lastcall.res;
	var circle_scale = $("#param_scale")[0].value;
	var toVis = {};

	globals.stops.all.forEach(function (stop) {
		var id = stop.properties.stop_id;
		if (res[id] !== undefined) {
			var props = {
				early: 0,
				late: 0,
				ontime: 0
			};

			Object.keys(res[id]).forEach(function (dir) {
				if (res[id][dir] !== null) {
					var a = res[id][dir];

					props.early += getCounts("early", a);
					props.late += getCounts("late", a);
					props.ontime += a.on_time;
				}
			});

			if (toVis[id] == undefined) toVis[id] = {0: null, 1: null};
			toVis[id] = {}
			var ll = [stop.properties.stop_lat, stop.properties.stop_lon];
			var tot = props.early + props.late + props.ontime;

			toVis[id].early = L.circle(ll, props.early*circle_scale, {color: "blue", weight: 1});
			toVis[id].early["properties"] = {
				val: props.early, 
				vis: false, 
				onmap: false,
				pct: Math.round(props.early/tot)
			};

			toVis[id].late = L.circle(ll, props.late*circle_scale, {color: "red", weight: 1});
			toVis[id].late["properties"] = {
				val: props.late, 
				vis: false, 
				onmap: false,
				pct: Math.round(props.late/tot)
			};

			toVis[id].ontime = L.circle(ll, props.ontime*circle_scale, {color: "yellow", weight: 1});
			toVis[id].ontime["properties"] = {
				val: props.ontime, 
				vis: false, 
				onmap: false,
				pct: Math.round(props.ontime/tot)
			};

			var new_max = Math.max(globals.lastcall.max.val, props.early, props.late, props.ontime);
			if (new_max !== globals.lastcall.max.val) {
				globals.lastcall.max.id = id;
				globals.lastcall.max.val = new_max;
			}

		}
	});
	
	$("#changeable_max_miss")[0].innerHTML = "max size is " + 
																				globals.lastcall.max.val + " vehicles x ";
	var tot = "";
	[0, 1].forEach(function (dir) {
		var rte = globals.lastcall.res[globals.lastcall.max.id][dir];
		if (rte !== null) {
		  var tr = "<tr>" +
		    "<td>" + rte.route_id + "</td>" +
		    "<td>" + rte.early_5 + "</td>" +
		    "<td>" + rte.early_2 + "</td>" +
		    "<td>" + rte.early + "</td>" +
		    "<td>" + rte.on_time + "</td>" +
		    "<td>" + rte.late + "</td>" +
		    "<td>" + rte.late_10 + "</td>" +
		    "<td>" + rte.late_15 + "</td>" +
		    "<td>" + rte.late_20 + "</td>" +
		    "<td>" + rte.late_30 + "</td>" +
		    "<td>" + rte.fulfilled + "</td>" +
		  "</tr>";
		  tot = tot + tr;
		}
	});
	$("#changeable_worst_stop")[0].innerHTML = tot;

	globals.lastcall.vis = toVis;
	toggleStopTypes();
};

function resizeCircles () {
	var circle_scale = $("#param_scale")[0].value;
	if (globals.lastcall.vis !== null) {
		Object.keys(globals.lastcall.vis).forEach(function (k) {
			Object.keys(globals.lastcall.vis[k]).forEach(function (a) {
				var r = Number(globals.lastcall.vis[k][a].properties.val) * circle_scale;
				globals.lastcall.vis[k][a].setRadius(r);
			});
		});
	}
};

function toggleStopTypes () {
	toggleLoad("on");
	if (globals.lastcall.vis !== null) {
		console.log("Running long toggle process.");
	  var early = $("#param_stoptype_early")[0].checked;
	  var ontime = $("#param_stoptype_ontime")[0].checked;
	  var late = $("#param_stoptype_late")[0].checked;

		Object.keys(globals.lastcall.vis).forEach(function (k) {
			Object.keys(globals.lastcall.vis[k]).forEach(function (a) {
				var add_early = ((a == "early") && early)
				var rem_early = ((a == "early") && !early)

				var add_ontime = ((a == "ontime") && ontime)
				var rem_ontime = ((a == "ontime") && !ontime)

				var add_late = ((a == "late") && late)
				var rem_late = ((a == "late") && !late)

				if (add_early || add_ontime || add_late) {
					globals.lastcall.vis[k][a].properties.vis = true;
				} else if (rem_early || rem_ontime || rem_late) {
					globals.lastcall.vis[k][a].properties.vis = false;
				}

				// check to see if passes the thresholds set for percentage balance
				var ok = true;
				["early", "late", "ontime"].forEach(function (type) {
					var thresh = $("#param_" + type + "_threshold").val();
					if (globals.lastcall.vis[k][a].properties.pct < thresh) {
						ok = false;
					}
				});
				globals.lastcall.vis[k][a].properties.vis = ok;
			});
		});

		redrawStops();
		console.log("Finished long toggle process.");
	}
	toggleLoad("off");
};

function getCounts (aspect, stop) {
	var base = 0;
	var wanted = getCategories()
	Object.keys(wanted).forEach(function (k) {
		if (wanted[k] && k.indexOf(aspect) > -1) {
			base += stop[k];
		}
	});
	return base;
};

function toggleLoad (specific) {
	if (specific == "on")
		$(".ajax").show();	
	else if (specific == "off")
		$(".ajax").hide();
	else
		$(".ajax").toggle();
}