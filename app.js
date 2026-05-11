// ============================
// VIREXO — APP LOGIC (UPDATED)
// Real OAuth Integration
// ============================

// ---- CONFIG — Apni values yahan dalo ----
const CONFIG = {
  meta: {
    appId: '1582044639536096',                        // Meta Developer App ID
    redirectUri: 'http://localhost:5500/',   // Aapka redirect URL
    scope: 'pages_manage_posts,pages_read_engagement,instagram_content_publish,instagram_basic,public_profile',
  },
  youtube: {
    clientId: 'YOUR_GOOGLE_CLIENT_ID',
    redirectUri: 'https://yoursite.com/oauth/youtube',
    scope: 'https://www.googleapis.com/auth/youtube.upload',
  },
  tiktok: {
    clientKey: 'YOUR_TIKTOK_CLIENT_KEY',
    redirectUri: 'https://yoursite.com/oauth/tiktok',
    scope: 'video.publish,user.info.basic',
  },
  twitter: {
    clientId: 'YOUR_TWITTER_CLIENT_ID',
    redirectUri: 'https://yoursite.com/oauth/twitter',
  },
  linkedin: {
    clientId: 'YOUR_LINKEDIN_CLIENT_ID',
    redirectUri: 'https://yoursite.com/oauth/linkedin',
    scope: 'w_member_social,r_liteprofile',
  },
};

// ---- DATA ----
const CAPTIONS_DB = {
  viral: [
    { text: "POV: You just stumbled upon the content that's about to break the internet 🌐 Wait till the end — you won't believe what happens next!", badge: "TOP PICK" },
    { text: "This is the video everyone's talking about but nobody's explaining 👀 I finally broke it down so you don't have to." },
    { text: "I've been doing this for 3 years and THIS is the moment that changed everything. Saving this for the people who need it 🔥" },
  ],
  funny: [
    { text: "Me: I'll just watch one video. YouTube at 3am: 👁️👄👁️ Anyway here's why this is the greatest thing you'll ever see", badge: "TRENDING" },
    { text: "Nobody asked for this content. I made it anyway. You're welcome. 😌 Like if you can relate, share if you're chaotic evil." },
    { text: "This is NOT what I planned to post today but the universe had other ideas 💀 Tag someone who needs to see this immediately." },
  ],
  serious: [
    { text: "Breaking down the framework that 97% of creators overlook. This single insight transformed how I approach content strategy." },
    { text: "After analyzing 10,000+ posts, here's the data-backed truth about what actually drives engagement in 2024. Thread 🧵" },
    { text: "The most underrated lesson from this piece of content is something schools never teach. Here's what I wish I knew earlier:", badge: "INSIGHTFUL" },
  ],
  clickbait: [
    { text: "They DELETED this video 3 times. Here's why they don't want you to see it 😳 Watch before it's gone again!", badge: "URGENT" },
    { text: "I tried this for 30 days and the results are INSANE. My doctor couldn't believe it either 🤯 Link in bio for full breakdown!" },
    { text: "This video will change how you see EVERYTHING. I'm not joking. People are saying it's the most important thing they've watched this year 👇" },
  ],
};

const HASHTAGS_DB = {
  viral:     ["#viral", "#trending", "#fyp", "#foryou", "#blowup", "#viralvideo", "#explore", "#reels", "#content", "#creator", "#growth", "#algorithm"],
  funny:     ["#funny", "#lol", "#memes", "#relatable", "#humor", "#comedy", "#lmao", "#vibes", "#mood", "#fyp", "#trending", "#funnymemes"],
  serious:   ["#motivation", "#mindset", "#entrepreneur", "#tips", "#knowledge", "#learn", "#growth", "#success", "#strategy", "#insights", "#valuepost"],
  clickbait: ["#mustsee", "#shocking", "#unbelievable", "#waitforit", "#mindblown", "#viral", "#omg", "#fyp", "#trending", "#secret", "#revealed"],
};

