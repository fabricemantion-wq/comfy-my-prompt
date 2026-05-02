import { app } from "../../scripts/app.js";

// ─────────────────────────────────────────────────────────────────────────────
//  My_Prompt — Visual prompt builder with clickable word categories
// ─────────────────────────────────────────────────────────────────────────────

// ── Styles ────────────────────────────────────────────────────────────────────
function injectStyles() {
    if (document.getElementById("my-prompt-styles")) return;
    const s = document.createElement("style");
    s.id = "my-prompt-styles";
    s.textContent = `
    @keyframes mpIn  { from{opacity:0} to{opacity:1} }
    @keyframes mpUp  { from{transform:translateY(18px);opacity:0} to{transform:translateY(0);opacity:1} }

    #my-mp-overlay { animation: mpIn .18s ease; }
    #my-mp-modal   { animation: mpUp .22s cubic-bezier(.16,1,.3,1); }

    /* Scrollbars */
    .mp-scroll::-webkit-scrollbar { width:4px; height:4px; }
    .mp-scroll::-webkit-scrollbar-track { background:transparent; }
    .mp-scroll::-webkit-scrollbar-thumb { background:#2a2a2a; border-radius:2px; }

    /* Clickable words */
    .mp-word {
        display:inline-flex; align-items:center; gap:4px;
        padding:3px 9px; border-radius:20px; font-size:12px;
        border:1px solid #2e2e2e; background:#1a1a1a; color:#aaa;
        cursor:pointer; user-select:none; transition:all .15s;
        white-space:nowrap;
    }
    .mp-word:hover       { border-color:#1a5fa8; color:#ccc; background:#1e2a38; }
    .mp-word.active      { border-color:#1a5fa8; background:#1a3a5c; color:#7db8f0; }
    .mp-word.active-space{ border-color:#2a7a4a; background:#1a3c2a; color:#7dd4a0; }


    /* Category tabs */
    .mp-tab {
        padding:5px 14px; border-radius:20px; font-size:12px;
        border:1px solid transparent; background:transparent; color:#666;
        cursor:pointer; user-select:none; transition:all .15s; white-space:nowrap;
    }
    .mp-tab:hover  { color:#aaa; border-color:#2a2a2a; }
    .mp-tab.active { color:#7db8f0; border-color:#1a5fa8; background:#1a2a3a; }
    .mp-tab.all    { color:#888; }

    /* Generic buttons */
    .mp-btn {
        padding:5px 12px; border-radius:6px; font-size:12px;
        border:1px solid #2e2e2e; background:#1a1a1a; color:#aaa;
        cursor:pointer; transition:all .15s;
    }
    .mp-btn:hover        { border-color:#1a5fa8; color:#7db8f0; background:#1e2a38; }
    .mp-btn.danger:hover { border-color:#8a2a2a; color:#f07d7d; background:#3a1a1a; }
    .mp-btn.primary      { background:#1a5fa8; border-color:#1a5fa8; color:#fff; }
    .mp-btn.primary:hover{ background:#2070c0; box-shadow:0 4px 14px rgba(26,95,168,.4); }
    .mp-btn.sm           { padding:2px 8px; font-size:11px; }

    /* Inputs */
    .mp-input {
        background:#0e0e0e; border:1px solid #2e2e2e; border-radius:6px;
        color:#ddd; font-size:13px; padding:6px 10px; outline:none;
        transition:border-color .15s;
    }
    .mp-input:focus { border-color:#1a5fa8; }

    /* Weight badge */
    .mp-weight-badge {
        font-size:10px; color:#f0c070; background:#2a2010;
        border:1px solid #5a4010; border-radius:4px; padding:0 4px;
    }

    /* Highlight overlay on textarea */
    #mp-highlight-layer {
        position:absolute; inset:0; pointer-events:none;
        font-family:'Segoe UI',sans-serif; font-size:13px; line-height:1.5;
        padding:8px 12px; color:transparent; white-space:pre-wrap;
        word-wrap:break-word; overflow:hidden; border-radius:8px;
        border:1px solid transparent; box-sizing:border-box;
    }
    #mp-highlight-layer mark {
        background:rgba(255,210,50,0.28); border-radius:3px;
        color:transparent; padding:0;
    }

    /* Sidebar section toggles */
    .mp-section-toggle {
        display:flex; align-items:center; justify-content:space-between;
        cursor:pointer; user-select:none; padding:2px 0; margin-top:8px;
    }
    .mp-section-toggle:hover .mp-toggle-label { color:#999; }
    .mp-toggle-label { font-size:10px; color:#666; text-transform:uppercase; letter-spacing:1px; transition:color .15s; }
    .mp-toggle-icon  { font-size:9px; color:#555; transition:color .15s; }
    .mp-section-toggle:hover .mp-toggle-icon { color:#999; }

    /* Presets */
    .mp-preset-row { display:flex; align-items:center; gap:5px; padding:2px 0; }
    .mp-preset-name {
        flex:1; font-size:11px; color:#777; overflow:hidden;
        text-overflow:ellipsis; white-space:nowrap; cursor:pointer; transition:color .12s;
    }
    .mp-preset-name:hover { color:#7db8f0; }
    `;
    document.head.appendChild(s);
}

