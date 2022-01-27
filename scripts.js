mapboxgl.accessToken = 'pk.eyJ1IjoiZXJpa2F3ZWkiLCJhIjoiY2pqb2kzeXJoMmM1eDNsc280YnBub2d6aCJ9.DapwlemDz4dhkDIG7sNdwQ';
let isFlying = false;
let startLocation = '';
let endLocation = '';

const destinations = [
	[-88.0410, 43.0313],
	[-89.384373, 43.074713],
	[-89.7709579, 43.6274794]
];

const center = [-89.35, 43.05];
const bounds = [
  [-92.889427,42.491592],
  [-86.82352,47.3]
];

//init map
const map = new mapboxgl.Map({
  container: document.getElementById('map'),
  style: 'mapbox://styles/adolphej/ckyd79eal0lyb16lol8hq1gfz',
  center: center,
  minZoom: 1,
  zoom: 12,
  maxBounds: bounds
});
map.scrollZoom.enable();

//init geocoder for user input start
const geocoder = new MapboxGeocoder({
	accessToken: mapboxgl.accessToken, 
	mapboxgl: mapboxgl, 
	marker: false, 
	placeholder: 'Search for places in Wisconsin',
	bbox: [-92.889427,42.491592, -86.82352,47.077252], 
	proximity: {
		longitude: -89.384373,
		latitude: 43.0747
	},
});
	 
//add geocoder to intro screen
const geocoderInput = document.getElementById('geocoder');
geocoder.addTo(geocoderInput);

map.on('load', () => {});


/**************************/
/** https://docs.mapbox.com/mapbox-gl-js/example/free-camera-path **/
/**************************/
function animatePath(routes) {
	// this is the path the camera will look at
	const targetRoute = routes;
	// this is the path the camera will move along
	const cameraRoute = routes;

	const animationDuration = 15000;
	const cameraAltitude = 15000;
	// get the overall distance of each route so we can interpolate along them
	const routeDistance = turf.lineDistance(turf.lineString(targetRoute));
	const cameraRouteDistance = turf.lineDistance(
		turf.lineString(cameraRoute)
	);
	 
	let start;
	 
	function frame(time) {
		if (!start) start = time;
		// phase determines how far through the animation we are
		const phase = (time - start) / animationDuration;
		 
		// phase is normalized between 0 and 1
		// when the animation is finished, reset start to loop the animation
		if (phase > 1) {
			// wait 1.5 seconds before looping
			setTimeout(() => {
				//start = 0.0;
				animationComplete();
			}, 1500);
		}
		 
		// use the phase to get a point that is the appropriate distance along the route
		// this approach syncs the camera and route positions ensuring they move
		// at roughly equal rates even if they don't contain the same number of points
		const alongRoute = turf.along(
			turf.lineString(targetRoute),
			routeDistance * phase
		).geometry.coordinates;
		 
		const alongCamera = turf.along(
			turf.lineString(cameraRoute),
			cameraRouteDistance * phase
		).geometry.coordinates;
		 
		const camera = map.getFreeCameraOptions();
		 
		// set the position and altitude of the camera
		camera.position = mapboxgl.MercatorCoordinate.fromLngLat(
			{
				lng: alongCamera[0],
				lat: alongCamera[1]
			},
			cameraAltitude
		);
		 
		// tell the camera to look at a point along the route
		camera.lookAtPoint({
			lng: alongRoute[0],
			lat: alongRoute[1]
		});
		 
		map.setFreeCameraOptions(camera);
		window.requestAnimationFrame(frame);
	}
	 
	window.requestAnimationFrame(frame);
}

function animationComplete() {
	document.getElementById('popup').style.display = 'block';
}


async function getRoute() {
  const query = await fetch(
    `https://api.mapbox.com/directions/v5/mapbox/driving/${startLocation[0]},${startLocation[1]};${endLocation[0]},${endLocation[1]}?steps=true&geometries=geojson&access_token=${mapboxgl.accessToken}`,
    { method: 'GET' }
  );
  const json = await query.json();
  const data = json.routes[0];
  const route = data.geometry.coordinates;
  const geojson = {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: route
    }
  };
  // if the route already exists on the map, we'll reset it using setData
  if (map.getSource('route')) {
    map.getSource('route').setData(geojson);
  }
  // otherwise, we'll make a new request
  else {
    map.addLayer({
      id: 'route',
      type: 'line',
      source: {
        type: 'geojson',
        data: geojson
      },
      layout: {
        'line-join': 'round',
        'line-cap': 'round'
      },
      paint: {
        'line-color': '#00ABFF',
        'line-width': 5,
        'line-opacity': 0.75
      }
    });
  }

  //fly to start location
  isFlying = true;
  map.flyTo({
		center: startLocation,
		speed: 0.5,
		zoom: 15
	});

  //flyto callback
	map.on('moveend', () => {
		if (isFlying) {
			isFlying = false;
    	animatePath(geojson.geometry.coordinates);
		}
	});

  console.log(geojson.geometry.coordinates);
}


function startAnimation() {
	document.getElementById('overlay').style.display = 'none';
	getRoute();
}


function init() {
	//set up static map
	var staticURL = `https://api.mapbox.com/styles/v1/adolphej/ckyd79eal0lyb16lol8hq1gfz/static/-89.35,43.05,10/300x300?access_token=${mapboxgl.accessToken}`;
  document.getElementById('static-map').style.backgroundImage = `url(${staticURL})`;

  //get page elements and set up event listeners
	const vehicles = document.querySelectorAll('input[type=radio][name="vehicle"]');
	const stepStart = document.getElementById('step-start');
	const stepEnd = document.getElementById('step-end');
	const btnGo = document.getElementById('btn-go');
	
	//vehicle select
	vehicles.forEach(vehicle => {
		vehicle.addEventListener('change', () => {
			stepStart.style.display = 'block';
			console.log('vehicle', vehicle.value);
		});
	});

	//geocoder input
	geocoder.on('result', (event) => {
		stepEnd.style.display = 'block';
		startLocation = event.result.geometry.coordinates;
		console.log('start', startLocation);
	});

	//destination select
	const destination = document.getElementById('destinationSelector');
	destination.addEventListener('change', (event) => {
		btnGo.style.display = 'block';
		endLocation = destinations[event.target.value];
		console.log('end', endLocation);
	});

	//go button
	btnGo.addEventListener('click', startAnimation);
}

init();