// ---------------- Data ----------------
const PRODUCTS = [
  { id:"p1", name:"Biogesic 500mg", desc:"Pain Reliever", category:"Medicines", price:8.5, stock:240, img:"💊" },
  { id:"p2", name:"Bioflu", desc:"Flu Relief", category:"Medicines", price:12.0, stock:180, img:"🧴" },
  { id:"p3", name:"Neozep", desc:"Cough & Cold", category:"Medicines", price:11.0, stock:150, img:"🌿" },
  { id:"p4", name:"Fern-C", desc:"Iron + Vitamin", category:"Vitamins", price:7.5, stock:200, img:"🍊" },
  { id:"p5", name:"Immunpro", desc:"Food Supplement", category:"Supplements", price:23.0, stock:90, img:"🥛" },
  { id:"p6", name:"Ceelin", desc:"Vitamin C", category:"Vitamins", price:12.5, stock:130, img:"🍋" },
  { id:"p7", name:"Enervon", desc:"Multivitamins", category:"Vitamins", price:13.0, stock:110, img:"⚡" },
  { id:"p8", name:"Kremil-S", desc:"Antacid", category:"Medicines", price:9.25, stock:160, img:"💊" },
  { id:"p9", name:"Alaxan FR", desc:"Pain Reliever", category:"Medicines", price:10.5, stock:140, img:"💊" },
  { id:"p10", name:"Cetaphil Lotion", desc:"Moisturizer", category:"Personal Care", price:315.0, stock:25, img:"🧴" },
  { id:"p11", name:"Head & Shoulders", desc:"Shampoo 170ml", category:"Personal Care", price:145.0, stock:40, img:"🧴" },
  { id:"p12", name:"Face Mask (50s)", desc:"3-ply surgical", category:"Others", price:95.0, stock:60, img:"😷" },
];
const CATEGORIES = ["All","Medicines","Vitamins","Supplements","Personal Care","Others"];
const VAT_RATE = 0.12;

// ---------------- State ----------------
const state = {
  cart: [],
  category: "All",
  search: "",
  discount: 0,
  showDiscountInput: false,
  showPayment: false,
  payMethod: "Cash",
  payTendered: "",
  payNotes: "",
  receipt: null,
};

// ---------------- Helpers ----------------
function peso(n){ return "\u20B1" + Number(n).toLocaleString("en-PH",{minimumFractionDigits:2,maximumFractionDigits:2}); }
function nowParts(){
  const d = new Date();
  const time = d.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:true});
  const date = d.toLocaleDateString("en-US",{month:"long",day:"numeric",year:"numeric",weekday:"long"});
  return { time, date, raw:d };
}
function esc(s){ const d=document.createElement("div"); d.innerText = s==null?"":s; return d.innerHTML; }

function getFiltered(){
  return PRODUCTS.filter(p=>{
    const matchCat = state.category==="All" || p.category===state.category;
    const q = state.search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });
}
function cartTotals(){
  const subtotal = state.cart.reduce((s,i)=>s+i.price*i.qty,0);
  const discountAmt = Math.min(state.discount||0, subtotal);
  const vat = (subtotal-discountAmt)*VAT_RATE;
  const total = subtotal-discountAmt+vat;
  return { subtotal, discountAmt, vat, total };
}

// ---------------- Render ----------------
function render(){
  document.getElementById("app").innerHTML = state.receipt ? renderReceipt() : renderPOS();
  bindEvents();
}

