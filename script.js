// Mercari — script.js (Supabase-enabled + Mini Carousels + Multiple Images)
// Theme/styles preserved. Only minimal UI added for carousels & multi-image support.

(() => {
  // --------------------------
  // Setup & Utilities
  // --------------------------
  const $ = (s) => document.querySelector(s);
  const qs = (s) => Array.from(document.querySelectorAll(s));
  const toast = (msg, time = 2200) => {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.getElementById('toast-area').appendChild(t);
    setTimeout(() => t.remove(), time);
  };

  // Supabase client (created in index.html)
  const sb = window.sb || null;

  // Constants / LS keys
  const LS_PRODUCTS = 'mercari_products_v2_multiimg';
  const LS_CART = 'mercari_cart_v1';
  const LS_SESSION = 'mercari_session_v1';
  const ADMIN_EMAIL = 'admin@mercari.local';

  // DOM refs
  const btnLogin = $('#btn-login');
  const btnSignup = $('#btn-signup');
  const btnSellerDashboard = $('#btn-seller-dashboard');
  const sellerArea = $('#seller-area');
  const productForm = $('#product-form');
  const pImageInput = $('#p-image');
  const pPreview = $('#p-preview');
  const marketGrid = $('#market-grid');
  const overlay = $('#overlay');
  const modalContent = $('#modal-content');
  const cartBtn = $('#btn-cart');
  const cartCount = $('#cart-count');
  const userPill = $('#user-pill');
  const totalListingsEl = $('#total-listings');
  const btnClearProducts = $('#btn-clear-products');
  const searchInput = $('#search');

  function genslug(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }
  function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // sample images (SVG data-URIs)
  function sampleImageDataURI(seed = 1){
    const colors = [
      ['#7c3aed','#06b6d4'],
      ['#ef4444','#f97316'],
      ['#06b6d4','#7c3aed'],
      ['#10b981','#06b6d4']
    ];
    const c = colors[seed % colors.length];
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
        <defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
          <stop offset='0' stop-color='${c[0]}'/><stop offset='1' stop-color='${c[1]}'/>
        </linearGradient></defs>
        <rect width='100%' height='100%' fill='url(#g)' rx='20'/>
        <g fill='white' font-family='sans-serif' font-weight='700' font-size='48'>
          <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' opacity='0.13'>Mercari</text>
        </g>
      </svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // localStorage helpers
  function loadProductsLocal() {
    let ps = JSON.parse(localStorage.getItem(LS_PRODUCTS) || 'null');
    if (!ps) {
      ps = [
        { id: genslug(), title: 'Classic Leather Sneakers', price: 69.99, desc: 'Premium leather sneakers. Comfortable & stylish.', images: [sampleImageDataURI(1), sampleImageDataURI(2)] },
        { id: genslug(), title: 'Wireless Headphones Pro', price: 129.00, desc: 'Noise-cancelling over-ear headphones.', images: [sampleImageDataURI(3)] }
      ];
      localStorage.setItem(LS_PRODUCTS, JSON.stringify(ps));
    }
    return ps;
  }
  function saveProductsLocal(ps){ localStorage.setItem(LS_PRODUCTS, JSON.stringify(ps)); }
  function loadCartLocal(){ return JSON.parse(localStorage.getItem(LS_CART) || '[]'); }
  function saveCartLocal(c){ localStorage.setItem(LS_CART, JSON.stringify(c)); updateCartCount(); }
  function getSessionLocal(){ return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); }
  function setSessionLocal(sess){ localStorage.setItem(LS_SESSION, JSON.stringify(sess)); updateSessionUI(); }
  function clearSessionLocal(){ localStorage.removeItem(LS_SESSION); updateSessionUI(); }

  // --------------------------
  // Supabase data helpers (images JSON support)
  // --------------------------
  async function getSupabaseUser() {
    if (!sb) return null;
    try { const { data } = await sb.auth.getUser(); return data?.user ?? null; }
    catch { return null; }
  }

  async function cloudLoadProducts() {
    if (!sb) throw new Error('Supabase not configured');
    const { data, error } = await sb.from('listings').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data.map(p => ({
      id: p.id,
      title: p.title,
      price: Number(p.price),
      desc: p.description || '',
      images: Array.isArray(p.images) && p.images.length ? p.images
        : (p.image ? [p.image] : [sampleImageDataURI()]) // fallback for legacy single image
    }));
  }

  async function cloudSaveProduct(newP) {
    if (!sb) throw new Error('Supabase not configured');
    const user = await getSupabaseUser();
    if (!user) throw new Error('Not signed in');
    if (user.email !== ADMIN_EMAIL) throw new Error('Only admin may create listings');

    const payload = {
      title: newP.title,
      price: newP.price,
      description: newP.desc,
      images: newP.images   // JSONB array
    };
    const { error } = await sb.from('listings').insert([payload]);
    if (error) throw error;
    return true;
  }

  // Cart cloud helpers
  async function cloudAddToCart(productId, qty = 1) {
    const user = await getSupabaseUser();
    if (!user) throw new Error('Please sign in');
    const { error } = await sb.from('carts').upsert([{
      user_id: user.id, product_id: productId, quantity: qty
    }], { onConflict: 'user_id,product_id' });
    if (error) throw error;
    return true;
  }
  async function cloudLoadCart() {
    const user = await getSupabaseUser();
    if (!user) return [];
    const { data: cartRows, error } = await sb.from('carts').select('*').eq('user_id', user.id);
    if (error) throw error;
    if (!cartRows?.length) return [];
    const ids = cartRows.map(r => r.product_id);
    const { data: products } = await sb.from('listings').select('*').in('id', ids);
    return cartRows.map(row => {
      const p = products.find(pp => pp.id === row.product_id) || {};
      const images = Array.isArray(p?.images) && p.images.length ? p.images : (p?.image ? [p.image] : [sampleImageDataURI()]);
      return { id: row.product_id, title: p.title || 'Unknown', price: Number(p.price || 0), images, qty: row.quantity };
    });
  }
  async function cloudRemoveFromCart(productId) {
    const user = await getSupabaseUser();
    if (!user) throw new Error('Not signed in');
    const { error } = await sb.from('carts').delete().eq('user_id', user.id).eq('product_id', productId);
    if (error) throw error;
    return true;
  }
  async function syncLocalCartToCloud() {
    if (!sb) return;
    const user = await getSupabaseUser();
    if (!user) return;
    const local = loadCartLocal();
    if (!local.length) return;
    for (const it of local) {
      try {
        await sb.from('carts').upsert([{ user_id: user.id, product_id: it.id, quantity: it.qty || 1 }], { onConflict: 'user_id,product_id' });
      } catch (e) { console.warn('sync cart item failed', e.message); }
    }
    localStorage.removeItem(LS_CART);
    updateCartCount();
  }

  // --------------------------
  // Render marketplace with mini carousel
  // --------------------------
  async function renderGrid(filter = '') {
    let products = [];
    if (sb) {
      try { products = await cloudLoadProducts(); }
      catch (err) { console.warn('Cloud load failed, using local', err.message); products = loadProductsLocal(); }
    } else { products = loadProductsLocal(); }

    totalListingsEl.textContent = products.length;
    const q = filter.trim().toLowerCase();
    const list = q ? products.filter(p => (p.title + p.desc + (p.price || '')).toLowerCase().includes(q)) : products;

    marketGrid.innerHTML = '';
    if (!list.length) {
      marketGrid.innerHTML = `<div style="grid-column:1/-1;padding:20px;border-radius:12px;background:rgba(255,255,255,0.02);color:var(--muted)">No products found.</div>`;
      return;
    }

    list.forEach(p => {
      const imgs = Array.isArray(p.images) && p.images.length ? p.images : [sampleImageDataURI()];
      const card = document.createElement('div'); card.className = 'card';

      // mini carousel markup
      const trackId = `track-${p.id}`;
      const dots = imgs.map((_,i)=>`<div class="carousel-dot ${i===0?'active':''}" data-i="${i}"></div>`).join('');
      card.innerHTML = `
        <div class="thumb">
          <div class="mini-carousel-track" id="${trackId}" style="width:${imgs.length*100}%;">
            ${imgs.map(src=>`<img src="${src}">`).join('')}
          </div>
          ${imgs.length>1 ? `
            <button class="carousel-btn carousel-prev" data-id="${p.id}" aria-label="Prev">‹</button>
            <button class="carousel-btn carousel-next" data-id="${p.id}" aria-label="Next">›</button>
            <div class="carousel-dots" data-id="${p.id}">${dots}</div>
          `:''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
          <div>
            <div class="title">${escapeHtml(p.title)}</div>
            <div class="muted desc" style="max-height:44px;overflow:hidden">${escapeHtml(p.desc)}</div>
          </div>
          <div style="text-align:right">
            <div class="price">$${Number(p.price).toFixed(2)}</div>
            <div class="muted" style="font-size:12px;margin-top:6px">ID: ${String(p.id).slice(0,8)}</div>
          </div>
        </div>
        <div class="card-actions">
          <button class="small primary add-to-cart" data-id="${p.id}">Add to Cart</button>
          <button class="small btn share-btn" data-id="${p.id}">Share</button>
          <button class="small btn" data-id="${p.id}" data-action="view">View</button>
        </div>
      `;

      // attach carousel state & handlers
      card.dataset.carouselIndex = '0';
      if (imgs.length>1) {
        const prev = card.querySelector('.carousel-prev');
        const next = card.querySelector('.carousel-next');
        const track = card.querySelector('.mini-carousel-track');
        const dotsWrap = card.querySelector('.carousel-dots');
        const dotsEls = Array.from(card.querySelectorAll('.carousel-dot'));
        const setIndex = (i) => {
          const max = imgs.length-1;
          if (i<0) i = max; if (i>max) i = 0;
          card.dataset.carouselIndex = String(i);
          track.style.transform = `translateX(-${i*100}%)`;
          dotsEls.forEach((d,di)=>d.classList.toggle('active', di===i));
        };
        prev.addEventListener('click', ()=> setIndex(Number(card.dataset.carouselIndex)-1));
        next.addEventListener('click', ()=> setIndex(Number(card.dataset.carouselIndex)+1));
        dotsWrap.addEventListener('click', (ev)=> {
          const dot = ev.target.closest('.carousel-dot');
          if (!dot) return;
          setIndex(Number(dot.dataset.i));
        });
      }

      marketGrid.appendChild(card);
    });
  }

  // --------------------------
  // Product Detail: large carousel + checkout
  // --------------------------
  async function openProductDetail(id) {
    let p = null;
    if (sb) {
      try {
        const { data, error } = await sb.from('listings').select('*').eq('id', id).single();
        if (error || !data) throw error || new Error('Not found');
        p = {
          id: data.id, title: data.title, price: Number(data.price),
          desc: data.description,
          images: Array.isArray(data.images) && data.images.length ? data.images : (data.image ? [data.image] : [sampleImageDataURI()])
        };
      } catch (err) {
        const local = loadProductsLocal(); p = local.find(x => x.id === id);
      }
    } else {
      const local = loadProductsLocal(); p = local.find(x => x.id === id);
    }
    if (!p) { toast('Product not found'); return; }

    const params = new URLSearchParams(location.search);
    params.set('id', id);
    history.replaceState({}, '', location.pathname + '?' + params.toString());

    const imgs = p.images?.length ? p.images : [sampleImageDataURI()];
    const slides = imgs.map(src=>`<img src="${src}" style="width:100%;height:320px;object-fit:cover;flex:0 0 100%">`).join('');
    const thumbs = imgs.map((src,i)=>`<div class="p-thumb" data-i="${i}" style="background-image:url('${src}');width:64px;height:64px"></div>`).join('');

    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <h3>${escapeHtml(p.title)}</h3>
        <div style="color:var(--muted)">ID: ${p.id}</div>
      </div>
      <div class="product-detail" style="margin-top:12px">
        <div class="left">
          <div class="thumb" style="height:320px">
            <div class="mini-carousel-track" id="detail-track" style="width:${imgs.length*100}%;">
              ${slides}
            </div>
            ${imgs.length>1 ? `
              <button class="carousel-btn carousel-prev" id="detail-prev">‹</button>
              <button class="carousel-btn carousel-next" id="detail-next">›</button>
              <div class="carousel-dots" id="detail-dots">
                ${imgs.map((_,i)=>`<div class="carousel-dot ${i===0?'active':''}" data-i="${i}"></div>`).join('')}
              </div>
            `:''}
          </div>
          ${imgs.length>1 ? `<div class="preview-grid" id="detail-thumbs" style="margin-top:8px">${thumbs}</div>`:''}
          <div style="margin-top:10px" class="muted">Shareable link:
            <input type="text" id="share-link-input" value="${location.origin + location.pathname + '?id=' + encodeURIComponent(p.id)}" style="width:100%;margin-top:8px;padding:10px;border-radius:8px;border:0;background:rgba(255,255,255,0.03);color:inherit" readonly />
          </div>
        </div>
        <div class="right">
          <div class="price" style="font-size:22px">$${Number(p.price).toFixed(2)}</div>
          <div class="desc" style="margin-top:8px">${escapeHtml(p.desc || '')}</div>
          <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
            <button class="btn primary" id="detail-add-to-cart">Add to Cart</button>
            <button class="btn" id="detail-checkout">Checkout</button>
            <button class="btn" id="detail-share">Share</button>
          </div>
        </div>
      </div>
    `;
    openOverlay(html);

    // detail carousel logic
    let detailIndex = 0;
    const track = $('#detail-track');
    const dots = Array.from(document.querySelectorAll('#detail-dots .carousel-dot')) || [];
    const setDetail = (i) => {
      const max = imgs.length-1;
      if (i<0) i = max; if (i>max) i = 0;
      detailIndex = i;
      if (track) track.style.transform = `translateX(-${i*100}%)`;
      dots.forEach((d,di)=>d.classList.toggle('active', di===i));
    };
    $('#detail-prev')?.addEventListener('click', ()=> setDetail(detailIndex-1));
    $('#detail-next')?.addEventListener('click', ()=> setDetail(detailIndex+1));
    $('#detail-dots')?.addEventListener('click', (e)=> {
      const dot = e.target.closest('.carousel-dot'); if (!dot) return;
      setDetail(Number(dot.dataset.i));
    });
    $('#detail-thumbs')?.addEventListener('click', (e)=> {
      const t = e.target.closest('.p-thumb'); if (!t) return; setDetail(Number(t.dataset.i));
    });

    $('#detail-add-to-cart').addEventListener('click', async () => {
      try { await addToCartById(p.id); closeOverlay(); }
      catch (e) { toast(e.message || 'Add to cart failed'); }
    });
    $('#detail-checkout').addEventListener('click', async () => {
      try { await addToCartById(p.id); openCheckoutForm(); }
      catch (e) { toast(e.message || 'Checkout failed'); }
    });
    $('#detail-share').addEventListener('click', () => {
      const link = $('#share-link-input').value;
      navigator.clipboard?.writeText(link).then(()=>toast('Product link copied!'));
    });
  }

  // --------------------------
  // Cart handlers
  // --------------------------
  async function addToCartById(id, qty=1) {
    const user = sb ? (await getSupabaseUser()) : null;
    if (sb && user) {
      try { await cloudAddToCart(id, qty); updateCartCount(); toast('Added to your cloud cart'); return; }
      catch (err) { console.warn('Cloud add to cart failed, using local', err.message); }
    }
    const cart = loadCartLocal();
    const existing = cart.find(c => c.id === id);
    if (existing) existing.qty += qty;
    else {
      const all = (sb ? await cloudLoadProducts().catch(()=>loadProductsLocal()) : loadProductsLocal());
      const p = all.find(x => x.id === id) || { title: 'Item', price: 0, images: [sampleImageDataURI()] };
      cart.push({ id, title: p.title, price: p.price, images: p.images, qty });
    }
    saveCartLocal(cart);
    toast('Added to local cart');
  }

  async function renderCartOverlay() {
    let items = [];
    const user = sb ? (await getSupabaseUser()) : null;
    if (sb && user) {
      try { items = await cloudLoadCart(); }
      catch (err) { console.warn('Cloud load cart failed, falling back to local', err.message); items = loadCartLocal(); }
    } else {
      items = loadCartLocal();
    }

    // Normalize local items (could be older schema)
    items = items.map(i => ({ ...i, images: Array.isArray(i.images)&&i.images.length? i.images : [sampleImageDataURI()] }));

    if (!items.length) {
      openOverlay(`<h3>Your cart is empty</h3><div class="hint">Add items from the marketplace.</div><div style="margin-top:12px"><button class="btn" id="c-close">Close</button></div>`);
      $('#c-close').addEventListener('click', closeOverlay);
      return;
    }

    const subtotal = items.reduce((s,it)=>s + (Number(it.price)||0) * (it.qty||1), 0);
    let itemsHtml = '';
    items.forEach(it => {
      const first = it.images[0];
      const more = it.images.slice(1,4).map(src=>`<div class="p-thumb" style="width:36px;height:36px;background-image:url('${src}')"></div>`).join('');
      itemsHtml += `
        <div class="cart-item" data-id="${it.id}">
          <div class="ci-thumb" style="background-image:url('${first}');background-size:cover"></div>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
              <div>
                <strong>${escapeHtml(it.title)}</strong>
                <div class="txt-muted">$${Number(it.price).toFixed(2)}</div>
                ${it.images.length>1 ? `<div class="preview-grid" style="margin-top:6px">${more}</div>`:''}
              </div>
              <div style="text-align:right">
                <div class="muted">Qty: <input type="number" value="${it.qty}" min="1" data-id="${it.id}" class="ci-qty" style="width:64px;padding:6px;border-radius:8px;border:0;background:rgba(255,255,255,0.03)"></div>
                <div style="margin-top:8px"><button class="btn" data-id="${it.id}" data-action="remove">Remove</button></div>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    const html = `
      <h3>Your Cart</h3>
      <div style="margin-top:12px" class="cart-panel">
        ${itemsHtml}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
          <div class="muted">Subtotal</div>
          <div style="font-weight:800">$${subtotal.toFixed(2)}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <button class="btn primary" id="proceed-checkout">Checkout (PayPal)</button>
          <button class="btn" id="continue-shopping">Continue shopping</button>
        </div>
      </div>
    `;
    openOverlay(html);

    $('#continue-shopping').addEventListener('click', closeOverlay);
    $('#proceed-checkout').addEventListener('click', openCheckoutForm);

    modalContent.querySelectorAll('[data-action="remove"]').forEach(b => {
      b.addEventListener('click', async (ev) => {
        const id = ev.target.dataset.id;
        if (sb && (await getSupabaseUser())) {
          await cloudRemoveFromCart(id);
        } else {
          let cart = loadCartLocal(); cart = cart.filter(x => x.id !== id); saveCartLocal(cart);
        }
        renderCartOverlay();
      });
    });
    modalContent.querySelectorAll('.ci-qty').forEach(inp => {
      inp.addEventListener('change', async (ev) => {
        const id = ev.target.dataset.id;
        let q = parseInt(ev.target.value) || 1; if (q < 1) q = 1;
        if (sb && (await getSupabaseUser())) {
          const user = await getSupabaseUser();
          await sb.from('carts').update({ quantity: q }).eq('user_id', user.id).eq('product_id', id);
        } else {
          const cart = loadCartLocal(); const it = cart.find(x => x.id === id); if (it) it.qty = q; saveCartLocal(cart);
        }
        renderCartOverlay();
      });
    });
  }

  // --------------------------
  // Checkout (same UX)
  // --------------------------
  function openCheckoutForm() {
    (async () => {
      let items = [];
      if (sb && (await getSupabaseUser())) {
        try { items = await cloudLoadCart(); } catch { items = loadCartLocal(); }
      } else { items = loadCartLocal(); }
      if (!items.length) { toast('Cart empty'); closeOverlay(); return; }
      const subtotal = items.reduce((s,i)=>s + (Number(i.price)||0) * (i.qty||1), 0);
      const html = `
        <h3>Checkout</h3>
        <div class="hint">Payment: <strong>PayPal</strong> (simulation)</div>
        <form id="checkout-form" style="margin-top:12px">
          <div class="row">
            <div><label>Full name</label><input id="co-name" type="text" required /></div>
            <div><label>Phone</label><input id="co-phone" type="text" required /></div>
            <div style="grid-column:1/-1"><label>Shipping Address</label><input id="co-address" type="text" placeholder="Street, City, Country" required /></div>
            <div style="grid-column:1/-1"><label>Payment Method</label>
              <select id="co-method" required><option value="paypal">PayPal</option></select>
            </div>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
            <div class="muted">Total</div><div style="font-weight:800">$${subtotal.toFixed(2)}</div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn primary" type="submit">Confirm Purchase</button>
            <button class="btn" id="co-cancel" type="button">Cancel</button>
          </div>
        </form>`;
      openOverlay(html);
      $('#co-cancel').addEventListener('click', closeOverlay);
      $('#checkout-form').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = $('#co-name').value.trim();
        const address = $('#co-address').value.trim();
        const method = $('#co-method').value;
        if (!name || !address) { toast('Fill required fields'); return; }
        if (method !== 'paypal') { toast('Only PayPal supported'); return; }
        (async () => {
          if (sb && (await getSupabaseUser())) {
            const user = await getSupabaseUser(); await sb.from('carts').delete().eq('user_id', user.id);
          } else { localStorage.removeItem(LS_CART); }
          const orderId = 'ORD-' + genslug().toUpperCase().slice(0,10);
          const confHtml = `
            <h3>Purchase Confirmed</h3>
            <div class="hint">Order ID: <strong>${orderId}</strong></div>
            <div style="margin-top:12px">
              <div class="muted">Shipping to</div>
              <div><strong>${escapeHtml(name)}</strong></div>
              <div class="muted">${escapeHtml(address)}</div>
            </div>
            <div style="display:flex;gap:8px;margin-top:12px"><button class="btn primary" id="conf-done">Done</button></div>`;
          openOverlay(confHtml);
          $('#conf-done').addEventListener('click', () => { closeOverlay(); toast('Thank you! Your order is complete.'); updateCartCount(); });
        })();
      });
    })();
  }

  // --------------------------
  // Auth (signup/login/session)
  // --------------------------
  function openSignup() {
    const html = `
      <h3>Sign Up</h3>
      <p class="hint">Create an account (email + password). After sign up you'll be logged in.</p>
      <form id="signup-form">
        <div class="row">
          <div><label>Username</label><input id="su-username" type="text" required /></div>
          <div><label>Email</label><input id="su-email" type="email" required/></div>
          <div style="grid-column:1/-1"><label>Password</label><input id="su-pass" type="password" required /></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn primary" type="submit">Create Account</button>
          <button class="btn" id="cancel-signup" type="button">Cancel</button>
        </div>
      </form>`;
    openOverlay(html);
    $('#signup-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = $('#su-username').value.trim() || 'user';
      const email = $('#su-email').value.trim();
      const pass = $('#su-pass').value;
      if (!email || !pass) { toast('Provide email & password'); return; }
      if (!sb) { setSessionLocal({ user: username, isAdmin: false, email }); closeOverlay(); toast('Signed up locally (offline).'); renderGrid(); return; }
      try {
        await sb.auth.signUp({ email, password: pass });
        await sb.auth.signInWithPassword({ email, password: pass });
        setSessionLocal({ user: username, isAdmin: (email === ADMIN_EMAIL), email });
        await syncLocalCartToCloud();
        closeOverlay(); toast('Signed up & signed in!'); renderGrid();
      } catch (err) { console.error('signup error', err); toast(err.message || 'Signup failed'); }
    });
    $('#cancel-signup').addEventListener('click', closeOverlay);
  }

  function openLogin() {
    const html = `
      <h3>Login</h3>
      <p class="hint">User login: <strong></strong>  <strong></strong> </p>
      <form id="login-form">
        <div class="row">
          <div><label>Username / Email</label><input id="li-username" type="text" required /></div>
          <div><label>Password</label><input id="li-password" type="password" required /></div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn primary" type="submit">Sign in</button>
          <button class="btn" id="cancel-login" type="button">Cancel</button>
        </div>
      </form>
      <div id="login-error" style="margin-top:8px;color:var(--danger)"></div>`;
    openOverlay(html);
    $('#login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      let u = $('#li-username').value.trim();
      const p = $('#li-password').value;
      if (!u || !p) { $('#login-error').textContent = 'Provide credentials'; return; }
      if (u === 'admin') u = ADMIN_EMAIL;
      if (!sb) {
        if (u === ADMIN_EMAIL && p === 'admin123') { setSessionLocal({ user: 'admin', isAdmin: true, email: ADMIN_EMAIL }); closeOverlay(); openSellerArea(); toast('Welcome back, admin (local).'); }
        else { $('#login-error').textContent = 'Invalid username or password.'; }
        return;
      }
      try {
        await sb.auth.signInWithPassword({ email: u, password: p });
        const { data: userData } = await sb.auth.getUser();
        const user = userData?.user;
        setSessionLocal({ user: user?.email || u, isAdmin: (user?.email === ADMIN_EMAIL), email: user?.email });
        await syncLocalCartToCloud();
        closeOverlay(); toast(`Signed in as ${user?.email || u}`);
        if (user?.email === ADMIN_EMAIL) openSellerArea();
      } catch (err) { console.error('login error', err); $('#login-error').textContent = err.message || 'Login failed'; }
    });
    $('#cancel-login').addEventListener('click', closeOverlay);
  }

  async function signOut() {
    if (sb) { try { await sb.auth.signOut(); } catch (e) { console.warn('supabase signout', e.message); } }
    clearSessionLocal(); toast('Logged out'); updateCartCount();
  }

  function updateSessionUI() {
    (async () => {
      const local = getSessionLocal();
      if (local) {
        userPill.textContent = local.user + (local.isAdmin ? ' (admin)' : '');
        btnLogin.textContent = 'Logout';
        btnLogin.onclick = () => signOut();
        btnSignup.style.display = 'none';
        btnSellerDashboard.style.display = 'inline-block';
        sellerArea.style.display = 'none';
      } else {
        if (sb) {
          try {
            const { data } = await sb.auth.getUser();
            const user = data?.user;
            if (user) { setSessionLocal({ user: user.email, isAdmin: (user.email === ADMIN_EMAIL), email: user.email }); return; }
          } catch {}
        }
        userPill.textContent = 'Guest';
        btnLogin.textContent = 'Login';
        btnLogin.onclick = openLogin;
        btnSignup.style.display = 'inline-block';
        btnSellerDashboard.style.display = 'inline-block';
        sellerArea.style.display = 'none';
      }
      updateCartCount();
    })();
  }

  // --------------------------
  // Seller create product (multiple images)
  // --------------------------
  let selectedImages = []; // dataURLs for preview & save (dev/demo)
  function resetPreview() {
    pPreview.innerHTML = `<div class="p-thumb" style="display:flex;align-items:center;justify-content:center;color:var(--muted);width:100%;max-width:280px">No images</div>`;
  }

  pImageInput?.addEventListener('change', () => {
    const files = Array.from(pImageInput.files || []);
    selectedImages = [];
    if (!files.length) { resetPreview(); return; }
    pPreview.innerHTML = '';
    let pending = files.length;
    files.forEach((f, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        selectedImages.push(dataUrl);
        const t = document.createElement('div');
        t.className = 'p-thumb';
        t.style.backgroundImage = `url('${dataUrl}')`;
        pPreview.appendChild(t);
        if (--pending === 0 && selectedImages.length === 0) resetPreview();
      };
      reader.readAsDataURL(f);
    });
  });

  async function handleCreateProduct() {
    const title = $('#p-title').value.trim();
    const price = parseFloat($('#p-price').value) || 0;
    const desc = $('#p-desc').value.trim();
    const images = selectedImages.length ? selectedImages : [sampleImageDataURI()];
    if (!title) { toast('Title required'); return; }

    const newP = { id: genslug(), title, price, desc, images };

    if (sb) {
      try {
        await cloudSaveProduct(newP);
        await renderGrid(searchInput.value);
        productForm.reset();
        selectedImages = []; resetPreview();
        toast('Listing created in cloud');
        return;
      } catch (err) {
        console.warn('cloud save failed', err.message);
        toast('Cloud save failed (are you admin?). Saved locally instead.');
      }
    }

    const ps = loadProductsLocal();
    ps.unshift(newP);
    saveProductsLocal(ps);
    await renderGrid(searchInput.value);
    productForm.reset();
    selectedImages = []; resetPreview();
    toast('Listing created (local fallback).');
  }

  // --------------------------
  // Overlay helpers
  // --------------------------
  function openOverlay(html) { modalContent.innerHTML = html; overlay.classList.add('open'); }
  function closeOverlay() {
    overlay.classList.remove('open'); modalContent.innerHTML = '';
    const params = new URLSearchParams(location.search);
    if (params.get('id')) { params.delete('id'); const newUrl = location.pathname + (params.toString() ? '?' + params.toString() : ''); history.replaceState({}, '', newUrl); }
  }

  // share
  function shareProduct(id) {
    const url = location.origin + location.pathname + '?id=' + encodeURIComponent(id);
    if (navigator.share) {
      navigator.share({ title: 'Check this product', url }).catch(()=>navigator.clipboard?.writeText(url).then(()=>toast('Link copied!')));
    } else {
      navigator.clipboard?.writeText(url).then(()=>toast('Link copied to clipboard'));
    }
  }

  // --------------------------
  // Wiring
  // --------------------------
  function wire() {
    btnSignup.addEventListener('click', openSignup);
    btnLogin.addEventListener('click', () => { const sess = getSessionLocal(); if (sess) { signOut(); return; } openLogin(); });
    btnSellerDashboard.addEventListener('click', openSellerArea);
    cartBtn.addEventListener('click', renderCartOverlay);
    btnClearProducts.addEventListener('click', async () => {
      if (!confirm('Clear ALL listings locally? This cannot be undone.')) return;
      localStorage.removeItem(LS_PRODUCTS);
      await renderGrid();
      toast('Local listings cleared.');
    });

    productForm.addEventListener('submit', (e) => { e.preventDefault(); handleCreateProduct(); });

    marketGrid.addEventListener('click', (e) => {
      const bt = e.target.closest('button'); if (!bt) return;
      const id = bt.dataset.id;
      if (bt.classList.contains('add-to-cart')) addToCartById(id);
      else if (bt.classList.contains('share-btn')) shareProduct(id);
      else if (bt.dataset.action === 'view') openProductDetail(id);
    });

    overlay.addEventListener('click', (e) => { if (e.target === overlay) closeOverlay(); });
    searchInput.addEventListener('input', () => renderGrid(searchInput.value));

    const params = new URLSearchParams(location.search);
    if (params.get('id')) setTimeout(()=>openProductDetail(params.get('id')), 300);

    updateCartCount();
    updateSessionUI();
    renderGrid();
  }

  // --------------------------
  // Cart/session small helpers used in UI
  // --------------------------
  async function updateCartCount() {
    if (sb && (await getSupabaseUser())) {
      try {
        const user = await getSupabaseUser();
        const { data } = await sb.from('carts').select('*').eq('user_id', user.id);
        const total = (data || []).reduce((s,i)=>s + (i.quantity||1), 0);
        if (total > 0) { cartCount.style.display = 'block'; cartCount.textContent = total; }
        else cartCount.style.display = 'none';
        return;
      } catch {}
    }
    const c = loadCartLocal();
    const count = c.reduce((s,i)=>s + (i.qty||1), 0);
    if (count > 0) { cartCount.style.display = 'block'; cartCount.textContent = count; }
    else { cartCount.style.display = 'none'; }
  }

  async function openSellerArea() {
    const sess = getSessionLocal();
    if (!sess || !sess.isAdmin) { openLogin(); return; }
    sellerArea.style.display = 'block';
    sellerArea.scrollIntoView({behavior:'smooth'});
  }

  // --------------------------
  // Init + storage sync
  // --------------------------
  wire();
  window.addEventListener('storage', (e) => {
    if (e.key === LS_CART) updateCartCount();
    if (e.key === LS_PRODUCTS) renderGrid(searchInput.value);
    if (e.key === LS_SESSION) updateSessionUI();
  });

})(); // IIFE
