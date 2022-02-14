;(function(){
	'use strict';

	window.router = new Router({
		processLinks: true,
		routes: new Routes([
			[ '/user/{id}/{name}', { route: 'user' }, {
				params: { q1: '{query1}', q2: 'test-{query2}' },
				hash: '{hash}',
			}],
			[ '/', { route: 'index' } ],
			[ '', { route: 'default' } ],
		]),
		getState: ( url, route ) => {
			console.log( 'getState', url, route );

			return { ...route, url };
		},
		onVisit: state => {
			console.log( 'onVisit', state );
		},
	});

})();