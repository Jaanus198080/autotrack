// src/App.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  doc, getDoc, setDoc, collection, getDocs, onSnapshot
} from "firebase/firestore";
import {
  signInWithEmailAndPassword, signOut, onAuthStateChanged, User
} from "firebase/auth";
import { db, auth } from "./firebase";
import emailjs from "@emailjs/browser";

const EMAILJS_SERVICE = "service_tbg6vp7";
const EMAILJS_TEMPLATE = "template_petii59";
const EMAILJS_PUBLIC = "sycumEw72eiYqMsyK";

/* ═══════════════════════════════════════════
   TRANSLATIONS
═══════════════════════════════════════════ */
const T: Record<string, Record<string, string>> = {
  fr: { flag:"🇫🇷", code:"FR", h1a:"Suivez votre", h1b:"véhicule", h1c:"en temps réel", h1sub:"Entrez votre numéro de suivi pour voir l'état de votre transport", btn_track:"SUIVRE →", hint:"Numéro reçu par email à la confirmation de commande", not_found:"❌ Numéro introuvable. Vérifiez et réessayez.", loading:"Chargement…", back:"Nouvelle recherche", prog:"Progression du transport", itin:"Itinéraire", tl:"Historique des événements", info:"Informations transport", eta_pre:"⏱ Arrivée estimée :", lbl_dep:"Départ", lbl_step:"Étape", lbl_pos:"Position actuelle", lbl_dest:"Destination", lbl_mt:"Mode transport", lbl_carr:"Transporteur", lbl_dd:"Date départ", lbl_eta:"Arrivée est.", lbl_vin:"VIN", lbl_pl:"Plaque", st0:"En attente", st1:"Chargé", st2:"En transit", st3:"Douane", st4:"Livraison", st5:"Livré", st0f:"En attente de chargement", st1f:"Véhicule chargé", st2f:"En transit", st3f:"Passage en douane", st4f:"Livraison en cours", st5f:"Livré ✓", adm_title:"Créer un suivi de transport", adm_sub:"Remplissez les informations pour générer un numéro de suivi", s_cli:"Informations Client", s_veh:"Véhicule", s_rou:"Itinéraire", l_name:"Nom complet", l_email:"Email", l_phone:"Téléphone", l_co:"Entreprise", l_veh:"Marque & Modèle", l_col:"Couleur", l_vin:"Numéro VIN", l_plate:"Immatriculation", l_from:"Adresse de départ (chargement)", l_to:"Adresse de livraison", l_dep:"Date de départ", l_arr:"Arrivée estimée", l_mode:"Mode de transport", l_carrier:"Transporteur", m1:"Camion porte-voiture", m2:"Transport maritime (RoRo)", m3:"Transport aérien cargo", m4:"Transport combiné", btn_gen:"🚗 GÉNÉRER LE NUMÉRO DE SUIVI", gen_ok:"✅ Numéro de suivi créé avec succès", btn_copy:"Copier le numéro", lbl_link:"🔗 Lien à envoyer au client :", link_note:"Le client verra uniquement ses informations — sans accès admin.", upd_h:"📍 Mettre à jour la position du transporteur", u_city:"Ville / Localisation actuelle", u_date:"Date de l'événement", u_time:"Heure", u_status:"Statut", u_note:"Note / Détail", btn_upd:"📡 ENVOYER LA MISE À JOUR", hist_h:"📦 Suivis actifs", th1:"N° Suivi", th2:"Client", th3:"Véhicule", th4:"Trajet", th5:"Statut", th6:"Entreprise", ft_tag:"Import Auto · Livraison mondiale · Votre confiance, notre mission", ft_r:"Tous droits réservés.", toast_gen:"✅ Suivi créé :", toast_cop:"📋 Copié !", toast_upd:"📡 Mise à jour envoyée !", err_fill:"⚠️ Champs obligatoires manquants", err_city:"⚠️ Entrez la ville actuelle", err_nosel:"⚠️ Aucun suivi sélectionné", sel:"Suivi sélectionné :", login_title:"Accès Administrateur", login_email:"Email", login_pass:"Mot de passe", login_btn:"SE CONNECTER", login_err:"Email ou mot de passe incorrect.", logout:"Déconnexion" },
  en: { flag:"🇬🇧", code:"EN", h1a:"Track your", h1b:"vehicle", h1c:"in real time", h1sub:"Enter your tracking number to check your transport status", btn_track:"TRACK →", hint:"Tracking number received by email upon order confirmation", not_found:"❌ Number not found. Please check and try again.", loading:"Loading…", back:"New search", prog:"Transport progress", itin:"Route", tl:"Event history", info:"Transport information", eta_pre:"⏱ Estimated arrival:", lbl_dep:"Departure", lbl_step:"Stop", lbl_pos:"Current position", lbl_dest:"Destination", lbl_mt:"Transport mode", lbl_carr:"Carrier", lbl_dd:"Departure", lbl_eta:"Est. arrival", lbl_vin:"VIN", lbl_pl:"Plate", st0:"Waiting", st1:"Loaded", st2:"In transit", st3:"Customs", st4:"Delivery", st5:"Delivered", st0f:"Awaiting loading", st1f:"Vehicle loaded", st2f:"In transit", st3f:"Customs clearance", st4f:"Out for delivery", st5f:"Delivered ✓", adm_title:"Create a transport tracking", adm_sub:"Fill in the information to generate a tracking number", s_cli:"Client Information", s_veh:"Vehicle", s_rou:"Route", l_name:"Full name", l_email:"Email", l_phone:"Phone", l_co:"Company", l_veh:"Make & Model", l_col:"Color", l_vin:"VIN number", l_plate:"License plate", l_from:"Pickup address (loading)", l_to:"Delivery address", l_dep:"Departure date", l_arr:"Estimated arrival", l_mode:"Transport mode", l_carrier:"Carrier", m1:"Car transporter truck", m2:"Maritime transport (RoRo)", m3:"Air cargo", m4:"Combined transport", btn_gen:"🚗 GENERATE TRACKING NUMBER", gen_ok:"✅ Tracking number created", btn_copy:"Copy number", lbl_link:"🔗 Link to send to client:", link_note:"The client will only see their transport info — no admin access.", upd_h:"📍 Update carrier position", u_city:"City / Current location", u_date:"Event date", u_time:"Time", u_status:"Status", u_note:"Note / Detail", btn_upd:"📡 SEND UPDATE", hist_h:"📦 Active shipments", th1:"Tracking #", th2:"Client", th3:"Vehicle", th4:"Route", th5:"Status", th6:"Company", ft_tag:"Car Import · Global Delivery · Your Trust, Our Mission", ft_r:"All rights reserved.", toast_gen:"✅ Tracking created:", toast_cop:"📋 Copied!", toast_upd:"📡 Update sent!", err_fill:"⚠️ Required fields missing", err_city:"⚠️ Please enter current city", err_nosel:"⚠️ No tracking selected", sel:"Tracking selected:", login_title:"Admin Access", login_email:"Email", login_pass:"Password", login_btn:"SIGN IN", login_err:"Incorrect email or password.", logout:"Sign out" },
  de: { flag:"🇩🇪", code:"DE", h1a:"Verfolgen Sie Ihr", h1b:"Fahrzeug", h1c:"in Echtzeit", h1sub:"Sendungsnummer eingeben, um den Transportstatus zu prüfen", btn_track:"VERFOLGEN →", hint:"Sendungsnummer per E-Mail erhalten", not_found:"❌ Nummer nicht gefunden.", loading:"Wird geladen…", back:"Neue Suche", prog:"Transportfortschritt", itin:"Route", tl:"Ereignisverlauf", info:"Transportinformationen", eta_pre:"⏱ Ankunft:", lbl_dep:"Abfahrt", lbl_step:"Stopp", lbl_pos:"Standort", lbl_dest:"Ziel", lbl_mt:"Transport", lbl_carr:"Spediteur", lbl_dd:"Abfahrt", lbl_eta:"Ankunft", lbl_vin:"VIN", lbl_pl:"Kennzeichen", st0:"Warten", st1:"Verladen", st2:"Unterwegs", st3:"Zoll", st4:"Zustellung", st5:"Zugestellt", st0f:"Warten auf Verladung", st1f:"Fahrzeug verladen", st2f:"Unterwegs", st3f:"Zollabfertigung", st4f:"Zustellung läuft", st5f:"Zugestellt ✓", adm_title:"Transport-Tracking erstellen", adm_sub:"Ausfüllen zum Generieren einer Sendungsnummer", s_cli:"Kundeninformationen", s_veh:"Fahrzeug", s_rou:"Route", l_name:"Vollständiger Name", l_email:"E-Mail", l_phone:"Telefon", l_co:"Unternehmen", l_veh:"Marke & Modell", l_col:"Farbe", l_vin:"VIN", l_plate:"Kennzeichen", l_from:"Abholadresse", l_to:"Lieferadresse", l_dep:"Abfahrtsdatum", l_arr:"Voraussichtliche Ankunft", l_mode:"Transportmittel", l_carrier:"Spediteur", m1:"Autotransporter-LKW", m2:"Seetransport (RoRo)", m3:"Luftfracht", m4:"Kombinierter Transport", btn_gen:"🚗 SENDUNGSNUMMER GENERIEREN", gen_ok:"✅ Sendungsnummer erstellt", btn_copy:"Kopieren", lbl_link:"🔗 Link für den Kunden:", link_note:"Der Kunde sieht nur seine Transportinformationen.", upd_h:"📍 Standort aktualisieren", u_city:"Stadt / Standort", u_date:"Datum", u_time:"Uhrzeit", u_status:"Status", u_note:"Notiz", btn_upd:"📡 UPDATE SENDEN", hist_h:"📦 Aktive Sendungen", th1:"Sendungs-Nr.", th2:"Kunde", th3:"Fahrzeug", th4:"Route", th5:"Status", th6:"Unternehmen", ft_tag:"Fahrzeugimport · Weltweite Lieferung · Ihr Vertrauen", ft_r:"Alle Rechte vorbehalten.", toast_gen:"✅ Sendung erstellt:", toast_cop:"📋 Kopiert!", toast_upd:"📡 Update gesendet!", err_fill:"⚠️ Pflichtfelder ausfüllen", err_city:"⚠️ Bitte Stadt eingeben", err_nosel:"⚠️ Keine Sendung ausgewählt", sel:"Sendung ausgewählt:", login_title:"Admin-Zugang", login_email:"E-Mail", login_pass:"Passwort", login_btn:"ANMELDEN", login_err:"Falsche E-Mail oder Passwort.", logout:"Abmelden" },
  hr: { flag:"🇭🇷", code:"HR", h1a:"Pratite svoje", h1b:"vozilo", h1c:"u realnom vremenu", h1sub:"Unesite broj praćenja za provjeru statusa", btn_track:"PRATITI →", hint:"Broj praćenja primljen emailom", not_found:"❌ Broj nije pronađen.", loading:"Učitavanje…", back:"Nova pretraga", prog:"Napredak transporta", itin:"Ruta", tl:"Povijest događaja", info:"Informacije o transportu", eta_pre:"⏱ Dolazak:", lbl_dep:"Polazak", lbl_step:"Postaja", lbl_pos:"Pozicija", lbl_dest:"Odredište", lbl_mt:"Prijevoz", lbl_carr:"Prijevoznik", lbl_dd:"Polazak", lbl_eta:"Dolazak", lbl_vin:"VIN", lbl_pl:"Registracija", st0:"Čeka", st1:"Natovareno", st2:"U tranzitu", st3:"Carina", st4:"Dostava", st5:"Isporučeno", st0f:"Čeka se utovar", st1f:"Vozilo natovareno", st2f:"U tranzitu", st3f:"Carinjenje", st4f:"Dostava u tijeku", st5f:"Isporučeno ✓", adm_title:"Kreiranje praćenja", adm_sub:"Ispunite informacije za generiranje broja praćenja", s_cli:"Podaci o klijentu", s_veh:"Vozilo", s_rou:"Ruta", l_name:"Puno ime", l_email:"Email", l_phone:"Telefon", l_co:"Tvrtka", l_veh:"Marka i model", l_col:"Boja", l_vin:"VIN", l_plate:"Registracija", l_from:"Adresa preuzimanja", l_to:"Adresa dostave", l_dep:"Datum polaska", l_arr:"Procijenjeni dolazak", l_mode:"Prijevoz", l_carrier:"Prijevoznik", m1:"Kamion", m2:"Pomorski (RoRo)", m3:"Zračni teret", m4:"Kombinirani", btn_gen:"🚗 GENERIRAJ BROJ", gen_ok:"✅ Broj praćenja kreiran", btn_copy:"Kopirati", lbl_link:"🔗 Link za klijenta:", link_note:"Klijent vidi samo transportne podatke.", upd_h:"📍 Ažuriraj lokaciju", u_city:"Grad / Lokacija", u_date:"Datum", u_time:"Vrijeme", u_status:"Status", u_note:"Napomena", btn_upd:"📡 POŠALJI", hist_h:"📦 Aktivne pošiljke", th1:"Br.", th2:"Klijent", th3:"Vozilo", th4:"Ruta", th5:"Status", th6:"Tvrtka", ft_tag:"Uvoz automobila · Globalna dostava · Vaše povjerenje", ft_r:"Sva prava pridržana.", toast_gen:"✅ Kreiran:", toast_cop:"📋 Kopirano!", toast_upd:"📡 Ažurirano!", err_fill:"⚠️ Nedostaju polja", err_city:"⚠️ Unesite grad", err_nosel:"⚠️ Nije odabrano", sel:"Odabrano:", login_title:"Admin pristup", login_email:"Email", login_pass:"Lozinka", login_btn:"PRIJAVA", login_err:"Pogrešan email ili lozinka.", logout:"Odjava" },
  it: { flag:"🇮🇹", code:"IT", h1a:"Segui il tuo", h1b:"veicolo", h1c:"in tempo reale", h1sub:"Inserisci il numero di tracciamento per controllare lo stato", btn_track:"TRACCIA →", hint:"Numero ricevuto via email", not_found:"❌ Numero non trovato.", loading:"Caricamento…", back:"Nuova ricerca", prog:"Avanzamento", itin:"Itinerario", tl:"Cronologia", info:"Informazioni", eta_pre:"⏱ Arrivo:", lbl_dep:"Partenza", lbl_step:"Tappa", lbl_pos:"Posizione", lbl_dest:"Destinazione", lbl_mt:"Trasporto", lbl_carr:"Vettore", lbl_dd:"Partenza", lbl_eta:"Arrivo", lbl_vin:"VIN", lbl_pl:"Targa", st0:"Attesa", st1:"Caricato", st2:"In transito", st3:"Dogana", st4:"Consegna", st5:"Consegnato", st0f:"In attesa di carico", st1f:"Veicolo caricato", st2f:"In transito", st3f:"Sdoganamento", st4f:"Consegna in corso", st5f:"Consegnato ✓", adm_title:"Crea tracciamento", adm_sub:"Compila le informazioni", s_cli:"Cliente", s_veh:"Veicolo", s_rou:"Itinerario", l_name:"Nome completo", l_email:"Email", l_phone:"Telefono", l_co:"Azienda", l_veh:"Marca e Modello", l_col:"Colore", l_vin:"VIN", l_plate:"Targa", l_from:"Indirizzo di partenza", l_to:"Indirizzo di consegna", l_dep:"Data partenza", l_arr:"Arrivo stimato", l_mode:"Modalità", l_carrier:"Vettore", m1:"Camion", m2:"Marittimo (RoRo)", m3:"Aereo cargo", m4:"Combinato", btn_gen:"🚗 GENERA NUMERO", gen_ok:"✅ Numero generato", btn_copy:"Copia", lbl_link:"🔗 Link cliente:", link_note:"Il cliente vede solo le sue informazioni.", upd_h:"📍 Aggiorna posizione", u_city:"Città", u_date:"Data", u_time:"Ora", u_status:"Stato", u_note:"Nota", btn_upd:"📡 INVIA", hist_h:"📦 Spedizioni attive", th1:"N°", th2:"Cliente", th3:"Veicolo", th4:"Percorso", th5:"Stato", th6:"Azienda", ft_tag:"Importazione Auto · Consegna Globale · La Tua Fiducia", ft_r:"Tutti i diritti riservati.", toast_gen:"✅ Creato:", toast_cop:"📋 Copiato!", toast_upd:"📡 Aggiornato!", err_fill:"⚠️ Campi mancanti", err_city:"⚠️ Inserisci città", err_nosel:"⚠️ Nessun tracciamento", sel:"Selezionato:", login_title:"Accesso Admin", login_email:"Email", login_pass:"Password", login_btn:"ACCEDI", login_err:"Email o password errati.", logout:"Esci" },
  bg: { flag:"🇧🇬", code:"BG", h1a:"Проследете вашето", h1b:"превозно средство", h1c:"в реално време", h1sub:"Въведете номера за проследяване", btn_track:"СЛЕДИ →", hint:"Номерът е изпратен по имейл", not_found:"❌ Номерът не е намерен.", loading:"Зареждане…", back:"Ново търсене", prog:"Напредък", itin:"Маршрут", tl:"История", info:"Информация", eta_pre:"⏱ Пристигане:", lbl_dep:"Заминаване", lbl_step:"Спирка", lbl_pos:"Позиция", lbl_dest:"Дестинация", lbl_mt:"Транспорт", lbl_carr:"Превозвач", lbl_dd:"Заминаване", lbl_eta:"Пристигане", lbl_vin:"VIN", lbl_pl:"Регистрация", st0:"Изчаква", st1:"Натоварено", st2:"В транзит", st3:"Митница", st4:"Доставка", st5:"Доставено", st0f:"Изчаква товарене", st1f:"Натоварено", st2f:"В транзит", st3f:"Митническо оформление", st4f:"Доставката е в ход", st5f:"Доставено ✓", adm_title:"Създаване на проследяване", adm_sub:"Попълнете информацията", s_cli:"Клиент", s_veh:"Превозно средство", s_rou:"Маршрут", l_name:"Пълно име", l_email:"Имейл", l_phone:"Телефон", l_co:"Компания", l_veh:"Марка и модел", l_col:"Цвят", l_vin:"VIN", l_plate:"Регистрация", l_from:"Адрес за товарене", l_to:"Адрес за доставка", l_dep:"Дата", l_arr:"Пристигане", l_mode:"Транспорт", l_carrier:"Превозвач", m1:"Камион", m2:"Морски (RoRo)", m3:"Въздушен", m4:"Комбиниран", btn_gen:"🚗 ГЕНЕРИРАЙ", gen_ok:"✅ Номерът е създаден", btn_copy:"Копиране", lbl_link:"🔗 Линк за клиента:", link_note:"Клиентът вижда само своите данни.", upd_h:"📍 Актуализиране", u_city:"Град", u_date:"Дата", u_time:"Час", u_status:"Статус", u_note:"Бележка", btn_upd:"📡 ИЗПРАТИ", hist_h:"📦 Активни пратки", th1:"№", th2:"Клиент", th3:"Превозно средство", th4:"Маршрут", th5:"Статус", th6:"Компания", ft_tag:"Внос на автомобили · Глобална доставка · Вашето доверие", ft_r:"Всички права запазени.", toast_gen:"✅ Създадено:", toast_cop:"📋 Копирано!", toast_upd:"📡 Актуализирано!", err_fill:"⚠️ Попълнете полетата", err_city:"⚠️ Въведете град", err_nosel:"⚠️ Не е избрано", sel:"Избрано:", login_title:"Администраторски достъп", login_email:"Имейл", login_pass:"Парола", login_btn:"ВЛЕЗ", login_err:"Грешен имейл или парола.", logout:"Изход" },
  ro: { flag:"🇷🇴", code:"RO", h1a:"Urmăriți-vă", h1b:"vehiculul", h1c:"în timp real", h1sub:"Introduceți numărul de urmărire", btn_track:"URMĂRIRE →", hint:"Numărul a fost trimis prin email", not_found:"❌ Numărul nu a fost găsit.", loading:"Se încarcă…", back:"Căutare nouă", prog:"Progresul", itin:"Itinerar", tl:"Istoricul", info:"Informații", eta_pre:"⏱ Sosire:", lbl_dep:"Plecare", lbl_step:"Oprire", lbl_pos:"Poziție", lbl_dest:"Destinație", lbl_mt:"Transport", lbl_carr:"Transportator", lbl_dd:"Plecare", lbl_eta:"Sosire", lbl_vin:"VIN", lbl_pl:"Înmatriculare", st0:"Așteptare", st1:"Încărcat", st2:"În tranzit", st3:"Vamă", st4:"Livrare", st5:"Livrat", st0f:"În așteptare încărcare", st1f:"Vehicul încărcat", st2f:"În tranzit", st3f:"Vămuire", st4f:"Livrare în curs", st5f:"Livrat ✓", adm_title:"Creare urmărire", adm_sub:"Completați informațiile", s_cli:"Client", s_veh:"Vehicul", s_rou:"Itinerar", l_name:"Nume complet", l_email:"Email", l_phone:"Telefon", l_co:"Companie", l_veh:"Marcă și Model", l_col:"Culoare", l_vin:"VIN", l_plate:"Înmatriculare", l_from:"Adresă plecare", l_to:"Adresă livrare", l_dep:"Data plecare", l_arr:"Sosire estimată", l_mode:"Transport", l_carrier:"Transportator", m1:"Camion", m2:"Maritim (RoRo)", m3:"Aerian cargo", m4:"Combinat", btn_gen:"🚗 GENEREAZĂ NUMĂRUL", gen_ok:"✅ Numărul a fost creat", btn_copy:"Copiați", lbl_link:"🔗 Link client:", link_note:"Clientul vede doar informațiile sale.", upd_h:"📍 Actualizați poziția", u_city:"Orașul", u_date:"Data", u_time:"Ora", u_status:"Status", u_note:"Notă", btn_upd:"📡 TRIMITE", hist_h:"📦 Expedieri active", th1:"Nr.", th2:"Client", th3:"Vehicul", th4:"Traseu", th5:"Status", th6:"Companie", ft_tag:"Import Auto · Livrare globală · Încrederea dvs.", ft_r:"Toate drepturile rezervate.", toast_gen:"✅ Creat:", toast_cop:"📋 Copiat!", toast_upd:"📡 Actualizat!", err_fill:"⚠️ Câmpuri lipsesc", err_city:"⚠️ Introduceți orașul", err_nosel:"⚠️ Nicio urmărire", sel:"Selectat:", login_title:"Acces Administrator", login_email:"Email", login_pass:"Parolă", login_btn:"CONECTARE", login_err:"Email sau parolă incorectă.", logout:"Deconectare" }
};

