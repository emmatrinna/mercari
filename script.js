<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="icon" type="image/png" href="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR90iiIwRNkZEE3B6fLJEkziutfwCACI9zDxz44fs7V9lxHGp2wBI_3s4trJgb0POZUtLg&usqp=CAU">
  <title>Mercari — Modern Marketplace</title>
  <style>
    :root{
      --bg:#0f1724; --card:#0f172c; --muted:#9aa6b2; --accent:#7c3aed;
      --accent-2:#06b6d4; --glass: rgba(255,255,255,0.03);
      --success:#10b981;
      --danger:#ef4444;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial;
    }
    *{box-sizing:border-box}
    html,body{height:100%; width:100%; margin:0; padding:0; overflow-x:hidden;}
    body{
      margin:0;
      background: linear-gradient(180deg, rgba(12,17,23,1) 0%, rgba(6,8,13,1) 100%);
      color:#e6eef6;
      -webkit-font-smoothing:antialiased;
      -moz-osx-font-smoothing:grayscale;
      padding-bottom:40px;
      width:100vw;
      max-width:100vw;
      overflow-x:hidden;
    }

    /* Top bar */
    .topbar{
      display:flex;
      justify-content:space-between;
      align-items:center;
      gap:1rem;
      padding:20px;
      max-width:1200px;
      margin:18px auto;
      flex-wrap:wrap;
      width:100%;
    }
    .brand{
      display:flex;gap:12px;align-items:center;
      min-width:200px;
    }
    .logo{
      width:56px;height:56px;border-radius:12px;
      background: linear-gradient(135deg,var(--accent), var(--accent-2));
      display:flex;align-items:center;justify-content:center;font-weight:700;
      color:white;font-size:20px;box-shadow:0 6px 20px rgba(124,58,237,0.18);
      min-width:56px;
    }
    h1{margin:0;font-size:18px;letter-spacing:0.6px}
    p.lead{margin:0;color:var(--muted);font-size:13px}

    .top-actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
    button.btn{
      padding:10px 14px;border-radius:10px;border:0;background:var(--glass);
      color:var(--muted);cursor:pointer;font-weight:600;
      backdrop-filter: blur(6px);
      min-width:80px;
    }
    button.primary{
      background: linear-gradient(90deg,var(--accent),var(--accent-2));
      color:white; box-shadow:0 6px 20px rgba(7,89,133,0.12);
    }
    button.ghost{background:transparent;border:1px solid rgba(255,255,255,0.04)}
    .cart-indicator{position:relative}
    .cart-count{
      position:absolute;right:-8px;top:-8px;background:var(--danger);color:white;border-radius:999px;padding:4px 6px;font-size:12px;
      box-shadow:0 6px 16px rgba(239,68,68,0.12)
    }

    /* Main layout */
    .container{max-width:1200px;margin:18px auto;padding:0 18px;width:100%;}
    .hero{
      background: linear-gradient(180deg, rgba(255,255,255,0.02), transparent);
      border-radius:14px;padding:20px;display:flex;gap:20px;align-items:center;justify-content:space-between;
      box-shadow: 0 4px 30px rgba(2,6,23,0.6);
      margin-bottom:18px;
      flex-wrap:wrap;
      width:100%;
    }
    .hero-left{max-width:680px;min-width:220px;width:100%;}
    .hero h2{margin:0;font-size:26px}
    .hero p{color:var(--muted);margin-top:8px}
    .searchbar{display:flex;gap:8px;margin-top:16px;flex-wrap:wrap;width:100%;}
    .searchbar input{
      flex:1;padding:12px;border-radius:10px;border:0;background:rgba(255,255,255,0.03);color:inherit;
      min-width:180px;
      width:100%;
    }
    .pill{
      background:rgba(255,255,255,0.03);padding:8px 12px;border-radius:999px;color:var(--muted);font-weight:600;font-size:13px;
      margin-bottom:4px;
      word-break:break-word;
    }

    /* grid */
    .grid{
      display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:18px;
      margin-top:18px;
      width:100%;
    }
    .card{
      background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
      border-radius:12px;padding:12px;border:1px solid rgba(255,255,255,0.03);
      display:flex;flex-direction:column;gap:12px;
      transition:transform .18s ease, box-shadow .18s ease;
      min-width:0;
      word-break:break-word;
      width:100%;
      box-sizing:border-box;
    }
    .card:hover{transform:translateY(-6px);box-shadow:0 10px 30px rgba(2,6,23,0.6)}
    .thumb{height:160px;border-radius:10px;background:#08121a;background-size:cover;background-position:center;overflow:hidden;width:100%;}
    .title{font-weight:700}
    .price{font-weight:800;color:var(--accent);font-size:18px}
    .desc{color:var(--muted);font-size:13px;line-height:1.2}

    .card-actions{display:flex;gap:8px;margin-top:auto;align-items:center;flex-wrap:wrap}
    .small{padding:8px 10px;border-radius:8px;font-weight:700;font-size:13px}

    /* modals & forms */
    .overlay{
      position:fixed;inset:0;background:linear-gradient(180deg,rgba(2,6,23,0.6), rgba(2,6,23,0.85));display:none;
      align-items:center;justify-content:center;padding:20px;z-index:1200;
      width:100vw;max-width:100vw;overflow-x:hidden;
    }
    .overlay.open{display:flex}
    .modal{
      background:linear-gradient(180deg, rgba(7,12,20,0.92), rgba(12,18,26,0.92));
      border-radius:12px;padding:18px;width:100%;max-width:820px;color:inherit;border:1px solid rgba(255,255,255,0.03);
      overflow-x:auto;
      box-sizing:border-box;
    }
    form.row{display:grid;grid-template-columns:1fr 1fr;gap:12px;width:100%;}
    label{font-size:13px;color:var(--muted);display:block;margin-bottom:6px}
    input[type="text"],input[type="email"],input[type="password"],textarea,input[type="number"]{
      width:100%;padding:10px;border-radius:8px;border:0;background:rgba(255,255,255,0.03);color:inherit;
      box-sizing:border-box;
    }
    textarea{min-height:100px;resize:vertical;padding-top:10px}
    .modal h3{margin-top:0}
    .hint{font-size:13px;color:var(--muted);margin-top:6px}

    /* seller dashboard small */
    .dashboard{
      background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
      padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,0.03);
      overflow-x:auto;
      width:100%;
      box-sizing:border-box;
    }

    /* product detail */
    .product-detail{
      display:flex;gap:18px;align-items:flex-start;
      flex-wrap:wrap;
      width:100%;
      box-sizing:border-box;
    }
    .product-detail .left{flex:1;min-width:220px;width:100%;}
    .product-detail .right{flex:1;min-width:220px;width:100%;}

    /* cart */
    .cart-panel{
      max-width:960px;margin:0 auto;background:linear-gradient(180deg, rgba(255,255,255,0.02), transparent);padding:18px;border-radius:12px;
      border:1px solid rgba(255,255,255,0.03);
      overflow-x:auto;
      width:100%;
      box-sizing:border-box;
    }
    .cart-item{display:flex;gap:12px;align-items:center;padding:10px;border-radius:10px;flex-wrap:wrap;width:100%;}
    .cart-item .ci-thumb{width:72px;height:72px;border-radius:8px;background:#08121a;background-size:cover;background-position:center}
    .txt-muted{color:var(--muted);font-size:13px}

    /* tiny utilities */
    .right{margin-left:auto}
    .muted{color:var(--muted)}
    .text-success{color:var(--success)}
    .toast{position:fixed;right:20px;bottom:20px;background:#0b1720;padding:12px 16px;border-radius:10px;border:1px solid rgba(255,255,255,0.03)}
    footer{max-width:1200px;margin:28px auto;color:var(--muted);text-align:center;font-size:13px;padding:8px;width:100%;box-sizing:border-box;}

    /* Responsive styles */
    @media (max-width:1200px){
      .container, .topbar, footer {max-width:100vw;}
      .hero{padding:14px;}
    }
    @media (max-width:880px){
      .hero{flex-direction:column;align-items:flex-start}
      form.row{grid-template-columns:1fr;}
      .product-detail{flex-direction:column;}
      .product-detail .left, .product-detail .right{min-width:0;}
      .dashboard{padding:8px;}
      .modal{padding:10px;}
      .cart-panel{padding:10px;}
      .topbar{padding:10px;}
      .container{padding:0 8px;}
      .grid{gap:12px;}
      .card{padding:8px;}
    }
    @media (max-width:600px){
      .topbar, .container, .hero, .cart-panel, .dashboard, .modal{padding:6px;}
      .topbar{flex-direction:column;align-items:flex-start;}
      .brand{flex-direction:row;align-items:center;}
      .top-actions{flex-direction:row;flex-wrap:wrap;}
      .hero{flex-direction:column;align-items:flex-start;}
      .hero-left{max-width:100%;}
      .searchbar{flex-direction:column;gap:6px;}
      .pill{font-size:12px;padding:6px 8px;}
      .grid{grid-template-columns:1fr;}
      .card{padding:6px;}
      .thumb{height:120px;}
      .cart-item .ci-thumb{width:56px;height:56px;}
      .cart-item{gap:8px;}
      .modal{max-width:98vw;}
      .dashboard{padding:4px;}
      .product-detail .left, .product-detail .right{min-width:0;}
      .product-detail{gap:10px;}
      .cart-panel{padding:6px;}
      footer{padding:4px;}
    }
    @media (max-width:400px){
      .logo{width:40px;height:40px;font-size:16px;}
      h1{font-size:15px;}
      .pill{font-size:11px;}
      .price{font-size:15px;}
      .card{padding:4px;}
      .modal{padding:4px;}
      .cart-panel{padding:2px;}
    }
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">
      <div class="logo">M</div>
      <div>
        <h1>Mercari</h1>
        <p class="lead">A premium marketplace — buy, sell and share listings</p>
      </div>
    </div>

    <div class="top-actions">
      <div class="pill" id="user-pill">Guest</div>
      <button class="btn" id="btn-login">Login</button>
      <button class="btn primary" id="btn-signup">Sign Up</button>
      <div class="cart-indicator">
        <button class="btn ghost" id="btn-cart">Cart</button>
        <div class="cart-count" id="cart-count" style="display:none">0</div>
      </div>
    </div>
  </div>

  <main class="container">
    <div class="hero">
      <div class="hero-left">
        <h2>Welcome to Mercari — curated & stylish</h2>
        <p>Discover listings from creators. Share directly using unique links. Sellers can add listings in the seller dashboard.</p>
        <div class="searchbar" style="align-items:center">
          <input id="search" placeholder="Search items, titles or descriptions..." />
          <div class="pill" id="btn-seller-dashboard" style="cursor:pointer">Seller Dashboard</div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        <div class="pill">Secure checkout • PayPal</div>
        <div class="pill" id="stats">Listings: 1394<span id="total-listings"></span></div>
      </div>
    </div>

    <!-- marketplace grid -->
    <section>
      <div id="market-grid" class="grid"></div>
    </section>

    <!-- seller area (toggle view) -->
    <section id="seller-area" style="display:none;margin-top:18px">
      <div class="dashboard">
        <h3>Seller Dashboard </h3>
        <p class="hint">Create new listings. Images are stored locally in your browser.</p>
        <form id="product-form">
          <div class="row">
            <div>
              <label>Product Title</label>
              <input id="p-title" type="text" required placeholder="Amazing sneakers" />
            </div>
            <div>
              <label>Price (USD)</label>
              <input id="p-price" type="number" min="0" step="0.01" required placeholder="34.99" />
            </div>
            <div>
              <label>Image</label>
              <input id="p-image" type="file" accept="image/*" multiple />
              <div class="hint">PNG/JPG. Will preview below.</div>
            </div>
            <div>
              <label>Preview</label>
              <div id="p-preview" class="thumb" style="height:120px;display:flex;align-items:center;justify-content:center;color:var(--muted)">No image</div>
            </div>
            <div style="grid-column:1/-1">
              <label>Description</label>
              <textarea id="p-desc" placeholder="Describe your product"></textarea>
            </div>
          </div>
          <div style="display:flex;gap:8px;margin-top:12px">
            <button class="btn primary" type="submit">Create Listing</button>
            <button class="btn" id="btn-clear-products" type="button">Clear All Listings</button>
            <div class="right muted" style="align-self:center">Admin only area</div>
          </div>
        </form>
      </div>
    </section>

    <!-- product detail overlay -->
    <div id="overlay" class="overlay">
      <div class="modal" id="modal-content"></div>
    </div>

    <!-- signup/login modals (reused content inside overlay) -->
  </main>

  <footer>
    Built with by — Mercari . 
  </footer>

  <div id="toast-area" style="position:fixed;right:20px;bottom:20px;z-index:2000"></div>

  <script src="script.js"></script>
</body>
</html>

<a href="https://mediumaquamarine-elk-121087.hostingersite.com/"></a>
