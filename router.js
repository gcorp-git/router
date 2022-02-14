;(function(){
	'use strict';

	const STATE = {
		isInited: false,
		allowedOptions: {
			processLinks: v => typeof v === 'boolean',
			routes: v => v instanceof Object,
			getState: v => typeof v === 'function',
			onVisit: v => typeof v === 'function',
		},
	};

	const OPTIONS = {
		processLinks: true,
		routes: undefined,
		getState: undefined,
		onVisit: ({ location, state }) => {},
	};

	class Router {
		constructor( options ) {
			if ( STATE.isInited ) return;

			STATE.isInited = true;

			_setOptions( options );

			document.addEventListener( 'click', _onLinkClick );
			window.onpopstate = e => OPTIONS.onVisit( e.state );

			this.visit( document.location.href );
		}
		visit( url ) {
			if ( typeof url !== 'string' ) {
				throw 'incorrect URL format';
			}

			const data = _getHistoryData( url );

			if ( !( data instanceof Object ) ) return;

			_jump( data );
		}
	};

	window.Router = Router;

	function _setOptions( options ) {
		if ( !( options instanceof Object ) ) return;

		for ( const name in STATE.allowedOptions ) {
			if ( options[ name ] !== undefined ) {
				const validate = STATE.allowedOptions[ name ];

				if ( !validate || !validate( options[ name ] ) ) {
					throw 'incorrect options format';
				}
				
				OPTIONS[ name ] = options[ name ];
			}
		}
	}

	function _onLinkClick( e ) {
		if ( !OPTIONS.processLinks ) return;

		let $link = null;

		for ( const $node of e.path ) {
			if ( $node.tagName === 'A' ) {
				$link = $node;

				break;
			}
		}

		if ( !$link ) return;

		const attr = $link.getAttribute( 'data-router' );

		if ( attr === 'ignore' ) return;

		const url = $link.getAttribute( 'href' );
		const data = _getHistoryData( url );

		if ( !( data instanceof Object ) ) return;

		e.preventDefault();
		
		_jump( data );
	}

	function _getHistoryData( url ) {
		url = _getProcessedURL( url );

		if ( url === undefined ) return undefined;

		const route = ( OPTIONS.routes ) ? _getRoute( url, OPTIONS.routes ) : undefined;
		const state = ( OPTIONS.getState ) ? OPTIONS.getState( url, route ) : ( route ?? { url } );

		if ( state === undefined ) return undefined;

		if ( !( state instanceof Object ) ) {
			throw 'getState() returned incorrect result';
		}

		return { state, url };
	}

	function _getProcessedURL( url ) {
		url = url.trim();

		if ( url.indexOf( '//' ) === 0 ) {
			url = location.protocol + url;
		}

		if ( url.indexOf( location.origin ) === 0 ) {
			url = url.substr( location.origin.length );
		}

		try {
			if ( ( new URL( url ) ).origin !== location.origin ) return undefined;
		} catch ( e ) {}

		switch ( true ) {
			case url.indexOf( '/' ) === 0: {} break;
			case url.indexOf( '#' ) === 0: {
				url = location.pathname + location.search + url;
			} break;
			case url.indexOf( '?' ) === 0: {
				url = location.pathname + url;
			} break;
			default: {
				const lsp = location.pathname.lastIndexOf( '/' );
				const path = ( lsp !== -1 ) ? location.pathname.substr( 0, lsp + 1 ) : '';

				url = path + url;
			} break;
		}

		return url;
	}

	function _jump({ state, url }) {
		if ( !( state instanceof Object ) ) {
			throw 'state should be an object';
		}

		window.history.pushState( state, document.title, url );

		OPTIONS.onVisit( window.history.state );
	}

	function _collectRouteArgs( path, regexp, args ) {
		let matches = [ ...path.matchAll( regexp.regexp ) ];

		if ( !matches.length || !matches[0].length ) return false;

		const pathMatches = matches[0].slice( 1 );

		for ( let i = 0, len = pathMatches.length; i < len; i++ ) {
			args[ regexp.names[ i ] ] = pathMatches[ i ];
		}

		return true;
	}

	function _getRoute( url, routes ) {
		if ( typeof window.Routes !== 'function' ) {
			throw 'class Routes not found';
		}
		if ( !( routes instanceof window.Routes ) ) {
			throw 'incorrect routes format';
		}

		let found = routes.default;

		for ( const route of routes.list ) {
			const _url = new URL( location.origin + url );

			const args = {};

			if ( !_collectRouteArgs( _url.pathname, route.path, args ) ) continue;

			for ( let i = 0, len = route.params.length; i < len; i++ ) {
				const pair = route.params[ i ];
				const value = _url.searchParams.get( pair[0] );

				if ( value !== null ) {
					_collectRouteArgs( value, pair[1], args );
				}
			}

			if ( route.hash ) {
				_collectRouteArgs( _url.hash.substr( 1 ), route.hash, args );
			}

			found = { ...route.state, ...args };

			break;
		}

		return found;
	}

})();