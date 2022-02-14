;(function(){
	'use strict';

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
		}
	};

	window.Routes = Routes;

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

})();