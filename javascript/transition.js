(function(){
	const pageTransition = document.getElementById('page-transition');
	if(!pageTransition) return;

	// simple helpers
	function showTransition(){
		pageTransition.classList.add('transition-active');
		pageTransition.classList.remove('transition-hidden');
	}
	function hideTransition(){
		pageTransition.classList.remove('transition-active');
		pageTransition.classList.add('transition-hidden');
	}

	// intercept internal link clicks to show transition
	document.addEventListener('click', function(e){
		const a = e.target.closest('a');
		if(!a || !a.href) return;
		// only intercept same-origin internal navigation (same host)
		try{
			const url = new URL(a.href, location.href);
			if(url.origin === location.origin && !a.hasAttribute('target') && !a.href.startsWith('mailto:') && !a.href.startsWith('tel:')){
				e.preventDefault();
				showTransition();
				setTimeout(()=> { location.href = a.href; }, 420);
			}
		}catch(err){}
	});

	// when page loads, hide transition after short delay
	window.addEventListener('pageshow', function(){
		setTimeout(hideTransition, 80);
	});
})();
