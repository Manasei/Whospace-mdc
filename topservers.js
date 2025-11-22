(function(){
	// use provided API key only if set — do not default to token
	const API_KEY = window.TOP_SERVERS_API_KEY || 'CV3YXVBMTS6F3R';
	const SERVER_TOKEN = window.TOP_SERVER_TOKEN || '';
	const BASE = window.TOP_SERVERS_BASE || 'https://api.top-serveurs.net/v1';
	const DOC_URL = 'https://api.top-serveurs.net/documentation';

	const container = document.getElementById('topServersContainer');
	if(!container){
		console.warn('TopServers container introuvable — annulation.');
		return;
	}
	const loader = container.querySelector('.loader');
	const errBox = container.querySelector('.ts-error');
	const listBox = container.querySelector('.ts-list');

	function showError(msg){
		if(loader) loader.style.display = 'none';
		errBox.style.display = '';
		errBox.innerHTML = `<strong>Erreur récupération Top‑Serveurs :</strong> ${escapeHtml(msg)}<br><small>Doc : <a href="${DOC_URL}" target="_blank" rel="noopener">${DOC_URL}</a></small>`;
		listBox.style.display = 'none';
	}

	function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

	function renderServerCard(s){
		// common mappings with fallbacks
		const name = s.name || s.nom || s.serverName || 'Serveur';
		const address = s.address || s.ip || s.server || '—';
		const players = (s.players !== undefined) ? s.players : (s.currentPlayers || null);
		const max = (s.maxPlayers !== undefined) ? s.maxPlayers : (s.max || null);
		const votes = s.votes || s.vote_count || s.votes_count || null;
		const status = (s.online !== undefined) ? (s.online ? 'online' : 'offline') : (s.status || (players!=null ? 'online' : 'unknown'));
		const desc = s.description || s.desc || '';

		const card = document.createElement('div');
		card.className = 'ts-card';
		card.innerHTML = `
			<div class="ts-card-head">
				<div class="ts-name">${escapeHtml(name)}</div>
				<div class="ts-status ${escapeHtml(String(status)).toLowerCase()}">${escapeHtml(String(status))}</div>
			</div>
			<div class="ts-meta">
				<div class="ts-address">IP: <strong>${escapeHtml(address)}</strong></div>
				<div class="ts-players">Joueurs: <strong>${players!==null ? players : '—'}</strong>${max ? ' / '+max : ''}</div>
			</div>
			${desc ? `<div class="ts-desc">${escapeHtml(desc)}</div>` : ''}
			<div class="ts-meta" style="margin-top:6px;">
				${votes !== null ? `<div>Votes: <strong>${escapeHtml(String(votes))}</strong></div>` : ''}
			</div>
			<div class="ts-actions">
				<a class="btn" href="#" onclick="return false">Voir</a>
			</div>
		`;
		return card;
	}

	// new: render a compact server mini card (used in features)
	function renderServerMini(s){
		const mini = document.getElementById('topServersMini');
		if(!mini) return;
		const name = s.name || s.serverName || 'Serveur';
		const address = s.address || s.ip || '—';
		const players = (s.players !== undefined) ? s.players : (s.currentPlayers || '—');
		const max = (s.maxPlayers !== undefined) ? s.maxPlayers : (s.max || null);
		const status = (s.online !== undefined) ? (s.online ? 'online' : 'offline') : (s.status || 'unknown');
		const logo = s.icon || s.image || 'images/MDC_SURVIVAL.png';
		mini.innerHTML = `
			<img src="${escapeHtml(logo)}" alt="${escapeHtml(name)}" class="mini-logo" />
			<div class="mini-info">
				<div class="mini-name">${escapeHtml(name)}</div>
				<div class="mini-desc">${escapeHtml(s.description || s.desc || 'Monde persistant, commerce, métiers et marché communautaire.')}</div>
				<div class="mini-stats ${escapeHtml(String(status))}">Joueurs: <strong>${players}${max? ' / '+max : ''}</strong> — ${escapeHtml(String(status))}</div>
			</div>
		`;
	}

	async function fetchServerByToken(token){
		if(!token){ showError('Token du serveur manquant. Déclarez window.TOP_SERVER_TOKEN avec le TokenDuServeur fourni par Top‑Serveurs.'); return; }

		loader.style.display = '';
		errBox.style.display = 'none';
		listBox.style.display = 'none';

		const url = `${BASE}/servers/${encodeURIComponent(token)}`; // endpoint /v1/servers/:server_token
		try{
			// build headers conditionally (do NOT send X-Api-Key/Authorization if empty)
			const headers = { 'Accept': 'application/json' };
			if(API_KEY) {
				headers['X-Api-Key'] = API_KEY;
				// many APIs don't want Authorization header for token-endpoint; we avoid it unless explicitly needed
			}
			console.debug('TopServers: fetching', url, API_KEY ? '(with API key)' : '(no API key)');
			const res = await fetch(url, { method: 'GET', headers });

			if(!res.ok){
				const text = await res.text();
				let json = null;
				try{ json = JSON.parse(text); } catch(e){}
				if(res.status === 404 || (json && (json.code === 404 || json.message && json.message.toLowerCase().includes('aucun serveur')))){
					showError('Serveur introuvable (ServerNotFound). Vérifiez le token du serveur.');
					return;
				}
				const msg = (json && (json.message || json.error)) ? (json.message || json.error) : `HTTP ${res.status} ${res.statusText}`;
				showError(msg);
				return;
			}
			const data = await res.json();
			// expected shape { code:200, success:true, server: { ... } }
			if(data && data.server){
				// render single server
				loader.style.display = 'none';
				errBox.style.display = 'none';
				listBox.style.display = '';
				listBox.innerHTML = '';
				listBox.appendChild(renderServerCard(data.server));
				// also populate compact mini if present
				renderServerMini(data.server);
				return;
			}
			if(Array.isArray(data)) { listBox.innerHTML=''; data.forEach(s=>listBox.appendChild(renderServerCard(s))); listBox.style.display=''; loader.style.display='none'; return; }
			if(Array.isArray(data.servers)) { listBox.innerHTML=''; data.servers.forEach(s=>listBox.appendChild(renderServerCard(s))); listBox.style.display=''; loader.style.display='none'; return; }

			showError('Réponse inattendue de l’API. Consultez la documentation pour l\'endpoint correct.');
			console.debug('TopServeurs: réponse brute', data);
		}catch(err){
			console.error('fetchServerByToken err', err);
			// Most likely CORS/preflight if request is blocked by server — surface friendly message
			if(err && err.message && err.message.toLowerCase().includes('failed to fetch')){
				showError('Requête bloquée (CORS) ou API inaccessible depuis votre navigateur. Utilisez un proxy côté serveur ou hébergez sur un domaine autorisé.');
			} else {
				showError(err.message || err);
			}
		}
	}

	// initial call tries server token first; expose refresh
	if(SERVER_TOKEN){
		fetchServerByToken(SERVER_TOKEN);
	} else {
		// no token: helpful message
		showError('Aucun token serveur fourni. Déclarez window.TOP_SERVER_TOKEN dans la page (TokenDuServeur).');
	}

	window.topServers = { refresh: ()=> SERVER_TOKEN ? fetchServerByToken(SERVER_TOKEN) : Promise.reject('no-token') };
})();