/* ═══════════════════════════════════════════
   STYLES
═══════════════════════════════════════════ */
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=Exo+2:wght@300;400;500;600;700&display=swap');
  *{margin:0;padding:0;box-sizing:border-box;}
  :root{--blue:#1a6fd4;--orange:#e85d04;--green:#5a9e2f;--bg:#080c18;--card:rgba(255,255,255,0.035);--border:rgba(255,255,255,0.08);--text:#e8eaf0;--muted:#7a8499;}
  body{font-family:'Exo 2',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;}
  .at-root{position:relative;min-height:100vh;display:flex;flex-direction:column;}
  .bg-grid{position:fixed;inset:0;background:linear-gradient(rgba(26,111,212,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(26,111,212,.03) 1px,transparent 1px);background-size:40px 40px;pointer-events:none;z-index:0;}
  .bg-glow{position:fixed;inset:0;background:radial-gradient(ellipse 80% 50% at 50% -10%,rgba(26,111,212,.14),transparent);pointer-events:none;z-index:0;}
  .z1{position:relative;z-index:1;}
  .hdr{position:sticky;top:0;z-index:50;padding:0 24px;height:64px;display:flex;align-items:center;justify-content:space-between;background:rgba(8,12,24,.97);border-bottom:1px solid var(--border);backdrop-filter:blur(20px);gap:12px;}
  .hdr-badges{display:flex;align-items:center;gap:8px;}
  .bdg{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:11px;letter-spacing:.07em;padding:3px 9px;border-radius:4px;border:1px solid;}
  .bdg-ar{color:var(--orange);border-color:var(--orange);background:rgba(232,93,4,.08);}
  .bdg-ad{color:var(--blue);border-color:var(--blue);background:rgba(26,111,212,.08);}
  .hdr-brand{text-align:center;flex:1;}
  .hdr-title{font-family:'Rajdhani',sans-serif;font-weight:700;font-size:20px;letter-spacing:.22em;color:#fff;}
  .hdr-title span{color:var(--blue);}
  .hdr-sub{font-size:9px;letter-spacing:.12em;color:var(--muted);text-transform:uppercase;}
  .hdr-right{display:flex;align-items:center;gap:6px;}
  .lang-wrap{position:relative;}
  .lang-btn{font-size:12px;font-weight:600;padding:6px 10px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--text);cursor:pointer;display:flex;align-items:center;gap:4px;font-family:'Exo 2',sans-serif;}
  .lang-btn:hover{border-color:var(--blue);}
  .lang-drop{position:absolute;top:calc(100% + 6px);right:0;background:rgba(10,14,26,.98);border:1px solid var(--border);border-radius:10px;overflow:hidden;z-index:200;min-width:145px;box-shadow:0 12px 40px rgba(0,0,0,.6);}
  .lang-opt{padding:9px 13px;font-size:13px;cursor:pointer;color:var(--text);}
  .lang-opt:hover{background:rgba(26,111,212,.13);}
  .lang-opt.active{color:var(--blue);}
  .nav-btn{font-family:'Exo 2',sans-serif;font-size:12px;font-weight:600;padding:7px 13px;border-radius:6px;border:1px solid var(--border);background:var(--card);color:var(--muted);cursor:pointer;white-space:nowrap;transition:all .2s;}
  .nav-btn:hover,.nav-btn.active{border-color:var(--blue);color:var(--blue);background:rgba(26,111,212,.1);}
  .op-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(232,93,4,.1);border:1px solid rgba(232,93,4,.3);color:var(--orange);font-size:11px;font-weight:700;letter-spacing:.09em;padding:5px 11px;border-radius:30px;white-space:nowrap;}
  .hero{text-align:center;padding:72px 20px 52px;}
  .hero h1{font-family:'Rajdhani',sans-serif;font-size:clamp(26px,5vw,52px);font-weight:700;letter-spacing:.05em;line-height:1.1;margin-bottom:10px;}
  .hero h1 .ac{color:var(--blue);}
  .hero p{color:var(--muted);font-size:15px;margin-bottom:42px;}
  .search-box{max-width:560px;margin:0 auto;background:var(--card);border:1px solid var(--border);border-radius:16px;padding:26px;backdrop-filter:blur(20px);}
  .s-row{display:flex;gap:10px;}
  .s-in{flex:1;background:rgba(255,255,255,.05);border:1px solid var(--border);border-radius:10px;padding:13px 17px;color:#fff;font-family:'Exo 2',sans-serif;font-size:15px;letter-spacing:.12em;text-transform:uppercase;outline:none;transition:border-color .2s;}
  .s-in:focus{border-color:var(--blue);}
  .s-in::placeholder{color:var(--muted);text-transform:none;letter-spacing:0;}
  .btn-blue{font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;letter-spacing:.1em;padding:13px 20px;border-radius:10px;border:none;background:linear-gradient(135deg,var(--blue),#0d4fa0);color:#fff;cursor:pointer;transition:all .2s;white-space:nowrap;}
  .btn-blue:hover{transform:translateY(-1px);box-shadow:0 8px 24px rgba(26,111,212,.4);}
  .btn-blue:disabled{opacity:.5;cursor:not-allowed;transform:none;}
  .s-hint{font-size:11px;color:var(--muted);margin-top:10px;text-align:center;}
  .err-msg{margin-top:13px;background:rgba(232,93,4,.1);border:1px solid rgba(232,93,4,.3);border-radius:8px;padding:10px 14px;font-size:13px;color:var(--orange);text-align:center;}
  .res-wrap{max-width:880px;margin:0 auto;padding:32px 20px 60px;}
  .back-btn{display:inline-flex;align-items:center;gap:7px;font-size:13px;color:var(--muted);cursor:pointer;border:1px solid var(--border);padding:7px 13px;border-radius:8px;background:var(--card);margin-bottom:18px;transition:all .2s;}
  .back-btn:hover{color:var(--text);border-color:var(--blue);}
  .top-card{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:22px 26px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:14px;}
  .res-id{font-family:'Rajdhani',sans-serif;font-size:23px;font-weight:700;letter-spacing:.15em;color:var(--blue);margin-bottom:4px;}
  .res-route{font-size:13px;color:var(--muted);margin-bottom:9px;}
  .res-route b{color:var(--text);}
  .sbadge{display:inline-flex;align-items:center;gap:7px;padding:7px 15px;border-radius:30px;font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;}
  .s-wait{background:rgba(122,132,153,.12);border:1px solid rgba(122,132,153,.3);color:var(--muted);}
  .s-transit{background:rgba(26,111,212,.15);border:1px solid rgba(26,111,212,.4);color:var(--blue);}
  .s-customs{background:rgba(232,93,4,.15);border:1px solid rgba(232,93,4,.4);color:var(--orange);}
  .s-done{background:rgba(90,158,47,.15);border:1px solid rgba(90,158,47,.4);color:var(--green);}
  .sdot{width:7px;height:7px;border-radius:50%;background:currentColor;animation:pulse 1.5s infinite;}
  @keyframes pulse{0%,100%{opacity:1;transform:scale(1);}50%{opacity:.5;transform:scale(1.3);}}
  .res-right{text-align:right;}
  .res-name{font-size:16px;font-weight:700;margin-bottom:3px;}
  .res-veh{font-size:13px;color:var(--muted);}
  .res-eta{font-size:13px;color:var(--green);margin-top:5px;font-weight:600;}
  .res-co{font-size:11px;color:var(--muted);margin-top:3px;}
  .prog-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 22px;margin-bottom:14px;}
  .ctitle{font-family:'Rajdhani',sans-serif;font-size:11px;font-weight:700;letter-spacing:.14em;color:var(--muted);text-transform:uppercase;margin-bottom:12px;display:flex;align-items:center;gap:8px;}
  .ctitle::after{content:'';flex:1;height:1px;background:var(--border);}
  .pbar{background:rgba(255,255,255,.06);border-radius:6px;height:7px;overflow:hidden;}
  .pfill{height:100%;border-radius:6px;background:linear-gradient(90deg,var(--green),var(--blue),var(--orange));transition:width .8s ease;}
  .plabels{display:flex;justify-content:space-between;margin-top:7px;font-size:10px;color:var(--muted);}
  .ppct{color:var(--blue);font-weight:700;}
  .steps-row{display:flex;align-items:flex-start;justify-content:space-between;margin-top:16px;position:relative;}
  .steps-row::before{content:'';position:absolute;top:14px;left:8%;right:8%;height:2px;background:var(--border);z-index:0;}
  .step-item{display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;position:relative;z-index:1;}
  .step-dot{width:28px;height:28px;border-radius:50%;border:2px solid;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:11px;}
  .sd-done{border-color:var(--green);background:rgba(90,158,47,.15);color:var(--green);}
  .sd-active{border-color:var(--orange);background:rgba(232,93,4,.15);color:var(--orange);animation:gpulse 2s infinite;}
  @keyframes gpulse{0%,100%{box-shadow:0 0 12px rgba(232,93,4,.4);}50%{box-shadow:0 0 24px rgba(232,93,4,.7);}}
  .sd-pend{border-color:var(--border);color:var(--muted);}
  .step-lbl{font-size:9px;font-weight:600;text-align:center;color:var(--muted);max-width:65px;line-height:1.3;}
  .sl-active{color:var(--orange);}
  .sl-done{color:var(--green);}
  .g2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px;}
  .card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px;}
  .rp{display:flex;gap:12px;padding-bottom:18px;position:relative;}
  .rp:last-child{padding-bottom:0;}
  .rp::before{content:'';position:absolute;left:11px;top:26px;bottom:0;width:2px;background:linear-gradient(to bottom,var(--blue),rgba(26,111,212,.04));}
  .rp:last-child::before{display:none;}
  .pi{width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;flex-shrink:0;z-index:1;position:relative;border:2px solid;}
  .pi-o{background:rgba(90,158,47,.2);border-color:var(--green);}
  .pi-s{background:rgba(26,111,212,.18);border-color:var(--blue);}
  .pi-c{background:rgba(232,93,4,.2);border-color:var(--orange);animation:gpulse 2s infinite;}
  .pi-d{background:rgba(26,111,212,.06);border-color:rgba(26,111,212,.2);}
  .plabel{font-size:9px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-bottom:1px;}
  .pcity{font-size:13px;font-weight:600;color:#fff;}
  .ptime{font-size:10px;color:var(--muted);margin-top:1px;}
  .pnote{font-size:10px;color:var(--orange);margin-top:2px;}
  .tli{display:flex;gap:11px;padding-bottom:14px;position:relative;}
  .tli:last-child{padding-bottom:0;}
  .tli::before{content:'';position:absolute;left:11px;top:24px;bottom:0;width:1px;background:var(--border);}
  .tli:last-child::before{display:none;}
  .tld{width:23px;height:23px;border-radius:50%;border:2px solid;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:9px;flex-shrink:0;z-index:1;position:relative;}
  .td{border-color:var(--green);color:var(--green);}
  .ta{border-color:var(--orange);color:var(--orange);}
  .tp{border-color:var(--border);color:var(--muted);}
  .tlc{flex:1;padding-top:2px;}
  .tlt{font-size:12px;font-weight:600;margin-bottom:1px;}
  .tltime{font-size:10px;color:var(--muted);}
  .ig{display:grid;grid-template-columns:repeat(3,1fr);gap:9px;}
  .ii{background:rgba(255,255,255,.02);border-radius:8px;padding:11px;}
  .il{font-size:9px;color:var(--muted);letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px;}
  .iv{font-size:13px;font-weight:600;}
  .adm-wrap{max-width:960px;margin:0 auto;padding:44px 20px 80px;}
  .adm-hdr{text-align:center;margin-bottom:30px;}
  .adm-hdr h2{font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700;letter-spacing:.06em;margin-bottom:6px;}
  .adm-hdr p{color:var(--muted);font-size:14px;}
  .fg{display:grid;grid-template-columns:1fr 1fr;gap:13px;}
  .fg .full{grid-column:1/-1;}
  .fgroup{display:flex;flex-direction:column;gap:5px;}
  .flabel{font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);}
  .fi,.fs{background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:9px;padding:10px 12px;color:#fff;font-family:'Exo 2',sans-serif;font-size:13px;outline:none;transition:border-color .2s;width:100%;}
  .fi:focus,.fs:focus{border-color:var(--blue);background:rgba(26,111,212,.05);}
  .fs option{background:#0a0e1a;}
  .sdivider{font-family:'Rajdhani',sans-serif;font-size:10px;font-weight:700;letter-spacing:.15em;color:var(--muted);text-transform:uppercase;display:flex;align-items:center;gap:10px;grid-column:1/-1;margin-top:6px;}
  .sdivider::before,.sdivider::after{content:'';flex:1;height:1px;background:var(--border);}
  .btn-gen{grid-column:1/-1;font-family:'Rajdhani',sans-serif;font-size:15px;font-weight:700;letter-spacing:.12em;padding:14px;border-radius:11px;border:none;background:linear-gradient(135deg,var(--blue) 0%,#0d4fa0 50%,#1b2a4a 100%);color:#fff;cursor:pointer;transition:all .3s;display:flex;align-items:center;justify-content:center;gap:10px;}
  .btn-gen:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(26,111,212,.35);}
  .btn-gen:disabled{opacity:.5;cursor:not-allowed;transform:none;}
  .gen-card{background:rgba(26,111,212,.06);border:1px solid rgba(26,111,212,.25);border-radius:16px;padding:24px;margin-top:20px;text-align:center;}
  .gen-lbl{font-size:10px;color:var(--muted);letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;}
  .gen-num{font-family:'Rajdhani',sans-serif;font-size:clamp(20px,4vw,38px);font-weight:700;letter-spacing:.2em;color:#fff;margin-bottom:9px;}
  .gen-num span{color:var(--blue);}
  .copy-btn{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--blue);cursor:pointer;border:1px solid rgba(26,111,212,.3);padding:5px 13px;border-radius:20px;margin-bottom:12px;transition:all .2s;}
  .copy-btn:hover{background:rgba(26,111,212,.1);}
  .link-box{background:rgba(0,0,0,.35);border:1px solid var(--border);border-radius:8px;padding:11px 14px;font-size:12px;color:var(--muted);word-break:break-all;text-align:left;margin-bottom:5px;}
  .link-box a{color:var(--blue);font-weight:600;}
  .link-note{font-size:11px;color:var(--muted);}
  .upd-section{margin-top:18px;padding-top:18px;border-top:1px solid var(--border);text-align:left;}
  .upd-h{font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;letter-spacing:.1em;color:var(--orange);margin-bottom:13px;text-transform:uppercase;}
  .upd-g3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:11px;margin-bottom:11px;}
  .upd-g2{display:grid;grid-template-columns:1fr 1fr;gap:11px;margin-bottom:13px;}
  .btn-upd{font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;letter-spacing:.08em;padding:12px;border-radius:9px;border:none;background:linear-gradient(135deg,var(--orange),#c44d00);color:#fff;cursor:pointer;transition:all .2s;width:100%;display:flex;align-items:center;justify-content:center;gap:8px;}
  .btn-upd:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(232,93,4,.4);}
  .btn-upd:disabled{opacity:.5;cursor:not-allowed;transform:none;}
  .hist{margin-top:32px;}
  .hist h3{font-family:'Rajdhani',sans-serif;font-size:17px;font-weight:700;letter-spacing:.08em;margin-bottom:11px;display:flex;align-items:center;gap:10px;}
  .ref-btn{font-size:11px;color:var(--muted);cursor:pointer;border:1px solid var(--border);padding:4px 9px;border-radius:6px;background:var(--card);font-family:'Exo 2',sans-serif;}
  .ref-btn:hover{color:var(--blue);border-color:var(--blue);}
  .htable{width:100%;border-collapse:collapse;}
  .htable th{text-align:left;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);padding:8px 11px;border-bottom:1px solid var(--border);}
  .htable td{padding:11px 11px;font-size:13px;border-bottom:1px solid rgba(255,255,255,.04);}
  .htable tr:hover td{background:rgba(255,255,255,.02);}
  .tid{font-family:'Rajdhani',sans-serif;letter-spacing:.1em;color:var(--blue);font-size:12px;cursor:pointer;}
  .tid:hover{text-decoration:underline;}
  .dstatus{display:inline-flex;align-items:center;gap:5px;}
  .dot{width:6px;height:6px;border-radius:50%;}
  footer{position:relative;z-index:1;padding:16px 24px;border-top:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-top:auto;}
  .fl{display:flex;align-items:center;gap:11px;font-family:'Rajdhani',sans-serif;font-size:13px;font-weight:700;letter-spacing:.1em;}
  footer p{font-size:11px;color:var(--muted);}
  .spin{width:15px;height:15px;border:2px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:spinr .7s linear infinite;display:inline-block;}
  @keyframes spinr{to{transform:rotate(360deg);}}
  .toast-wrap{position:fixed;bottom:22px;right:22px;z-index:9999;display:flex;flex-direction:column;gap:8px;}
  .toast{backdrop-filter:blur(20px);color:#fff;padding:11px 18px;border-radius:10px;font-size:13px;font-weight:600;max-width:290px;animation:toastin .3s ease;}
  @keyframes toastin{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
  .t-ok{background:rgba(26,111,212,.93);border:1px solid rgba(26,111,212,.4);}
  .t-err{background:rgba(232,93,4,.93);border:1px solid rgba(232,93,4,.4);}
  .t-info{background:rgba(90,158,47,.93);border:1px solid rgba(90,158,47,.4);}
  .loader-ov{position:fixed;inset:0;background:rgba(8,12,24,.9);z-index:200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;}
  .loader-spin{width:44px;height:44px;border:3px solid var(--border);border-top-color:var(--blue);border-radius:50%;animation:spinr .8s linear infinite;}

  /* LOGIN */
  .login-ov{position:fixed;inset:0;background:rgba(8,12,24,.97);z-index:300;display:flex;align-items:center;justify-content:center;}
  .login-box{background:rgba(255,255,255,.04);border:1px solid var(--border);border-radius:20px;padding:40px 36px;width:100%;max-width:380px;text-align:center;}
  .login-box h2{font-family:'Rajdhani',sans-serif;font-size:22px;font-weight:700;letter-spacing:.1em;margin-bottom:6px;}
  .login-box p{font-size:12px;color:var(--muted);margin-bottom:24px;}
  .login-box .fgroup{text-align:left;margin-bottom:12px;}
  .login-err{background:rgba(232,93,4,.1);border:1px solid rgba(232,93,4,.3);border-radius:8px;padding:9px 13px;font-size:12px;color:var(--orange);margin-bottom:13px;}

  @media(max-width:640px){
    .g2,.ig,.fg,.upd-g3,.upd-g2{grid-template-columns:1fr;}
    .fg .full,.sdivider,.btn-gen{grid-column:1;}
    .s-row{flex-direction:column;}
    .top-card{flex-direction:column;}
    .res-right{text-align:left;}
    .steps-row{flex-wrap:wrap;gap:8px;}
    .steps-row::before{display:none;}
    .step-item{flex-direction:row;width:48%;}
    .step-lbl{text-align:left;max-width:none;}
    .hdr{flex-wrap:wrap;height:auto;padding:10px 14px;}
    .hdr-brand{order:-1;width:100%;}
  }
`;

/* ═══════════════════════════════════════════
   FIREBASE DB HELPERS
═══════════════════════════════════════════ */
async function dbRead(): Promise<Record<string, any>> {
  try {
    const col = collection(db, "trackings");
    const snap = await getDocs(col);
    const result: Record<string, any> = {};
    snap.forEach(d => { result[d.id] = d.data(); });
    return result;
  } catch (e) {
    console.error("dbRead error", e);
    return {};
  }
}

async function dbWrite(id: string, data: any): Promise<void> {
  await setDoc(doc(db, "trackings", id), data);
}

async function dbReadOne(id: string): Promise<any | null> {
  try {
    const snap = await getDoc(doc(db, "trackings", id));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function fmt(d: string) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("fr-FR"); } catch { return d; }
}
function nowStr() {
  return new Date().toLocaleString("fr-FR", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

/* ═══════════════════════════════════════════
   MAIN APP
═══════════════════════════════════════════ */
export default function App() {
  const [lang, setLangState] = useState("fr");
  const t = (k: string) => T[lang]?.[k] ?? T.fr[k] ?? k;

  const isAdminUrl = new URLSearchParams(window.location.search).get("admin") === "1";
  const [view, setView] = useState<"client"|"admin">(isAdminUrl ? "admin" : "client");
  const [showLang, setShowLang] = useState(false);
  const [toasts, setToasts] = useState<{id:number;msg:string;type:string}[]>([]);
  const [loading, setLoading] = useState(false);

  // AUTH
  const [adminUser, setAdminUser] = useState<User|null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);

  // CLIENT
  const [trackInput, setTrackInput] = useState("");
  const [trackError, setTrackError] = useState(false);
  const [trackData, setTrackData] = useState<any>(null);
  const [trackId, setTrackId] = useState("");
  const unsubTrackRef = useRef<(() => void) | null>(null);

  // ADMIN
  const [form, setForm] = useState({ name:"", email:"", phone:"", co:"AutoDeliv", veh:"", col:"", vin:"", plate:"", from:"", to:"", dep:"", arr:"", mode:"Camion porte-voiture", carrier:"" });
  const [genId, setGenId] = useState<string|null>(null);
  const [history, setHistory] = useState<[string,any][]>([]);
  const [selectedId, setSelectedId] = useState<string|null>(null);
  const [upd, setUpd] = useState({ city:"", date:"", time:"", status:"st0", note:"" });
  const [genBusy, setGenBusy] = useState(false);
  const [updBusy, setUpdBusy] = useState(false);

  const toast = (msg: string, type="ok") => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3500);
  };

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, user => {
      setAdminUser(user);
      setAuthChecked(true);
    });
    return unsub;
  }, []);

  // Init dates + URL param
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const next = new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    setForm(p => ({ ...p, dep: today, arr: next }));
    setUpd(p => ({ ...p, date: today, time: hhmm }));
    const params = new URLSearchParams(window.location.search);
    const tid = params.get("track");
    if (tid) { setTrackInput(tid); doTrackById(tid); }
  }, []); // eslint-disable-line

  const loadHistory = useCallback(async () => {
    const db2 = await dbRead();
    setHistory(Object.entries(db2).reverse());
  }, []);

  useEffect(() => { if (view === "admin" && adminUser) loadHistory(); }, [view, adminUser, loadHistory]);

  /* ── LOGIN ── */
  async function doLogin() {
    setLoginErr("");
    setLoginBusy(true);
    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPass);
      setShowLogin(false);
      setView("admin");
    } catch {
      setLoginErr(t("login_err"));
    }
    setLoginBusy(false);
  }

  async function doLogout() {
    await signOut(auth);
    setView("client");
  }

  /* ── TRACK ── */
  async function doTrack() {
    const raw = trackInput.trim().toUpperCase().replace(/\s/g, "");
    if (!raw) return;
    setTrackError(false);
    setLoading(true);
    await doTrackById(raw);
    setLoading(false);
  }

  async function doTrackById(raw: string) {
    setLoading(true);
    // Unsubscribe previous listener
    if (unsubTrackRef.current) { unsubTrackRef.current(); unsubTrackRef.current = null; }

    // Try direct lookup first
    let data = await dbReadOne(raw);
    let id = raw;
    if (!data) {
      const all = await dbRead();
      const found = Object.keys(all).find(k =>
        k.replace(/-/g,"") === raw.replace(/-/g,"") ||
        k.replace(/-/g,"").endsWith(raw.replace(/-/g,"").slice(-5))
      );
      if (found) { id = found; data = all[found]; }
    }
    setLoading(false);
    if (!data) { setTrackError(true); setTrackData(null); return; }
    setTrackId(id);
    setTrackData(data);
    setTrackError(false);

    // Subscribe to real-time updates
    const unsub = onSnapshot(doc(db, "trackings", id), (snap) => {
      if (snap.exists()) {
        setTrackData(snap.data());
      }
    });
    unsubTrackRef.current = unsub;
  }

  /* ── GENERATE ── */
  async function genTracking() {
    const { name, from, to, veh } = form;
    if (!name || !from || !to || !veh) { toast(t("err_fill"), "err"); return; }
    setGenBusy(true);
    const words = from.split(/[,\s]+/).filter((w: string) => /^[A-Za-zÀ-ÿ]{2,}$/.test(w));
    const cc = (words[words.length - 1] || "XX").substring(0, 2).toUpperCase();
    const yr = new Date().getFullYear();
    const num = String(Math.floor(Math.random() * 90000) + 10000);
    const id = `ATK-${yr}-${cc}-${num}`;
    const dep = fmt(form.dep), arr = fmt(form.arr);
    const rec = {
      client: name, email: form.email, phone: form.phone,
      vehicle: veh, color: form.col || "—", vin: form.vin || "—", plate: form.plate || "—",
      from, to, fromCity: from.split(",")[0].trim(), toCity: to.split(",")[0].trim(),
      dep, arr, mode: form.mode, carrier: form.carrier || "—",
      company: form.co, progress: 5, statusKey: "st0",
      route: [
        { city: from.split(",")[0].trim(), lk:"lbl_dep", type:"origin", time: dep, note: null },
        { city: to.split(",")[0].trim(), lk:"lbl_dest", type:"dest", time: `Estimé ${arr}`, note: null }
      ],
      timeline: [
        { icon:"●", type:"active", title:`Prise en charge prévue — ${from.split(",")[0].trim()}`, time: dep },
        { icon:"○", type:"pending", title:"Transport en cours", time:"—" },
        { icon:"○", type:"pending", title:`Livraison — ${to.split(",")[0].trim()}`, time:`Estimé ${arr}` }
      ],
      info: [
        { lk:"lbl_mt", val: form.mode }, { lk:"lbl_carr", val: form.carrier || "—" },
        { lk:"lbl_dd", val: dep }, { lk:"lbl_eta", val: arr },
        { lk:"lbl_vin", val: form.vin || "—" }, { lk:"lbl_pl", val: form.plate || "—" }
      ]
    };
    await dbWrite(id, rec);
    setGenId(id);
    setSelectedId(id);
    await loadHistory();
    toast(t("toast_gen") + " " + id, "ok");
    setGenBusy(false);
  }

  /* ── PUSH UPDATE ── */
  async function pushUpdate() {
    if (!selectedId) { toast(t("err_nosel"), "err"); return; }
    if (!upd.city) { toast(t("err_city"), "err"); return; }
    setUpdBusy(true);
    let dt = "";
    if (upd.date) { try { dt = new Date(upd.date).toLocaleDateString("fr-FR"); } catch { dt = upd.date; } if (upd.time) dt += " — " + upd.time; }
    else dt = nowStr();
    const data = await dbReadOne(selectedId);
    if (!data) { toast("❌ Introuvable", "err"); setUpdBusy(false); return; }
    data.statusKey = upd.status;
    const pm: Record<string,number> = { st0:5, st1:15, st2:50, st3:75, st4:90, st5:100 };
    data.progress = pm[upd.status] || data.progress;
    data.route.forEach((r: any) => { if (r.type === "current") r.type = "step"; });
    const di = data.route.findIndex((r: any) => r.type === "dest");
    data.route.splice(di, 0, { city: upd.city, lk:"lbl_pos", type:"current", time: dt, note: upd.note || null });
    data.timeline.unshift({ icon:"●", type:"active", title:`${t(upd.status)} — ${upd.city}${upd.note ? " · " + upd.note : ""}`, time: dt });
    let first = true;
    data.timeline = data.timeline.map((e: any) => {
      if (e.type === "active") { if (first) { first = false; return e; } return { ...e, type:"done", icon:"✓" }; }
      return e;
    });
    await dbWrite(selectedId, data);
    await loadHistory();

    // Send email notification to client
    if (data.email && data.email !== "—" && data.email.includes("@")) {
      try {
        await emailjs.send(EMAILJS_SERVICE, EMAILJS_TEMPLATE, {
          client_name: data.client,
          vehicle: data.vehicle,
          city: upd.city,
          status: t(upd.status + "f"),
          date: dt,
          note: upd.note ? "📝 " + upd.note : "",
          tracking_id: selectedId,
          tracking_link: window.location.origin + window.location.pathname + "?track=" + selectedId,
          to_email: data.email,
        }, EMAILJS_PUBLIC);
        toast("📧 Email envoyé à " + data.email, "ok");
      } catch (err) {
        console.error("EmailJS error", err);
        toast("⚠️ Mise à jour OK mais email non envoyé", "err");
      }
    }

    toast(t("toast_upd"), "ok");
    setUpd(p => ({ ...p, city:"", note:"" }));
    setUpdBusy(false);
  }

  /* ── SELECT TRACKING ── */
  async function selectTracking(id: string) {
    setGenId(id);
    setSelectedId(id);
    toast(t("sel") + " " + id, "info");
    document.querySelector(".gen-card")?.scrollIntoView({ behavior:"smooth" });
  }

  /* ── COPY ── */
  function copyNum() {
    const el = document.getElementById("gen-num-display");
    navigator.clipboard.writeText(el?.textContent || "").then(() => toast(t("toast_cop"), "ok"));
  }

  function sBadgeClass(stk: string) {
    if (stk === "st5") return "sbadge s-done";
    if (stk === "st3") return "sbadge s-customs";
    if (stk === "st0") return "sbadge s-wait";
    return "sbadge s-transit";
  }

  const lkMap = (lk: string) => ({ lbl_dep: t("lbl_dep"), lbl_step: t("lbl_step"), lbl_pos: t("lbl_pos"), lbl_dest: t("lbl_dest") } as Record<string,string>)[lk] || lk;
  const infoLkMap = (lk: string) => ({ lbl_mt: t("lbl_mt"), lbl_carr: t("lbl_carr"), lbl_dd: t("lbl_dd"), lbl_eta: t("lbl_eta"), lbl_vin: t("lbl_vin"), lbl_pl: t("lbl_pl") } as Record<string,string>)[lk] || lk;

  const steps = ["st0","st1","st2","st3","st4","st5"];
  const stepIcons = ["⏳","📦","🚛","🛃","🏠","✅"];
  const trackLink = genId ? `${window.location.origin}${window.location.pathname}?track=${genId}` : "";

  if (!authChecked) return <div className="loader-ov"><div className="loader-spin" /></div>;

  return (
    <>
      <style>{css}</style>
      <div className="at-root" onClick={() => setShowLang(false)}>
        <div className="bg-grid" /><div className="bg-glow" />

        {/* LOGIN OVERLAY */}
        {showLogin && (
          <div className="login-ov">
            <div className="login-box">
              <div className="op-chip" style={{marginBottom:14,display:"inline-flex"}}>🔐 Admin</div>
              <h2>{t("login_title")}</h2>
              <p>AutoTrack — Accès sécurisé</p>
              {loginErr && <div className="login-err">{loginErr}</div>}
              <div className="fgroup">
                <div className="flabel">{t("login_email")}</div>
                <input className="fi" type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key==="Enter" && doLogin()} placeholder="admin@email.com" />
              </div>
              <div className="fgroup" style={{marginBottom:20}}>
                <div className="flabel">{t("login_pass")}</div>
                <input className="fi" type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)} onKeyDown={e => e.key==="Enter" && doLogin()} placeholder="••••••••" />
              </div>
              <button className="btn-blue" style={{width:"100%",marginBottom:10}} onClick={doLogin} disabled={loginBusy}>
                {loginBusy ? <><span className="spin" /> Connexion…</> : t("login_btn")}
              </button>
              <button className="nav-btn" style={{width:"100%"}} onClick={() => setShowLogin(false)}>Annuler</button>
            </div>
          </div>
        )}

        {/* LOADER */}
        {loading && (
          <div className="loader-ov">
            <div className="loader-spin" />
            <p style={{color:"var(--muted)",fontSize:14}}>{t("loading")}</p>
          </div>
        )}

        {/* HEADER */}
        <header className="hdr">
          <div className="hdr-badges">
            <span className="bdg bdg-ar">AutoReach+</span>
            <span style={{color:"var(--muted)"}}>×</span>
            <span className="bdg bdg-ad">AutoDeliv</span>
          </div>
          <div className="hdr-brand">
            <div className="hdr-title">AUTO<span>TRACK</span></div>
            <div className="hdr-sub">powered by AutoReach+ &amp; AutoDeliv</div>
          </div>
          <div className="hdr-right">
            {isAdminUrl && (
              adminUser ? (
                <>
                  <button className={`nav-btn${view==="client"?" active":""}`} onClick={() => setView("client")}>Suivi</button>
                  <button className={`nav-btn${view==="admin"?" active":""}`} onClick={() => setView("admin")}>⚙️ Admin</button>
                  <button className="nav-btn" onClick={doLogout} title={t("logout")}>🚪</button>
                </>
              ) : (
                <button className="nav-btn" onClick={() => { setShowLogin(true); setLoginErr(""); }}>🔐 Admin</button>
              )
            )}
            <div className="lang-wrap" onClick={e => e.stopPropagation()}>
              <button className="lang-btn" onClick={() => setShowLang(p => !p)}>
                {T[lang].flag} {T[lang].code} ▾
              </button>
              {showLang && (
                <div className="lang-drop">
                  {Object.entries(T).map(([l, v]) => (
                    <div key={l} className={`lang-opt${lang===l?" active":""}`} onClick={() => { setLangState(l); setShowLang(false); }}>
                      {v.flag} {l==="fr"?"Français":l==="en"?"English":l==="de"?"Deutsch":l==="hr"?"Hrvatski":l==="it"?"Italiano":l==="bg"?"Български":"Română"}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* ════ CLIENT VIEW ════ */}
        {view === "client" && !trackData && (
          <div className="z1">
            <div className="hero">
              <h1>{t("h1a")} <span className="ac">{t("h1b")}</span><br/>{t("h1c")}</h1>
              <p>{t("h1sub")}</p>
              <div className="search-box">
                <div className="s-row">
                  <input className="s-in" value={trackInput} onChange={e => setTrackInput(e.target.value)} onKeyDown={e => e.key==="Enter" && doTrack()} placeholder="ATK-2026-FR-00142" maxLength={22} />
                  <button className="btn-blue" onClick={doTrack} disabled={loading}>{t("btn_track")}</button>
                </div>
                <p className="s-hint">{t("hint")}</p>
                {trackError && <div className="err-msg">{t("not_found")}</div>}
              </div>
            </div>
          </div>
        )}

        {/* ════ TRACKING RESULT ════ */}
        {view === "client" && trackData && (
          <div className="z1">
            <div className="res-wrap">
              <div className="back-btn" onClick={() => { if (unsubTrackRef.current) { unsubTrackRef.current(); unsubTrackRef.current = null; } setTrackData(null); setTrackError(false); setTrackInput(""); }}>← {t("back")}</div>
              <div className="top-card">
                <div>
                  <div className="res-id">{trackId}</div>
                  <div className="res-route" dangerouslySetInnerHTML={{ __html: `<b>${trackData.from}</b> → <b>${trackData.to}</b>` }} />
                  <span className={sBadgeClass(trackData.statusKey)}>
                    <span className="sdot" />{t(trackData.statusKey + "f")}
                  </span>
                </div>
                <div className="res-right">
                  <div className="res-name">{trackData.client}</div>
                  <div className="res-veh">{trackData.vehicle}{trackData.color&&trackData.color!=="—"?" — "+trackData.color:""}</div>
                  <div className="res-eta">{t("eta_pre")} {trackData.arr}</div>
                  <div className="res-co">{trackData.company}</div>
                </div>
              </div>
              <div className="prog-card">
                <div className="ctitle">{t("prog")}</div>
                <div className="pbar"><div className="pfill" style={{width: (trackData.progress||0)+"%"}} /></div>
                <div className="plabels">
                  <span>{trackData.fromCity}</span>
                  <span className="ppct">{trackData.progress||0}%</span>
                  <span>{trackData.toCity}</span>
                </div>
                <div className="steps-row">
                  {steps.map((s, i) => {
                    const ci = steps.indexOf(trackData.statusKey);
                    const state = i < ci ? "sd-done" : i === ci ? "sd-active" : "sd-pend";
                    const lc = i < ci ? "sl-done" : i === ci ? "sl-active" : "";
                    return (
                      <div key={s} className="step-item">
                        <div className={`step-dot ${state}`}>{stepIcons[i]}</div>
                        <div className={`step-lbl ${lc}`}>{t(s)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="g2">
                <div className="card">
                  <div className="ctitle">{t("itin")}</div>
                  {(trackData.route||[]).map((p: any, i: number) => {
                    const cls = p.type==="origin"?"pi-o":p.type==="current"?"pi-c":p.type==="dest"?"pi-d":"pi-s";
                    const ico = p.type==="origin"?"🚀":p.type==="current"?"📍":p.type==="dest"?"🏁":"●";
                    return (
                      <div key={i} className="rp">
                        <div className={`pi ${cls}`}>{ico}</div>
                        <div>
                          <div className="plabel">{lkMap(p.lk)}</div>
                          <div className="pcity">{p.city}</div>
                          <div className="ptime">{p.time}</div>
                          {p.note && <div className="pnote">{p.note}</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="card">
                  <div className="ctitle">{t("tl")}</div>
                  {(trackData.timeline||[]).map((e: any, i: number) => {
                    const cls = e.type==="done"?"td":e.type==="active"?"ta":"tp";
                    const col = e.type==="active"?"var(--orange)":e.type==="done"?"var(--text)":"var(--muted)";
                    return (
                      <div key={i} className="tli">
                        <div className={`tld ${cls}`}>{e.icon}</div>
                        <div className="tlc">
                          <div className="tlt" style={{color:col}}>{e.title}</div>
                          <div className="tltime">{e.time}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="card">
                <div className="ctitle">{t("info")}</div>
                <div className="ig">
                  {(trackData.info||[]).map((item: any, i: number) => (
                    <div key={i} className="ii">
                      <div className="il">{infoLkMap(item.lk)}</div>
                      <div className="iv">{item.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ ADMIN VIEW (protected) ════ */}
        {view === "admin" && adminUser && (
          <div className="z1">
            <div className="adm-wrap">
              <div className="adm-hdr">
                <div className="op-chip" style={{marginBottom:12}}>🔐 {t("adm_title").split(" ")[0]}</div>
                <h2>{t("adm_title")}</h2>
                <p>{t("adm_sub")}</p>
              </div>
              <div className="card">
                <div className="fg">
                  <div className="sdivider">{t("s_cli")}</div>
                  {([["l_name","name","Mohammed Alami"],["l_email","email","client@email.com"],["l_phone","phone","+33 6 00 00 00 00"]] as [string,string,string][]).map(([lk,k,ph]) => (
                    <div key={k} className="fgroup">
                      <div className="flabel">{t(lk)}</div>
                      <input className="fi" value={(form as any)[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} />
                    </div>
                  ))}
                  <div className="fgroup">
                    <div className="flabel">{t("l_co")}</div>
                    <select className="fs" value={form.co} onChange={e => setForm(p=>({...p,co:e.target.value}))}>
                      <option value="AutoDeliv">AutoDeliv</option>
                      <option value="AutoReach+">AutoReach+</option>
                    </select>
                  </div>
                  <div className="sdivider">{t("s_veh")}</div>
                  {([["l_veh","veh","BMW X5 2021"],["l_col","col","Blanc perle"],["l_vin","vin","WBA3A5G5XDNX00001"],["l_plate","plate","AB-123-CD"]] as [string,string,string][]).map(([lk,k,ph]) => (
                    <div key={k} className="fgroup">
                      <div className="flabel">{t(lk)}</div>
                      <input className="fi" value={(form as any)[k]} onChange={e => setForm(p=>({...p,[k]:e.target.value}))} placeholder={ph} />
                    </div>
                  ))}
                  <div className="sdivider">{t("s_rou")}</div>
                  <div className="fgroup full">
                    <div className="flabel">{t("l_from")}</div>
                    <input className="fi" value={form.from} onChange={e => setForm(p=>({...p,from:e.target.value}))} placeholder="15 Rue de la Paix, Paris, France" />
                  </div>
                  <div className="fgroup full">
                    <div className="flabel">{t("l_to")}</div>
                    <input className="fi" value={form.to} onChange={e => setForm(p=>({...p,to:e.target.value}))} placeholder="12 Bd Mohammed V, Casablanca, Maroc" />
                  </div>
                  <div className="fgroup">
                    <div className="flabel">{t("l_dep")}</div>
                    <input className="fi" type="date" value={form.dep} onChange={e => setForm(p=>({...p,dep:e.target.value}))} />
                  </div>
                  <div className="fgroup">
                    <div className="flabel">{t("l_arr")}</div>
                    <input className="fi" type="date" value={form.arr} onChange={e => setForm(p=>({...p,arr:e.target.value}))} />
                  </div>
                  <div className="fgroup">
                    <div className="flabel">{t("l_mode")}</div>
                    <select className="fs" value={form.mode} onChange={e => setForm(p=>({...p,mode:e.target.value}))}>
                      {["m1","m2","m3","m4"].map(k => <option key={k}>{t(k)}</option>)}
                    </select>
                  </div>
                  <div className="fgroup">
                    <div className="flabel">{t("l_carrier")}</div>
                    <input className="fi" value={form.carrier} onChange={e => setForm(p=>({...p,carrier:e.target.value}))} placeholder="Express Trans Europe" />
                  </div>
                  <button className="btn-gen" onClick={genTracking} disabled={genBusy}>
                    {genBusy ? <><span className="spin" /> Génération…</> : t("btn_gen")}
                  </button>
                </div>

                {genId && (
                  <div className="gen-card">
                    <div className="gen-lbl">{t("gen_ok")}</div>
                    <div className="gen-num" id="gen-num-display">
                      <span>ATK</span>{genId.substring(3)}
                    </div>
                    <div className="copy-btn" onClick={copyNum}>📋 {t("btn_copy")}</div>
                    <div className="link-box">
                      {t("lbl_link")}<br/>
                      <a href={trackLink} target="_blank" rel="noreferrer">{trackLink}</a>
                    </div>
                    <p className="link-note">{t("link_note")}</p>
                    <div className="upd-section">
                      <div className="upd-h">{t("upd_h")}</div>
                      <div className="upd-g3">
                        <div className="fgroup">
                          <div className="flabel">{t("u_city")}</div>
                          <input className="fi" value={upd.city} onChange={e=>setUpd(p=>({...p,city:e.target.value}))} placeholder="Lyon, France" />
                        </div>
                        <div className="fgroup">
                          <div className="flabel">{t("u_date")}</div>
                          <input className="fi" type="date" value={upd.date} onChange={e=>setUpd(p=>({...p,date:e.target.value}))} />
                        </div>
                        <div className="fgroup">
                          <div className="flabel">{t("u_time")}</div>
                          <input className="fi" type="time" value={upd.time} onChange={e=>setUpd(p=>({...p,time:e.target.value}))} />
                        </div>
                      </div>
                      <div className="upd-g2">
                        <div className="fgroup">
                          <div className="flabel">{t("u_status")}</div>
                          <select className="fs" value={upd.status} onChange={e=>setUpd(p=>({...p,status:e.target.value}))}>
                            {steps.map(s => <option key={s} value={s}>{t(s+"f")}</option>)}
                          </select>
                        </div>
                        <div className="fgroup">
                          <div className="flabel">{t("u_note")}</div>
                          <input className="fi" value={upd.note} onChange={e=>setUpd(p=>({...p,note:e.target.value}))} placeholder="Contrôle douanier en cours…" />
                        </div>
                      </div>
                      <button className="btn-upd" onClick={pushUpdate} disabled={updBusy}>
                        {updBusy ? <><span className="spin" /> Envoi…</> : t("btn_upd")}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="hist">
                <h3>
                  {t("hist_h")}
                  <button className="ref-btn" onClick={loadHistory}>↻</button>
                </h3>
                <div className="card" style={{overflowX:"auto"}}>
                  <table className="htable">
                    <thead><tr>
                      {["th1","th2","th3","th4","th5","th6"].map(k=><th key={k}>{t(k)}</th>)}
                    </tr></thead>
                    <tbody>
                      {history.length === 0 && (
                        <tr><td colSpan={6} style={{textAlign:"center",color:"var(--muted)",padding:20}}>Aucun suivi créé.</td></tr>
                      )}
                      {history.map(([id, d]) => {
                        const co = d.company || "—";
                        const stc = d.statusKey==="st5"?"var(--green)":d.statusKey==="st3"?"var(--orange)":"var(--blue)";
                        return (
                          <tr key={id}>
                            <td><span className="tid" onClick={() => selectTracking(id)}>{id}</span></td>
                            <td>{d.client}</td>
                            <td>{d.vehicle}</td>
                            <td>{d.fromCity} → {d.toCity}</td>
                            <td><span className="dstatus"><span className="dot" style={{background:stc}} />{t((d.statusKey||"st0")+"f")}</span></td>
                            <td><span style={{color:co==="AutoDeliv"?"var(--blue)":"var(--orange)"}}>{co}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════ ADMIN NOT LOGGED ════ */}
        {view === "admin" && !adminUser && (
          <div className="z1" style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"80px 20px"}}>
            <div style={{textAlign:"center"}}>
              <p style={{color:"var(--muted)",marginBottom:16}}>Vous devez être connecté pour accéder à l'administration.</p>
              <button className="btn-blue" onClick={() => { setShowLogin(true); setLoginErr(""); }}>🔐 Se connecter</button>
            </div>
          </div>
        )}

        {/* FOOTER */}
        <footer>
          <div className="fl">
            <span style={{color:"var(--orange)"}}>AutoReach+</span>
            <span style={{color:"var(--border)"}}>|</span>
            <span style={{color:"var(--blue)"}}>AutoDeliv</span>
          </div>
          <p>{t("ft_tag")}</p>
          <p>© 2026 AUTOTRACK — {t("ft_r")}</p>
        </footer>

        <div className="toast-wrap">
          {toasts.map(tk => (
            <div key={tk.id} className={`toast t-${tk.type}`}>{tk.msg}</div>
          ))}
        </div>
      </div>
    </>
  );
}
