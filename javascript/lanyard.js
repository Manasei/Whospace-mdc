(function(){
    'use strict';
    const REFRESH_MS = 30000; // 30s
    const BASE = 'https://api.lanyard.rest/v1/users/';

    function escapeHtml(s){ return String(s).replace(/[&<>"']/g, c=> ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

    async function fetchPresence(userId){
        try{
            const res = await fetch(BASE + encodeURIComponent(userId));
            if(!res.ok) return null;
            const json = await res.json();
            if(json && json.success && json.data) return json.data;
            return null;
        }catch(e){
            console.warn('Lanyard fetch error', e);
            return null;
        }
    }

    // build discord avatar url (fallback to default embed avatar)
    function avatarUrl(discord_user){
        if(!discord_user) return '';
        const id = discord_user.id;
        const avatar = discord_user.avatar;
        if(avatar){
            return `https://cdn.discordapp.com/avatars/${id}/${avatar}.png?size=128`;
        }
        const disc = parseInt(discord_user.discriminator || '0', 10) || 0;
        return `https://cdn.discordapp.com/embed/avatars/${disc % 5}.png`;
    }

    // Extract display name only (username#discriminator)
    function displayName(discordUser, data){
        const user = discordUser || (data && (data.discord_user || data.user));
        if(!user) return 'Discord';
        return `${escapeHtml(user.username || '')}#${escapeHtml(user.discriminator || '')}`;
    }

    async function updateWidget(el){
        const userId = el.dataset.user && el.dataset.user.trim();
        const minimal = (el.dataset.minimal === 'true') || el.classList.contains('minimal');

        if(!userId){
            el.className = minimal ? 'discord-presence minimal offline' : 'discord-presence offline';
            el.innerHTML = '<span class="presence-dot"></span>';
            el.title = 'ID Discord non configuré';
            return;
        }

        // loading
        el.innerHTML = '<span class="presence-dot"></span>';

        const data = await fetchPresence(userId);
        if(!data){
            el.className = minimal ? 'discord-presence minimal offline' : 'discord-presence offline';
            el.innerHTML = '<span class="presence-dot"></span>';
            el.title = 'Hors ligne / indisponible';
            return;
        }

        const discordUser = data.discord_user || data.user || { id: userId, username: data.username, discriminator: data.discriminator, avatar: data.avatar };
        const status = (data.discord_status || 'offline').toLowerCase();

        // uniquement le point
        el.className = (minimal ? 'discord-presence minimal ' : 'discord-presence ') + status;
        el.innerHTML = `<span class="presence-dot"></span>`;
        el.title = `${status}`;

        // avatars
        const avatarElements = document.querySelectorAll('.discord-avatar[data-user="'+userId+'"]');
        const url = avatarUrl(discordUser);
        avatarElements.forEach(img=>{
            if(url) img.src = url;
            img.alt = discordUser.username ? `${discordUser.username} avatar` : img.alt||'Discord avatar';
        });

        // usernames (si tu veux les garder ailleurs)
        const nameEls = document.querySelectorAll('.discord-username[data-user="'+userId+'"]');
        const name = displayName(discordUser, data);
        nameEls.forEach(ne=>{
            ne.textContent = name;
        });
    }

    function init(){
        const presenceEls = Array.from(document.querySelectorAll('.discord-presence'));
        if(!presenceEls.length) return;
        presenceEls.forEach(el=>{
            updateWidget(el);
            setInterval(()=> updateWidget(el), REFRESH_MS);
        });
        const avatarEls = Array.from(document.querySelectorAll('.discord-avatar'));
        avatarEls.forEach(img=>{
            const id = img.dataset.user && img.dataset.user.trim();
            if(!id) return;
            const related = document.querySelector('.discord-presence[data-user="'+id+'"]') || (function(){
                const tmp = document.createElement('div');
                tmp.dataset.user = id;
                return tmp;
            })();
            updateWidget(related);
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