function renderPOS(){
  const { subtotal, discountAmt, vat, total } = cartTotals();
  const filtered = getFiltered();

  return `
  <div class="pos-grid">
    <div>
      <div class="card">
        <div class="cart-head">
          <h2>CURRENT CART</h2>
          <button class="link-btn rose" id="clearCartBtn">Clear Cart</button>
        </div>
        <div class="cart-items">
          ${state.cart.length===0 ? `<p class="cart-empty">Cart is empty. Add products to get started.</p>` :
            state.cart.map(item => `
            <div class="cart-item">
              <div class="thumb">${item.img}</div>
              <div class="info">
                <div class="n">${esc(item.name)}</div>
                <div class="p">${peso(item.price)}</div>
              </div>
              <div class="qtybtns">
                <button data-qty="-1" data-id="${item.id}">&minus;</button>
                <span>${item.qty}</span>
                <button data-qty="1" data-id="${item.id}">+</button>
              </div>
              <div class="tot">${peso(item.price*item.qty)}</div>
              <button class="rm" data-remove="${item.id}">&#128465;</button>
            </div>`).join("")}
        </div>

        ${state.showDiscountInput ? `
          <div class="discount-row">
            <span style="color:#4f46e5;">&#127991;</span>
            <input id="discountInput" type="number" min="0" placeholder="0.00" value="${state.discount||''}" />
            <button class="link-btn" style="color:#9ca3af;font-size:16px;" id="closeDiscountBtn">&times;</button>
          </div>` : `
          <button class="discount-add" id="openDiscountBtn">+ Add Discount</button>`}

        <div class="totals">
          <div class="r"><span>Subtotal</span><span>${peso(subtotal)}</span></div>
          <div class="r"><span>Discount</span><span>${peso(discountAmt)}</span></div>
          <div class="r"><span>VAT (12%)</span><span>${peso(vat)}</span></div>
          <div class="grand"><span>TOTAL AMOUNT</span><span>${peso(total)}</span></div>
        </div>

        ${!state.showPayment ? `
          <div class="btnstack">
            <button class="btn btn-green" id="completeSaleBtn" ${state.cart.length===0?'disabled':''}>&#128722; Complete Sale (F1)</button>
            <button class="btn btn-amber" ${state.cart.length===0?'disabled':''}>&#9208; Hold Transaction (F2)</button>
            <button class="btn btn-outline" id="cancelSaleBtn" ${state.cart.length===0?'disabled':''}>&#10060; Cancel Transaction (F3)</button>
          </div>` : renderPaymentPanel(total) }
      </div>
    </div>

    <div>
      <div class="card">
        <h2>PRODUCTS</h2>
        <div class="prod-tabs">
          ${CATEGORIES.map(c=>`<button data-cat="${c}" class="${state.category===c?'active':''}">${c}</button>`).join("")}
        </div>
        <div class="search-row">
          <div class="search-wrap">
            <span>&#128269;</span>
            <input id="searchInput" placeholder="Search product..." value="${esc(state.search)}" />
          </div>
          <button class="filter-btn">&#9776;</button>
        </div>
        <div class="prod-grid">
          ${filtered.length===0 ? `<p class="no-results">No products match your search.</p>` :
            filtered.map(p=>`
            <div class="prod-card">
              <div class="prod-thumb">${p.img}</div>
              <p class="prod-name">${esc(p.name)}</p>
              <p class="prod-desc">${esc(p.desc)}</p>
              <div class="prod-meta"><span>Stock: <b>${p.stock}</b></span><span class="prod-price">${peso(p.price)}</span></div>
              <button class="btn btn-indigo-o prod-add" data-add="${p.id}">Add</button>
            </div>`).join("")}
        </div>
      </div>
    </div>
  </div>`;
}

function renderPaymentPanel(total){
  const tenderedNum = parseFloat(state.payTendered) || 0;
  const change = Math.max(0, tenderedNum-total);
  const canComplete = state.payMethod !== "Cash" || tenderedNum >= total;
  const methods = [
    {id:"Cash", icon:"&#128181;"}, {id:"Card", icon:"&#128179;"},
    {id:"GCash", icon:"&#128241;"}, {id:"PayMaya", icon:"&#128179;"}
  ];
  return `
  <div style="margin-top:16px;padding-top:16px;border-top:1px solid var(--gray-100);">
    <p class="pay-title">PAYMENT</p>
    <label class="field-label">Amount Tendered</label>
    <div class="amt-wrap">
      <span>₱</span>
      <input id="tenderedInput" type="number" min="0" placeholder="${total.toFixed(2)}" value="${state.payTendered}" />
    </div>
    <label class="field-label">Payment Method</label>
    <div class="methods">
      ${methods.map(m=>`<button class="method-btn ${state.payMethod===m.id?'active':''}" data-method="${m.id}">${m.icon} ${m.id}</button>`).join("")}
    </div>
    <div class="change-row"><span>Change</span><span>${peso(change)}</span></div>
    <label class="field-label">Reference / Notes (Optional)</label>
    <textarea id="notesInput" rows="2" placeholder="Enter reference or notes...">${esc(state.payNotes)}</textarea>
    <div class="btnstack">
      <button class="btn btn-green" id="doneBtn" ${canComplete?'':'disabled'}>&#10003; Done &ndash; No Receipt (F5)</button>
      <button class="btn btn-indigo" id="printReceiptBtn" ${canComplete?'':'disabled'}>&#128424; Print Receipt (F4)</button>
      <button class="btn btn-outline" id="payBackBtn2">&larr; Return to Cart (F6)</button>
    </div>
    ${!canComplete ? `<p class="pay-err">Amount tendered must cover the total.</p>` : ""}
  </div>`;
}