// ── Utilities ─────────────────────────────────────────────────────────────────
function el(tag, style, attrs = {}) {
    const e = document.createElement(tag);
    if (style) e.style.cssText = style;
    Object.assign(e, attrs);
    return e;
}
function escHtml(t)   { return t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }
function escapeReg(s) { return s.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"); }
function mkSep(text)  { const d=el("div","font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;margin:6px 0 2px;"); d.textContent=text; return d; }

// ── Word helpers — supports both string and {en, fr} object formats ───────────
function wordEn(w)  { return typeof w==="string" ? w : (w.en||""); }
function wordFr(w)  { return typeof w==="string" ? "" : (w.fr||""); }
function sortWords(arr) {
    return arr.sort((a,b) => wordEn(a).localeCompare(wordEn(b)));
}

function mkSectionToggle(label, isOpen, setter) {
    const row=el("div",null); row.className="mp-section-toggle";
    const lbl=el("div",null); lbl.className="mp-toggle-label"; lbl.textContent=label;
    const ico=el("div",null); ico.className="mp-toggle-icon";  ico.textContent=isOpen?"▲":"▼";
    row.append(lbl,ico);
    row.onclick=()=>{ const nv=ico.textContent==="▲"?false:true; setter(nv); ico.textContent=nv?"▲":"▼"; };
    return row;
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function apiGet()      { const r=await fetch("/my_prompt/data"); return r.json(); }
async function apiSave(data) { await fetch("/my_prompt/data",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)}); }
async function apiReset()    { const r=await fetch("/my_prompt/reset",{method:"POST"}); return r.json(); }