const PLATFORMS = [
  { id: "youtube",   name: "YouTube",   icon: "📺", format: "Long-form / Shorts", trend: "HIGH REACH", color: "#ff0000" },
  { id: "tiktok",    name: "TikTok",    icon: "🎵", format: "Short-form video",   trend: "VIRAL",      color: "#69c9d0" },
  { id: "instagram", name: "Instagram", icon: "📸", format: "Reels / Stories",    trend: "HOT",        color: "#e1306c" },
  { id: "facebook",  name: "Facebook",  icon: "📘", format: "Video / Reels",      trend: null,         color: "#1877f2" },
  { id: "twitter",   name: "Twitter/X", icon: "🐦", format: "Short clips",        trend: null,         color: "#1da1f2" },
  { id: "linkedin",  name: "LinkedIn",  icon: "💼", format: "Professional video", trend: null,         color: "#0077b5" },
];

// ---- TOKEN STORAGE ----
// Tokens ko localStorage mein save karte hain
const Tokens = {
  save(platform, tokenData) {
    localStorage.setItem(`virexo_token_${platform}`, JSON.stringify(tokenData));
  },
  get(platform) {
    const data = localStorage.getItem(`virexo_token_${platform}`);
    return data ? JSON.parse(data) : null;
  },
  remove(platform) {
    localStorage.removeItem(`virexo_token_${platform}`);
  },
  isExpired(platform) {
    const data = this.get(platform);
    if (!data || !data.expiresAt) return true;
    return Date.now() > data.expiresAt;
  }
};

// ---- STATE ----
let state = {
  videoUrl: '',
  detectedPlatform: '',
  selectedTone: 'viral',
  selectedCaption: 0,
  selectedHashtags: new Set(),
  selectedPlatforms: new Set(['youtube', 'tiktok']),
  accounts: [],        // Real accounts — localStorage se load honge
  scheduled: false,
  schedDate: '',
  schedTime: '09:00',
};

// ---- INIT ----
document.addEventListener('DOMContentLoaded', () => {
  loadSavedAccounts();   // Saved real accounts load karo
  renderPlatforms();
  renderAccounts();
  setTodayDate();
  checkOAuthCallback(); // URL mein OAuth callback check karo

  document.getElementById('videoUrl').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') analyzeVideo();
  });
});

// ---- LOAD SAVED ACCOUNTS (localStorage se) ----
function loadSavedAccounts() {
  const saved = localStorage.getItem('virexo_accounts');
  if (saved) {
    state.accounts = JSON.parse(saved);
  } else {
    state.accounts = []; // Pehli baar — koi default nahi, real accounts hi aayenge
  }
}

function saveAccounts() {
  localStorage.setItem('virexo_accounts', JSON.stringify(state.accounts));
}

// ---- OAUTH — URL CALLBACK CHECK ----
// Jab user OAuth se wapas aaye, URL mein ?code= hoga
function checkOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const platform = params.get('state'); // state param mein platform name bheja tha

  if (!code || !platform) return;

  // URL clean karo
  window.history.replaceState({}, document.title, window.location.pathname);

  showToast(`🔄 ${platform} connecting...`, 'success');

  // Platform ke hisaab se token exchange karo
  exchangeCodeForToken(platform, code);
}

// ---- OAUTH FLOWS ---- 

// Facebook + Instagram — Meta OAuth
function connectMeta(type) {
  // state param mein platform name bhejo taake callback mein pata chale
  const platform = type; // 'Facebook' ya 'Instagram'
  const url = `https://www.facebook.com/v19.0/dialog/oauth?`
    + `client_id=${CONFIG.meta.appId}`
    + `&redirect_uri=${encodeURIComponent(CONFIG.meta.redirectUri)}`
    + `&scope=${encodeURIComponent(CONFIG.meta.scope)}`
    + `&response_type=code`
    + `&state=${platform}`;

  // Popup mein kholo
  openOAuthPopup(url, platform);
}

// YouTube — Google OAuth
function connectYouTube() {
  const url = `https://accounts.google.com/o/oauth2/v2/auth?`
    + `client_id=${CONFIG.youtube.clientId}`
    + `&redirect_uri=${encodeURIComponent(CONFIG.youtube.redirectUri)}`
    + `&scope=${encodeURIComponent(CONFIG.youtube.scope)}`
    + `&response_type=code`
    + `&access_type=offline`
    + `&state=YouTube`;

  openOAuthPopup(url, 'YouTube');
}