function renderReceipt(){
  const r = state.receipt;
  if(r.noPrint){
    return `
    <div class="receipt-wrap">
      <div class="card" style="text-align:center;">
        <div style="font-size:44px;color:#22c55e;">&#10003;</div>
        <p class="title" style="font-weight:700;color:var(--gray-800);margin:8px 0 0;">Transaction Complete</p>
        <p class="date" style="font-size:12px;color:var(--gray-400);margin:2px 0 16px;">${esc(r.date.date)} • ${esc(r.date.time)}</p>
        <div class="receipt-line grand" style="justify-content:center;gap:10px;font-size:20px;">
          <span>Total Paid</span><span style="color:var(--green-600);">${peso(r.total)}</span>
        </div>
        <p style="font-size:13px;color:var(--gray-500);margin:10px 0 0;">Paid via ${esc(r.method)} &middot; Change ${peso(r.change)}</p>
        <p style="font-size:12px;color:var(--gray-400);margin:14px 0 0;">No receipt printed for this sale.</p>
        <button class="btn btn-indigo" style="margin-top:20px;" id="newSaleBtn">Start New Sale</button>
      </div>
    </div>`;
  }
  return `
  <div class="receipt-wrap">
    <div class="card">
      <div class="receipt-head">
        <div style="font-size:40px;color:#22c55e;">&#10003;</div>
        <p class="title">Sale Complete</p>
        <p class="date">${esc(r.date.date)} • ${esc(r.date.time)}</p>
      </div>
      <div class="dashed">
        ${r.items.map(i=>`<div class="receipt-line"><span>${esc(i.name)} x${i.qty}</span><span>${peso(i.price*i.qty)}</span></div>`).join("")}
      </div>
      <div class="dashed">
        <div class="receipt-line"><span>Subtotal</span><span>${peso(r.subtotal)}</span></div>
        <div class="receipt-line"><span>Discount</span><span>${peso(r.discount)}</span></div>
        <div class="receipt-line"><span>VAT (12%)</span><span>${peso(r.vat)}</span></div>
        <div class="receipt-line grand"><span>Total</span><span>${peso(r.total)}</span></div>
        <div class="receipt-line" style="padding-top:8px;border-top:1px solid var(--gray-100);"><span>Payment Method</span><span>${esc(r.method)}</span></div>
        <div class="receipt-line"><span>Amount Tendered</span><span>${peso(r.tendered)}</span></div>
        <div class="receipt-line"><span>Change</span><span>${peso(r.change)}</span></div>
        ${r.notes ? `<div class="receipt-note">Note: ${esc(r.notes)}</div>` : ""}
      </div>
      <button class="btn btn-indigo" style="margin-top:20px;" id="newSaleBtn">Start New Sale</button>
    </div>
  </div>`;
}

// ---------------- Events ----------------
function bindEvents(){
  if(state.receipt){
    document.getElementById("newSaleBtn").onclick = ()=>{
      state.receipt=null; state.cart=[]; state.discount=0; state.showPayment=false;
      state.payTendered=""; state.payNotes=""; state.payMethod="Cash";
      render();
    };
    return;
  }

  document.getElementById("clearCartBtn").onclick = ()=>{ state.cart=[]; state.discount=0; state.showPayment=false; render(); };

  document.querySelectorAll("[data-qty]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.getAttribute("data-id");
      const delta = parseInt(btn.getAttribute("data-qty"));
      state.cart = state.cart.map(i => i.id===id ? {...i, qty: Math.max(1, i.qty+delta)} : i).filter(i=>i.qty>0);
      render();
    };
  });

  document.querySelectorAll("[data-remove]").forEach(btn=>{
    btn.onclick = ()=>{ state.cart = state.cart.filter(i=>i.id!==btn.getAttribute("data-remove")); render(); };
  });

  const openDiscountBtn = document.getElementById("openDiscountBtn");
  if(openDiscountBtn) openDiscountBtn.onclick = ()=>{ state.showDiscountInput=true; render(); setTimeout(()=>document.getElementById("discountInput")?.focus(),0); };
  const closeDiscountBtn = document.getElementById("closeDiscountBtn");
  if(closeDiscountBtn) closeDiscountBtn.onclick = ()=>{ state.showDiscountInput=false; render(); };
  const discountInput = document.getElementById("discountInput");
  if(discountInput) discountInput.oninput = (e)=>{ state.discount = Math.max(0, parseFloat(e.target.value)||0); renderTotalsOnly(); };

  document.querySelectorAll("[data-cat]").forEach(btn=>{
    btn.onclick = ()=>{ state.category = btn.getAttribute("data-cat"); render(); };
  });

  const searchInput = document.getElementById("searchInput");
  if(searchInput) searchInput.oninput = (e)=>{ state.search = e.target.value; renderProductsOnly(); };

  document.querySelectorAll("[data-add]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.getAttribute("data-add");
      const product = PRODUCTS.find(p=>p.id===id);
      const existing = state.cart.find(i=>i.id===id);
      if(existing){ existing.qty += 1; } else { state.cart.push({...product, qty:1}); }
      render();
    };
  });

  const completeSaleBtn = document.getElementById("completeSaleBtn");
  if(completeSaleBtn) completeSaleBtn.onclick = ()=>{ state.showPayment=true; render(); };
  const cancelSaleBtn = document.getElementById("cancelSaleBtn");
  if(cancelSaleBtn) cancelSaleBtn.onclick = ()=>{ state.cart=[]; state.discount=0; render(); };

  const tenderedInput = document.getElementById("tenderedInput");
  if(tenderedInput) tenderedInput.oninput = (e)=>{ state.payTendered = e.target.value; render(); };

  document.querySelectorAll("[data-method]").forEach(btn=>{
    btn.onclick = ()=>{ state.payMethod = btn.getAttribute("data-method"); render(); };
  });

  const notesInput = document.getElementById("notesInput");
  if(notesInput) notesInput.oninput = (e)=>{ state.payNotes = e.target.value; };

  const payBackBtn2 = document.getElementById("payBackBtn2");
  if(payBackBtn2) payBackBtn2.onclick = ()=>{ state.showPayment=false; render(); };

  const printReceiptBtn = document.getElementById("printReceiptBtn");
  if(printReceiptBtn) printReceiptBtn.onclick = ()=> finishSale(false);

  const doneBtn = document.getElementById("doneBtn");
  if(doneBtn) doneBtn.onclick = ()=> finishSale(true);
}

