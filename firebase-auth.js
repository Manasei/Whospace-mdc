// Firebase auth + UI helper (prototype, client-side role check via adminEmails)

(function(){
	// Firebase config (fournie)
	const firebaseConfig = {
	  apiKey: "AIzaSyCo8L4cE7vuHJ9ik2bYF7v_CKzAlfr5vS4",
	  authDomain: "whospace-e4d9d.firebaseapp.com",
	  projectId: "whospace-e4d9d",
	  storageBucket: "whospace-e4d9d.firebasestorage.app",
	  messagingSenderId: "973203916314",
	  appId: "1:973203916314:web:0433c9aed306725880b3a3",
	  measurementId: "G-M9VL01YV2N"
	};

	// Admins (prototype). Remplacez par la liste souhaitée ou utilisez claims côté serveur en production.
	const adminEmails = [
		"admin@whospace.fr" // exemple — modifiez ici
	];

	// init firebase
	if(!window.firebase || !firebase.apps){
		console.error('Firebase SDK non chargé. Vérifiez les <script> firebase-app & firebase-auth inclus.');
		return;
	}
	const app = firebase.initializeApp(firebaseConfig);
	const auth = firebase.auth();

	// safe init (évite double init & gère absence du SDK)
	try {
		if(!window.firebase){ console.error('Firebase SDK non chargé.'); throw new Error('Firebase SDK absent'); }
		if(!firebase.apps || !firebase.apps.length) {
			firebase.initializeApp(firebaseConfig);
		} else {
			firebase.app();
		}
	} catch(e){
		console.error('Initialisation Firebase échouée', e);
		// continue but operations d'auth afficheront message utile ci‑dessous
	}

	// helper pour erreur de configuration
	function showConfigHint(err){
		console.error('Auth error', err);
		if(err && err.code === 'auth/configuration-not-found'){
			alert(
				"Erreur Firebase (auth/configuration-not-found).\n\n" +
				"Pour corriger :\n" +
				"• Allez dans Firebase Console → Authentication → Sign-in method\n" +
				"• Activez 'Email/Password'\n" +
				"• Ajoutez votre domaine (ex: localhost ou domaine hébergé) dans 'Authorized domains'\n" +
				"• Rechargez le site\n\n" +
				"Vérifiez également que firebase-app-compat.js et firebase-auth-compat.js sont inclus avant ce script."
			);
			return true;
		}
		return false;
	}

	// utility: ensure there's a login modal in DOM (if page doesn't include it)
	function ensureModal(){
		if(document.getElementById('loginModal')) return;
		const tpl = document.createElement('div');
		tpl.innerHTML = `
			<div class="modal-backdrop" id="loginModal" aria-hidden="true">
				<div class="modal">
					<button class="modal-close" id="closeModal">&times;</button>
					<h2>Connexion (prototype)</h2>
					<form id="loginForm" class="login-form">
						<label>Email
							<input name="username" type="email" required placeholder="email@example.com">
						</label>
						<label>Mot de passe
							<input name="password" type="password" required placeholder="••••••">
						</label>
						<div class="form-actions">
							<button type="submit" class="btn primary">Se connecter</button>
							<button type="button" class="btn" id="cancelLogin">Annuler</button>
						</div>
					</form>
					<p class="muted">Prototype : en production utilisez règles/claims côté serveur.</p>
				</div>
			</div>
		`;
		document.body.appendChild(tpl.firstElementChild);
	}

	// add login/logout UI into navbar
	function ensureNavLogin(){
		const nav = document.querySelector('.navbar .nav-links');
		if(!nav) return;

		// avoid duplicates
		if(nav.querySelector('#loginToggle')) return;

		const li = document.createElement('li');
		li.innerHTML = `<a href="#" id="loginToggle">Connexion</a>`;
		nav.appendChild(li);

		// placeholder for user display / logout
		const liUser = document.createElement('li');
		liUser.innerHTML = `<a href="#" id="userToggle" style="display:none"></a>`;
		nav.appendChild(liUser);

		document.getElementById('loginToggle').addEventListener('click', (e)=>{
			e.preventDefault();
			openModal();
		});
	}

	// open/close modal helpers
	function openModal(){
		ensureModal();
		const m = document.getElementById('loginModal');
		if(!m) return;
		m.classList.add('open');
		m.setAttribute('aria-hidden','false');
		// attach handlers after ensuring modal exists
		attachModalHandlers();
	}
	function closeModal(){
		const m = document.getElementById('loginModal');
		if(!m) return;
		m.classList.remove('open');
		m.setAttribute('aria-hidden','true');
	}

	// attach only once
	let handlersAttached = false;
	function attachModalHandlers(){
		if(handlersAttached) return;
		handlersAttached = true;
		const m = document.getElementById('loginModal');
		if(!m) return;
		const closeBtn = m.querySelector('.modal-close');
		const cancelBtn = m.querySelector('#cancelLogin');
		const form = m.querySelector('#loginForm');
		if(closeBtn) closeBtn.addEventListener('click', closeModal);
		if(cancelBtn) cancelBtn.addEventListener('click', closeModal);
		if(form){
			form.addEventListener('submit', async (ev)=>{
				ev.preventDefault();
				const email = form.username.value.trim();
				const password = form.password.value;
				if(!email || !password) { alert('Email et mot de passe requis'); return; }
				try{
					await auth.signInWithEmailAndPassword(email, password);
					closeModal();
				}catch(err){
					// if user not found, propose creation
					if(err.code === 'auth/user-not-found'){
						if(confirm("Compte non trouvé. Créer un compte avec ces identifiants ?")){
							try{
								await auth.createUserWithEmailAndPassword(email, password);
								alert('Compte créé et connecté.');
								closeModal();
							}catch(e2){
								alert('Erreur création compte: ' + (e2.message||e2));
							}
						}
					} else {
						if(!showConfigHint(err)) alert('Erreur connexion: ' + (err.message || err));
					}
				}
			});
		}
	}

	// update nav when auth state changes
	function updateNav(user){
		const loginLink = document.getElementById('loginToggle');
		const userLink = document.getElementById('userToggle');
		if(user){
			// set admin flag if email in adminEmails
			const email = user.email || user.displayName || 'Utilisateur';
			if(adminEmails.includes(email)) document.body.classList.add('admin-active');
			else document.body.classList.remove('admin-active');

			// show user and logout
			if(loginLink) loginLink.style.display = 'none';
			if(userLink) {
				userLink.style.display = '';
				userLink.textContent = `Salut, ${email}`;
				// clicking user toggles sign out prompt
				userLink.onclick = (e)=>{
					e.preventDefault();
					if(confirm('Se déconnecter ?')) auth.signOut();
				};
			}
		}else{
			document.body.classList.remove('admin-active');
			if(loginLink) loginLink.style.display = '';
			if(userLink) {
				userLink.style.display = 'none';
				userLink.textContent = '';
				userLink.onclick = null;
			}
		}
	}

	// observe auth state
	auth.onAuthStateChanged(user=>{
		updateNav(user);
	});

	// on load
	document.addEventListener('DOMContentLoaded', ()=>{
		ensureNavLogin();
		// ensure modal handlers if modal already present on page
		if(document.getElementById('loginModal')) attachModalHandlers();
		// expose open/close for other scripts if needed
		window.whospaceAuth = { openModal, closeModal, auth, adminEmails };
	});
})();