// TikTok OAuth
function connectTikTok() {
  const url = `https://www.tiktok.com/v2/auth/authorize?`
    + `client_key=${CONFIG.tiktok.clientKey}`
    + `&redirect_uri=${encodeURIComponent(CONFIG.tiktok.redirectUri)}`
    + `&scope=${encodeURIComponent(CONFIG.tiktok.scope)}`
    + `&response_type=code`
    + `&state=TikTok`;

  openOAuthPopup(url, 'TikTok');
}

// Twitter/X OAuth
function connectTwitter() {
  // Twitter PKCE flow — code_verifier generate karna hoga
  const codeVerifier = generateCodeVerifier();
  sessionStorage.setItem('twitter_code_verifier', codeVerifier);
  generateCodeChallenge(codeVerifier).then(challenge => {
    const url = `https://twitter.com/i/oauth2/authorize?`
      + `client_id=${CONFIG.twitter.clientId}`
      + `&redirect_uri=${encodeURIComponent(CONFIG.twitter.redirectUri)}`
      + `&scope=tweet.write%20tweet.read%20users.read%20offline.access`
      + `&response_type=code`
      + `&code_challenge=${challenge}`
      + `&code_challenge_method=S256`
      + `&state=Twitter`;
    openOAuthPopup(url, 'Twitter/X');
  });
}

// LinkedIn OAuth
function connectLinkedIn() {
  const url = `https://www.linkedin.com/oauth/v2/authorization?`
    + `client_id=${CONFIG.linkedin.clientId}`
    + `&redirect_uri=${encodeURIComponent(CONFIG.linkedin.redirectUri)}`
    + `&scope=${encodeURIComponent(CONFIG.linkedin.scope)}`
    + `&response_type=code`
    + `&state=LinkedIn`;

  openOAuthPopup(url, 'LinkedIn');
}

// ---- POPUP HELPER ----
function openOAuthPopup(url, platform) {
  const width = 520, height = 680;
  const left = (screen.width - width) / 2;
  const top = (screen.height - height) / 2;

  const popup = window.open(
    url,
    `${platform}_oauth`,
    `width=${width},height=${height},left=${left},top=${top},toolbar=0,menubar=0`
  );

  if (!popup) {
    // Popup block hua — direct redirect karo
    window.location.href = url;
    return;
  }

  // Popup close hone ka wait karo
  const checkClosed = setInterval(() => {
    if (popup.closed) {
      clearInterval(checkClosed);
      // Check karo token aa gaya kya
      const token = Tokens.get(platform.toLowerCase().replace('/', ''));
      if (token) {
        showToast(`✅ ${platform} connected!`, 'success');
        renderAccounts();
      }
    }
  }, 500);
}

// ---- TOKEN EXCHANGE ----
// Note: Real app mein yeh server-side hona chahiye (client_secret expose na ho)
// Yahan demo ke liye frontend mein hai
async function exchangeCodeForToken(platform, code) {
  try {
    let tokenData = null;

    if (platform === 'Facebook' || platform === 'Instagram') {
      // Meta token exchange
      const res = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?`
        + `client_id=${CONFIG.meta.appId}`
        + `&redirect_uri=${encodeURIComponent(CONFIG.meta.redirectUri)}`
        + `&client_secret=YOUR_META_APP_SECRET`   // ⚠️ Server-side rakhna zaroori hai
        + `&code=${code}`
      );
      const data = await res.json();

      if (data.access_token) {
        tokenData = {
          accessToken: data.access_token,
          expiresAt: Date.now() + (data.expires_in * 1000),
        };

        // Long-lived token ke liye exchange karo
        await exchangeForLongLivedToken(data.access_token, platform);
        return;
      }
    }

    if (tokenData) {
      const key = platform.toLowerCase().replace('/', '');
      Tokens.save(key, tokenData);
      await fetchUserProfile(platform, tokenData.accessToken);
    }

  } catch (err) {
    showToast(`❌ ${platform} connection failed`, 'error');
    console.error(err);
  }
}

// Meta Long-lived token (60 din wala)
async function exchangeForLongLivedToken(shortToken, platform) {
  try {
    const res = await fetch(
      `https://graph.facebook.com/v19.0/oauth/access_token?`
      + `grant_type=fb_exchange_token`
      + `&client_id=${CONFIG.meta.appId}`
      + `&client_secret=YOUR_META_APP_SECRET`    // ⚠️ Server-side rakhna
      + `&fb_exchange_token=${shortToken}`
    );
    const data = await res.json();

    if (data.access_token) {
      const tokenData = {
        accessToken: data.access_token,
        expiresAt: Date.now() + (60 * 24 * 60 * 60 * 1000), // 60 din
      };
      const key = platform.toLowerCase().replace('/', '');
      Tokens.save(key, tokenData);
      await fetchUserProfile(platform, data.access_token);
    }
  } catch (err) {
    console.error('Long-lived token error:', err);
  }
}

