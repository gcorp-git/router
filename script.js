;(function(){
	'use strict';

	const routes = new Routes([
		[ '/user/{id}/{name}', { route: 'user' }, {
			params: { q1: '{query1}', q2: 'test-{query2}' },
			hash: '{hash}',
		}],
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