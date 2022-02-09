;(function(){
	'use strict';

	const routes = new Routes([
		[ '/user/{id}/{name}?query={query}#{anchor}', { route: 'user-query-anchor' } ],
		[ '/user/{id}/{name}?query={query}', { route: 'user-query' } ],
		[ '/user/{id}/{name}#{anchor}', { route: 'user-anchor' } ],
		[ '/user/{id}/{name}', { route: 'user' } ],
		[ '/', { route: 'index' } ],
		[ '', { route: 'default' } ],
	]);

	window.router.init({
		processLinks: true,
		getState: url => {
			const route = window.router.getRoute( url, routes );

			console.log( 'getState', url, route );

			return { ...route, url };
		},
		onVisit: state => {
			console.log( 'onVisit', state );
		},
	});

})();