// ---- USER PROFILE FETCH ----
async function fetchUserProfile(platform, accessToken) {
  try {
    let name = '', handle = '';
    const colors = {
      Facebook: '#1877f2', Instagram: '#e1306c', YouTube: '#ff0000',
      TikTok: '#69c9d0', 'Twitter/X': '#1da1f2', LinkedIn: '#0077b5'
    };
    const initials = {
      Facebook: 'FB', Instagram: 'IG', YouTube: 'YT',
      TikTok: 'TT', 'Twitter/X': 'TW', LinkedIn: 'LI'
    };

    if (platform === 'Facebook' || platform === 'Instagram') {
      // Facebook user info
      const res = await fetch(
        `https://graph.facebook.com/v19.0/me?fields=name,id&access_token=${accessToken}`
      );
      const user = await res.json();
      name = user.name || 'My Account';
      handle = `@${name.toLowerCase().replace(/\s/g, '_')}`;

      // Agar Instagram hai toh IG account dhundo
      if (platform === 'Instagram') {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
        );
        const pages = await pagesRes.json();
        if (pages.data && pages.data.length > 0) {
          const pageId = pages.data[0].id;
          const pageToken = pages.data[0].access_token;
          const igRes = await fetch(
            `https://graph.facebook.com/v19.0/${pageId}?fields=instagram_business_account&access_token=${pageToken}`
          );
          const igData = await igRes.json();
          if (igData.instagram_business_account) {
            const igId = igData.instagram_business_account.id;
            const igProfile = await fetch(
              `https://graph.facebook.com/v19.0/${igId}?fields=username&access_token=${pageToken}`
            ).then(r => r.json());
            handle = `@${igProfile.username || 'ig_account'}`;
            // IG account token bhi save karo
            Tokens.save('instagram_page_id', { pageId: igId, pageToken });
          }
        }
      }

      // Facebook Pages bhi save karo
      if (platform === 'Facebook') {
        const pagesRes = await fetch(
          `https://graph.facebook.com/v19.0/me/accounts?access_token=${accessToken}`
        );
        const pages = await pagesRes.json();
        if (pages.data && pages.data.length > 0) {
          Tokens.save('facebook_page', {
            pageId: pages.data[0].id,
            pageToken: pages.data[0].access_token,
            pageName: pages.data[0].name,
          });
          handle = pages.data[0].name;
        }
      }
    }

    // Account list mein add karo
    const existingIdx = state.accounts.findIndex(a => a.platform === platform);
    const newAccount = {
      id: Date.now(),
      name: handle || `@${platform.toLowerCase()}_account`,
      platform,
      color: colors[platform] || '#7c3aed',
      initials: initials[platform] || platform.substring(0, 2).toUpperCase(),
      checked: true,
      connected: true,
      realAccount: true,
    };

    if (existingIdx >= 0) {
      state.accounts[existingIdx] = newAccount;
    } else {
      state.accounts.push(newAccount);
    }

    saveAccounts();
    renderAccounts();
    showToast(`✅ ${platform} connected — ${handle}`, 'success');

  } catch (err) {
    console.error('Profile fetch error:', err);
    showToast(`⚠️ Connected but profile fetch failed`, 'error');
  }
}

// ---- TWITTER PKCE HELPERS ----
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/[^a-zA-Z0-9]/g, '').substring(0, 43);
}

async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ---- connectAccount — MAIN FUNCTION (Modal se call hota hai) ----
function connectAccount(platform) {
  closeModal();

  // Already connected?
  if (state.accounts.find(a => a.platform === platform && a.realAccount)) {
    showToast(`✅ ${platform} already connected`, 'success');
    return;
  }

  // Platform ke hisaab se OAuth start karo
  switch (platform) {
    case 'Facebook':
      connectMeta('Facebook');
      break;
    case 'Instagram':
      connectMeta('Instagram');
      break;
    case 'YouTube':
      connectYouTube();
      break;
    case 'TikTok':
      connectTikTok();
      break;
    case 'Twitter/X':
      connectTwitter();
      break;
    case 'LinkedIn':
      connectLinkedIn();
      break;
    default:
      showToast(`⚠️ ${platform} coming soon`, 'error');
  }
}

