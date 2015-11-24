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
		vis: null
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
			var ll = [stop.properties.stop_lat, stop.properties.stop_lon]

			toVis[id].early = L.circle(ll, props.early*circle_scale, {color: "blue", weight: 1});
			toVis[id].early["properties"] = {val: props.early, vis: true};

			toVis[id].late = L.circle(ll, props.late*circle_scale, {color: "red", weight: 1});
			toVis[id].late["properties"] = {val: props.late, vis: true};

			toVis[id].ontime = L.circle(ll, props.ontime*circle_scale, {color: "yellow", weight: 1});
			toVis[id].ontime["properties"] = {val: props.ontime, vis: true};
		}
	});

	Object.keys(toVis).forEach(function (stop_id) {
		var stop = toVis[stop_id];
		stop.early.addTo(map)
		stop.late.addTo(map)
		stop.ontime.addTo(map)
	});

	globals.lastcall.vis = toVis;
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
  var early = $("#param_stoptype_early")[0].checked;
  var ontime = $("#param_stoptype_ontime")[0].checked;
  var late = $("#param_stoptype_late")[0].checked;

	if (globals.lastcall.vis !== null) {
		Object.keys(globals.lastcall.vis).forEach(function (k) {
			Object.keys(globals.lastcall.vis[k]).forEach(function (a) {
				var add_early = ((a == "early") && early)
				var rem_early = ((a == "early") && !early)

				var add_ontime = ((a == "ontime") && ontime)
				var rem_ontime = ((a == "ontime") && !ontime)

				var add_late = ((a == "late") && late)
				var rem_late = ((a == "late") && !late)

				if (add_early || add_ontime || add_late) {
					if (globals.lastcall.vis[k][a].properties.vis == false) {
						globals.lastcall.vis[k][a].addTo(map);
					}
					globals.lastcall.vis[k][a].properties.vis = true;
				} else if (rem_early || rem_ontime || rem_late) {
					if (globals.lastcall.vis[k][a].properties.vis == true) {
						map.removeLayer(globals.lastcall.vis[k][a]);
					}
					globals.lastcall.vis[k][a].properties.vis = false;
				}
			});
		});
	}
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