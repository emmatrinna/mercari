// Mercari — script.js
// All behavior: sign up, login (admin), seller dashboard, product listing, share links, cart & checkout.
// Uses localStorage to persist "products" and "cart" and session flags.

(() => {
  // Utilities
  const $ = (s) => document.querySelector(s);
  const qs = (s) => Array.from(document.querySelectorAll(s));
  const toast = (msg, time = 2500) => {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.getElementById('toast-area').appendChild(t);
    setTimeout(() => t.remove(), time);
  };

  // State keys
  const LS_PRODUCTS = 'mercari_products_v1';
  const LS_CART = 'mercari_cart_v1';
  const LS_SESSION = 'mercari_session_v1'; // {user: 'name', isAdmin: bool}

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

  // Helpers
  function loadProducts() {
    let ps = JSON.parse(localStorage.getItem(LS_PRODUCTS) || 'null');
    if (!ps) {
      // initial demo product (only once)
      ps = [
        {
          id: genslug(),
          title: 'Classic Leather Sneakers',
          price: 69.99,
          desc: 'Premium leather sneakers. Comfortable & stylish.',
          image: sampleImageDataURI()
        },
        {
          id: genslug(),
          title: 'Wireless Headphones Pro',
          price: 129.0,
          desc: 'Noise-cancelling over-ear headphones with long battery life.',
          image: sampleImageDataURI(2)
        }
      ];
      localStorage.setItem(LS_PRODUCTS, JSON.stringify(ps));
    }
    return ps;
  }
  function saveProducts(ps){ localStorage.setItem(LS_PRODUCTS, JSON.stringify(ps)); }
  function loadCart(){ return JSON.parse(localStorage.getItem(LS_CART) || '[]'); }
  function saveCart(c){ localStorage.setItem(LS_CART, JSON.stringify(c)); updateCartCount(); }
  function getSession(){ return JSON.parse(localStorage.getItem(LS_SESSION) || 'null'); }
  function setSession(sess){ localStorage.setItem(LS_SESSION, JSON.stringify(sess)); updateSessionUI(); }
  function clearSession(){ localStorage.removeItem(LS_SESSION); updateSessionUI(); }
  function genslug(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,7); }

  // Sample base64 tiny images (placeholder gradients)
  function sampleImageDataURI(seed = 1){
    // create a small SVG as data URI to avoid large base64 images
    const colors = [
      ['#7c3aed','#06b6d4'],
      ['#ef4444','#f97316'],
      ['#06b6d4','#7c3aed'],
      ['#10b981','#06b6d4']
    ];
    const c = colors[seed % colors.length];
    const svg = `
      <svg xmlns='http://www.w3.org/2000/svg' width='800' height='600'>
        <defs>
          <linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>
            <stop offset='0' stop-color='${c[0]}'/>
            <stop offset='1' stop-color='${c[1]}'/>
          </linearGradient>
        </defs>
        <rect width='100%' height='100%' fill='url(#g)' rx='20'/>
        <g fill='white' font-family='sans-serif' font-weight='700' font-size='48'>
          <text x='50%' y='50%' dominant-baseline='middle' text-anchor='middle' opacity='0.13'>Mercari</text>
        </g>
      </svg>
    `;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // Render marketplace
  function renderGrid(filter = '') {
    const products = loadProducts();
    totalListingsEl.textContent = products.length;
    const q = filter.trim().toLowerCase();
    const list = q ? products.filter(p => (p.title+p.desc+(p.price||'')).toLowerCase().includes(q)) : products;
    marketGrid.innerHTML = '';
    if (list.length === 0) {
      marketGrid.innerHTML = `<div style="grid-column:1/-1;padding:20px;border-radius:12px;background:rgba(255,255,255,0.02);color:var(--muted)">No products found.</div>`;
      return;
    }
    list.forEach(p => {
      const card = document.createElement('div');
      card.className = 'card';

      // Carousel markup
      const images = p.images || [p.image || sampleImageDataURI()];
      let carouselHtml = `
        <div class="carousel" style="position:relative;">
          <img src="${images[0]}" class="carousel-img" style="width:100%;height:160px;object-fit:cover;border-radius:10px;" />
          ${images.length > 1 ? `
            <button class="carousel-prev" style="position:absolute;top:50%;left:8px;transform:translateY(-50%);background:rgba(0,0,0,0.3);border:none;color:white;border-radius:50%;width:32px;height:32px;cursor:pointer;">&#8592;</button>
            <button class="carousel-next" style="position:absolute;top:50%;right:8px;transform:translateY(-50%);background:rgba(0,0,0,0.3);border:none;color:white;border-radius:50%;width:32px;height:32px;cursor:pointer;">&#8594;</button>
          ` : ''}
        </div>
      `;

      card.innerHTML = `
        ${carouselHtml}
        <div class="title">${escapeHtml(p.title)}</div>
        <div class="price">$${Number(p.price).toFixed(2)}</div>
        <div class="desc">${escapeHtml(p.desc)}</div>
        <div class="card-actions">
          <button class="btn small primary" data-action="view" data-id="${p.id}">View</button>
          <button class="btn small" data-action="add-cart" data-id="${p.id}">Add to Cart</button>
        </div>
      `;

      // Carousel logic
      if (images.length > 1) {
        let idx = 0;
        const imgEl = card.querySelector('.carousel-img');
        card.querySelector('.carousel-prev').onclick = (e) => {
          e.stopPropagation();
          idx = (idx - 1 + images.length) % images.length;
          imgEl.src = images[idx];
        };
        card.querySelector('.carousel-next').onclick = (e) => {
          e.stopPropagation();
          idx = (idx + 1) % images.length;
          imgEl.src = images[idx];
        };
      }

      marketGrid.appendChild(card);
    });
  }

  // Escape HTML to prevent injection in this demo
  function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; }); }

  // Event wiring
  function wire() {
    // Top buttons
    btnSignup.addEventListener('click', openSignup);
    btnLogin.addEventListener('click', openLogin);
    btnSellerDashboard.addEventListener('click', openSellerArea);
    cartBtn.addEventListener('click', openCartOverlay);
    btnClearProducts.addEventListener('click', () => {
      if (!confirm('Clear ALL listings? This cannot be undone.')) return;
      localStorage.removeItem(LS_PRODUCTS);
      renderGrid();
      toast('All listings removed.');
    });

    // product create
    pImageInput.addEventListener('change', handlePreviewImage);
    productForm.addEventListener('submit', (e) => {
      e.preventDefault();
      handleCreateProduct();
    });

    // delegate grid clicks
    marketGrid.addEventListener('click', (e) => {
      const bt = e.target.closest('button');
      if (!bt) return;
      const id = bt.dataset.id;
      if (bt.dataset.action === 'add-cart') {
        addToCartById(id);
      } else if (bt.dataset.action === 'view') {
        openProductDetail(id);
      }
    });

    // overlay close
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeOverlay();
    });

    // search
    searchInput.addEventListener('input', () => renderGrid(searchInput.value));

    // handle direct link
    const params = new URLSearchParams(location.search);
    if (params.get('id')) {
      setTimeout(()=>openProductDetail(params.get('id')), 300);
    }

    updateCartCount();
    updateSessionUI();
    renderGrid();
  }

  // Signup modal
  function openSignup() {
    const html = `
      <h3>Sign Up</h3>
      <p class="hint">Create a quick account (no backend). After signup you'll be redirected to the marketplace.</p>
      <form id="signup-form">
        <div class="row">
          <div>
            <label>Username</label>
            <input id="su-username" type="text" required />
          </div>
          <div>
            <label>Email</label>
            <input id="su-email" type="email" required/>
          </div>
          <div style="grid-column:1/-1">
            <label>Password</label>
            <input id="su-pass" type="password" required />
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn primary" type="submit">Create Account</button>
          <button class="btn" id="cancel-signup" type="button">Cancel</button>
        </div>
      </form>
    `;
    openOverlay(html);
    $('#signup-form').addEventListener('submit', (e) => {
      e.preventDefault();
      // fake create
      const user = $('#su-username').value.trim() || 'user';
      setSession({ user, isAdmin: false });
      closeOverlay();
      renderGrid();
      toast('Welcome, ' + user + '! Redirected to marketplace.');
    });
    $('#cancel-signup').addEventListener('click', closeOverlay);
  }

  // Login modal (admin only accepted)
  function openLogin() {
    const html = `
      <h3>Login</h3>
      <p class="hint">Admin login: <strong>admin</strong> / <strong>admin123</strong></p>
      <form id="login-form">
        <div class="row">
          <div>
            <label>Username</label>
            <input id="li-username" type="text" required />
          </div>
          <div>
            <label>Password</label>
            <input id="li-password" type="password" required />
          </div>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px">
          <button class="btn primary" type="submit">Sign in</button>
          <button class="btn" id="cancel-login" type="button">Cancel</button>
        </div>
      </form>
      <div id="login-error" style="margin-top:8px;color:var(--danger)"></div>
    `;
    openOverlay(html);
    $('#login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const u = $('#li-username').value.trim();
      const p = $('#li-password').value;
      if (u === 'admin' && p === 'admin123') {
        setSession({ user: 'admin', isAdmin: true });
        closeOverlay();
        openSellerArea();
        toast('Welcome back, admin.');
      } else {
        // Hide login, signup, and guest buttons, show username badge
        closeOverlay();
        btnLogin.style.display = 'none';
        btnSignup.style.display = 'none';
        userPill.style.display = 'none';

        // Create a badge for the username
        let userBadge = document.getElementById('user-badge');
        if (!userBadge) {
          userBadge = document.createElement('div');
          userBadge.id = 'user-badge';
          userBadge.className = 'pill';
          userBadge.style.background = 'var(--accent)';
          userBadge.style.color = 'white';
          userBadge.style.fontWeight = 'bold';
          userBadge.style.position = 'absolute';
          userBadge.style.top = '28px';
          userBadge.style.right = '38px';
          userBadge.style.zIndex = '999';
          document.body.appendChild(userBadge);
        }
        userBadge.textContent = u;
        toast('Logged in as ' + u);
      }
    });
    $('#cancel-login').addEventListener('click', closeOverlay);
  }

  // Seller area toggling
  function openSellerArea() {
    const sess = getSession();
    if (!sess || !sess.isAdmin) {
      // prompt login if not admin
      openLogin();
      return;
    }
    sellerArea.style.display = 'block';
    sellerArea.scrollIntoView({behavior:'smooth'});
  }

  // Preview image selection
  let currentImageDataURLs = []; // Store multiple images

  function handlePreviewImage() {
    const files = Array.from(pImageInput.files || []);
    currentImageDataURLs = [];
    pPreview.innerHTML = '';
    if (files.length === 0) {
      pPreview.textContent = 'No image';
      return;
    }
    files.forEach((f, idx) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        currentImageDataURLs.push(ev.target.result);
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.style.height = '100px';
        img.style.marginRight = '8px';
        img.style.borderRadius = '8px';
        pPreview.appendChild(img);
      };
      reader.readAsDataURL(f);
    });
  }

  // Create product
  function handleCreateProduct() {
    const title = $('#p-title').value.trim();
    const price = parseFloat($('#p-price').value) || 0;
    const desc = $('#p-desc').value.trim();
    const images = currentImageDataURLs.length > 0 ? currentImageDataURLs : [sampleImageDataURI()];
    if (!title) { toast('Title required'); return; }
    const products = loadProducts();
    const newP = { id: genslug(), title, price, desc, images };
    products.unshift(newP);
    saveProducts(products);
    renderGrid();
    productForm.reset();
    pPreview.innerHTML = 'No image';
    currentImageDataURLs = [];
    toast('Listing created — share it with the link button.');
  }

  // Open overlay with markup
  function openOverlay(html) {
    modalContent.innerHTML = html;
    overlay.classList.add('open');
  }
  function closeOverlay() {
    overlay.classList.remove('open');
    modalContent.innerHTML = '';
    // remove ?id from URL (we won't push state if user navigated directly)
    const params = new URLSearchParams(location.search);
    if (params.get('id')) {
      params.delete('id');
      const newUrl = location.pathname + (params.toString() ? '?' + params.toString() : '');
      history.replaceState({}, '', newUrl);
    }
  }

  // Show product detail
  function openProductDetail(id) {
    const products = loadProducts();
    const p = products.find(x => x.id === id);
    if (!p) {
      toast('Product not found');
      return;
    }
    // set URL with ?id
    const params = new URLSearchParams(location.search);
    params.set('id', id);
    history.replaceState({}, '', location.pathname + '?' + params.toString());

    // Use all images for carousel
    const images = p.images || [p.image || sampleImageDataURI()];
    let carouselHtml = `
      <div class="carousel" style="position:relative;">
        <img src="${images[0]}" class="carousel-img" style="width:100%;height:320px;object-fit:cover;border-radius:10px;" />
        ${images.length > 1 ? `
          <button class="carousel-prev" style="position:absolute;top:50%;left:8px;transform:translateY(-50%);background:rgba(0,0,0,0.3);border:none;color:white;border-radius:50%;width:32px;height:32px;cursor:pointer;">&#8592;</button>
          <button class="carousel-next" style="position:absolute;top:50%;right:8px;transform:translateY(-50%);background:rgba(0,0,0,0.3);border:none;color:white;border-radius:50%;width:32px;height:32px;cursor:pointer;">&#8594;</button>
        ` : ''}
      </div>
    `;

    const html = `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px">
        <h3>${escapeHtml(p.title)}</h3>
        <div style="color:var(--muted)">ID: ${p.id}</div>
      </div>
      <div class="product-detail" style="margin-top:12px">
        <div class="left">
          ${carouselHtml}
          <div style="margin-top:10px" class="muted">Shareable link:
            <input type="text" id="share-link-input" value="${location.origin + location.pathname + '?id=' + encodeURIComponent(p.id)}" style="width:100%;margin-top:8px;padding:10px;border-radius:8px;border:0;background:rgba(255,255,255,0.03);color:inherit" readonly />
          </div>
        </div>
        <div class="right">
          <div class="price" style="font-size:22px">$${Number(p.price).toFixed(2)}</div>
          <div class="desc" style="margin-top:8px">${escapeHtml(p.desc)}</div>
          <div style="display:flex;gap:8px;margin-top:14px">
            <button class="btn primary" id="detail-add-to-cart">Add to Cart</button>
            <button class="btn" id="detail-share">Share</button>
            <button class="btn primary" id="detail-checkout">Checkout</button>
          </div>
        </div>
      </div>
    `;
    openOverlay(html);

    // Carousel logic for detail view
    if (images.length > 1) {
      let idx = 0;
      const imgEl = modalContent.querySelector('.carousel-img');
      modalContent.querySelector('.carousel-prev').onclick = (e) => {
        e.stopPropagation();
        idx = (idx - 1 + images.length) % images.length;
        imgEl.src = images[idx];
      };
      modalContent.querySelector('.carousel-next').onclick = (e) => {
        e.stopPropagation();
        idx = (idx + 1) % images.length;
        imgEl.src = images[idx];
      };
    }

    $('#detail-add-to-cart').addEventListener('click', () => { addToCartById(p.id); closeOverlay(); });
    $('#detail-share').addEventListener('click', () => {
      const link = $('#share-link-input').value;
      navigator.clipboard?.writeText(link).then(()=>toast('Product link copied!'));
    });
    $('#detail-checkout').addEventListener('click', () => {
      addToCartById(p.id);
      closeOverlay();
      openCartOverlay();
    });
  }

  // Add to cart
  function addToCartById(id, qty=1) {
    const products = loadProducts();
    const p = products.find(x => x.id === id);
    if (!p) { toast('Product not found'); return; }
    const cart = loadCart();
    const item = cart.find(i => i.id === id);
    // Use first image from images array, fallback to sample
    const image = (p.images && p.images[0]) ? p.images[0] : (p.image || sampleImageDataURI());
    if (item) item.qty += qty;
    else cart.push({ id: p.id, title: p.title, price: p.price, image, qty });
    saveCart(cart);
    toast('Added to cart');
  }

  // update cart count
  function updateCartCount(){
    const cart = loadCart();
    const count = cart.reduce((s,i)=>s+i.qty,0);
    if (count > 0) {
      cartCount.style.display = 'block';
      cartCount.textContent = count;
    } else {
      cartCount.style.display = 'none';
    }
    // update user pill if any
    const sess = getSession();
    userPill.textContent = sess?.user ? sess.user : 'Guest';
  }

  // Cart overlay / checkout flow
  function openCartOverlay() {
    const cart = loadCart();
    if (cart.length === 0) {
      openOverlay(`<h3>Your cart is empty</h3><div class="hint">Add items from the marketplace.</div><div style="margin-top:12px"><button class="btn" id="c-close">Close</button></div>`);
      $('#c-close').addEventListener('click', closeOverlay);
      return;
    }
    const subtotal = cart.reduce((s,i)=>s + (i.price * i.qty), 0);
    let itemsHtml = '';
    cart.forEach(it => {
      itemsHtml += `
        <div class="cart-item" data-id="${it.id}">
          <div class="ci-thumb" style="background-image:url('${it.image}');background-size:cover"></div>
          <div style="flex:1">
            <div style="display:flex;justify-content:space-between;align-items:center">
              <div><strong>${escapeHtml(it.title)}</strong><div class="txt-muted">$${Number(it.price).toFixed(2)}</div></div>
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

    // events
    $('#continue-shopping').addEventListener('click', closeOverlay);
    $('#proceed-checkout').addEventListener('click', openCheckoutForm);
    // remove & qty change
    modalContent.querySelectorAll('[data-action="remove"]').forEach(b => {
      b.addEventListener('click', (ev) => {
        const id = ev.target.dataset.id;
        let cart = loadCart();
        cart = cart.filter(x => x.id !== id);
        saveCart(cart);
        openCartOverlay(); // refresh
      });
    });
    modalContent.querySelectorAll('.ci-qty').forEach(inp => {
      inp.addEventListener('change', (ev) => {
        const id = ev.target.dataset.id;
        let q = parseInt(ev.target.value) || 1;
        if (q < 1) q = 1;
        const cart = loadCart();
        const it = cart.find(x => x.id === id);
        if (it) it.qty = q;
        saveCart(cart);
        openCartOverlay();
      });
    });
  }

  // Checkout form
  function openCheckoutForm() {
    const cart = loadCart();
    if (cart.length === 0) { toast('Cart empty'); closeOverlay(); return; }
    const subtotal = cart.reduce((s,i)=>s + (i.price * i.qty), 0);
    const html = `
      <h3>Checkout</h3>
      <div class="hint">Payment <strong></strong></div>
      <form id="checkout-form" style="margin-top:12px">
        <div class="row">
          <div>
            <label>Full name</label>
            <input id="co-name" type="text" required />
          </div>
          <div>
            <label>Phone</label>
            <input id="co-phone" type="text" required />
          </div>
          <div style="grid-column:1/-1">
            <label>Shipping Address</label>
            <input id="co-address" type="text" placeholder="Street, City, Country" required />
          </div>
          <div style="grid-column:1/-1">
            <label>Payment Method</label>
            <select id="co-method" required>
              <option value="paypal">PayPal</option>
            </select>
          </div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px">
          <div class="muted">Total</div>
          <div style="font-weight:800">$${subtotal.toFixed(2)}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
         <button class="btn primary" type="submit">Confirm Purchase</button> 

          <button class="btn" id="co-cancel" type="button">Cancel</button>
        </div>
      </form>
    `;
    openOverlay(html);
    $('#co-cancel').addEventListener('click', closeOverlay);
    $('#checkout-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = $('#co-name').value.trim();
      const address = $('#co-address').value.trim();
      const method = $('#co-method').value;
      if (!name || !address) { toast('Fill required fields'); return; }
      if (method !== 'paypal') { toast('Only PayPal supported'); return; }
      // simulate order
      const orderId = 'ORD-' + genslug().toUpperCase().slice(0,10);
      const cart = loadCart();
      const total = cart.reduce((s,i)=>s + (i.price * i.qty), 0);
      // clear cart
      saveCart([]);
      // show confirmation
      const summaryHtml = cart.map(it => `<div style="display:flex;justify-content:space-between"><div>${escapeHtml(it.title)} x ${it.qty}</div><div>$${(it.price*it.qty).toFixed(2)}</div></div>`).join('');
      const confHtml = `
        <h3>Purchase Confirmed</h3>
        <div class="hint">Order ID: <strong>${orderId}</strong></div>
        <div style="margin-top:12px">
          ${summaryHtml}
          <div style="display:flex;justify-content:space-between;margin-top:8px;font-weight:800">Total:<div>$${total.toFixed(2)}</div></div>
        </div>
        <div style="margin-top:12px">
          <div class="muted">Shipping to</div>
          <div><strong>${escapeHtml(name)}</strong></div>
          <div class="muted">${escapeHtml(address)}</div>
        </div>
        <div style="display:flex;gap:8px;margin-top:12px">
          <a href="https://mediumaquamarine-elk-121087.hostingersite.com/"><button class="btn primary" id="conf-done">Make Payment</button> </a>
        </div>
      `;
      openOverlay(confHtml);
      $('#conf-done').addEventListener('click', () => {
        closeOverlay();
        toast('Thank you! Your order is complete.');
      });
    });
  }

  // Share product: copy link
  function shareProduct(id) {
    const url = location.origin + location.pathname + '?id=' + encodeURIComponent(id);
    if (navigator.share) {
      navigator.share({ title: 'Check this product', url }).then(()=>{}).catch(()=>navigator.clipboard?.writeText(url).then(()=>toast('Link copied!')));
    } else {
      navigator.clipboard?.writeText(url).then(()=>toast('Link copied to clipboard'));
    }
  }

  // session UI update
  function updateSessionUI(){
    const sess = getSession();
    if (sess) {
      userPill.textContent = sess.user + (sess.isAdmin ? ' (admin)' : '');
      btnLogin.textContent = 'Logout';
      btnLogin.onclick = () => { clearSession(); toast('Logged out'); };
      btnSignup.style.display = 'none';
      if (sess.isAdmin) {
        btnSellerDashboard.style.display = 'inline-block';
      } else {
        btnSellerDashboard.style.display = 'none';
        sellerArea.style.display = 'none';
      }
    } else {
      userPill.textContent = 'Guest';
      btnLogin.textContent = 'Login';
      btnLogin.onclick = openLogin;
      btnSignup.style.display = 'inline-block';
      btnSellerDashboard.style.display = 'inline-block';
      sellerArea.style.display = 'none';
    }
  }

  // escape function already set

  // Initialize
  wire();

  // small helper: ensure cart count updates on storage events (sync across tabs)
  window.addEventListener('storage', (e) => {
    if (e.key === LS_CART) updateCartCount();
    if (e.key === LS_PRODUCTS) renderGrid(searchInput.value);
    if (e.key === LS_SESSION) updateSessionUI();
  });

  document.addEventListener('DOMContentLoaded', function() {
    const userPill = document.getElementById('user-pill');
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');

    userPill.addEventListener('click', function() {
      btnLogin.style.display = 'none';
      btnSignup.style.display = 'none';
      userPill.textContent = 'Guest Mode';
      userPill.style.background = 'var(--accent)';
      userPill.style.color = 'white';
      userPill.style.fontWeight = 'bold';
    });
  });

})();