// ---- DISCONNECT ACCOUNT ----
function disconnectAccount(id) {
  const acc = state.accounts.find(a => a.id === id);
  if (!acc) return;

  // Token remove karo
  const key = acc.platform.toLowerCase().replace('/', '');
  Tokens.remove(key);

  state.accounts = state.accounts.filter(a => a.id !== id);
  saveAccounts();
  renderAccounts();
  showToast(`🔌 ${acc.platform} disconnected`, 'error');
}

// ---- PUBLISH — Real API Calls ----
async function publishToRealAccounts(caption, videoUrl) {
  const checkedAccounts = state.accounts.filter(a => a.checked && a.realAccount);
  const results = [];

  for (const acc of checkedAccounts) {
    try {
      let result;
      if (acc.platform === 'Facebook') {
        result = await publishToFacebook(caption, videoUrl);
      } else if (acc.platform === 'Instagram') {
        result = await publishToInstagram(caption, videoUrl);
      } else if (acc.platform === 'YouTube') {
        result = await publishToYouTube(caption, videoUrl);
      }
      // TikTok, Twitter, LinkedIn — same pattern se add karo
      results.push({ platform: acc.platform, success: true, data: result });
    } catch (err) {
      results.push({ platform: acc.platform, success: false, error: err.message });
    }
  }
  return results;
}

async function publishToFacebook(caption, videoUrl) {
  const pageData = Tokens.get('1582044639536096');
  if (!pageData) throw new Error('Facebook page not connected');

  const res = await fetch(
    `https://graph.facebook.com/v19.0/${pageData.pageId}/videos`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        file_url: videoUrl,
        description: caption,
        access_token: pageData.pageToken,
      }),
    }
  );
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

async function publishToInstagram(caption, videoUrl) {
  const igData = Tokens.get('802560142464893');
  const token = Tokens.get('EAAWe3HjCIZBABRc3wkYkG9fKHKJR00Ypx0seY8UIlQci9xswshFW6rjOCIXiaofBF9ZCXeZCVSYPjNP1JoHc71jmk3YYZBKwKv1DJ9Y1YucSWSA6wZCE5t4iU8NsLKcnuGIlAiotmDlI5Gwuoob9gNslcwi36PrXdTCowYdevOt1YVJZBdSuZAQmEyZBZAHwfADs8QVZAEZCg7De82y');
  if (!igData || !token) throw new Error('Instagram not connected');

  // Step 1: Media container
  const containerRes = await fetch(
    `https://graph.facebook.com/v19.0/${igData.pageId}/media`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption,
        access_token: igData.pageToken,
      }),
    }
  );
  const container = await containerRes.json();
  if (container.error) throw new Error(container.error.message);

  // Step 2: Publish
  await new Promise(r => setTimeout(r, 3000)); // Upload hone do
  const publishRes = await fetch(
    `https://graph.facebook.com/v19.0/${igData.pageId}/media_publish`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: container.id,
        access_token: igData.pageToken,
      }),
    }
  );
  const published = await publishRes.json();
  if (published.error) throw new Error(published.error.message);
  return published;
}

