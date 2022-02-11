;(function(){
	'use strict';

	const STATE = {
		isInited: false,
		allowedOptions: {
			processLinks: 'boolean',
			getState: 'function',
			onVisit: 'function',
		},
	};

	const OPTIONS = {
		processLinks: true,
		getState: url => {},
		onVisit: ({ location, state }) => {},
	};

	class Routes {
		constructor( routes ) {
			const die = () => { throw 'incorrect routes format'; };

			if ( !( routes instanceof Array ) ) die();

			this.default = undefined;

			const list = [];

			for ( const route of routes ) {
				if ( !( route instanceof Array ) ) die();
				if ( !route.length ) die();

				const tpl = route[0];

				if ( typeof tpl !== 'string' ) die();

				const state = route.length > 1 ? route[1] : undefined;
				const options = route.length > 2 ? route[2] : {};

				if ( !( options instanceof Object ) ) die();

				if ( tpl === '' ) {
					if ( this.default ) die();

					this.default = state;

					continue;
				}

				const names = [];
				const path = _processRoutePath( tpl, names );

				const params = [];

				if ( options.params instanceof Object ) {
					for ( const param in options.params ) {
						params.push([
							param,
							_processRoutePath( options.params[ param ], names ),
						]);
					}
				}

				let hash = '';

				if ( options.hash ) {
					hash = _processRoutePath( options.hash, names );
				}

				list.push({ path, state, params, hash });
			}

			this.list = list;

			return _deepFreeze( this );
		}
	};

	window.Routes = Routes;

	class Router {
		init( options ) {
			if ( STATE.isInited ) return;

			STATE.isInited = true;

			this.setOptions( options );

			document.addEventListener( 'click', _onClick );
			window.onpopstate = e => OPTIONS.onVisit( e.state );

			this.visit( document.location.href );
		}
		setOptions( options ) {
			if ( !( options instanceof Object ) ) return;

			for ( const name in STATE.allowedOptions ) {
				if ( options[ name ] !== undefined ) {
					const type = STATE.allowedOptions[ name ];

					if ( typeof options[ name ] !== type ) {
						throw 'incorrect options format';
					}
					
					OPTIONS[ name ] = options[ name ];
				}
			}
		}
		visit( url ) {
			if ( typeof url !== 'string' ) {
				throw 'incorrect URL format';
			}

			const data = _getHistoryData( url );

			if ( !( data instanceof Object ) ) return;

			_jump( data );
		}
		getRoute( url, routes ) {
			if ( !( routes instanceof Routes ) ) {
				throw 'incorrect routes format';
			}

			let found = routes.default;

			forRoutes:
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
	};

	window.router = new Router();

	function _onClick( e ) {
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

	function _getHistoryData( url ) {
		url = _getProcessedURL( url );

		if ( url === undefined ) return undefined;

		const state = OPTIONS.getState( url );

		if ( state === undefined ) return undefined;

		if ( !( state instanceof Object ) ) {
			throw 'getState() returned incorrect result';
		}

		return { state, url };
	}

	function _jump({ state, url }) {
		if ( !( state instanceof Object ) ) {
			throw 'state should be an object';
		}

		window.history.pushState( state, document.title, url );

		OPTIONS.onVisit( window.history.state );
	}

	function _processRoutePath( tpl, names ) {
		const reName = /^[^\d\W]\w*$/;
		const _names = [];

		let isName = false;
		let regexp = '';

		for ( let i = 0, len = tpl.length; i < len; i++ ) {
			const c = tpl[ i ];

			if ( c === '{' ) {
				if ( isName || i === len - 1 ) die();

				isName = true;

				continue;
			}

			if ( !isName ) {
				if ( c === '}' ) die();

				regexp += _escapeRegExp( c );

				continue;
			}

			let name = '';

			for ( let j = i; j < len; j++ ) {
				const _c = tpl[ j ];

				if ( _c === '{' ) die();
				if ( j === len - 1 && _c !== '}' ) die();

				if ( _c === '}' ) {
					regexp += '([^/?#&]+)';
					name = name.trim();

					if ( !name ) die();
					if ( !reName.test( name ) ) die();
					if ( names.indexOf( name ) !== -1 ) die();

					names.push( name );
					_names.push( name );

					isName = false;
					i = j;

					break;
				}

				name += _c;
			}
		}

		return {
			regexp: new RegExp( '^' + regexp + '$', 'g' ),
			names: _names,
		};
	}

	function _escapeRegExp( s ) {
		return s.replace( /[.*+?^${}()|[\]\\]/g, '\\$&' );
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

	function _deepFreeze( o ) {
		Object.freeze( o );

		if ( o === undefined || o === null ) return o;

		for ( const prop of Object.getOwnPropertyNames( o ) ) {
			if ( o[ prop ] !== null ) {
				if ( typeof o[ prop ] === 'object' || typeof o[ prop ] === 'function' ) {
					if ( !Object.isFrozen( o[ prop ] ) ) {
						_deepFreeze( o[ prop ] );
					}
				}
			}
		}

		return o;
	};

})();