// ── Open modal ────────────────────────────────────────────────────────────────
async function openModal(node) {
    injectStyles();
    const existing=document.getElementById("my-mp-overlay");
    if(existing) existing.remove();

    let data       = await apiGet();
    let categories = data.categories || [];
    let presets    = data.presets    || [];

    // Sort alphabetically on load (supports strings and {en,fr} objects)
    categories.forEach(cat => sortWords(cat.words));

    let promptText   = node._mpPrompt || "";
    let activeTokens = new Map(); // key_lower → { sep, weight, original }
    let tokenOrder   = [];

    // ── Rebuild depuis texte ──────────────────────────
    function rebuildActive() {
        activeTokens.clear(); tokenOrder=[];
        if(!promptText.trim()) return;
        promptText.split(",").forEach(chunk=>{
            chunk=chunk.trim(); if(!chunk) return;
            const wm=chunk.match(/^\((.+?):([0-9.]+)\)$/);
            if(wm){
                const key=wm[1].trim().toLowerCase();
                activeTokens.set(key,{sep:",",weight:parseFloat(wm[2]),original:wm[1].trim()});
                tokenOrder.push(key);
            } else {
                const key=chunk.toLowerCase();
                activeTokens.set(key,{sep:",",weight:1,original:chunk});
                tokenOrder.push(key);
            }
        });
    }
    rebuildActive();

    // ── États UI ──────────────────────────────────────
    let activeCatId  = "all";
    let searchQuery  = "";
    let wordListOpen = true;
    let catListOpen  = true;
    let presetOpen   = true;

    // ── Highlight ─────────────────────────────────────
    function syncHighlight(hoveredWord) {
        if(!hlLayer) return;
        const raw=promptTA.value;
        if(!hoveredWord){ hlLayer.innerHTML=escHtml(raw); return; }
        hlLayer.innerHTML=escHtml(raw).replace(new RegExp(`(${escapeReg(hoveredWord)})`,"gi"),"<mark>$1</mark>");
        hlLayer.scrollTop=promptTA.scrollTop;
    }

    // ── Overlay & Modal ───────────────────────────────
    const overlay=el("div",`position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.88);
        display:flex;align-items:center;justify-content:center;font-family:'Segoe UI',sans-serif;`);
    overlay.id="my-mp-overlay";
    overlay.addEventListener("click",e=>{ if(e.target===overlay) close(); });

    const modal=el("div",`background:#161616;border:1px solid #2a2a2a;border-radius:14px;
        width:min(97vw,1200px);height:min(93vh,820px);display:flex;flex-direction:column;
        box-shadow:0 20px 80px rgba(0,0,0,0.95);overflow:hidden;color:#ddd;`);
    modal.id="my-mp-modal";

    // ═══════════════════════════════════════════════════
    //  HEADER
    // ═══════════════════════════════════════════════════
    const header=el("div",`display:flex;flex-direction:column;gap:5px;
        padding:10px 14px;border-bottom:1px solid #222;flex-shrink:0;`);

    const headerTop=el("div","display:flex;align-items:center;justify-content:space-between;");
    const title=el("div","font-size:11px;font-weight:600;color:#ccc;text-transform:uppercase;letter-spacing:1px;");
    title.textContent="My Prompt";
    const closeBtn=el("button",`width:22px;height:22px;border-radius:50%;border:1px solid #333;
        background:#1a1a1a;color:#666;cursor:pointer;font-size:12px;
        display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s;`);
    closeBtn.textContent="×";
    closeBtn.onmouseenter=()=>{ closeBtn.style.color="#f07d7d"; closeBtn.style.borderColor="#8a2a2a"; };
    closeBtn.onmouseleave=()=>{ closeBtn.style.color="#666";    closeBtn.style.borderColor="#333"; };
    closeBtn.onclick=close;
    headerTop.append(title,closeBtn);

    const headerBot=el("div","display:flex;gap:8px;align-items:flex-start;");
    const taWrap=el("div","flex:1;position:relative;");
    const hlLayer=el("div",""); hlLayer.id="mp-highlight-layer";

    const promptTA=el("textarea",`width:100%;box-sizing:border-box;
        background:transparent;border:1px solid #2e2e2e;border-radius:8px;
        color:#ddd;font-size:13px;padding:8px 12px;outline:none;resize:none;
        font-family:'Segoe UI',sans-serif;height:68px;line-height:1.5;
        transition:border-color .15s;position:relative;z-index:1;`);
    promptTA.className="mp-input mp-scroll";
    promptTA.placeholder="Click words below to build your prompt…";
    promptTA.value=promptText;
    promptTA.addEventListener("scroll",()=>{ hlLayer.scrollTop=promptTA.scrollTop; });
    promptTA.addEventListener("input",()=>{
        promptText=promptTA.value; rebuildActive(); renderWords(); syncHighlight(null);
    });
    promptTA.addEventListener("focus",()=>promptTA.style.borderColor="#1a5fa8");
    promptTA.addEventListener("blur", ()=>{ promptTA.style.borderColor="#2e2e2e"; syncHighlight(null); });
    taWrap.append(hlLayer,promptTA);

    const clearBtn=el("button","flex-shrink:0;margin-top:2px;"); clearBtn.className="mp-btn danger";
    clearBtn.textContent="×"; clearBtn.title="Clear prompt";
    clearBtn.style.cssText+=";padding:3px 9px;font-size:13px;";
    clearBtn.onclick=()=>{
        promptText=""; promptTA.value=""; activeTokens.clear(); tokenOrder=[];
        syncHighlight(null); renderWords();
    };

    headerBot.append(taWrap,clearBtn);
    header.append(headerTop,headerBot);

    // ═══════════════════════════════════════════════════
    //  BODY
    // ═══════════════════════════════════════════════════
    const body=el("div","display:flex;flex:1;overflow:hidden;");
    const center=el("div","flex:1;display:flex;flex-direction:column;overflow:hidden;border-right:1px solid #1e1e1e;");

    const tabBar=el("div",`display:flex;gap:6px;padding:10px 14px;flex-shrink:0;
        border-bottom:1px solid #1e1e1e;overflow-x:auto;align-items:center;`);
    tabBar.className="mp-scroll";
    tabBar.addEventListener("wheel",e=>{ if(!e.deltaY) return; e.preventDefault(); tabBar.scrollLeft+=e.deltaY; },{passive:false});

    const searchWrap=el("div","padding:8px 14px;flex-shrink:0;border-bottom:1px solid #1a1a1a;display:flex;gap:8px;align-items:center;");
    const searchIcon=el("div","color:#444;font-size:13px;flex-shrink:0;"); searchIcon.textContent="🔍";
    const searchInput=el("input","flex:1;"); searchInput.className="mp-input"; searchInput.placeholder="Search words…";
    searchInput.addEventListener("input",()=>{ searchQuery=searchInput.value.toLowerCase().trim(); renderWords(); });
    searchWrap.append(searchIcon,searchInput);

    // overflow-x:visible pour que les tooltips ne soient pas coupés
    const wordsContainer=el("div","flex:1;overflow-y:auto;overflow-x:visible;padding:14px;"); wordsContainer.className="mp-scroll";
    center.append(tabBar,searchWrap,wordsContainer);

    const sidebar=el("div","width:240px;display:flex;flex-direction:column;flex-shrink:0;overflow:hidden;");
    body.append(center,sidebar);

    // ═══════════════════════════════════════════════════
    //  FOOTER
    // ═══════════════════════════════════════════════════
    const footer=el("div",`display:flex;align-items:center;justify-content:space-between;
        padding:10px 18px;border-top:1px solid #222;flex-shrink:0;gap:10px;`);
    const hint=el("div","font-size:11px;color:#666;flex:1;");
    hint.innerHTML="<b style='color:#999'>Click</b> → <span style='color:#4a8fd4'>,</span> &nbsp;·&nbsp; <b style='color:#999'>Dbl-click</b> → <span style='color:#666'>space</span> &nbsp;·&nbsp; <b style='color:#999'>Re-click</b> → <span style='color:#666'>remove</span> &nbsp;·&nbsp; <b style='color:#999'>Right-click</b> → weight <span style='color:#c8a040'>()</span>";
    const applyBtn=el("button",null); applyBtn.className="mp-btn primary";
    applyBtn.textContent="✓ Apply"; applyBtn.style.cssText+=";padding:7px 22px;font-size:13px;";
    applyBtn.onclick=apply;
    footer.append(hint,applyBtn);

    // ═══════════════════════════════════════════════════
    //  RENDER ONGLETS
    // ═══════════════════════════════════════════════════
    function renderTabs() {
        tabBar.innerHTML="";
        const allTab=el("button",null); allTab.className="mp-tab all"+(activeCatId==="all"?" active":"");
        allTab.textContent="All";
        allTab.onclick=()=>{ activeCatId="all"; renderTabs(); renderWords(); renderSidebar(); };
        tabBar.appendChild(allTab);
        categories.forEach(cat=>{
            const t=el("button",null); t.className="mp-tab"+(activeCatId===cat.id?" active":"");
            t.textContent=cat.label;
            t.onclick=()=>{ activeCatId=cat.id; renderTabs(); renderWords(); renderSidebar(); };
            tabBar.appendChild(t);
        });
    }

    // ═══════════════════════════════════════════════════
    //  RENDER MOTS
    // ═══════════════════════════════════════════════════
    function renderWords() {
        wordsContainer.innerHTML="";
        const catsToShow=activeCatId==="all"?categories:categories.filter(c=>c.id===activeCatId);
        catsToShow.forEach(cat=>{
            const words=searchQuery
                ? cat.words.filter(w=>wordEn(w).toLowerCase().includes(searchQuery)||wordFr(w).toLowerCase().includes(searchQuery))
                : cat.words;
            if(!words.length) return;
            if(activeCatId==="all"){
                const lbl=el("div","font-size:10px;color:#666;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;margin-top:4px;");
                lbl.textContent=cat.label; wordsContainer.appendChild(lbl);
            }
            const area=el("div","display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;");
            words.forEach(wordObj=>{
                const word=wordEn(wordObj);
                const fr=wordFr(wordObj);
                const key=word.toLowerCase();
                const info=activeTokens.get(key);
                const chip=el("div",null);
                chip.className="mp-word"+(info?(info.sep===","?" active":" active-space"):"");
                if(info&&info.weight&&info.weight!==1)
                    chip.innerHTML=`${word} <span class="mp-weight-badge">${info.weight.toFixed(1)}</span>`;
                else chip.textContent=word;

                chip.addEventListener("mouseenter",()=>syncHighlight(word));
                chip.addEventListener("mouseleave", ()=>syncHighlight(null));

                let clickTimer=null;
                chip.addEventListener("click",e=>{
                    e.preventDefault(); if(clickTimer) return;
                    clickTimer=setTimeout(()=>{ clickTimer=null; toggleWord(word,","); },200);
                });
                chip.addEventListener("dblclick",e=>{
                    e.preventDefault(); if(clickTimer){ clearTimeout(clickTimer); clickTimer=null; }
                    toggleWord(word," ");
                });
                chip.addEventListener("contextmenu",e=>{ e.preventDefault(); openWeightMenu(e,word); });
                area.appendChild(chip);
            });
            wordsContainer.appendChild(area);
        });
    }

    // ═══════════════════════════════════════════════════
    //  TOGGLE MOT
    // ═══════════════════════════════════════════════════
    function toggleWord(word,sep) {
        const key=word.toLowerCase();
        if(activeTokens.has(key)){
            activeTokens.delete(key);
            tokenOrder=tokenOrder.filter(k=>k!==key);
            removeFromPrompt(word);
        } else {
            activeTokens.set(key,{sep,weight:1,original:word});
            tokenOrder.push(key);
            addToPrompt(word,sep);
        }
        renderWords();
    }

    function addToPrompt(word,sep) {
        const txt=promptTA.value.trim();
        promptTA.value=txt?(sep===" "?txt+" "+word:txt+", "+word):word;
        promptText=promptTA.value;
    }

    function removeFromPrompt(word) {
        let txt=promptTA.value;
        txt=txt.replace(new RegExp(`\\(${escapeReg(word)}:[0-9.]+\\)\\s*,?\\s*`,"gi"),"");
        txt=txt.replace(new RegExp(`(,\\s*)?${escapeReg(word)}(\\s*,)?`,"gi"),(m,pre,post)=>{ if(pre&&post) return","; return""; });
        txt=txt.replace(/^[,\s]+|[,\s]+$/g,"").replace(/,\s*,/g,",").replace(/\s{2,}/g," ");
        promptTA.value=txt; promptText=txt;
    }

    // ═══════════════════════════════════════════════════
    //  MENU POIDS
    // ═══════════════════════════════════════════════════
    function openWeightMenu(e,word) {
        const ex=document.getElementById("mp-weight-menu"); if(ex) ex.remove();
        const key=word.toLowerCase();
        const info=activeTokens.get(key)||{sep:",",weight:1};
        const menu=el("div",`position:fixed;z-index:100001;background:#111;border:1px solid #333;
            border-radius:8px;padding:10px;display:flex;flex-direction:column;gap:6px;
            min-width:180px;box-shadow:0 8px 30px rgba(0,0,0,.8);`);
        menu.id="mp-weight-menu";
        menu.style.left=e.clientX+"px"; menu.style.top=e.clientY+"px";
        const wt=el("div","font-size:11px;color:#555;margin-bottom:2px;"); wt.textContent=`Weight: "${word}"`;
        const slider=el("input","width:100%;"); slider.type="range";slider.min="0.1";slider.max="2.0";slider.step="0.05";slider.value=info.weight||1;
        const val=el("div","text-align:center;font-size:13px;color:#f0c070;"); val.textContent=parseFloat(slider.value).toFixed(2);
        slider.addEventListener("input",()=>{ val.textContent=parseFloat(slider.value).toFixed(2); });
        const applyW=el("button",null); applyW.className="mp-btn primary"; applyW.textContent="Apply weight"; applyW.style.marginTop="4px";
        applyW.onclick=()=>{
            const w=parseFloat(slider.value);
            if(!activeTokens.has(key)){ activeTokens.set(key,{sep:",",weight:w,original:word}); tokenOrder.push(key); addToPrompt(word,","); }
            else activeTokens.get(key).weight=w;
            updateWeightInPrompt(word,w); menu.remove(); renderWords();
        };
        const removeW=el("button",null); removeW.className="mp-btn"; removeW.textContent="Remove weight";
        removeW.onclick=()=>{
            if(activeTokens.has(key)) activeTokens.get(key).weight=1;
            removeWeightFromPrompt(word); menu.remove(); renderWords();
        };
        menu.append(wt,val,slider,applyW,removeW);
        document.body.appendChild(menu);
        const dismiss=ev=>{ if(!menu.contains(ev.target)){ menu.remove(); document.removeEventListener("mousedown",dismiss); } };
        setTimeout(()=>document.addEventListener("mousedown",dismiss),0);
    }

    function updateWeightInPrompt(word,w) {
        let txt=promptTA.value;
        const reg=new RegExp(`\\([^)]*${escapeReg(word)}[^)]*\\)|${escapeReg(word)}`,"gi");
        let replaced=false;
        txt=txt.replace(reg,m=>{ if(replaced) return m; replaced=true; return w!==1?`(${word}:${w.toFixed(2)})`:word; });
        if(!replaced) txt=txt+(txt.trim()?", ":"")+(w!==1?`(${word}:${w.toFixed(2)})`:word);
        promptTA.value=txt; promptText=txt;
    }
    function removeWeightFromPrompt(word) {
        let txt=promptTA.value;
        txt=txt.replace(new RegExp(`\\(${escapeReg(word)}:[0-9.]+\\)`,"gi"),word);
        promptTA.value=txt; promptText=txt;
    }

    // ═══════════════════════════════════════════════════
    //  SIDEBAR
    // ═══════════════════════════════════════════════════
    function renderSidebar() {
        sidebar.innerHTML="";

        // ── Partie haute fixe ─────────────────────────
        const fixedTop=el("div","padding:12px 14px 10px;display:flex;flex-direction:column;gap:6px;flex-shrink:0;border-bottom:1px solid #1e1e1e;");

        fixedTop.appendChild(mkSep("Add a word"));
        const newWordIn=el("input","width:100%;box-sizing:border-box;"); newWordIn.className="mp-input"; newWordIn.placeholder="New word…";
        const catSel=el("select","width:100%;box-sizing:border-box;margin-top:4px;"); catSel.className="mp-input";
        categories.forEach(c=>{ const o=document.createElement("option"); o.value=c.id; o.textContent=c.label; catSel.appendChild(o); });
        if(activeCatId!=="all") catSel.value=activeCatId;
        const addWordBtn=el("button","width:100%;margin-top:4px;"); addWordBtn.className="mp-btn primary"; addWordBtn.textContent="+ Add word";
        addWordBtn.onclick=()=>{
            const en=newWordIn.value.trim(); const catId=catSel.value; if(!en) return;
            const cat=categories.find(c=>c.id===catId);
            const exists=cat&&cat.words.some(w=>wordEn(w).toLowerCase()===en.toLowerCase());
            if(cat&&!exists){
                cat.words.push(en);
                sortWords(cat.words);
                apiSave({categories,presets}); newWordIn.value=""; renderWords(); renderSidebar();
            }
        };
        newWordIn.addEventListener("keydown",e=>{ if(e.key==="Enter") addWordBtn.click(); });
        fixedTop.append(newWordIn,catSel,addWordBtn);

        fixedTop.appendChild(mkSep("Add a category"));
        const newCatIn=el("input","width:100%;box-sizing:border-box;"); newCatIn.className="mp-input"; newCatIn.placeholder="Category name…";
        const addCatBtn=el("button","width:100%;margin-top:4px;"); addCatBtn.className="mp-btn"; addCatBtn.textContent="+ Create category";
        addCatBtn.onclick=()=>{
            const label=newCatIn.value.trim(); if(!label) return;
            const id=label.toLowerCase().replace(/[^a-z0-9]/g,"_")+"_"+Date.now();
            categories.push({id,label,words:[]}); apiSave({categories,presets}); newCatIn.value="";
            renderTabs(); renderSidebar();
        };
        newCatIn.addEventListener("keydown",e=>{ if(e.key==="Enter") addCatBtn.click(); });
        fixedTop.append(newCatIn,addCatBtn);
        sidebar.appendChild(fixedTop);

        // ── Partie basse scrollable ───────────────────
        const scrollZone=el("div","flex:1;overflow-y:auto;padding:10px 14px 12px;display:flex;flex-direction:column;gap:4px;");
        scrollZone.className="mp-scroll";

        // ── Presets ───────────────────────────────────
        const presToggle=mkSectionToggle("Presets",presetOpen,v=>{ presetOpen=v; presetListEl.style.display=v?"flex":"none"; });
        scrollZone.appendChild(presToggle);

        const presetListEl=el("div","flex-direction:column;gap:4px;margin-top:4px;");
        presetListEl.style.display=presetOpen?"flex":"none";

        const pSaveRow=el("div","display:flex;gap:5px;");
        const pNameIn=el("input","flex:1;font-size:11px;padding:3px 7px;"); pNameIn.className="mp-input"; pNameIn.placeholder="Preset name…";
        const pSaveBtn=el("button",null); pSaveBtn.className="mp-btn sm"; pSaveBtn.textContent="💾"; pSaveBtn.title="Save current prompt";
        pSaveBtn.onclick=()=>{
            const name=pNameIn.value.trim(); if(!name) return;
            const txt=promptTA.value.trim();  if(!txt)  return;
            const idx=presets.findIndex(p=>p.name===name);
            if(idx!==-1) presets[idx].prompt=txt; else presets.push({name,prompt:txt});
            apiSave({categories,presets}); pNameIn.value=""; renderSidebar();
        };
        pNameIn.addEventListener("keydown",e=>{ if(e.key==="Enter") pSaveBtn.click(); });
        pSaveRow.append(pNameIn,pSaveBtn);
        presetListEl.appendChild(pSaveRow);

        if(presets.length===0){
            const empty=el("div","font-size:11px;color:#2a2a2a;padding:2px 0;"); empty.textContent="No presets saved";
            presetListEl.appendChild(empty);
        } else {
            presets.forEach((preset,idx)=>{
                const row=el("div",null); row.className="mp-preset-row";
                const name=el("div",null); name.className="mp-preset-name";
                name.textContent=preset.name; name.title=preset.prompt;
                name.onclick=()=>{ promptText=preset.prompt; promptTA.value=preset.prompt; rebuildActive(); renderWords(); syncHighlight(null); };
                const del=el("button",null); del.className="mp-btn sm danger"; del.textContent="×";
                del.onclick=()=>{ presets.splice(idx,1); apiSave({categories,presets}); renderSidebar(); };
                row.append(name,del); presetListEl.appendChild(row);
            });
        }
        scrollZone.appendChild(presetListEl);

        // ── Manage categories ─────────────────────────
        const catToggle=mkSectionToggle("Manage categories",catListOpen,v=>{ catListOpen=v; catListEl.style.display=v?"flex":"none"; });
        scrollZone.appendChild(catToggle);
        const catListEl=el("div","flex-direction:column;gap:5px;margin-top:2px;");
        catListEl.style.display=catListOpen?"flex":"none";
        categories.forEach(cat=>{
            const row=el("div","display:flex;align-items:center;gap:6px;");
            const lbl=el("div","flex:1;font-size:12px;color:#888;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;");
            lbl.textContent=cat.label; lbl.title=`${cat.words.length} word(s)`;
            const count=el("div","font-size:10px;color:#444;flex-shrink:0;"); count.textContent=cat.words.length;
            const del=el("button","padding:2px 7px;font-size:11px;flex-shrink:0;"); del.className="mp-btn danger"; del.textContent="×";
            del.onclick=()=>{
                if(!confirm(`Delete "${cat.label}" and its ${cat.words.length} word(s)?`)) return;
                categories=categories.filter(c=>c.id!==cat.id);
                if(activeCatId===cat.id) activeCatId="all";
                apiSave({categories,presets}); renderTabs(); renderWords(); renderSidebar();
            };
            row.append(lbl,count,del); catListEl.appendChild(row);
        });
        scrollZone.appendChild(catListEl);

        // ── Mots de la catégorie active ───────────────
        if(activeCatId!=="all"){
            const cat=categories.find(c=>c.id===activeCatId);
            if(cat){
                const wToggle=mkSectionToggle(`Words — ${cat.label}`,wordListOpen,v=>{ wordListOpen=v; wordsListEl.style.display=v?"flex":"none"; });
                scrollZone.appendChild(wToggle);
                const wordsListEl=el("div","flex-direction:column;gap:4px;margin-top:2px;");
                wordsListEl.style.display=wordListOpen?"flex":"none";
                cat.words.forEach((wordObj,idx)=>{
                    const row=el("div","display:flex;align-items:center;gap:6px;");
                    const lbl=el("div","flex:1;overflow:hidden;");
                    const en=el("div","font-size:11px;color:#666;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"); en.textContent=wordEn(wordObj);
                    lbl.appendChild(en);
                    const fr=wordFr(wordObj);
                    if(fr){ const frEl=el("div","font-size:10px;color:#444;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"); frEl.textContent=fr; lbl.appendChild(frEl); }
                    const del=el("button","padding:1px 6px;font-size:10px;flex-shrink:0;"); del.className="mp-btn danger"; del.textContent="×";
                    del.onclick=()=>{ cat.words.splice(idx,1); apiSave({categories,presets}); renderWords(); renderSidebar(); };
                    row.append(lbl,del); wordsListEl.appendChild(row);
                });
                scrollZone.appendChild(wordsListEl);
            }
        }

        // ── Données ───────────────────────────────────
        scrollZone.appendChild(mkSep("Data"));
        const exportBtn=el("button","width:100%;"); exportBtn.className="mp-btn"; exportBtn.textContent="📤 Export JSON";
        exportBtn.onclick=()=>{
            const blob=new Blob([JSON.stringify({categories,presets},null,2)],{type:"application/json"});
            const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="my_prompt_data.json"; a.click();
        };
        const importFile=el("input","display:none;"); importFile.type="file"; importFile.accept=".json";
        importFile.addEventListener("change",async()=>{
            const file=importFile.files[0]; if(!file) return;
            try{
                const imp=JSON.parse(await file.text());
                if(imp.categories){ categories=imp.categories; if(imp.presets) presets=imp.presets;
                    apiSave({categories,presets}); activeCatId="all"; renderTabs(); renderWords(); renderSidebar(); }
            } catch{ alert("Invalid JSON file"); }
        });
        const importBtn=el("button","width:100%;margin-top:4px;"); importBtn.className="mp-btn"; importBtn.textContent="📥 Import JSON";
        importBtn.onclick=()=>importFile.click();
        const resetBtn=el("button","width:100%;margin-top:4px;"); resetBtn.className="mp-btn danger"; resetBtn.textContent="↺ Reset to defaults";
        resetBtn.onclick=async()=>{
            if(!confirm("Reset all categories and words to defaults?")) return;
            const def=await apiReset(); categories=def.categories; presets=[];
            activeCatId="all"; renderTabs(); renderWords(); renderSidebar();
        };
        scrollZone.append(exportBtn,importFile,importBtn,resetBtn);
        sidebar.appendChild(scrollZone);
    }

    // ═══════════════════════════════════════════════════
    //  APPLY / CLOSE
    // ═══════════════════════════════════════════════════
    function apply() {
        const val=promptTA.value.trim(); node._mpPrompt=val;
        const w=node.widgets?.find(w=>w.name==="prompt");
        if(w) w.value=val;
        if(node._syncPrompt) node._syncPrompt();
        close();
    }
    function close() {
        const m=document.getElementById("mp-weight-menu"); if(m) m.remove();
        overlay.remove();
    }
    document.addEventListener("keydown",function onKey(e){
        if(e.key==="Escape"){ close(); document.removeEventListener("keydown",onKey); }
    });

    // ═══════════════════════════════════════════════════
    //  ASSEMBLAGE
    // ═══════════════════════════════════════════════════
    modal.append(header,body,footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    renderTabs();
    renderWords();
    renderSidebar();
    setTimeout(()=>promptTA.focus(),100);
}

// ── ComfyUI extension ─────────────────────────────────────────────────────────
app.registerExtension({
    name:"My_Nodes.My_Prompt",
    async beforeRegisterNodeDef(nodeType,nodeData) {
        if(nodeData.name!=="My_Prompt") return;
        const orig=nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated=function(){
            if(orig) orig.apply(this,arguments);

            const promptWidget = this.widgets?.find(w=>w.name==="prompt");

            // Open button
            this.addWidget("button","✏️ Open Prompt Builder",null,()=>openModal(this));

            // Reposition the prompt widget after the button, disabled (read-only display)
            if(promptWidget){
                this.widgets = this.widgets.filter(w=>w!==promptWidget);
                this.widgets.push(promptWidget);
                promptWidget.disabled = true;
            }

            this._syncPrompt = function() {
                if(promptWidget) promptWidget.value = this._mpPrompt || "";
                this.setDirtyCanvas(true, true);
            };

            setTimeout(()=>this._syncPrompt(), 100);
            this.title="My Prompt";
        };
        const onSer=nodeType.prototype.onSerialize||(()=>{});
        nodeType.prototype.onSerialize=function(o){ onSer.call(this,o); if(this._mpPrompt!==undefined) o.mpPrompt=this._mpPrompt; };
        const onConf=nodeType.prototype.onConfigure||(()=>{});
        nodeType.prototype.onConfigure=function(o){
            onConf.call(this,o);
            if(o.mpPrompt!==undefined){
                this._mpPrompt=o.mpPrompt;
                const w=this.widgets?.find(w=>w.name==="prompt"); if(w) w.value=o.mpPrompt||"";
                if(this._syncPrompt) this._syncPrompt();
            }
        };
    },
});
