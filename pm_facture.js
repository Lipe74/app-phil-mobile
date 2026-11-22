// Import de facture partagé par wp_comparatif.html et wp_orange.html (Build 14.125).
// La lecture (IA) et le rangement dans la fiche passent par window.parent.pmFactApi (hub, même origine).
// Usage : pmFactInit({ mount:'id', apply:function(v){...}, autoPrefill:true|false })
(function () {
  function api() { try { return (window.parent && window.parent !== window && window.parent.pmFactApi) || null; } catch (e) { return null; } }
  var fp = (new URLSearchParams(location.search).get('fiche') || '').split('|');
  var FICHE = (fp.length === 2 && fp[1] && (fp[0] === 'prospectsClients' || fp[0] === 'clients')) ? { coll: fp[0], id: fp[1] } : null;

  // Montant mensuel TVAC déduit des factures d'une fiche (même règle que wp_orange.html)
  window.pmFactActuel = function (factures) {
    var key = function (x) { return String(x.dateFacture || x.uploadedAt || '').slice(0, 10); };
    var list = (Array.isArray(factures) ? factures : []).filter(function (x) { return x && Number(x.montantTvac) > 0 && ['Mobile', 'Internet', 'Mobile + Internet'].indexOf(x.service) >= 0; });
    var best = {};
    list.forEach(function (x) { if (!best[x.service] || key(x) > key(best[x.service])) best[x.service] = x; });
    var combo = best['Mobile + Internet'], sep = [best['Mobile'], best['Internet']].filter(Boolean);
    var sepNewest = sep.reduce(function (m, x) { return key(x) > m ? key(x) : m; }, '');
    if (combo && (!sep.length || key(combo) >= sepNewest)) return { tvac: Number(combo.montantTvac), fournisseur: combo.fournisseur || '', note: "d'après la facture " + (combo.fournisseur || '') };
    if (sep.length) return { tvac: sep.reduce(function (t, x) { return t + Number(x.montantTvac); }, 0), fournisseur: sep[0].fournisseur || '', note: sep.length > 1 ? "d'après les dernières factures mobile + internet" : "d'après la facture " + (sep[0].fournisseur || '') };
    return null;
  };

  function el(tag, css, txt) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (txt != null) e.textContent = txt; return e; }
  var INP = 'width:100%;box-sizing:border-box;border:1px solid #ddd;border-radius:8px;padding:8px 10px;font-size:14px;font-family:Arial,sans-serif;';

  window.pmFactInit = function (cfg) {
    var mount = document.getElementById(cfg.mount);
    if (!mount || mount.dataset.pmFact) return;
    mount.dataset.pmFact = '1';
    var box = el('div', 'margin:10px 0;');
    var btn = el('button', 'width:100%;padding:11px 14px;border:2px dashed #f97316;background:#fff7ed;color:#c2410c;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;font-family:Arial,sans-serif;', '📄 Importer une facture (PDF ou photo)');
    btn.type = 'button';
    var input = el('input'); input.type = 'file'; input.accept = 'application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp'; input.style.display = 'none';
    var status = el('div', 'display:none;margin-top:8px;padding:8px 10px;border-radius:8px;font-size:12px;line-height:1.4;');
    box.appendChild(btn); box.appendChild(input); box.appendChild(status); mount.appendChild(box);
    function say(type, msg) {
      if (!type) { status.style.display = 'none'; return; }
      status.style.display = 'block';
      status.style.background = type === 'ok' ? '#e8f9ee' : (type === 'wait' ? '#fff7ed' : '#fdeaea');
      status.style.color = type === 'ok' ? '#1a7a3c' : (type === 'wait' ? '#c2410c' : '#b42323');
      status.textContent = msg;
    }
    btn.onclick = function () {
      if (!api()) { say('err', "Pour importer une facture, ouvre cette page depuis le menu de l'application Phil-Mobile."); return; }
      input.value = ''; input.click();
    };
    input.onchange = async function () {
      var file = input.files && input.files[0]; if (!file) return;
      var A = api(); if (!A) { say('err', "Ouvre cette page depuis l'application Phil-Mobile."); return; }
      say('wait', '🤖 Lecture de la facture en cours…');
      var r;
      try { r = await A.read(file); } catch (e) { say('err', '❌ ' + (e.message || 'Lecture impossible')); return; }
      say(null);
      review(file, r);
    };

    function review(file, r) {
      var m = r.meta, lu = m.lu || {};
      var ov = el('div', 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:99999;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:16px;');
      var card = el('div', 'background:#fff;border-radius:14px;max-width:460px;width:100%;padding:18px;font-family:Arial,sans-serif;box-sizing:border-box;margin:auto;');
      card.appendChild(el('div', 'font-size:16px;font-weight:700;color:#1a1a1a;', '📄 Vérifie ce qui a été lu'));
      card.appendChild(el('div', 'font-size:12px;color:#6b7280;margin:2px 0 12px;', 'Corrige si besoin, puis valide : le comparatif se remplit avec ces informations.'));
      var fields = {};
      function row(id, label, val, type) {
        var w = el('div', 'margin-bottom:8px;');
        w.appendChild(el('label', 'display:block;font-size:11px;font-weight:700;color:#6b7280;margin-bottom:2px;', label));
        var i = el(type === 'select' ? 'select' : 'input', INP);
        if (type === 'select') {
          [['', '— type de facture —'], ['Mobile', '📱 Mobile'], ['Internet', '🌐 Internet'], ['Mobile + Internet', '📱🌐 Mobile + Internet'], ['Énergie', '⚡ Énergie']].forEach(function (o) { var op = el('option', '', o[1]); op.value = o[0]; i.appendChild(op); });
          i.value = val || '';
        } else { i.value = val == null ? '' : val; if (type === 'num') { i.type = 'text'; i.inputMode = 'decimal'; } }
        fields[id] = i; w.appendChild(i); card.appendChild(w);
      }
      row('fournisseur', 'Fournisseur actuel', m.fournisseur);
      row('montant', 'Montant mensuel TVAC (€)', m.montantTvac ? String(m.montantTvac).replace('.', ',') : '', 'num');
      row('service', 'Type de facture', m.service, 'select');
      card.appendChild(el('div', 'font-size:12px;font-weight:700;color:#f97316;margin:12px 0 6px;', 'Client'));
      row('titulaire', 'Nom du client', m.titulaire);
      row('societe', 'Société', lu.societe); row('tva', 'N° TVA', lu.tva);
      row('adresse', 'Adresse', lu.adresse); row('cp', 'Code postal', lu.cp); row('ville', 'Ville', lu.ville); row('email', 'Email', lu.email);
      var c = r.counts || {}, labels = { phone: 'Postes fixes', inet: 'Connexions internet', mob: 'Abonnements mobile', tv: 'Abonnements TV', dec: 'Décodeurs' };
      var anyCount = Object.keys(labels).some(function (k) { return c[k] > 0; });
      if (anyCount) {
        card.appendChild(el('div', 'font-size:12px;font-weight:700;color:#f97316;margin:12px 0 6px;', 'Détail trouvé sur la facture (informatif)'));
        Object.keys(labels).forEach(function (k) { if (c[k] > 0) row('n_' + k, labels[k], String(c[k]), 'num'); });
      }
      if (FICHE && FICHE.coll === 'clients') card.appendChild(el('div', 'font-size:12px;color:#6b7280;margin-top:10px;', "Fiche client : la facture n'est pas gardée (seulement pour les prospects)."));
      else card.appendChild(el('div', 'font-size:12px;color:#6b7280;margin-top:10px;', FICHE ? 'La facture sera rangée dans la fiche du prospect.' : 'Un prospect sera créé avec ces informations (ou complété s\'il existe déjà), avec la facture.'));
      var bar = el('div', 'display:flex;gap:8px;margin-top:14px;');
      var ok = el('button', 'flex:1;padding:11px;border:none;background:#f97316;color:#fff;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;', 'Valider et remplir');
      var no = el('button', 'padding:11px 16px;border:1px solid #ddd;background:#fff;color:#374151;border-radius:10px;font-weight:700;font-size:14px;cursor:pointer;', 'Annuler');
      ok.type = no.type = 'button'; bar.appendChild(ok); bar.appendChild(no); card.appendChild(bar);
      ov.appendChild(card); document.body.appendChild(ov);
      no.onclick = function () { ov.remove(); };
      ok.onclick = async function () {
        var g = function (k) { return fields[k] ? fields[k].value.trim() : ''; };
        var num = function (k) { var x = parseFloat(g(k).replace(/\s/g, '').replace(',', '.')); return isFinite(x) && x > 0 ? x : 0; };
        var v = {
          fournisseur: g('fournisseur'), montantTvac: num('montant'), service: g('service'), titulaire: g('titulaire'), societe: g('societe'), tva: g('tva'),
          adresse: g('adresse'), cp: g('cp'), ville: g('ville'), email: g('email'),
          counts: { phone: num('n_phone'), inet: num('n_inet'), mob: num('n_mob'), tv: num('n_tv'), dec: num('n_dec') }
        };
        // Les corrections de l'écran de vérification sont aussi enregistrées avec la facture
        var meta = Object.assign({}, m, { fournisseur: v.fournisseur, montantTvac: v.montantTvac, service: v.service, titulaire: v.titulaire,
          lu: Object.assign({}, lu, { societe: v.societe, tva: v.tva, adresse: v.adresse, cp: v.cp, ville: v.ville, email: v.email }) });
        var save = !(FICHE && FICHE.coll === 'clients');
        ov.remove();
        try { cfg.apply(v); } catch (e) { console.log('Remplissage:', e.message); }
        say('ok', '✅ Comparatif rempli d\'après la facture' + (v.fournisseur ? ' ' + v.fournisseur : '') + '. Vérifie les chiffres.');
        if (!save) return;
        try {
          var A = api(), res;
          if (FICHE) { await A.attach(FICHE.coll, FICHE.id, file, meta); say('ok', '✅ Comparatif rempli et facture rangée dans la fiche du prospect.'); }
          else {
            res = await A.createProspect(file, meta);
            if (res.existingClient) say('ok', '✅ Comparatif rempli. « ' + res.nom + ' » est déjà dans tes clients : la facture n\'est pas gardée.');
            else if (res.factureErr) say('err', '⚠️ Fiche « ' + res.nom + ' » ' + (res.merged ? 'complétée' : 'créée') + ', mais la facture n\'a pas pu être rangée (' + res.factureErr + ').');
            else say('ok', res.merged ? '✅ Comparatif rempli. Le prospect « ' + res.nom + ' » existait déjà : fiche complétée et facture rangée.' : '✅ Comparatif rempli. Prospect « ' + res.nom + ' » créé avec la facture.');
          }
        } catch (e) { say('err', '⚠️ Comparatif rempli, mais la facture n\'a pas pu être rangée : ' + (e.message || e)); }
      };
    }

    // Pré-remplissage depuis les factures déjà dans la fiche du prospect (comparatif ouvert depuis la fiche)
    if (cfg.autoPrefill && FICHE) {
      (async function () {
        var tries = 0, A = api();
        while (!A && tries < 20) { await new Promise(function (r) { setTimeout(r, 300); }); A = api(); tries++; }
        if (!A) return;
        try {
          var info = await A.ficheInfo(FICHE.coll, FICHE.id);
          var act = info && window.pmFactActuel(info.factures);
          if (act) { cfg.apply({ fournisseur: act.fournisseur, montantTvac: act.tvac, counts: {}, prefill: true }); say('ok', '✔ Pré-rempli ' + act.note + ' (fiche de ' + info.nom + '), modifiable.'); }
          else if (info) say('ok', 'Fiche de ' + info.nom + ' : importe sa facture pour remplir le comparatif.');
        } catch (e) { console.log('Fiche non lue:', e.message); }
      })();
    }
  };
})();
