(function(){
	// config (fournie par l'utilisateur)
	const firebaseConfig = {
    apiKey: "AIzaSyCo8L4cE7vuHJ9ik2bYF7v_CKzAlfr5vS4",
	authDomain: "whospace-e4d9d.firebaseapp.com",
	projectId: "whospace-e4d9d",
	storageBucket: "whospace-e4d9d.firebasestorage.app",
	messagingSenderId: "973203916314",
	appId: "1:973203916314:web:0433c9aed306725880b3a3",
	measurementId: "G-M9VL01YV2N"
	};

	// --- remplacement sécurisé de l'initialisation firebase (évite double init) ---
	let app;
	try {
		if(!window.firebase){ console.error('Firebase SDK absent'); throw new Error('Firebase SDK absent'); }
		app = (firebase.apps && firebase.apps.length) ? firebase.app() : firebase.initializeApp(firebaseConfig);
	} catch(initErr){
		console.error('Init Firebase échoué', initErr);
		// allow rest of script to fail gracefully
	}

	// init
	const auth = firebase.auth();
	const db = firebase.firestore();

	// helper: affiche instructions quand la config Auth manque
	function handleAuthError(err){
		console.error('Auth error', err);
		if(err && err.code === 'auth/configuration-not-found'){
			alert(
				"Erreur Firebase (auth/configuration-not-found).\n\n" +
				"Actions recommandées :\n" +
				"1) Ouvrez la console Firebase → Authentication → Sign-in method.\n" +
				"2) Activez 'Email/Password' (Sign-in providers).\n" +
				"3) Sous 'Authorized domains', ajoutez le domaine utilisé (ex: localhost ou votre domaine hébergé).\n" +
				"4) Rechargez la page.\n\n" +
				"Assurez-vous aussi que les scripts Firebase (firebase-app-compat + firebase-auth-compat) sont chargés avant firebase-app.js."
			);
			return true;
		}
		return false;
	}

	// expose API
	const api = {
		auth, db,
		// init page analytics
		async initPage(pageId){
			try{
				const ref = db.collection('analytics').doc(pageId);
				await db.runTransaction(async t=>{
					const doc = await t.get(ref);
					if(!doc.exists) t.set(ref, {views:1, updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
					else t.update(ref, {views: firebase.firestore.FieldValue.increment(1), updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
				});
			}catch(e){ console.warn('analytics err', e); }
		},
		// listen products in realtime, callback receives array of {id, ...data}
		listenProducts(cb){
			return db.collection('products').orderBy('name').onSnapshot(snap=>{
				const arr = [];
				snap.forEach(d=>arr.push(Object.assign({id:d.id}, d.data())));
				cb(arr);
			}, err=>console.error('products listen', err));
		},
		// update product price (admin only client-side; enforce on server via rules in prod)
		async updateProductPrice(id, price){
			const u = auth.currentUser;
			if(!u) throw new Error('Connexion requise');
			// simple role check: read user doc
			const ud = await db.collection('users').doc(u.uid).get();
			if(!ud.exists || ud.data().role !== 'admin') throw new Error('Drois admin requis');
			return db.collection('products').doc(id).update({price: Number(price)});
		},
		// create product if none with same name exists (helper)
		async createProductIfMissing(prod){
			const q = await db.collection('products').where('name','==',prod.name).limit(1).get();
			if(!q.empty) return;
			return db.collection('products').add(Object.assign({createdAt: firebase.firestore.FieldValue.serverTimestamp()}, prod));
		},
		// simulate buy: creates an order doc
		async buyProduct(id){
			const doc = await db.collection('products').doc(id).get();
			if(!doc.exists) return alert('Produit introuvable');
			const data = doc.data();
			const user = auth.currentUser;
			const order = {
				productId: id,
				productName: data.name,
				price: data.price || 0,
				userId: user ? user.uid : null,
				userEmail: user ? user.email : null,
				createdAt: firebase.firestore.FieldValue.serverTimestamp()
			};
			await db.collection('orders').add(order);
			alert('Achat simulé enregistré. Intégrez un backend pour paiements réels.');
		}
	};

	// on signup/signin create user doc if needed and default role
	async function ensureUserDoc(user){
		if(!user) return;
		const ref = db.collection('users').doc(user.uid);
		const snap = await ref.get();
		if(!snap.exists){
			await ref.set({
				email: user.email || null,
				role: 'member',
				createdAt: firebase.firestore.FieldValue.serverTimestamp()
			});
		}
	}

	// auth listeners
	auth.onAuthStateChanged(async user=>{
		if(user){
			await ensureUserDoc(user);
			const ud = await db.collection('users').doc(user.uid).get();
			const role = ud.exists ? ud.data().role : null;
			if(role === 'admin') document.body.classList.add('admin-active');
			else document.body.classList.remove('admin-active');
			// update nav UI if present
			const loginLink = document.getElementById('loginToggle');
			const userToggle = document.getElementById('userToggle');
			if(loginLink) loginLink.style.display = 'none';
			if(userToggle){
				userToggle.style.display = '';
				userToggle.textContent = user.email || 'Utilisateur';
				userToggle.onclick = ()=>{ if(confirm('Se déconnecter ?')) auth.signOut(); };
			}
		}else{
			document.body.classList.remove('admin-active');
			const loginLink = document.getElementById('loginToggle');
			const userToggle = document.getElementById('userToggle');
			if(loginLink) loginLink.style.display = '';
			if(userToggle){ userToggle.style.display = 'none'; userToggle.textContent = ''; userToggle.onclick = null; }
		}
	});

	// minimal login UI wiring if modal exists
	document.addEventListener('DOMContentLoaded', ()=>{
		// ensure nav login link
		const nav = document.querySelector('.navbar .nav-links');
		if(nav && !nav.querySelector('#loginToggle')){
			const li = document.createElement('li');
			li.innerHTML = '<a href="#" id="loginToggle">Connexion</a>';
			nav.appendChild(li);
			const liUser = document.createElement('li');
			liUser.innerHTML = '<a href="#" id="userToggle" style="display:none"></a>';
			nav.appendChild(liUser);
			document.getElementById('loginToggle').addEventListener('click', e=>{ e.preventDefault(); const m=document.getElementById('loginModal'); if(m){ m.classList.add('open'); m.setAttribute('aria-hidden','false'); }});
		}
		// modal handlers
		const modal = document.getElementById('loginModal');
		if(modal){
			const close = modal.querySelector('.modal-close');
			const cancel = modal.querySelector('#cancelLogin');
			const form = modal.querySelector('#loginForm');
			if(close) close.addEventListener('click', ()=>{ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');});
			if(cancel) cancel.addEventListener('click', ()=>{ modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');});
			if(form){
				form.addEventListener('submit', async (ev)=>{
					ev.preventDefault();
					const email = form.username.value.trim();
					const password = form.password.value;
					const mode = form.dataset.mode === 'register' ? 'register' : 'login';
					try{
						if(mode === 'register'){
							// explicit registration flow
							const cred = await auth.createUserWithEmailAndPassword(email, password);
							await ensureUserDoc(cred.user); // create user doc with role: 'member'
							modal.classList.remove('open');
							modal.setAttribute('aria-hidden','true');
						}else{
							// login flow
							await auth.signInWithEmailAndPassword(email, password);
							modal.classList.remove('open');
							modal.setAttribute('aria-hidden','true');
						}
					}catch(err){
						// nicer errors
						if(mode === 'login' && err.code === 'auth/user-not-found'){
							if(confirm('Compte non trouvé. Voulez-vous créer un compte avec ces identifiants ?')){
								try{
									const cred = await auth.createUserWithEmailAndPassword(email, password);
									await ensureUserDoc(cred.user);
									modal.classList.remove('open');
									modal.setAttribute('aria-hidden','true');
								}catch(e2){ alert('Erreur création: '+(e2.message||e2)); }
							}
						}else{
							if(!handleAuthError(err)) alert('Erreur: ' + (err.message || err));
						}
					}
				});
			}
		}
	});

	// expose
	window.whospaceApp = Object.assign({}, api);
})();