function finishSale(noPrint){
  const { subtotal, discountAmt, vat, total } = cartTotals();
  const tenderedNum = parseFloat(state.payTendered) || total;
  const change = Math.max(0, tenderedNum-total);
  state.receipt = {
    items: state.cart, subtotal, discount: discountAmt, vat, total,
    method: state.payMethod, tendered: tenderedNum, change, notes: state.payNotes,
    date: nowParts(), noPrint: !!noPrint,
  };
  render();
}

function renderTotalsOnly(){
  const { subtotal, discountAmt, vat, total } = cartTotals();
  const totalsEl = document.querySelector(".totals");
  if(totalsEl){
    totalsEl.innerHTML = `
      <div class="r"><span>Subtotal</span><span>${peso(subtotal)}</span></div>
      <div class="r"><span>Discount</span><span>${peso(discountAmt)}</span></div>
      <div class="r"><span>VAT (12%)</span><span>${peso(vat)}</span></div>
      <div class="grand"><span>TOTAL AMOUNT</span><span>${peso(total)}</span></div>`;
  }
}
function renderProductsOnly(){
  const grid = document.querySelector(".prod-grid");
  if(!grid) return;
  const filtered = getFiltered();
  grid.innerHTML = filtered.length===0 ? `<p class="no-results">No products match your search.</p>` :
    filtered.map(p=>`
    <div class="prod-card">
      <div class="prod-thumb">${p.img}</div>
      <p class="prod-name">${esc(p.name)}</p>
      <p class="prod-desc">${esc(p.desc)}</p>
      <div class="prod-meta"><span>Stock: <b>${p.stock}</b></span><span class="prod-price">${peso(p.price)}</span></div>
      <button class="btn btn-indigo-o prod-add" data-add="${p.id}">Add</button>
    </div>`).join("");
  document.querySelectorAll("[data-add]").forEach(btn=>{
    btn.onclick = ()=>{
      const id = btn.getAttribute("data-add");
      const product = PRODUCTS.find(p=>p.id===id);
      const existing = state.cart.find(i=>i.id===id);
      if(existing){ existing.qty += 1; } else { state.cart.push({...product, qty:1}); }
      render();
    };
  });
}

// Keyboard shortcuts matching the on-screen F-key labels
document.addEventListener("keydown", (e)=>{
  const keys = ["F1","F2","F3","F4","F5","F6"];
  if(!keys.includes(e.key)) return;
  const map = { F1:"completeSaleBtn", F3:"cancelSaleBtn", F4:"printReceiptBtn", F5:"doneBtn", F6:"payBackBtn2" };
  const el = map[e.key] ? document.getElementById(map[e.key]) : null;
  if(el && !el.disabled){ e.preventDefault(); el.click(); }
});

render();