async function publishToYouTube(title, videoUrl) {
  const token = Tokens.get('youtube');
  if (!token) throw new Error('YouTube not connected');

  // YouTube ke liye video file chahiye — URL se direct nahi hota
  // Pehle video fetch karo phir upload
  const videoBlob = await fetch(videoUrl).then(r => r.blob());

  // Resumable upload init
  const initRes = await fetch(
    'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.accessToken}`,
        'Content-Type': 'application/json',
        'X-Upload-Content-Type': videoBlob.type,
        'X-Upload-Content-Length': videoBlob.size,
      },
      body: JSON.stringify({
        snippet: { title, description: title, categoryId: '22' },
        status: { privacyStatus: 'public' },
      }),
    }
  );

  const uploadUrl = initRes.headers.get('Location');
  if (!uploadUrl) throw new Error('YouTube upload init failed');

  // Video upload
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token.accessToken}` },
    body: videoBlob,
  });
  return uploadRes.json();
}

// ============================
// BAAKI SAARA ORIGINAL CODE
// (Koi change nahi)
// ============================

// ---- STEP 1: ANALYZE VIDEO ----
function analyzeVideo() {
  const url = document.getElementById('videoUrl').value.trim();
  if (!url) { showToast('⚠️ Please paste a video URL first', 'error'); return; }
  if (!isValidUrl(url)) { showToast('❌ Please enter a valid video URL', 'error'); return; }

  state.videoUrl = url;
  state.detectedPlatform = detectPlatform(url);

  showThumbnailPreview(url);
  setTimeout(() => startAnalysis(), 800);
}

function isValidUrl(url) {
  try { new URL(url); return true; } catch { return false; }
}

function detectPlatform(url) {
  if (url.includes('youtube') || url.includes('youtu.be')) return 'YouTube';
  if (url.includes('tiktok')) return 'TikTok';
  if (url.includes('instagram')) return 'Instagram';
  if (url.includes('twitter') || url.includes('x.com')) return 'Twitter/X';
  if (url.includes('facebook') || url.includes('fb.watch')) return 'Facebook';
  return 'Video';
}

function showThumbnailPreview(url) {
  const preview = document.getElementById('thumbnailPreview');
  const badge = document.getElementById('platformBadge');
  const title = document.getElementById('thumbTitle');
  const meta = document.getElementById('thumbMeta');

  badge.textContent = state.detectedPlatform;
  title.textContent = 'Video detected — analyzing content...';
  meta.textContent = truncateUrl(url);

  preview.style.display = 'block';
  preview.style.animation = 'slideIn 0.4s ease';
}

function truncateUrl(url) {
  return url.length > 60 ? url.substring(0, 60) + '...' : url;
}

function startAnalysis() {
  document.getElementById('step1').style.display = 'none';
  const loader = document.getElementById('loadingCard');
  loader.style.display = 'block';

  const steps = ['ls1', 'ls2', 'ls3', 'ls4'];
  steps.forEach(id => document.getElementById(id).classList.remove('active', 'done'));

  let current = 0;
  document.getElementById(steps[0]).classList.add('active');

  const interval = setInterval(() => {
    document.getElementById(steps[current]).classList.remove('active');
    document.getElementById(steps[current]).classList.add('done');
    current++;
    if (current >= steps.length) {
      clearInterval(interval);
      setTimeout(() => showStep2(), 400);
    } else {
      document.getElementById(steps[current]).classList.add('active');
    }
  }, 700);
}

// ---- STEP 2: CAPTIONS ----
function showStep2() {
  document.getElementById('loadingCard').style.display = 'none';
  const step2 = document.getElementById('step2');
  step2.style.display = 'block';
  step2.classList.add('active');

  document.getElementById('thumbTitle').textContent = getSampleVideoTitle();
  document.getElementById('thumbMeta').textContent = `${state.detectedPlatform} • AI analysis complete`;

  renderCaptions();
  renderHashtags();
  step2.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getSampleVideoTitle() {
  const titles = [
    "The Secret Nobody Talks About",
    "This Changed My Life Forever",
    "You Won't Believe This Trick",
    "The Ultimate Guide (2024)",
    "Behind The Scenes Revealed",
  ];
  return titles[Math.floor(Math.random() * titles.length)];
}

function selectTone(btn) {
  document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  state.selectedTone = btn.dataset.tone;
  renderCaptions();
  renderHashtags();
}

function renderCaptions() {
  const list = document.getElementById('captionsList');
  const captions = CAPTIONS_DB[state.selectedTone];
  list.innerHTML = '';

  captions.forEach((cap, i) => {
    const div = document.createElement('div');
    div.className = 'caption-item' + (i === state.selectedCaption ? ' selected' : '');
    div.onclick = () => selectCaption(i);
    div.innerHTML = `
      ${cap.badge ? `<div class="caption-badge">${cap.badge}</div>` : ''}
      <div class="caption-text">${cap.text}</div>
      <button class="caption-copy" onclick="copyCaption(event, ${i})">📋 Copy</button>
    `;
    list.appendChild(div);
  });
}

function selectCaption(index) {
  state.selectedCaption = index;
  document.querySelectorAll('.caption-item').forEach((el, i) => {
    el.classList.toggle('selected', i === index);
  });
}

function copyCaption(e, index) {
  e.stopPropagation();
  const text = CAPTIONS_DB[state.selectedTone][index].text;
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ Caption copied!', 'success');
  });
}

function regenerateCaptions() {
  const list = document.getElementById('captionsList');
  list.style.opacity = '0.3';
  setTimeout(() => {
    list.style.opacity = '1';
    renderCaptions();
    showToast('✨ New captions generated!', 'success');
  }, 400);
}

function renderHashtags() {
  const wrap = document.getElementById('hashtagsWrap');
  const tags = HASHTAGS_DB[state.selectedTone];
  state.selectedHashtags = new Set(tags.slice(0, 8));

  wrap.innerHTML = '';
  tags.forEach((tag, i) => {
    const chip = document.createElement('div');
    chip.className = 'hashtag-chip' + (i < 8 ? ' selected' : '') + (i < 4 ? ' trending' : '');
    chip.textContent = tag;
    chip.onclick = () => toggleHashtag(chip, tag);
    wrap.appendChild(chip);
  });
  updateHashtagCount();
}

function toggleHashtag(chip, tag) {
  if (state.selectedHashtags.has(tag)) {
    state.selectedHashtags.delete(tag);
    chip.classList.remove('selected');
  } else {
    state.selectedHashtags.add(tag);
    chip.classList.add('selected');
  }
  updateHashtagCount();
}

function updateHashtagCount() {
  document.getElementById('hashtagCount').textContent = `${state.selectedHashtags.size} selected`;
}

function goToStep3() {
  const step3 = document.getElementById('step3');
  step3.style.display = 'block';
  step3.classList.add('active');
  step3.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ---- STEP 3: PLATFORMS + PUBLISH ----
function renderPlatforms() {
  const grid = document.getElementById('platformsGrid');
  grid.innerHTML = '';

  PLATFORMS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'platform-card' + (state.selectedPlatforms.has(p.id) ? ' selected' : '');
    card.onclick = () => togglePlatform(card, p.id);
    card.innerHTML = `
      ${p.trend ? `<div class="platform-trend">${p.trend}</div>` : ''}
      <span class="platform-icon">${p.icon}</span>
      <div class="platform-name">${p.name}</div>
      <div class="platform-format">${p.format}</div>
    `;
    grid.appendChild(card);
  });
}

function togglePlatform(card, platformId) {
  if (state.selectedPlatforms.has(platformId)) {
    if (state.selectedPlatforms.size === 1) {
      showToast('⚠️ Select at least one platform', 'error'); return;
    }
    state.selectedPlatforms.delete(platformId);
    card.classList.remove('selected');
  } else {
    state.selectedPlatforms.add(platformId);
    card.classList.add('selected');
  }
  updatePublishButton();
}

function updatePublishButton() {
  const count = state.selectedPlatforms.size;
  document.getElementById('publishBtnText').textContent = `Post to ${count} Platform${count > 1 ? 's' : ''}`;
}

// ---- RENDER ACCOUNTS — Updated with real account indicators ----
function renderAccounts() {
  const list = document.getElementById('accountsList');
  list.innerHTML = '';

  if (state.accounts.length === 0) {
    list.innerHTML = `
      <div style="text-align:center; padding:24px; color:#9090a8; font-size:13px;">
        No accounts connected yet.<br>Click "Add Account" to connect your real social accounts.
      </div>`;
    return;
  }

  state.accounts.forEach(acc => {
    const div = document.createElement('div');
    div.className = 'account-item';
    div.innerHTML = `
      <div class="account-avatar" style="background: ${acc.color}22; color: ${acc.color}; border: 1px solid ${acc.color}44">
        ${acc.initials}
      </div>
      <div class="account-info">
        <div class="account-name">${acc.name}</div>
        <div class="account-platform">${acc.platform} ${acc.realAccount ? '• Real Account' : ''}</div>
      </div>
      <div class="account-status connected">● Connected</div>
      <div class="account-check ${acc.checked ? 'checked' : ''}" onclick="toggleAccount(${acc.id}, this)"></div>
      <button onclick="disconnectAccount(${acc.id})" style="background:none;border:none;color:#9090a8;cursor:pointer;font-size:12px;padding:4px 8px;margin-left:4px;" title="Disconnect">✕</button>
    `;
    list.appendChild(div);
  });
}

function toggleAccount(id, el) {
  const acc = state.accounts.find(a => a.id === id);
  if (acc) {
    acc.checked = !acc.checked;
    el.classList.toggle('checked', acc.checked);
    saveAccounts();
  }
}

function toggleSchedule() {
  state.scheduled = document.getElementById('scheduleToggle').checked;
  const inputs = document.getElementById('scheduleInputs');
  inputs.style.display = state.scheduled ? 'grid' : 'none';
}

function setQuickTime(time) {
  document.getElementById('schedTime').value = time;
  state.schedTime = time;
}

function showAddAccount() {
  document.getElementById('modalOverlay').classList.add('open');
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
}

function setTodayDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  document.getElementById('schedDate').value = `${y}-${m}-${day}`;
}

// ---- PUBLISH ----
function publishNow() {
  const checkedAccounts = state.accounts.filter(a => a.checked);
  if (checkedAccounts.length === 0) {
    showToast('⚠️ Please connect and select at least one account', 'error'); return;
  }
  if (state.selectedPlatforms.size === 0) {
    showToast('⚠️ Please select at least one platform', 'error'); return;
  }

  const btn = document.getElementById('publishBtn');
  btn.disabled = true;
  btn.innerHTML = '<span class="publish-icon">⏳</span> <span>Publishing...</span>';

  setTimeout(() => showSuccess(checkedAccounts), 1800);
}

function showSuccess(accounts) {
  document.getElementById('step3').style.display = 'none';
  const step4 = document.getElementById('step4');
  step4.style.display = 'block';

  const platforms = [...state.selectedPlatforms];
  document.getElementById('postedCount').textContent = platforms.length;
  document.getElementById('statReach').textContent = formatNumber(estimateReach(platforms));
  document.getElementById('statAccounts').textContent = accounts.length;
  document.getElementById('statScore').textContent = getViralScore();

  const postedPlatforms = document.getElementById('postedPlatforms');
  postedPlatforms.innerHTML = platforms.map(p => {
    const platform = PLATFORMS.find(pl => pl.id === p);
    return `<div class="posted-platform">${platform.icon} ${platform.name}</div>`;
  }).join('');

  step4.scrollIntoView({ behavior: 'smooth', block: 'start' });
  showToast('🚀 All posts published successfully!', 'success');
}

function estimateReach(platforms) {
  const reaches = { youtube: 12000, tiktok: 45000, instagram: 18000, facebook: 9000, twitter: 7000, linkedin: 4000 };
  return platforms.reduce((total, p) => total + (reaches[p] || 5000), 0);
}

function getViralScore() {
  const scores = ['72%', '81%', '88%', '94%', '97%'];
  return scores[Math.floor(Math.random() * scores.length)];
}

function formatNumber(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n;
}

// ---- RESET ----
function resetAll() {
  state = {
    videoUrl: '', detectedPlatform: '', selectedTone: 'viral',
    selectedCaption: 0, selectedHashtags: new Set(),
    selectedPlatforms: new Set(['youtube', 'tiktok']),
    accounts: state.accounts, // Accounts reset mat karo — real accounts rehne do
    scheduled: false, schedDate: '', schedTime: '09:00',
  };

  document.getElementById('videoUrl').value = '';
  document.getElementById('thumbnailPreview').style.display = 'none';
  document.getElementById('step1').style.display = 'block';
  document.getElementById('step2').style.display = 'none';
  document.getElementById('step3').style.display = 'none';
  document.getElementById('step4').style.display = 'none';
  document.getElementById('loadingCard').style.display = 'none';
  document.getElementById('scheduleToggle').checked = false;
  document.getElementById('scheduleInputs').style.display = 'none';

  const btn = document.getElementById('publishBtn');
  btn.disabled = false;
  btn.innerHTML = '<span class="publish-icon">🚀</span><span id="publishBtnText">Post to All Selected</span>';

  renderPlatforms();
  renderAccounts();
  document.getElementById('step1').classList.add('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- TOAST ----
function showToast(msg, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  setTimeout(() => { toast.classList.remove('show'); }, 3000);
}