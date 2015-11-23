var globals = {
	stops: {
		all: [],
		vis: [],
		hidden: false
	},
	lastcall: {
		date: null,
		hour: null,
		res: null
	}
}

function plotStops (res) {
	res.forEach(function (stop) {
		var s = L.circle([stop.stop_lat, stop.stop_lon], 2, {color: "#00c3c3", weight: 1});
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
	toggleLoad("on");

	var date = $("#param_date")[0].value;
	var hour = $("#param_hour")[0].value.split(":")[0];

	if (date !== globals.lastcall.date || hour !== globals.lastcall.hour) {
		$.ajax({
		  url: "api/arrivals",
		  type: "get",
		  data: {date: date, hour: hour},
		  success: function (res) {
		  	globals.lastcall.date = date;
		  	globals.lastcall.hour = hour;
		  	globals.lastcall.res = res;

		  	console.log(res);
		  	renderQuery();
		  	toggleLoad("off");
		  },
		  error: function (err) {
		    alert("Error: ", err);
		  }
		});
	}
};

function renderQuery () {
	var temp = {};
	Object.keys(globals.lastcall.res).forEach(function (stop_id) {
		var stop = globals.lastcall.res[stop_id];
		if (stop[0] !== null && stop[1] !== null) {
			console.log("Wow");
		}
	});
	globals.stops.all.forEach(function (stop) {
		
	});
}

function toggleLoad (specific) {
	if (specific == "on")
		$(".ajax").show();	
	else if (specific == "off")
		$(".ajax").hide();
	else
		$(".ajax").toggle();
}